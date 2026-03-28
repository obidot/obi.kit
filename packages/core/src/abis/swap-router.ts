// AUTO-GENERATED — do not edit manually.
// Source: obi.router/out/SwapRouter.sol/SwapRouter.json
// Router path: /home/harry-riddle/dev/github.com/obidot/obi.router
// Synced: 2026-03-28T07:01:46.118Z
//
// SwapRouter — DEX aggregator routing engine: single/multi-hop/split swaps, multicall, adapter registry.

export const SWAP_ROUTER_ABI = [
  {
    type: 'constructor',
    inputs: [
      {
        name: '_admin',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'DEFAULT_ADMIN_ROLE',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'VAULT_ROLE',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'adapters',
    inputs: [
      {
        name: '',
        type: 'uint8',
        internalType: 'enum ISwapRouter.PoolType',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getRoleAdmin',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'grantRole',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        internalType: 'bytes32',
      },
      {
        name: 'account',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'grantVaultRole',
    inputs: [
      {
        name: 'vault',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'hasRole',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        internalType: 'bytes32',
      },
      {
        name: 'account',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'multicall',
    inputs: [
      {
        name: 'data',
        type: 'bytes[]',
        internalType: 'bytes[]',
      },
    ],
    outputs: [
      {
        name: 'results',
        type: 'bytes[]',
        internalType: 'bytes[]',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'pause',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'paused',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'quote',
    inputs: [
      {
        name: 'route',
        type: 'tuple',
        internalType: 'struct ISwapRouter.Route',
        components: [
          {
            name: 'poolType',
            type: 'uint8',
            internalType: 'enum ISwapRouter.PoolType',
          },
          {
            name: 'pool',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'tokenIn',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'tokenOut',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'feeBps',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'data',
            type: 'bytes32',
            internalType: 'bytes32',
          },
        ],
      },
      {
        name: 'amountIn',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'amountOut',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'quoteMultiHop',
    inputs: [
      {
        name: 'routes',
        type: 'tuple[]',
        internalType: 'struct ISwapRouter.Route[]',
        components: [
          {
            name: 'poolType',
            type: 'uint8',
            internalType: 'enum ISwapRouter.PoolType',
          },
          {
            name: 'pool',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'tokenIn',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'tokenOut',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'feeBps',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'data',
            type: 'bytes32',
            internalType: 'bytes32',
          },
        ],
      },
      {
        name: 'amountIn',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'amountOut',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'renounceRole',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        internalType: 'bytes32',
      },
      {
        name: 'callerConfirmation',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'revokeRole',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        internalType: 'bytes32',
      },
      {
        name: 'account',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setAdapter',
    inputs: [
      {
        name: 'poolType',
        type: 'uint8',
        internalType: 'enum ISwapRouter.PoolType',
      },
      {
        name: 'adapter',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'supportsInterface',
    inputs: [
      {
        name: 'interfaceId',
        type: 'bytes4',
        internalType: 'bytes4',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'swap',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        internalType: 'struct ISwapRouter.SwapParams',
        components: [
          {
            name: 'route',
            type: 'tuple',
            internalType: 'struct ISwapRouter.Route',
            components: [
              {
                name: 'poolType',
                type: 'uint8',
                internalType: 'enum ISwapRouter.PoolType',
              },
              {
                name: 'pool',
                type: 'address',
                internalType: 'address',
              },
              {
                name: 'tokenIn',
                type: 'address',
                internalType: 'address',
              },
              {
                name: 'tokenOut',
                type: 'address',
                internalType: 'address',
              },
              {
                name: 'feeBps',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'data',
                type: 'bytes32',
                internalType: 'bytes32',
              },
            ],
          },
          {
            name: 'amountIn',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'minAmountOut',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'to',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'deadline',
            type: 'uint256',
            internalType: 'uint256',
          },
        ],
      },
    ],
    outputs: [
      {
        name: 'amountOut',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'swapCounter',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'swapFlat',
    inputs: [
      {
        name: 'poolType',
        type: 'uint8',
        internalType: 'uint8',
      },
      {
        name: 'pool',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'tokenIn',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'tokenOut',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'feeBps',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'data',
        type: 'bytes32',
        internalType: 'bytes32',
      },
      {
        name: 'amountIn',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'minAmountOut',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'to',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'deadline',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'amountOut',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'swapMultiHop',
    inputs: [
      {
        name: 'routes',
        type: 'tuple[]',
        internalType: 'struct ISwapRouter.Route[]',
        components: [
          {
            name: 'poolType',
            type: 'uint8',
            internalType: 'enum ISwapRouter.PoolType',
          },
          {
            name: 'pool',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'tokenIn',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'tokenOut',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'feeBps',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'data',
            type: 'bytes32',
            internalType: 'bytes32',
          },
        ],
      },
      {
        name: 'amountIn',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'minAmountOut',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'to',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'deadline',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'amountOut',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'swapSplit',
    inputs: [
      {
        name: 'legs',
        type: 'tuple[]',
        internalType: 'struct ISwapRouter.SplitLeg[]',
        components: [
          {
            name: 'route',
            type: 'tuple',
            internalType: 'struct ISwapRouter.Route',
            components: [
              {
                name: 'poolType',
                type: 'uint8',
                internalType: 'enum ISwapRouter.PoolType',
              },
              {
                name: 'pool',
                type: 'address',
                internalType: 'address',
              },
              {
                name: 'tokenIn',
                type: 'address',
                internalType: 'address',
              },
              {
                name: 'tokenOut',
                type: 'address',
                internalType: 'address',
              },
              {
                name: 'feeBps',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'data',
                type: 'bytes32',
                internalType: 'bytes32',
              },
            ],
          },
          {
            name: 'weight',
            type: 'uint256',
            internalType: 'uint256',
          },
        ],
      },
      {
        name: 'tokenIn',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'tokenOut',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'amountIn',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'minAmountOut',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'to',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'deadline',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'amountOut',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'unpause',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'AdapterSet',
    inputs: [
      {
        name: 'poolType',
        type: 'uint8',
        indexed: true,
        internalType: 'enum ISwapRouter.PoolType',
      },
      {
        name: 'adapter',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'Paused',
    inputs: [
      {
        name: 'account',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'RoleAdminChanged',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'previousAdminRole',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'newAdminRole',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'RoleGranted',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'account',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'sender',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'RoleRevoked',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'account',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'sender',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'Swapped',
    inputs: [
      {
        name: 'sender',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'tokenIn',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'tokenOut',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'amountIn',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'amountOut',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'poolType',
        type: 'uint8',
        indexed: false,
        internalType: 'enum ISwapRouter.PoolType',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'Unpaused',
    inputs: [
      {
        name: 'account',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'error',
    name: 'AccessControlBadConfirmation',
    inputs: [],
  },
  {
    type: 'error',
    name: 'AccessControlUnauthorizedAccount',
    inputs: [
      {
        name: 'account',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'neededRole',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
  },
  {
    type: 'error',
    name: 'EnforcedPause',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ExpectedPause',
    inputs: [],
  },
  {
    type: 'error',
    name: 'Expired',
    inputs: [],
  },
  {
    type: 'error',
    name: 'IdenticalTokens',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InvalidSplitWeights',
    inputs: [
      {
        name: 'totalWeight',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'NoAdapterRegistered',
    inputs: [
      {
        name: 'poolType',
        type: 'uint8',
        internalType: 'enum ISwapRouter.PoolType',
      },
    ],
  },
  {
    type: 'error',
    name: 'ReentrancyGuardReentrantCall',
    inputs: [],
  },
  {
    type: 'error',
    name: 'SafeERC20FailedOperation',
    inputs: [
      {
        name: 'token',
        type: 'address',
        internalType: 'address',
      },
    ],
  },
  {
    type: 'error',
    name: 'SlippageExceeded',
    inputs: [
      {
        name: 'amountOut',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'minAmountOut',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'Unauthorized',
    inputs: [],
  },
  {
    type: 'error',
    name: 'UnsupportedPoolType',
    inputs: [
      {
        name: 'poolType',
        type: 'uint8',
        internalType: 'enum ISwapRouter.PoolType',
      },
    ],
  },
  {
    type: 'error',
    name: 'ZeroAddress',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ZeroSwapAmount',
    inputs: [],
  },
] as const;
