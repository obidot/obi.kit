// AUTO-GENERATED — do not edit manually.
// Source: obi.router/out/CrossChainRouter.sol/CrossChainRouter.json
// Router path: /home/harry-riddle/dev/github.com/obidot/obi.router
// Synced: 2026-03-15T03:21:57.620Z
//
// CrossChainRouter — hub ISMP message router (dispatches + receives).

export const CROSS_CHAIN_ROUTER_ABI = [
  {
    type: 'constructor',
    inputs: [
      {
        name: '_ismpHost',
        type: 'address',
        internalType: 'address',
      },
      {
        name: '_asset',
        type: 'address',
        internalType: 'contract IERC20',
      },
      {
        name: '_masterVault',
        type: 'address',
        internalType: 'address',
      },
      {
        name: '_admin',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'receive',
    stateMutability: 'payable',
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
    name: 'DISPATCHER_ROLE',
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
    name: 'addSatelliteChain',
    inputs: [
      {
        name: 'chainId',
        type: 'bytes',
        internalType: 'bytes',
      },
      {
        name: 'moduleAddress',
        type: 'bytes',
        internalType: 'bytes',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'asset',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract IERC20',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'broadcastAssetSync',
    inputs: [
      {
        name: 'globalTotalAssets',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'globalTotalShares',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'totalRemoteAssets',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'broadcastEmergencySync',
    inputs: [
      {
        name: '_paused',
        type: 'bool',
        internalType: 'bool',
      },
      {
        name: '_emergencyMode',
        type: 'bool',
        internalType: 'bool',
      },
      {
        name: 'reason',
        type: 'bytes',
        internalType: 'bytes',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'broadcastStrategyReport',
    inputs: [
      {
        name: 'strategyId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'success',
        type: 'bool',
        internalType: 'bool',
      },
      {
        name: 'returnedAmount',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'pnl',
        type: 'int256',
        internalType: 'int256',
      },
      {
        name: 'newTotalRemoteAssets',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'feeToken',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract IERC20',
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
    name: 'incomingDepositNonces',
    inputs: [
      {
        name: '',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
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
    name: 'incomingWithdrawNonces',
    inputs: [
      {
        name: '',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
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
    name: 'ismpHost',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract IIsmpHost',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'knownChains',
    inputs: [
      {
        name: '',
        type: 'bytes32',
        internalType: 'bytes32',
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
    name: 'masterVault',
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
    name: 'onAccept',
    inputs: [
      {
        name: 'incoming',
        type: 'tuple',
        internalType: 'struct IIsmpModule.IncomingPostRequest',
        components: [
          {
            name: 'request',
            type: 'tuple',
            internalType: 'struct IIsmpModule.PostRequest',
            components: [
              {
                name: 'source',
                type: 'bytes',
                internalType: 'bytes',
              },
              {
                name: 'dest',
                type: 'bytes',
                internalType: 'bytes',
              },
              {
                name: 'nonce',
                type: 'uint64',
                internalType: 'uint64',
              },
              {
                name: 'from',
                type: 'bytes',
                internalType: 'bytes',
              },
              {
                name: 'to',
                type: 'bytes',
                internalType: 'bytes',
              },
              {
                name: 'timeoutTimestamp',
                type: 'uint64',
                internalType: 'uint64',
              },
              {
                name: 'body',
                type: 'bytes',
                internalType: 'bytes',
              },
            ],
          },
          {
            name: 'relayer',
            type: 'address',
            internalType: 'address',
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'onGetResponse',
    inputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct IIsmpModule.IncomingGetResponse',
        components: [
          {
            name: 'response',
            type: 'tuple',
            internalType: 'struct IIsmpModule.GetResponse',
            components: [
              {
                name: 'request',
                type: 'tuple',
                internalType: 'struct IIsmpModule.GetRequest',
                components: [
                  {
                    name: 'source',
                    type: 'bytes',
                    internalType: 'bytes',
                  },
                  {
                    name: 'dest',
                    type: 'bytes',
                    internalType: 'bytes',
                  },
                  {
                    name: 'nonce',
                    type: 'uint64',
                    internalType: 'uint64',
                  },
                  {
                    name: 'from',
                    type: 'address',
                    internalType: 'address',
                  },
                  {
                    name: 'timeoutTimestamp',
                    type: 'uint64',
                    internalType: 'uint64',
                  },
                  {
                    name: 'keys',
                    type: 'bytes[]',
                    internalType: 'bytes[]',
                  },
                  {
                    name: 'height',
                    type: 'uint64',
                    internalType: 'uint64',
                  },
                  {
                    name: 'context',
                    type: 'bytes',
                    internalType: 'bytes',
                  },
                ],
              },
              {
                name: 'values',
                type: 'tuple[]',
                internalType: 'struct IIsmpModule.StorageValue[]',
                components: [
                  {
                    name: 'key',
                    type: 'bytes',
                    internalType: 'bytes',
                  },
                  {
                    name: 'value',
                    type: 'bytes',
                    internalType: 'bytes',
                  },
                ],
              },
            ],
          },
          {
            name: 'relayer',
            type: 'address',
            internalType: 'address',
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'onGetTimeout',
    inputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct IIsmpModule.GetRequest',
        components: [
          {
            name: 'source',
            type: 'bytes',
            internalType: 'bytes',
          },
          {
            name: 'dest',
            type: 'bytes',
            internalType: 'bytes',
          },
          {
            name: 'nonce',
            type: 'uint64',
            internalType: 'uint64',
          },
          {
            name: 'from',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'timeoutTimestamp',
            type: 'uint64',
            internalType: 'uint64',
          },
          {
            name: 'keys',
            type: 'bytes[]',
            internalType: 'bytes[]',
          },
          {
            name: 'height',
            type: 'uint64',
            internalType: 'uint64',
          },
          {
            name: 'context',
            type: 'bytes',
            internalType: 'bytes',
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'onPostRequestTimeout',
    inputs: [
      {
        name: 'request',
        type: 'tuple',
        internalType: 'struct IIsmpModule.PostRequest',
        components: [
          {
            name: 'source',
            type: 'bytes',
            internalType: 'bytes',
          },
          {
            name: 'dest',
            type: 'bytes',
            internalType: 'bytes',
          },
          {
            name: 'nonce',
            type: 'uint64',
            internalType: 'uint64',
          },
          {
            name: 'from',
            type: 'bytes',
            internalType: 'bytes',
          },
          {
            name: 'to',
            type: 'bytes',
            internalType: 'bytes',
          },
          {
            name: 'timeoutTimestamp',
            type: 'uint64',
            internalType: 'uint64',
          },
          {
            name: 'body',
            type: 'bytes',
            internalType: 'bytes',
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'onPostResponse',
    inputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct IIsmpModule.IncomingPostResponse',
        components: [
          {
            name: 'response',
            type: 'tuple',
            internalType: 'struct IIsmpModule.PostResponse',
            components: [
              {
                name: 'request',
                type: 'tuple',
                internalType: 'struct IIsmpModule.PostRequest',
                components: [
                  {
                    name: 'source',
                    type: 'bytes',
                    internalType: 'bytes',
                  },
                  {
                    name: 'dest',
                    type: 'bytes',
                    internalType: 'bytes',
                  },
                  {
                    name: 'nonce',
                    type: 'uint64',
                    internalType: 'uint64',
                  },
                  {
                    name: 'from',
                    type: 'bytes',
                    internalType: 'bytes',
                  },
                  {
                    name: 'to',
                    type: 'bytes',
                    internalType: 'bytes',
                  },
                  {
                    name: 'timeoutTimestamp',
                    type: 'uint64',
                    internalType: 'uint64',
                  },
                  {
                    name: 'body',
                    type: 'bytes',
                    internalType: 'bytes',
                  },
                ],
              },
              {
                name: 'response',
                type: 'bytes',
                internalType: 'bytes',
              },
              {
                name: 'timeoutTimestamp',
                type: 'uint64',
                internalType: 'uint64',
              },
            ],
          },
          {
            name: 'relayer',
            type: 'address',
            internalType: 'address',
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'onPostResponseTimeout',
    inputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct IIsmpModule.PostResponse',
        components: [
          {
            name: 'request',
            type: 'tuple',
            internalType: 'struct IIsmpModule.PostRequest',
            components: [
              {
                name: 'source',
                type: 'bytes',
                internalType: 'bytes',
              },
              {
                name: 'dest',
                type: 'bytes',
                internalType: 'bytes',
              },
              {
                name: 'nonce',
                type: 'uint64',
                internalType: 'uint64',
              },
              {
                name: 'from',
                type: 'bytes',
                internalType: 'bytes',
              },
              {
                name: 'to',
                type: 'bytes',
                internalType: 'bytes',
              },
              {
                name: 'timeoutTimestamp',
                type: 'uint64',
                internalType: 'uint64',
              },
              {
                name: 'body',
                type: 'bytes',
                internalType: 'bytes',
              },
            ],
          },
          {
            name: 'response',
            type: 'bytes',
            internalType: 'bytes',
          },
          {
            name: 'timeoutTimestamp',
            type: 'uint64',
            internalType: 'uint64',
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'outgoingNonce',
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
    name: 'pendingSatelliteDeposits',
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
    name: 'pendingWithdrawalRequests',
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
    name: 'pendingWithdrawals',
    inputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'chainId',
        type: 'bytes',
        internalType: 'bytes',
      },
      {
        name: 'withdrawer',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'sharesToBurn',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'nonce',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'registerPeer',
    inputs: [
      {
        name: 'chainId',
        type: 'bytes',
        internalType: 'bytes',
      },
      {
        name: 'moduleAddress',
        type: 'bytes',
        internalType: 'bytes',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'registeredPeers',
    inputs: [
      {
        name: '',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bytes',
        internalType: 'bytes',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'relayerFee',
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
    name: 'removePeer',
    inputs: [
      {
        name: 'chainId',
        type: 'bytes',
        internalType: 'bytes',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
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
    name: 'satelliteAssets',
    inputs: [
      {
        name: '',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
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
    name: 'satelliteChainCount',
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
    name: 'satelliteChains',
    inputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bytes',
        internalType: 'bytes',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'sendDepositAck',
    inputs: [
      {
        name: 'destChainId',
        type: 'bytes',
        internalType: 'bytes',
      },
      {
        name: 'depositNonce',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'globalTotalAssets',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'accepted',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'sendWithdrawFulfill',
    inputs: [
      {
        name: 'destChainId',
        type: 'bytes',
        internalType: 'bytes',
      },
      {
        name: '_withdrawNonce',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'amount',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'fullyFulfilled',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setFeeToken',
    inputs: [
      {
        name: '_feeToken',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setMasterVault',
    inputs: [
      {
        name: '_masterVault',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setRelayerFee',
    inputs: [
      {
        name: '_relayerFee',
        type: 'uint256',
        internalType: 'uint256',
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
    name: 'totalSatelliteAssets',
    inputs: [],
    outputs: [
      {
        name: 'total',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'unpause',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'withdrawNonce',
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
    type: 'event',
    name: 'AssetSyncBroadcast',
    inputs: [
      {
        name: 'globalTotalAssets',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'globalTotalShares',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'totalRemoteAssets',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'satelliteCount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'EmergencySyncBroadcast',
    inputs: [
      {
        name: 'paused',
        type: 'bool',
        indexed: false,
        internalType: 'bool',
      },
      {
        name: 'emergencyMode',
        type: 'bool',
        indexed: false,
        internalType: 'bool',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'FeeTokenUpdated',
    inputs: [
      {
        name: 'feeToken',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'MessageDispatched',
    inputs: [
      {
        name: 'commitment',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'dest',
        type: 'bytes',
        indexed: false,
        internalType: 'bytes',
      },
      {
        name: 'timeout',
        type: 'uint64',
        indexed: false,
        internalType: 'uint64',
      },
      {
        name: 'bodyLength',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'MessageReceived',
    inputs: [
      {
        name: 'source',
        type: 'bytes',
        indexed: false,
        internalType: 'bytes',
      },
      {
        name: 'nonce',
        type: 'uint64',
        indexed: false,
        internalType: 'uint64',
      },
      {
        name: 'bodyLength',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'MessageTimeout',
    inputs: [
      {
        name: 'dest',
        type: 'bytes',
        indexed: false,
        internalType: 'bytes',
      },
      {
        name: 'nonce',
        type: 'uint64',
        indexed: false,
        internalType: 'uint64',
      },
      {
        name: 'bodyLength',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
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
    name: 'PeerRegistered',
    inputs: [
      {
        name: 'chainId',
        type: 'bytes',
        indexed: false,
        internalType: 'bytes',
      },
      {
        name: 'moduleAddress',
        type: 'bytes',
        indexed: false,
        internalType: 'bytes',
      },
      {
        name: 'registered',
        type: 'bool',
        indexed: false,
        internalType: 'bool',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'RelayerFeeUpdated',
    inputs: [
      {
        name: 'relayerFee',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
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
    name: 'SatelliteDepositReceived',
    inputs: [
      {
        name: 'chainId',
        type: 'bytes',
        indexed: true,
        internalType: 'bytes',
      },
      {
        name: 'depositor',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'sharesMinted',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'nonce',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'SatelliteWithdrawRequested',
    inputs: [
      {
        name: 'chainId',
        type: 'bytes',
        indexed: true,
        internalType: 'bytes',
      },
      {
        name: 'withdrawer',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'sharesToBurn',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'nonce',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'StrategyReportBroadcast',
    inputs: [
      {
        name: 'strategyId',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'success',
        type: 'bool',
        indexed: false,
        internalType: 'bool',
      },
      {
        name: 'returnedAmount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'pnl',
        type: 'int256',
        indexed: false,
        internalType: 'int256',
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
    name: 'DepositNotAccepted',
    inputs: [
      {
        name: 'nonce',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'DispatchFailed',
    inputs: [
      {
        name: 'commitment',
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
    name: 'InsufficientBalance',
    inputs: [
      {
        name: 'available',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'requested',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'InsufficientFeeTokenBalance',
    inputs: [
      {
        name: 'required',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'available',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'MessageTooShort',
    inputs: [
      {
        name: 'length',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'minLength',
        type: 'uint256',
        internalType: 'uint256',
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
    name: 'UnauthorizedHost',
    inputs: [
      {
        name: 'caller',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'expected',
        type: 'address',
        internalType: 'address',
      },
    ],
  },
  {
    type: 'error',
    name: 'UnauthorizedSourceModule',
    inputs: [
      {
        name: 'from',
        type: 'bytes',
        internalType: 'bytes',
      },
    ],
  },
  {
    type: 'error',
    name: 'UnknownCrossChainMessage',
    inputs: [
      {
        name: 'messageType',
        type: 'uint8',
        internalType: 'uint8',
      },
    ],
  },
  {
    type: 'error',
    name: 'UnknownSourceChain',
    inputs: [
      {
        name: 'source',
        type: 'bytes',
        internalType: 'bytes',
      },
    ],
  },
  {
    type: 'error',
    name: 'ZeroDepositAmount',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ZeroHostAddress',
    inputs: [],
  },
] as const;
