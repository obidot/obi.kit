/**
 * ABI for the BifrostAdapter smart contract.
 *
 * Provides functions for previewing and executing Bifrost DeFi strategies
 * (SLP minting/redeeming, DEX swaps, farming, SALP contributions).
 */
export const BIFROST_ADAPTER_ABI = [
  {
    type: 'function',
    name: 'previewStrategy',
    inputs: [
      { name: 'strategyType', type: 'uint8', internalType: 'uint8' },
      { name: 'currencyIn', type: 'uint8', internalType: 'uint8' },
      { name: 'amount', type: 'uint256', internalType: 'uint256' },
      { name: 'poolId', type: 'uint32', internalType: 'uint32' },
    ],
    outputs: [
      { name: 'expectedOut', type: 'uint256', internalType: 'uint256' },
      { name: 'fee', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'executeBifrostStrategy',
    inputs: [
      { name: 'strategyType', type: 'uint8', internalType: 'uint8' },
      { name: 'currencyIn', type: 'uint8', internalType: 'uint8' },
      { name: 'amount', type: 'uint256', internalType: 'uint256' },
      { name: 'minOut', type: 'uint256', internalType: 'uint256' },
      { name: 'poolId', type: 'uint32', internalType: 'uint32' },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getStrategyInfo',
    inputs: [{ name: 'strategyType', type: 'uint8', internalType: 'uint8' }],
    outputs: [
      { name: 'name', type: 'string', internalType: 'string' },
      { name: 'isActive', type: 'bool', internalType: 'bool' },
      { name: 'totalExecuted', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'owner',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'paused',
    inputs: [],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'BifrostStrategyExecuted',
    inputs: [
      { name: 'strategyType', type: 'uint8', indexed: true, internalType: 'uint8' },
      { name: 'currencyIn', type: 'uint8', indexed: false, internalType: 'uint8' },
      { name: 'amountIn', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'amountOut', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'poolId', type: 'uint32', indexed: false, internalType: 'uint32' },
    ],
    anonymous: false,
  },
] as const;
