import { Tool } from '@langchain/core/tools';
import type { EvmVaultConfig, ObiEvmContext, ToolResult } from '@obidot-kit/core';

/**
 * Parsed input for the swap quote tool.
 */
export interface SwapQuoteInput {
  /** Pool address to query (pass zero address to auto-detect) */
  pool?: string;
  /** Input token address */
  tokenIn: string;
  /** Output token address */
  tokenOut: string;
  /** Amount of tokenIn (as a string to preserve precision) */
  amountIn: string;
  /** Whether to return all quotes or just the best (default: false = best only) */
  allQuotes?: boolean;
}

/**
 * Options for constructing a `SwapQuoteTool`.
 */
export interface SwapQuoteToolOptions {
  /** EVM context for reading on-chain state. */
  evmContext?: ObiEvmContext;
  /** ObidotVault configuration (used for vault address). */
  vaultConfig?: EvmVaultConfig;
  /** SwapQuoter contract address. */
  quoterAddress?: `0x${string}`;
}

/**
 * LangChain tool for querying swap quotes from the SwapQuoter contract.
 *
 * This is a **read-only** tool — it only requires a public client.
 * Queries all registered pool adapters via the SwapQuoter and returns
 * the best quote (or all quotes) for a given token pair.
 */
export class SwapQuoteTool extends Tool {
  name = 'swap_quote';

  description =
    'Get a swap quote from the Obidot DEX aggregator on Polkadot Hub. ' +
    'Input is a JSON string with "tokenIn" (ERC-20 address), "tokenOut" (ERC-20 address), ' +
    '"amountIn" (amount in base units as string), optional "pool" (pool address, default auto-detect), ' +
    'and optional "allQuotes" (boolean, default false — return all quotes instead of just the best).';

  private readonly evmContext: ObiEvmContext | undefined;
  private readonly vaultConfig: EvmVaultConfig | undefined;
  private readonly quoterAddress: `0x${string}` | undefined;

  constructor(options: SwapQuoteToolOptions) {
    super();
    this.evmContext = options.evmContext;
    this.vaultConfig = options.vaultConfig;
    this.quoterAddress = options.quoterAddress;
  }

  protected async _call(input: string): Promise<string> {
    try {
      const parsed = this.parseInput(input);
      const result = await this.execute(parsed);
      return JSON.stringify(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return JSON.stringify({
        success: false,
        error: message,
      } satisfies ToolResult);
    }
  }

  private parseInput(input: string): SwapQuoteInput {
    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch {
      throw new Error(`Invalid JSON input: ${input}`);
    }

    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Input must be a JSON object');
    }

    const obj = parsed as Record<string, unknown>;

    if (typeof obj['tokenIn'] !== 'string' || obj['tokenIn'].length === 0) {
      throw new Error('Missing or invalid "tokenIn" field');
    }
    if (typeof obj['tokenOut'] !== 'string' || obj['tokenOut'].length === 0) {
      throw new Error('Missing or invalid "tokenOut" field');
    }
    if (typeof obj['amountIn'] !== 'string' || obj['amountIn'].length === 0) {
      throw new Error('Missing or invalid "amountIn" field');
    }

    return {
      pool: typeof obj['pool'] === 'string' ? obj['pool'] : undefined,
      tokenIn: obj['tokenIn'],
      tokenOut: obj['tokenOut'],
      amountIn: obj['amountIn'],
      allQuotes: typeof obj['allQuotes'] === 'boolean' ? obj['allQuotes'] : false,
    };
  }

  private async execute(input: SwapQuoteInput): Promise<ToolResult> {
    const quoterAddress = this.quoterAddress;
    if (!quoterAddress) {
      throw new Error('No SwapQuoter address configured');
    }

    const ctx = this.evmContext;
    if (!ctx) {
      return {
        success: true,
        data: {
          quoterAddress,
          tokenIn: input.tokenIn,
          tokenOut: input.tokenOut,
          amountIn: input.amountIn,
          mode: 'stub',
          message: 'No EVM context — cannot read on-chain quotes',
        },
      };
    }

    const { SWAP_QUOTER_ABI } = await import('@obidot-kit/core');

    const pool = (input.pool ?? '0x0000000000000000000000000000000000000000') as `0x${string}`;
    const tokenIn = input.tokenIn as `0x${string}`;
    const tokenOut = input.tokenOut as `0x${string}`;
    const amountIn = BigInt(input.amountIn);

    if (input.allQuotes) {
      const quotes = (await ctx.client.readContract({
        address: quoterAddress,
        abi: SWAP_QUOTER_ABI,
        functionName: 'getAllQuotes',
        args: [pool, tokenIn, tokenOut, amountIn],
      })) as readonly {
        source: number;
        pool: string;
        feeBps: bigint;
        amountIn: bigint;
        amountOut: bigint;
      }[];

      const serialised = quotes.map((q) => ({
        source: q.source,
        pool: q.pool,
        feeBps: q.feeBps.toString(),
        amountIn: q.amountIn.toString(),
        amountOut: q.amountOut.toString(),
      }));

      return {
        success: true,
        data: {
          quoterAddress,
          tokenIn,
          tokenOut,
          amountIn: amountIn.toString(),
          quotesCount: serialised.length,
          quotes: serialised,
          mode: 'evm',
        },
        message: `Found ${serialised.length} quote(s) for ${tokenIn} → ${tokenOut}.`,
      };
    }

    // Best quote only
    const best = (await ctx.client.readContract({
      address: quoterAddress,
      abi: SWAP_QUOTER_ABI,
      functionName: 'getBestQuote',
      args: [pool, tokenIn, tokenOut, amountIn],
    })) as {
      source: number;
      pool: string;
      feeBps: bigint;
      amountIn: bigint;
      amountOut: bigint;
    };

    return {
      success: true,
      data: {
        quoterAddress,
        tokenIn,
        tokenOut,
        amountIn: amountIn.toString(),
        bestQuote: {
          source: best.source,
          pool: best.pool,
          feeBps: best.feeBps.toString(),
          amountIn: best.amountIn.toString(),
          amountOut: best.amountOut.toString(),
        },
        mode: 'evm',
      },
      message: `Best quote: ${best.amountOut.toString()} out via pool type ${best.source}.`,
    };
  }
}
