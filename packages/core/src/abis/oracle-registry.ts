/**
 * ABI for the OracleRegistry contract.
 *
 * Provides multi-asset price feed management with staleness checks
 * and slippage validation.
 */
export const ORACLE_REGISTRY_ABI = [
  {
    type: 'function',
    name: 'getPrice',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [
      { name: 'price', type: 'int256' },
      { name: 'oracleDecimals', type: 'uint8' },
      { name: 'updatedAt', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPriceStrict',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [
      { name: 'price', type: 'uint256' },
      { name: 'oracleDecimals', type: 'uint8' },
      { name: 'updatedAt', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'validateSlippage',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'minReturn', type: 'uint256' },
      { name: 'maxSlippageBps', type: 'uint16' },
    ],
    outputs: [
      { name: 'valid', type: 'bool' },
      { name: 'oracleMinimum', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isFeedStale',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [{ name: 'stale', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'hasFeed',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'feedCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAllRegisteredAssets',
    inputs: [],
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
  },
] as const;
