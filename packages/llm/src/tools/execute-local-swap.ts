import { Tool } from '@langchain/core/tools';
import type { EvmVaultConfig, ObiEvmContext, ToolResult } from '@obidot-kit/core';

/**
 * Parsed input for the execute local swap tool.
 */
export interface ExecuteLocalSwapInput {
  // ── SwapParams ──
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
  /** Amount of tokenIn to swap (as string) */
  amountIn: string;
  /** Minimum acceptable output (as string) */
  minAmountOut: string;
  /** Recipient of swap output (defaults to vault) */
  swapTo?: string;
  /** Swap deadline */
  swapDeadline?: string;

  // ── StrategyIntent ──
  /** Asset address for the strategy */
  asset: string;
  /** Strategy amount (as string) */
  amount: string;
  /** Minimum return (as string) */
  minReturn: string;
  /** Maximum slippage in basis points (as string) */
  maxSlippageBps: string;
  /** Strategy deadline (unix timestamp as string) */
  deadline: string;
  /** Nonce for EIP-712 replay protection (as string) */
  nonce: string;
  /** XCM call bytes (hex, use "0x" for local swaps) */
  xcmCall?: string;
  /** Target parachain ID (0 for local swaps) */
  targetParachain?: number;
  /** Target protocol address */
  targetProtocol?: string;

  // ── Signature ──
  /** EIP-712 signature (hex) */
  signature: string;
}

/**
 * Options for constructing an `ExecuteLocalSwapTool`.
 */
export interface ExecuteLocalSwapToolOptions {
  /** EVM context for reading and writing on-chain state. */
  evmContext?: ObiEvmContext;
  /** ObidotVault configuration. */
  vaultConfig?: EvmVaultConfig;
}

/**
 * LangChain tool for executing a vault-routed on-hub swap via
 * `ObidotVault.executeLocalSwap()`.
 *
 * This routes swaps through the vault's SwapRouter with EIP-712
 * StrategyIntent authorization. The vault handles token transfers
 * and accounting, then dispatches to SwapRouter.
 *
 * In **EVM mode**, the tool calls `vault.executeLocalSwap(swapParams, intent, signature)`.
 * In **offline mode**, returns a stub result.
 */
export class ExecuteLocalSwapTool extends Tool {
  name = 'execute_local_swap';

  description =
    'Submit a signed vault-routed local swap through ObidotVault.executeLocalSwap() on Polkadot Hub. ' +
    'Use this when you already have the swap route and an EIP-712-authorized StrategyIntent; prefer ' +
    'swap_quote for quote discovery, swap_execute for direct router swaps, and swap_multi_hop for explicit ' +
    'multi-hop router execution. Input is JSON with swap parameters (poolType, pool, tokenIn, tokenOut, ' +
    'amountIn, minAmountOut), strategy intent fields (asset, amount, minReturn, maxSlippageBps, deadline, ' +
    'nonce), and "signature" (EIP-712 hex).';

  private readonly evmContext: ObiEvmContext | undefined;
  private readonly vaultConfig: EvmVaultConfig | undefined;

  constructor(options: ExecuteLocalSwapToolOptions) {
    super();
    this.evmContext = options.evmContext;
    this.vaultConfig = options.vaultConfig;
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

  private parseInput(input: string): ExecuteLocalSwapInput {
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

    // Required swap fields
    if (typeof obj['poolType'] !== 'number') throw new Error('Missing "poolType"');
    if (typeof obj['pool'] !== 'string') throw new Error('Missing "pool"');
    if (typeof obj['tokenIn'] !== 'string') throw new Error('Missing "tokenIn"');
    if (typeof obj['tokenOut'] !== 'string') throw new Error('Missing "tokenOut"');
    if (typeof obj['amountIn'] !== 'string') throw new Error('Missing "amountIn"');
    if (typeof obj['minAmountOut'] !== 'string') throw new Error('Missing "minAmountOut"');

    // Required intent fields
    if (typeof obj['asset'] !== 'string') throw new Error('Missing "asset"');
    if (typeof obj['amount'] !== 'string') throw new Error('Missing "amount"');
    if (typeof obj['minReturn'] !== 'string') throw new Error('Missing "minReturn"');
    if (typeof obj['maxSlippageBps'] !== 'string') throw new Error('Missing "maxSlippageBps"');
    if (typeof obj['deadline'] !== 'string') throw new Error('Missing "deadline"');
    if (typeof obj['nonce'] !== 'string') throw new Error('Missing "nonce"');
    if (typeof obj['signature'] !== 'string') throw new Error('Missing "signature"');

    return {
      poolType: obj['poolType'],
      pool: obj['pool'],
      tokenIn: obj['tokenIn'],
      tokenOut: obj['tokenOut'],
      feeBps: typeof obj['feeBps'] === 'string' ? obj['feeBps'] : '0',
      data: typeof obj['data'] === 'string' ? obj['data'] : '0x',
      amountIn: obj['amountIn'],
      minAmountOut: obj['minAmountOut'],
      swapTo: typeof obj['swapTo'] === 'string' ? obj['swapTo'] : undefined,
      swapDeadline: typeof obj['swapDeadline'] === 'string' ? obj['swapDeadline'] : undefined,
      asset: obj['asset'],
      amount: obj['amount'],
      minReturn: obj['minReturn'],
      maxSlippageBps: obj['maxSlippageBps'],
      deadline: obj['deadline'],
      nonce: obj['nonce'],
      xcmCall: typeof obj['xcmCall'] === 'string' ? obj['xcmCall'] : '0x',
      targetParachain: typeof obj['targetParachain'] === 'number' ? obj['targetParachain'] : 0,
      targetProtocol:
        typeof obj['targetProtocol'] === 'string'
          ? obj['targetProtocol']
          : '0x0000000000000000000000000000000000000000',
      signature: obj['signature'],
    };
  }

  private async execute(input: ExecuteLocalSwapInput): Promise<ToolResult> {
    const vaultAddress = this.vaultConfig?.vaultAddress;
    if (!vaultAddress) {
      throw new Error('No vault configured');
    }

    const ctx = this.evmContext;
    if (!ctx?.walletClient) {
      return {
        success: true,
        data: {
          vaultAddress,
          tokenIn: input.tokenIn,
          tokenOut: input.tokenOut,
          amountIn: input.amountIn,
          mode: 'stub',
          status: 'pending',
          message: 'No EVM wallet context — local swap prepared but not submitted',
        },
      };
    }

    const { OBIDOT_VAULT_ABI } = await import('@obidot-kit/core');

    const account = ctx.account;
    if (!account) {
      throw new Error('Signer account required for local swap execution');
    }
    const swapDeadline = input.swapDeadline ? BigInt(input.swapDeadline) : BigInt(Math.floor(Date.now() / 1000) + 300);

    // Build SwapParams struct
    const swapParams = {
      route: {
        poolType: input.poolType,
        pool: input.pool as `0x${string}`,
        tokenIn: input.tokenIn as `0x${string}`,
        tokenOut: input.tokenOut as `0x${string}`,
        feeBps: BigInt(input.feeBps ?? '0'),
        data: (input.data ?? '0x') as `0x${string}`,
      },
      amountIn: BigInt(input.amountIn),
      minAmountOut: BigInt(input.minAmountOut),
      to: (input.swapTo ?? vaultAddress) as `0x${string}`,
      deadline: swapDeadline,
    };

    // Build StrategyIntent struct
    const intent = {
      asset: input.asset as `0x${string}`,
      amount: BigInt(input.amount),
      minReturn: BigInt(input.minReturn),
      maxSlippageBps: BigInt(input.maxSlippageBps),
      deadline: BigInt(input.deadline),
      nonce: BigInt(input.nonce),
      xcmCall: (input.xcmCall ?? '0x') as `0x${string}`,
      targetParachain: input.targetParachain ?? 0,
      targetProtocol: (input.targetProtocol ?? '0x0000000000000000000000000000000000000000') as `0x${string}`,
    };

    const hash = await ctx.walletClient.writeContract({
      address: vaultAddress,
      abi: OBIDOT_VAULT_ABI,
      functionName: 'executeLocalSwap',
      args: [swapParams, intent, input.signature as `0x${string}`],
      chain: ctx.chain,
      account: account as `0x${string}`,
    });

    const receipt = await ctx.client.waitForTransactionReceipt({ hash });

    return {
      success: true,
      data: {
        action: 'executeLocalSwap',
        vaultAddress,
        tokenIn: input.tokenIn,
        tokenOut: input.tokenOut,
        amountIn: input.amountIn,
        minAmountOut: input.minAmountOut,
        poolType: input.poolType,
        mode: 'evm',
        status: receipt.status === 'success' ? 'confirmed' : 'failed',
        blockNumber: Number(receipt.blockNumber),
        message: `Local swap executed via vault: ${input.amountIn} ${input.tokenIn} → ${input.tokenOut}.`,
      },
      txHash: hash,
      blockNumber: Number(receipt.blockNumber),
    };
  }
}
