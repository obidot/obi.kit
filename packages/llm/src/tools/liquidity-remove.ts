import { Tool } from '@langchain/core/tools';
import type { ObiEvmContext, ToolResult } from '@obidot-kit/core';
import { LIQUIDITY_ROUTER_ABI, POLKADOT_HUB_TESTNET_CONTRACTS } from '@obidot-kit/core';
import {
  approveIfNeeded,
  buildRemoveLiquidityPreview,
  readPairState,
  resolveLiquidityPair,
} from './liquidity-shared.js';

export interface LiquidityRemoveInput {
  pair: string;
  liquidity: string;
  amountAMin?: string;
  amountBMin?: string;
  to?: string;
  deadline?: string;
}

export interface LiquidityRemoveToolOptions {
  evmContext?: ObiEvmContext;
  liquidityRouterAddress?: `0x${string}`;
}

export class LiquidityRemoveTool extends Tool {
  name = 'liquidity_remove';

  description =
    'Remove liquidity from an Obidot LP pair on Polkadot Hub. ' +
    'Input is JSON with "pair" (human label like "tDOT/tUSDC" or a pair address) and "liquidity" ' +
    '(LP token amount in base units), plus optional "amountAMin", "amountBMin", "to", and "deadline". ' +
    'Without a signer it returns a reserve-based preview only; with a signer it approves LP tokens if ' +
    'needed and submits LiquidityRouter.removeLiquidity().';

  private readonly evmContext: ObiEvmContext | undefined;
  private readonly liquidityRouterAddress: `0x${string}`;

  constructor(options: LiquidityRemoveToolOptions = {}) {
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

  private parseInput(input: string): LiquidityRemoveInput {
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
    if (typeof obj['liquidity'] !== 'string' || obj['liquidity'].length === 0) {
      throw new Error('Missing or invalid "liquidity" field');
    }

    return {
      pair: obj['pair'],
      liquidity: obj['liquidity'],
      amountAMin: typeof obj['amountAMin'] === 'string' ? obj['amountAMin'] : undefined,
      amountBMin: typeof obj['amountBMin'] === 'string' ? obj['amountBMin'] : undefined,
      to: typeof obj['to'] === 'string' ? obj['to'] : undefined,
      deadline: typeof obj['deadline'] === 'string' ? obj['deadline'] : undefined,
    };
  }

  private async execute(input: LiquidityRemoveInput): Promise<ToolResult> {
    const pairAddress = resolveLiquidityPair(input.pair);
    const liquidity = BigInt(input.liquidity);
    const amountAMin = BigInt(input.amountAMin ?? '0');
    const amountBMin = BigInt(input.amountBMin ?? '0');

    if (liquidity <= 0n) {
      throw new Error('Liquidity amount must be positive');
    }

    const ctx = this.evmContext;
    if (!ctx) {
      return {
        success: true,
        data: {
          action: 'remove_liquidity',
          pair: pairAddress,
          liquidity: input.liquidity,
          amountAMin: amountAMin.toString(),
          amountBMin: amountBMin.toString(),
          liquidityRouterAddress: this.liquidityRouterAddress,
          mode: 'stub',
          status: 'pending',
          message: 'No EVM context configured — liquidity removal prepared but not submitted',
        },
      };
    }

    const pairState = await readPairState(ctx.client, pairAddress);
    const preview = buildRemoveLiquidityPreview(
      liquidity,
      pairState.reserve0,
      pairState.reserve1,
      pairState.totalSupply,
    );

    if (!ctx.walletClient || !ctx.account) {
      return {
        success: true,
        data: {
          action: 'remove_liquidity',
          pair: pairAddress,
          token0: pairState.token0,
          token1: pairState.token1,
          liquidity: input.liquidity,
          amountAOut: preview.amountA.toString(),
          amountBOut: preview.amountB.toString(),
          amountAMin: amountAMin.toString(),
          amountBMin: amountBMin.toString(),
          liquidityRouterAddress: this.liquidityRouterAddress,
          mode: 'stub',
          status: 'pending',
          message: 'No EVM signer available — liquidity removal preview prepared but not submitted',
        },
      };
    }

    const account = ctx.account as `0x${string}`;
    const toAddress = (input.to ?? account) as `0x${string}`;
    const deadline = input.deadline ? BigInt(input.deadline) : BigInt(Math.floor(Date.now() / 1000) + 300);

    const approvalTxHash = await approveIfNeeded(ctx, pairAddress, this.liquidityRouterAddress, liquidity);

    const hash = await ctx.walletClient.writeContract({
      address: this.liquidityRouterAddress,
      abi: LIQUIDITY_ROUTER_ABI,
      functionName: 'removeLiquidity',
      args: [pairAddress, liquidity, amountAMin, amountBMin, toAddress, deadline],
      chain: ctx.chain,
      account,
    });

    const receipt = await ctx.client.waitForTransactionReceipt({ hash });

    return {
      success: true,
      data: {
        action: 'remove_liquidity',
        pair: pairAddress,
        token0: pairState.token0,
        token1: pairState.token1,
        liquidity: input.liquidity,
        amountAOut: preview.amountA.toString(),
        amountBOut: preview.amountB.toString(),
        amountAMin: amountAMin.toString(),
        amountBMin: amountBMin.toString(),
        to: toAddress,
        deadline: deadline.toString(),
        liquidityRouterAddress: this.liquidityRouterAddress,
        approvalTxHash,
        mode: 'evm',
        status: receipt.status === 'success' ? 'confirmed' : 'failed',
        blockNumber: Number(receipt.blockNumber),
        message: `Liquidity removal executed for pair ${pairAddress}.`,
      },
      txHash: hash,
      blockNumber: Number(receipt.blockNumber),
    };
  }
}
