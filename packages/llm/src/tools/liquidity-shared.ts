import type { ObiEvmContext } from '@obidot-kit/core';
import { LIQUIDITY_PAIR_ABI, POLKADOT_HUB_TESTNET_CONTRACTS } from '@obidot-kit/core';
import type { PublicClient } from 'viem';

export const KNOWN_LIQUIDITY_PAIRS: Record<string, `0x${string}`> = {
  'tDOT/TKB': POLKADOT_HUB_TESTNET_CONTRACTS.lpPairDotTkb,
  'tDOT/tUSDC': POLKADOT_HUB_TESTNET_CONTRACTS.lpPairDotUsdc,
  'tDOT/tETH': POLKADOT_HUB_TESTNET_CONTRACTS.lpPairDotEth,
  'tUSDC/tETH': POLKADOT_HUB_TESTNET_CONTRACTS.lpPairUsdcEth,
  'TKB/TKA': POLKADOT_HUB_TESTNET_CONTRACTS.lpPairTkbTka,
};

export function resolveLiquidityPair(pair: string): `0x${string}` {
  const trimmed = pair.trim();
  if (trimmed.startsWith('0x')) {
    return trimmed as `0x${string}`;
  }

  const address = KNOWN_LIQUIDITY_PAIRS[trimmed];
  if (!address) {
    throw new Error(`Unknown pair "${pair}". Available: ${Object.keys(KNOWN_LIQUIDITY_PAIRS).join(', ')}`);
  }

  return address;
}

export const ERC20_ALLOWANCE_ABI = [
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

export interface LiquidityPairState {
  token0: `0x${string}`;
  token1: `0x${string}`;
  reserve0: bigint;
  reserve1: bigint;
  totalSupply: bigint;
}

export async function readPairState(
  client: Pick<PublicClient, 'readContract'>,
  pair: `0x${string}`,
): Promise<LiquidityPairState> {
  const [token0, token1, reserves, totalSupply] = await Promise.all([
    client.readContract({
      address: pair,
      abi: LIQUIDITY_PAIR_ABI,
      functionName: 'token0',
    }) as Promise<`0x${string}`>,
    client.readContract({
      address: pair,
      abi: LIQUIDITY_PAIR_ABI,
      functionName: 'token1',
    }) as Promise<`0x${string}`>,
    client.readContract({
      address: pair,
      abi: LIQUIDITY_PAIR_ABI,
      functionName: 'getReserves',
    }) as Promise<readonly [bigint, bigint, number]>,
    client.readContract({
      address: pair,
      abi: LIQUIDITY_PAIR_ABI,
      functionName: 'totalSupply',
    }) as Promise<bigint>,
  ]);

  const [reserve0, reserve1] = reserves;
  return {
    token0,
    token1,
    reserve0,
    reserve1,
    totalSupply,
  };
}

export function buildAddLiquidityPreview(
  amountADesired: bigint,
  amountBDesired: bigint,
  reserve0: bigint,
  reserve1: bigint,
) {
  if (reserve0 === 0n && reserve1 === 0n) {
    return {
      amountA: amountADesired,
      amountB: amountBDesired,
    };
  }

  const amountBOptimal = (amountADesired * reserve1) / reserve0;
  if (amountBOptimal <= amountBDesired) {
    return {
      amountA: amountADesired,
      amountB: amountBOptimal,
    };
  }

  const amountAOptimal = (amountBDesired * reserve0) / reserve1;
  return {
    amountA: amountAOptimal,
    amountB: amountBDesired,
  };
}

export function buildRemoveLiquidityPreview(
  liquidity: bigint,
  reserve0: bigint,
  reserve1: bigint,
  totalSupply: bigint,
) {
  if (totalSupply === 0n) {
    return {
      amountA: 0n,
      amountB: 0n,
    };
  }

  return {
    amountA: (liquidity * reserve0) / totalSupply,
    amountB: (liquidity * reserve1) / totalSupply,
  };
}

export async function approveIfNeeded(
  ctx: ObiEvmContext,
  token: `0x${string}`,
  spender: `0x${string}`,
  amount: bigint,
): Promise<string | undefined> {
  const account = ctx.account as `0x${string}` | undefined;
  if (!account || !ctx.walletClient) {
    throw new Error('Wallet client and account are required for approval');
  }

  const allowance = (await ctx.client.readContract({
    address: token,
    abi: ERC20_ALLOWANCE_ABI,
    functionName: 'allowance',
    args: [account, spender],
  })) as bigint;

  if (allowance >= amount) {
    return undefined;
  }

  const hash = await ctx.walletClient.writeContract({
    address: token,
    abi: ERC20_ALLOWANCE_ABI,
    functionName: 'approve',
    args: [spender, amount],
    chain: ctx.chain,
    account,
  });
  await ctx.client.waitForTransactionReceipt({ hash });
  return hash;
}
