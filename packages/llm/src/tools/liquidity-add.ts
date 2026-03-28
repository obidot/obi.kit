import { Tool } from '@langchain/core/tools';
import type { ObiEvmContext, ToolResult } from '@obidot-kit/core';
import { LIQUIDITY_ROUTER_ABI, POLKADOT_HUB_TESTNET_CONTRACTS } from '@obidot-kit/core';
import { approveIfNeeded, buildAddLiquidityPreview, readPairState, resolveLiquidityPair } from './liquidity-shared.js';

export interface LiquidityAddInput {
  pair: string;
  amountADesired: string;
  amountBDesired: string;
  amountAMin?: string;
  amountBMin?: string;
  to?: string;
  deadline?: string;
}

export interface LiquidityAddToolOptions {
  evmContext?: ObiEvmContext;
  liquidityRouterAddress?: `0x${string}`;
}

export class LiquidityAddTool extends Tool {
  name = 'liquidity_add';

  description =
    'Add liquidity to an Obidot LP pair on Polkadot Hub. ' +
    'Input is a JSON string with "pair" (pair label like "tDOT/tUSDC" or pair address), ' +
    '"amountADesired", "amountBDesired", optional "amountAMin", "amountBMin", "to", and "deadline".';

  private readonly evmContext: ObiEvmContext | undefined;
  private readonly liquidityRouterAddress: `0x${string}`;

  constructor(options: LiquidityAddToolOptions = {}) {
    super();
    this.evmContext = options.evmContext;
    this.liquidityRouterAddress =
      options.liquidityRouterAddress ?? POLKADOT_HUB_TESTNET_CONTRACTS.liquidityRouterAddress;
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

  private parseInput(input: string): LiquidityAddInput {
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
    if (typeof obj['pair'] !== 'string' || obj['pair'].length === 0) {
      throw new Error('Missing or invalid "pair" field');
    }
    if (typeof obj['amountADesired'] !== 'string' || obj['amountADesired'].length === 0) {
      throw new Error('Missing or invalid "amountADesired" field');
    }
    if (typeof obj['amountBDesired'] !== 'string' || obj['amountBDesired'].length === 0) {
      throw new Error('Missing or invalid "amountBDesired" field');
    }

    return {
      pair: obj['pair'],
      amountADesired: obj['amountADesired'],
      amountBDesired: obj['amountBDesired'],
      amountAMin: typeof obj['amountAMin'] === 'string' ? obj['amountAMin'] : undefined,
      amountBMin: typeof obj['amountBMin'] === 'string' ? obj['amountBMin'] : undefined,
      to: typeof obj['to'] === 'string' ? obj['to'] : undefined,
      deadline: typeof obj['deadline'] === 'string' ? obj['deadline'] : undefined,
    };
  }

  private async execute(input: LiquidityAddInput): Promise<ToolResult> {
    const pairAddress = resolveLiquidityPair(input.pair);
    const amountADesired = BigInt(input.amountADesired);
    const amountBDesired = BigInt(input.amountBDesired);
    const amountAMin = BigInt(input.amountAMin ?? '0');
    const amountBMin = BigInt(input.amountBMin ?? '0');

    if (amountADesired <= 0n || amountBDesired <= 0n) {
      throw new Error('Desired liquidity amounts must be positive');
    }

    const ctx = this.evmContext;
    if (!ctx) {
      return {
        success: true,
        data: {
          action: 'add_liquidity',
          pair: pairAddress,
          amountADesired: input.amountADesired,
          amountBDesired: input.amountBDesired,
          amountAMin: amountAMin.toString(),
          amountBMin: amountBMin.toString(),
          liquidityRouterAddress: this.liquidityRouterAddress,
          mode: 'stub',
          status: 'pending',
          message: 'No EVM context configured — liquidity add prepared but not submitted',
        },
      };
    }

    const pairState = await readPairState(ctx.client, pairAddress);
    const preview = buildAddLiquidityPreview(amountADesired, amountBDesired, pairState.reserve0, pairState.reserve1);

    if (!ctx.walletClient || !ctx.account) {
      return {
        success: true,
        data: {
          action: 'add_liquidity',
          pair: pairAddress,
          token0: pairState.token0,
          token1: pairState.token1,
          amountADesired: input.amountADesired,
          amountBDesired: input.amountBDesired,
          amountAUsed: preview.amountA.toString(),
          amountBUsed: preview.amountB.toString(),
          amountAMin: amountAMin.toString(),
          amountBMin: amountBMin.toString(),
          liquidityRouterAddress: this.liquidityRouterAddress,
          mode: 'stub',
          status: 'pending',
          message: 'No EVM signer available — liquidity add preview prepared but not submitted',
        },
      };
    }

    const account = ctx.account as `0x${string}`;
    const toAddress = (input.to ?? account) as `0x${string}`;
    const deadline = input.deadline ? BigInt(input.deadline) : BigInt(Math.floor(Date.now() / 1000) + 300);

    const approvalTxHashes: string[] = [];
    const approval0 = await approveIfNeeded(ctx, pairState.token0, this.liquidityRouterAddress, preview.amountA);
    if (approval0) approvalTxHashes.push(approval0);

    const approval1 = await approveIfNeeded(ctx, pairState.token1, this.liquidityRouterAddress, preview.amountB);
    if (approval1) approvalTxHashes.push(approval1);

    const hash = await ctx.walletClient.writeContract({
      address: this.liquidityRouterAddress,
      abi: LIQUIDITY_ROUTER_ABI,
      functionName: 'addLiquidity',
      args: [pairAddress, amountADesired, amountBDesired, amountAMin, amountBMin, toAddress, deadline],
      chain: ctx.chain,
      account,
    });

    const receipt = await ctx.client.waitForTransactionReceipt({ hash });

    return {
      success: true,
      data: {
        action: 'add_liquidity',
        pair: pairAddress,
        token0: pairState.token0,
        token1: pairState.token1,
        amountADesired: input.amountADesired,
        amountBDesired: input.amountBDesired,
        amountAUsed: preview.amountA.toString(),
        amountBUsed: preview.amountB.toString(),
        amountAMin: amountAMin.toString(),
        amountBMin: amountBMin.toString(),
        to: toAddress,
        deadline: deadline.toString(),
        liquidityRouterAddress: this.liquidityRouterAddress,
        approvalTxHashes,
        mode: 'evm',
        status: receipt.status === 'success' ? 'confirmed' : 'failed',
        blockNumber: Number(receipt.blockNumber),
        message: `Liquidity add executed for pair ${pairAddress}.`,
      },
      txHash: hash,
      blockNumber: Number(receipt.blockNumber),
    };
  }
}
