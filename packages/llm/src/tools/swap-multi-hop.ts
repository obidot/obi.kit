import { Tool } from '@langchain/core/tools';
import type { EvmVaultConfig, ObiEvmContext, ToolResult } from '@obidot-kit/core';

/**
 * A single route hop in a multi-hop swap path.
 */
export interface RouteHop {
  /** Pool type: 0=HydrationOmnipool, 1=AssetHubPair, 2=BifrostDEX, 3=Custom */
  poolType: number;
  /** Pool address */
  pool: string;
  /** Input token address for this hop */
  tokenIn: string;
  /** Output token address for this hop */
  tokenOut: string;
  /** Pool fee in basis points (informational) */
  feeBps?: string;
  /** Pool-specific calldata (hex) */
  data?: string;
}

/**
 * Parsed input for the multi-hop swap tool.
 */
export interface SwapMultiHopInput {
  /** Ordered array of route hops: route[i].tokenOut == route[i+1].tokenIn */
  routes: RouteHop[];
  /** Amount of the first route's tokenIn (as string) */
  amountIn: string;
  /** Minimum acceptable final output (as string) */
  minAmountOut: string;
  /** Recipient of the final output tokens (defaults to signer) */
  to?: string;
  /** Unix timestamp deadline (defaults to block.timestamp + 300) */
  deadline?: string;
}

/**
 * Options for constructing a `SwapMultiHopTool`.
 */
export interface SwapMultiHopToolOptions {
  /** EVM context for reading and writing on-chain state. */
  evmContext?: ObiEvmContext;
  /** ObidotVault configuration. */
  vaultConfig?: EvmVaultConfig;
  /** SwapRouter contract address. */
  routerAddress?: `0x${string}`;
}

/**
 * LangChain tool for executing a multi-hop swap via the SwapRouter.
 *
 * Multi-hop swaps chain multiple single-hop swaps: the output of each hop
 * feeds into the next. Uses transient storage (EIP-1153) for intermediate
 * balance tracking (like zRouter's depositFor pattern).
 *
 * In **EVM mode**, the tool:
 * 1. Approves the SwapRouter to spend `amountIn` of the first hop's tokenIn.
 * 2. Calls `SwapRouter.swapMultiHop(routes, amountIn, minAmountOut, to, deadline)`.
 * 3. Returns the tx hash and confirmation status.
 *
 * In **offline mode**, returns a stub result.
 */
export class SwapMultiHopTool extends Tool {
  name = 'swap_multi_hop';

  description =
    'Execute a multi-hop swap through the Obidot DEX aggregator SwapRouter on Polkadot Hub. ' +
    'Input is a JSON string with "routes" (array of route hops, each with "poolType", "pool", ' +
    '"tokenIn", "tokenOut", optional "feeBps" and "data"), "amountIn" (string), ' +
    '"minAmountOut" (string), optional "to" (recipient), "deadline" (unix timestamp).';

  private readonly evmContext: ObiEvmContext | undefined;
  private readonly vaultConfig: EvmVaultConfig | undefined;
  private readonly routerAddress: `0x${string}` | undefined;

  constructor(options: SwapMultiHopToolOptions) {
    super();
    this.evmContext = options.evmContext;
    this.vaultConfig = options.vaultConfig;
    this.routerAddress = options.routerAddress;
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

  private parseInput(input: string): SwapMultiHopInput {
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

    if (!Array.isArray(obj['routes']) || obj['routes'].length === 0) {
      throw new Error('Missing or empty "routes" array');
    }

    const routes: RouteHop[] = (obj['routes'] as unknown[]).map((r, i) => {
      const route = r as Record<string, unknown>;
      if (typeof route['poolType'] !== 'number') {
        throw new Error(`Route[${i}]: missing or invalid "poolType"`);
      }
      if (typeof route['pool'] !== 'string') {
        throw new Error(`Route[${i}]: missing "pool"`);
      }
      if (typeof route['tokenIn'] !== 'string') {
        throw new Error(`Route[${i}]: missing "tokenIn"`);
      }
      if (typeof route['tokenOut'] !== 'string') {
        throw new Error(`Route[${i}]: missing "tokenOut"`);
      }
      return {
        poolType: route['poolType'],
        pool: route['pool'],
        tokenIn: route['tokenIn'],
        tokenOut: route['tokenOut'],
        feeBps: typeof route['feeBps'] === 'string' ? route['feeBps'] : '0',
        data: typeof route['data'] === 'string' ? route['data'] : '0x',
      };
    });

    if (typeof obj['amountIn'] !== 'string' || obj['amountIn'].length === 0) {
      throw new Error('Missing or invalid "amountIn" field');
    }
    if (typeof obj['minAmountOut'] !== 'string' || obj['minAmountOut'].length === 0) {
      throw new Error('Missing or invalid "minAmountOut" field');
    }

    return {
      routes,
      amountIn: obj['amountIn'],
      minAmountOut: obj['minAmountOut'],
      to: typeof obj['to'] === 'string' ? obj['to'] : undefined,
      deadline: typeof obj['deadline'] === 'string' ? obj['deadline'] : undefined,
    };
  }

  private async execute(input: SwapMultiHopInput): Promise<ToolResult> {
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
          hops: input.routes.length,
          tokenIn: input.routes[0]!.tokenIn,
          tokenOut: input.routes[input.routes.length - 1]!.tokenOut,
          amountIn: input.amountIn,
          minAmountOut: input.minAmountOut,
          mode: 'stub',
          status: 'pending',
          message: 'No EVM wallet context — multi-hop swap prepared but not submitted',
        },
      };
    }

    const { SWAP_ROUTER_ABI } = await import('@obidot-kit/core');

    const account = ctx.account!;
    const firstTokenIn = input.routes[0]!.tokenIn as `0x${string}`;
    const amountIn = BigInt(input.amountIn);
    const toAddress = (input.to ?? account) as `0x${string}`;
    const deadline = input.deadline ? BigInt(input.deadline) : BigInt(Math.floor(Date.now() / 1000) + 300);

    // ERC-20 approve for first hop
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
      address: firstTokenIn,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [account as `0x${string}`, routerAddress],
    })) as bigint;

    let approvalTxHash: string | undefined;
    if (allowance < amountIn) {
      const hash = await ctx.walletClient.writeContract({
        address: firstTokenIn,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [routerAddress, amountIn],
        chain: ctx.chain,
        account: account as `0x${string}`,
      });
      await ctx.client.waitForTransactionReceipt({ hash });
      approvalTxHash = hash;
    }

    // Build routes array for the contract
    const routes = input.routes.map((r) => ({
      poolType: r.poolType,
      pool: r.pool as `0x${string}`,
      tokenIn: r.tokenIn as `0x${string}`,
      tokenOut: r.tokenOut as `0x${string}`,
      feeBps: BigInt(r.feeBps ?? '0'),
      data: (r.data ?? '0x') as `0x${string}`,
    }));

    const hash = await ctx.walletClient.writeContract({
      address: routerAddress,
      abi: SWAP_ROUTER_ABI,
      functionName: 'swapMultiHop',
      args: [routes, amountIn, BigInt(input.minAmountOut), toAddress, deadline],
      chain: ctx.chain,
      account: account as `0x${string}`,
    });

    const receipt = await ctx.client.waitForTransactionReceipt({ hash });

    const lastRoute = input.routes[input.routes.length - 1]!;
    return {
      success: true,
      data: {
        action: 'swapMultiHop',
        routerAddress,
        hops: input.routes.length,
        tokenIn: input.routes[0]!.tokenIn,
        tokenOut: lastRoute.tokenOut,
        amountIn: input.amountIn,
        minAmountOut: input.minAmountOut,
        to: toAddress,
        approvalTxHash,
        mode: 'evm',
        status: receipt.status === 'success' ? 'confirmed' : 'failed',
        blockNumber: Number(receipt.blockNumber),
        message: `Multi-hop swap (${input.routes.length} hops) executed: ${input.routes[0]!.tokenIn} → ${lastRoute.tokenOut}.`,
      },
      txHash: hash,
      blockNumber: Number(receipt.blockNumber),
    };
  }
}
