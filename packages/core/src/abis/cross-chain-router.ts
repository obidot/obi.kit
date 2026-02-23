/**
 * ABI for the CrossChainRouter contract.
 *
 * Provides cross-chain routing functionality via Hyperbridge ISMP,
 * including asset sync broadcasting, satellite chain management,
 * and pause controls.
 */
export const CROSS_CHAIN_ROUTER_ABI = [
  {
    type: 'function',
    name: 'broadcastAssetSync',
    inputs: [
      { name: 'totalAssets', type: 'uint256', internalType: 'uint256' },
      { name: 'totalShares', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'satelliteChains',
    inputs: [{ name: 'index', type: 'uint256', internalType: 'uint256' }],
    outputs: [
      { name: 'chainName', type: 'string', internalType: 'string' },
      { name: 'vaultAddress', type: 'address', internalType: 'address' },
      { name: 'isActive', type: 'bool', internalType: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getSatelliteCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
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
    type: 'function',
    name: 'hubVault',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'requestCrossChainWithdraw',
    inputs: [
      { name: 'satelliteIndex', type: 'uint256', internalType: 'uint256' },
      { name: 'assets', type: 'uint256', internalType: 'uint256' },
      { name: 'receiver', type: 'address', internalType: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'requestCrossChainDeposit',
    inputs: [
      { name: 'satelliteIndex', type: 'uint256', internalType: 'uint256' },
      { name: 'assets', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'AssetSyncBroadcast',
    inputs: [
      { name: 'totalAssets', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'totalShares', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'timestamp', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'CrossChainWithdrawRequested',
    inputs: [
      { name: 'satelliteIndex', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'assets', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'receiver', type: 'address', indexed: true, internalType: 'address' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'CrossChainDepositRequested',
    inputs: [
      { name: 'satelliteIndex', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'assets', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
] as const;
