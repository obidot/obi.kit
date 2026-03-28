// AUTO-GENERATED — do not edit manually.
// Source: obi.router/out/BifrostAdapter.sol/BifrostAdapter.json
// Router path: /home/harry-riddle/dev/github.com/obidot/obi.router
// Synced: 2026-03-28T07:01:46.114Z
//
// BifrostAdapter — Bifrost SLP/SALP/DEX/Farming adapter (parachain 2030).

export const BIFROST_ADAPTER_ABI = [
  {
    type: 'constructor',
    inputs: [
      {
        name: '_admin',
        type: 'address',
        internalType: 'address',
      },
      {
        name: '_vault',
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
    name: 'STRATEGY_EXECUTOR_ROLE',
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
    name: 'XCM_PRECOMPILE',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract IXcm',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'XCM_PRECOMPILE_ADDR',
    inputs: [],
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
    name: 'bifrostStrategies',
    inputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'strategyType',
        type: 'uint8',
        internalType: 'enum BifrostAdapter.BifrostStrategyType',
      },
      {
        name: 'amount',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'executedAt',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'xcmMessageHash',
        type: 'bytes32',
        internalType: 'bytes32',
      },
      {
        name: 'dispatched',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'bifrostStrategyCounter',
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
    name: 'executeBifrostStrategy',
    inputs: [
      {
        name: 'strategy',
        type: 'tuple',
        internalType: 'struct BifrostAdapter.BifrostStrategy',
        components: [
          {
            name: 'strategyType',
            type: 'uint8',
            internalType: 'enum BifrostAdapter.BifrostStrategyType',
          },
          {
            name: 'currencyIdA',
            type: 'uint32',
            internalType: 'uint32',
          },
          {
            name: 'currencyIdB',
            type: 'uint32',
            internalType: 'uint32',
          },
          {
            name: 'amount',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'minOutput',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'poolId',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'beneficiary',
            type: 'bytes32',
            internalType: 'bytes32',
          },
        ],
      },
    ],
    outputs: [
      {
        name: 'strategyId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'xcmMessage',
        type: 'bytes',
        internalType: 'bytes',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getBifrostDestination',
    inputs: [],
    outputs: [
      {
        name: 'dest',
        type: 'bytes',
        internalType: 'bytes',
      },
    ],
    stateMutability: 'pure',
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
    name: 'previewStrategy',
    inputs: [
      {
        name: 'strategy',
        type: 'tuple',
        internalType: 'struct BifrostAdapter.BifrostStrategy',
        components: [
          {
            name: 'strategyType',
            type: 'uint8',
            internalType: 'enum BifrostAdapter.BifrostStrategyType',
          },
          {
            name: 'currencyIdA',
            type: 'uint32',
            internalType: 'uint32',
          },
          {
            name: 'currencyIdB',
            type: 'uint32',
            internalType: 'uint32',
          },
          {
            name: 'amount',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'minOutput',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'poolId',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'beneficiary',
            type: 'bytes32',
            internalType: 'bytes32',
          },
        ],
      },
    ],
    outputs: [
      {
        name: 'xcmMessage',
        type: 'bytes',
        internalType: 'bytes',
      },
    ],
    stateMutability: 'pure',
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
    type: 'event',
    name: 'BifrostStrategyDispatched',
    inputs: [
      {
        name: 'strategyId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'strategyType',
        type: 'uint8',
        indexed: true,
        internalType: 'enum BifrostAdapter.BifrostStrategyType',
      },
      {
        name: 'amount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'beneficiary',
        type: 'bytes32',
        indexed: false,
        internalType: 'bytes32',
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
    name: 'InvalidParachainId',
    inputs: [
      {
        name: 'id',
        type: 'uint32',
        internalType: 'uint32',
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
    name: 'UnsupportedStrategy',
    inputs: [
      {
        name: 'strategyType',
        type: 'uint8',
        internalType: 'enum BifrostAdapter.BifrostStrategyType',
      },
    ],
  },
  {
    type: 'error',
    name: 'UnsupportedVersion',
    inputs: [
      {
        name: 'version',
        type: 'uint8',
        internalType: 'uint8',
      },
    ],
  },
  {
    type: 'error',
    name: 'XcmDispatchFailed',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ZeroAmount',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ZeroBeneficiary',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ZeroStrategyAmount',
    inputs: [],
  },
] as const;
