import { Tool } from '@langchain/core/tools';
import type { EvmVaultConfig, ObiEvmContext, ToolResult } from '@obidot-kit/core';

/**
 * Parsed input for the swap execute tool.
 */
export interface SwapExecuteInput {
  /** Pool type: 0=HydrationOmnipool, 1=AssetHubPair, 2=BifrostDEX, 3=Custom */
  poolType: number;
  /** Pool address */
  pool: string;
  /** Input token address */
  tokenIn: string;
  /** Output token address */
  tokenOut: string;
  /** Pool fee in basis points (informational) */
  feeBps?: string;
  /** Pool-specific calldata (hex) */
  data?: string;
  /** Amount of tokenIn to swap (as string to preserve precision) */
  amountIn: string;
  /** Minimum acceptable output (as string) */
  minAmountOut: string;
  /** Recipient address (defaults to signer) */
  to?: string;
  /** Unix timestamp deadline (defaults to block.timestamp + 300) */
  deadline?: string;
}

/**
 * Options for constructing a `SwapExecuteTool`.
 */
export interface SwapExecuteToolOptions {
  /** EVM context for reading and writing on-chain state. */
  evmContext?: ObiEvmContext;
  /** ObidotVault configuration (used for asset address). */
  vaultConfig?: EvmVaultConfig;
  /** SwapRouter contract address. */
  routerAddress?: `0x${string}`;
  /**
   * SwapQuoter contract address. When provided, the tool calls
   * `SwapQuoter.getBestQuote()` before execution to validate or
   * compute `minAmountOut` from a live quote (pre-flight protection).
   */
  quoterAddress?: `0x${string}`;
  /**
   * Slippage tolerance in basis points applied to the live quote
   * when computing `minAmountOut`. Default: 200 (2%).
   * Only used when `quoterAddress` is set and `minAmountOut` is "0".
   */
  slippageBps?: number;
}

/**
 * LangChain tool for executing a single-hop swap via the SwapRouter.
 *
 * In **EVM mode** (with `evmContext` + `routerAddress`), the tool:
 * 1. Approves the SwapRouter to spend `amountIn` of `tokenIn` (if needed).
 * 2. Calls `SwapRouter.swap(SwapParams)`.
 * 3. Returns the tx hash and actual output amount.
 *
 * In **offline mode**, returns a stub result.
 */
export class SwapExecuteTool extends Tool {
  name = 'swap_execute';

  description =
    'Execute a single-hop swap through the Obidot DEX aggregator SwapRouter on Polkadot Hub. ' +
    'Input is a JSON string with "poolType" (0-3), "pool" (address), "tokenIn", "tokenOut", ' +
    '"amountIn", "minAmountOut" (all amounts as strings in base units), ' +
    'optional "feeBps", "data" (hex), "to" (recipient, default signer), "deadline" (unix timestamp).';

  private readonly evmContext: ObiEvmContext | undefined;
  private readonly vaultConfig: EvmVaultConfig | undefined;
  private readonly routerAddress: `0x${string}` | undefined;
  private readonly quoterAddress: `0x${string}` | undefined;
  private readonly slippageBps: number;

  constructor(options: SwapExecuteToolOptions) {
    super();
    this.evmContext = options.evmContext;
    this.vaultConfig = options.vaultConfig;
    this.routerAddress = options.routerAddress;
    this.quoterAddress = options.quoterAddress;
    this.slippageBps = options.slippageBps ?? 200; // 2% default
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

  private parseInput(input: string): SwapExecuteInput {
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

    if (typeof obj['poolType'] !== 'number') {
      throw new Error('Missing or invalid "poolType" field (must be 0-3)');
    }
    if (typeof obj['pool'] !== 'string' || obj['pool'].length === 0) {
      throw new Error('Missing or invalid "pool" field');
    }
    if (typeof obj['tokenIn'] !== 'string' || obj['tokenIn'].length === 0) {
      throw new Error('Missing or invalid "tokenIn" field');
    }
    if (typeof obj['tokenOut'] !== 'string' || obj['tokenOut'].length === 0) {
      throw new Error('Missing or invalid "tokenOut" field');
    }
    if (typeof obj['amountIn'] !== 'string' || obj['amountIn'].length === 0) {
      throw new Error('Missing or invalid "amountIn" field');
    }
    if (typeof obj['minAmountOut'] !== 'string' || obj['minAmountOut'].length === 0) {
      throw new Error('Missing or invalid "minAmountOut" field');
    }

    return {
      poolType: obj['poolType'],
      pool: obj['pool'],
      tokenIn: obj['tokenIn'],
      tokenOut: obj['tokenOut'],
      feeBps: typeof obj['feeBps'] === 'string' ? obj['feeBps'] : '0',
      data: typeof obj['data'] === 'string' ? obj['data'] : '0x',
      amountIn: obj['amountIn'],
      minAmountOut: obj['minAmountOut'],
      to: typeof obj['to'] === 'string' ? obj['to'] : undefined,
      deadline: typeof obj['deadline'] === 'string' ? obj['deadline'] : undefined,
    };
  }

  private async execute(input: SwapExecuteInput): Promise<ToolResult> {
    const routerAddress = this.routerAddress;
    if (!routerAddress) {
      throw new Error('No SwapRouter address configured');
    }

    const ctx = this.evmContext;
    if (!ctx?.walletClient) {
      return {
        success: true,
        data: {
          routerAddress,
          tokenIn: input.tokenIn,
          tokenOut: input.tokenOut,
          amountIn: input.amountIn,
          minAmountOut: input.minAmountOut,
          mode: 'stub',
          status: 'pending',
          message: 'No EVM wallet context — swap prepared but not submitted',
        },
      };
    }

    const { SWAP_ROUTER_ABI, SWAP_QUOTER_ABI } = await import('@obidot-kit/core');

    const account = ctx.account!;
    const tokenIn = input.tokenIn as `0x${string}`;
    const tokenOut = input.tokenOut as `0x${string}`;
    const pool = input.pool as `0x${string}`;
    const amountIn = BigInt(input.amountIn);
    const toAddress = (input.to ?? account) as `0x${string}`;

    // Default deadline: current block timestamp + 5 minutes
    const deadline = input.deadline ? BigInt(input.deadline) : BigInt(Math.floor(Date.now() / 1000) + 300);

    // ── SwapQuoter pre-flight ─────────────────────────────────────────
    // If minAmountOut is "0" (caller didn't set it) and we have a quoter,
    // fetch the live quote and apply slippage to compute a safe floor.
    let resolvedMinAmountOut = BigInt(input.minAmountOut);
    if (resolvedMinAmountOut === 0n && this.quoterAddress) {
      try {
        const quote = (await ctx.client.readContract({
          address: this.quoterAddress,
          abi: SWAP_QUOTER_ABI,
          functionName: 'getBestQuote',
          args: [pool, tokenIn, tokenOut, amountIn],
        })) as { amountOut: bigint };

        if (quote.amountOut > 0n) {
          resolvedMinAmountOut = (quote.amountOut * BigInt(10_000 - this.slippageBps)) / 10_000n;
        }
      } catch {
        // Non-fatal — proceed with minAmountOut=0; on-chain SlippageGuard still applies
      }
    }

    // ERC-20 approve if needed
    const ERC20_ABI = [
      {
        type: 'function' as const,
        name: 'allowance',
        inputs: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view' as const,
      },
      {
        type: 'function' as const,
        name: 'approve',
        inputs: [
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'nonpayable' as const,
      },
    ] as const;

    const allowance = (await ctx.client.readContract({
      address: tokenIn,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [account as `0x${string}`, routerAddress],
    })) as bigint;

    let approvalTxHash: string | undefined;
    if (allowance < amountIn) {
      const hash = await ctx.walletClient.writeContract({
        address: tokenIn,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [routerAddress, amountIn],
        chain: ctx.chain,
        account: account as `0x${string}`,
      });
      await ctx.client.waitForTransactionReceipt({ hash });
      approvalTxHash = hash;
    }

    // Build SwapParams struct
    const swapParams = {
      route: {
        poolType: input.poolType,
        pool,
        tokenIn,
        tokenOut,
        feeBps: BigInt(input.feeBps ?? '0'),
        data: (input.data ?? '0x0000000000000000000000000000000000000000000000000000000000000000') as `0x${string}`,
      },
      amountIn,
      minAmountOut: resolvedMinAmountOut,
      to: toAddress,
      deadline,
    };

    const hash = await ctx.walletClient.writeContract({
      address: routerAddress,
      abi: SWAP_ROUTER_ABI,
      functionName: 'swap',
      args: [swapParams],
      chain: ctx.chain,
      account: account as `0x${string}`,
    });

    const receipt = await ctx.client.waitForTransactionReceipt({ hash });

    return {
      success: true,
      data: {
        action: 'swap',
        routerAddress,
        tokenIn: input.tokenIn,
        tokenOut: input.tokenOut,
        amountIn: input.amountIn,
        minAmountOut: resolvedMinAmountOut.toString(),
        to: toAddress,
        poolType: input.poolType,
        approvalTxHash,
        mode: 'evm',
        status: receipt.status === 'success' ? 'confirmed' : 'failed',
        blockNumber: Number(receipt.blockNumber),
        message: `Swap executed: ${input.amountIn} ${input.tokenIn} → ${input.tokenOut} via pool type ${input.poolType}.`,
      },
      txHash: hash,
      blockNumber: Number(receipt.blockNumber),
    };
  }
}
