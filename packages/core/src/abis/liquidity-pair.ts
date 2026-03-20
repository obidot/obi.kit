// Source: obi.router/src/periphery/LiquidityPair.sol
// Synced: 2026-03-20
//
// LiquidityPair — UniswapV2-compatible LP pair with ERC-20 LP tokens.
// Constructor pattern (no factory). Protocol fee disabled on testnet.

export const LIQUIDITY_PAIR_ABI = [
  {
    type: 'event',
    name: 'Mint',
    inputs: [
      { name: 'sender', type: 'address', internalType: 'address', indexed: true },
      { name: 'amount0', type: 'uint256', internalType: 'uint256', indexed: false },
      { name: 'amount1', type: 'uint256', internalType: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Burn',
    inputs: [
      { name: 'sender', type: 'address', internalType: 'address', indexed: true },
      { name: 'amount0', type: 'uint256', internalType: 'uint256', indexed: false },
      { name: 'amount1', type: 'uint256', internalType: 'uint256', indexed: false },
      { name: 'to', type: 'address', internalType: 'address', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'Swap',
    inputs: [
      { name: 'sender', type: 'address', internalType: 'address', indexed: true },
      { name: 'amount0In', type: 'uint256', internalType: 'uint256', indexed: false },
      { name: 'amount1In', type: 'uint256', internalType: 'uint256', indexed: false },
      { name: 'amount0Out', type: 'uint256', internalType: 'uint256', indexed: false },
      { name: 'amount1Out', type: 'uint256', internalType: 'uint256', indexed: false },
      { name: 'to', type: 'address', internalType: 'address', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'Sync',
    inputs: [
      { name: 'reserve0', type: 'uint112', internalType: 'uint112', indexed: false },
      { name: 'reserve1', type: 'uint112', internalType: 'uint112', indexed: false },
    ],
  },
  {
    type: 'function',
    name: 'token0',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'token1',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getReserves',
    inputs: [],
    outputs: [
      { name: '_reserve0', type: 'uint112', internalType: 'uint112' },
      { name: '_reserve1', type: 'uint112', internalType: 'uint112' },
      { name: '_blockTimestampLast', type: 'uint32', internalType: 'uint32' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalSupply',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
] as const;
