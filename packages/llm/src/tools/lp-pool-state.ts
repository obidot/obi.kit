import { Tool } from '@langchain/core/tools';
import type { ObiEvmContext } from '@obidot-kit/core';
import { LIQUIDITY_PAIR_ABI, POLKADOT_HUB_TESTNET_CONTRACTS } from '@obidot-kit/core';
import { createPublicClient, http } from 'viem';

/** Known LP pair label → address mapping (SP-1 deployment). */
const LP_PAIRS: Record<string, `0x${string}`> = {
  'tDOT/TKB': POLKADOT_HUB_TESTNET_CONTRACTS.lpPairDotTkb,
  'tDOT/tUSDC': POLKADOT_HUB_TESTNET_CONTRACTS.lpPairDotUsdc,
  'tDOT/tETH': POLKADOT_HUB_TESTNET_CONTRACTS.lpPairDotEth,
  'tUSDC/tETH': POLKADOT_HUB_TESTNET_CONTRACTS.lpPairUsdcEth,
  'TKB/TKA': POLKADOT_HUB_TESTNET_CONTRACTS.lpPairTkbTka,
};

export interface LpPoolStateToolOptions {
  evmContext?: ObiEvmContext;
}

/**
 * LangChain tool for reading UniswapV2 LP pair reserve state on-chain.
 *
 * Input: pair label ("tDOT/TKB") or raw pair address ("0x...")
 * Output: JSON with token0, token1, reserve0, reserve1, totalSupply, priceRatio
 */
export class LpPoolStateTool extends Tool {
  name = 'lp_pool_state';
  description =
    'Read current reserves and price ratio for a UniswapV2 LP pair. ' +
    'Input: pair label (e.g. "tDOT/TKB") or pair address (0x...). ' +
    'Available pairs: ' +
    Object.keys(LP_PAIRS).join(', ');

  private evmContext?: ObiEvmContext;

  constructor(options: LpPoolStateToolOptions = {}) {
    super();
    this.evmContext = options.evmContext;
  }

  protected async _call(input: string): Promise<string> {
    try {
      const trimmed = input.trim();
      const pairAddress: `0x${string}` = trimmed.startsWith('0x')
        ? (trimmed as `0x${string}`)
        : (LP_PAIRS[trimmed] ??
          (() => {
            throw new Error(`Unknown pair: "${trimmed}". Available: ${Object.keys(LP_PAIRS).join(', ')}`);
          })());

      const client =
        this.evmContext?.client ?? createPublicClient({ transport: http('https://eth-rpc-testnet.polkadot.io/') });

      const [token0, token1, reserves, totalSupply] = await Promise.all([
        client.readContract({ address: pairAddress, abi: LIQUIDITY_PAIR_ABI, functionName: 'token0' }),
        client.readContract({ address: pairAddress, abi: LIQUIDITY_PAIR_ABI, functionName: 'token1' }),
        client.readContract({ address: pairAddress, abi: LIQUIDITY_PAIR_ABI, functionName: 'getReserves' }),
        client.readContract({ address: pairAddress, abi: LIQUIDITY_PAIR_ABI, functionName: 'totalSupply' }),
      ]);

      const [reserve0, reserve1] = reserves as [bigint, bigint, number];
      const priceRatio = reserve0 === 0n ? '0' : (Number(reserve1) / Number(reserve0)).toFixed(6);

      return JSON.stringify({
        pair: pairAddress,
        token0,
        token1,
        reserve0: reserve0.toString(),
        reserve1: reserve1.toString(),
        totalSupply: (totalSupply as bigint).toString(),
        priceRatio,
      });
    } catch (err) {
      return `Error reading LP pool state: ${err instanceof Error ? err.message : String(err)}`;
    }
  }
}
