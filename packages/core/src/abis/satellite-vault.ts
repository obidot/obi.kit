// AUTO-GENERATED — do not edit manually.
// Source: obi.router/out/ObidotVaultEVM.sol/ObidotVaultEVM.json
// Router path: /home/harry-riddle/dev/github.com/obidot/obi.router
// Synced: 2026-03-15T03:21:57.622Z
//
// ObidotVaultEVM — satellite ERC-4626 vault on EVM chains (Ethereum/Arbitrum/Base).

export const SATELLITE_VAULT_ABI = [
  {
    type: 'constructor',
    inputs: [
      {
        name: '_asset',
        type: 'address',
        internalType: 'contract IERC20',
      },
      {
        name: '_ismpHost',
        type: 'address',
        internalType: 'address',
      },
      {
        name: '_hubChainId',
        type: 'bytes',
        internalType: 'bytes',
      },
      {
        name: '_hubRouterModule',
        type: 'bytes',
        internalType: 'bytes',
      },
      {
        name: '_chainIdentifier',
        type: 'bytes',
        internalType: 'bytes',
      },
      {
        name: '_depositCap',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_maxSyncAge',
        type: 'uint256',
        internalType: 'uint256',
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
    name: 'KEEPER_ROLE',
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
    name: 'allowance',
    inputs: [
      {
        name: 'owner',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'spender',
        type: 'address',
        internalType: 'address',
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
    name: 'approve',
    inputs: [
      {
        name: 'spender',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'value',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool',
      },
    ],
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
        internalType: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [
      {
        name: 'account',
        type: 'address',
        internalType: 'address',
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
    name: 'chainIdentifier',
    inputs: [],
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
    name: 'convertToAssets',
    inputs: [
      {
        name: 'shares',
        type: 'uint256',
        internalType: 'uint256',
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
    name: 'convertToShares',
    inputs: [
      {
        name: 'assets',
        type: 'uint256',
        internalType: 'uint256',
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
    name: 'decimals',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint8',
        internalType: 'uint8',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'deposit',
    inputs: [
      {
        name: 'assets',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'receiver',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'depositAcknowledged',
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
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'depositCap',
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
    name: 'depositSyncNonce',
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
    name: 'emergencyMode',
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
    name: 'enableEmergencyMode',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
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
    name: 'globalTotalAssets',
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
    name: 'globalTotalShares',
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
    name: 'hubChainId',
    inputs: [],
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
    name: 'hubRemoteAssets',
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
    name: 'hubRouterModule',
    inputs: [],
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
    name: 'idleAssets',
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
    name: 'isSyncFresh',
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
    name: 'lastSyncTimestamp',
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
    name: 'maxDeposit',
    inputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address',
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
    name: 'maxMint',
    inputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address',
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
    name: 'maxRedeem',
    inputs: [
      {
        name: 'owner',
        type: 'address',
        internalType: 'address',
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
    name: 'maxSyncAge',
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
    name: 'maxWithdraw',
    inputs: [
      {
        name: 'owner',
        type: 'address',
        internalType: 'address',
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
    name: 'mint',
    inputs: [
      {
        name: 'shares',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'receiver',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'name',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'string',
        internalType: 'string',
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
        name: 'fulfilled',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'previewDeposit',
    inputs: [
      {
        name: 'assets',
        type: 'uint256',
        internalType: 'uint256',
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
    name: 'previewMint',
    inputs: [
      {
        name: 'shares',
        type: 'uint256',
        internalType: 'uint256',
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
    name: 'previewRedeem',
    inputs: [
      {
        name: 'shares',
        type: 'uint256',
        internalType: 'uint256',
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
    name: 'previewWithdraw',
    inputs: [
      {
        name: 'assets',
        type: 'uint256',
        internalType: 'uint256',
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
    name: 'redeem',
    inputs: [
      {
        name: 'shares',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'receiver',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'owner',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
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
    name: 'setDepositCap',
    inputs: [
      {
        name: 'newCap',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setHubConfig',
    inputs: [
      {
        name: '_hubChainId',
        type: 'bytes',
        internalType: 'bytes',
      },
      {
        name: '_hubRouterModule',
        type: 'bytes',
        internalType: 'bytes',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setMaxSyncAge',
    inputs: [
      {
        name: 'newMaxAge',
        type: 'uint256',
        internalType: 'uint256',
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
        name: 'newFee',
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
    name: 'symbol',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'string',
        internalType: 'string',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalAssets',
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
    name: 'totalPendingWithdrawals',
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
    name: 'totalSupply',
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
    name: 'transfer',
    inputs: [
      {
        name: 'to',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'value',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'transferFrom',
    inputs: [
      {
        name: 'from',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'to',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'value',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool',
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
    type: 'function',
    name: 'withdraw',
    inputs: [
      {
        name: 'assets',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'receiver',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'owner',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'withdrawRequestNonce',
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
    name: 'Approval',
    inputs: [
      {
        name: 'owner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'spender',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'value',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'AssetSyncReceived',
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
        name: 'timestamp',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'Deposit',
    inputs: [
      {
        name: 'sender',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'owner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'assets',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'shares',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'DepositAckReceived',
    inputs: [
      {
        name: 'depositNonce',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'accepted',
        type: 'bool',
        indexed: false,
        internalType: 'bool',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'DepositCapUpdated',
    inputs: [
      {
        name: 'newCap',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'DepositSynced',
    inputs: [
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
    name: 'EmergencySyncReceived',
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
    name: 'RelayerFeeUpdated',
    inputs: [
      {
        name: 'newFee',
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
    name: 'StrategyReportReceived',
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
    name: 'Transfer',
    inputs: [
      {
        name: 'from',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'to',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'value',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
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
    type: 'event',
    name: 'Withdraw',
    inputs: [
      {
        name: 'sender',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'receiver',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'owner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'assets',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'shares',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'WithdrawalFulfilled',
    inputs: [
      {
        name: 'withdrawNonce',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'amount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'fullyFulfilled',
        type: 'bool',
        indexed: false,
        internalType: 'bool',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'WithdrawalRequested',
    inputs: [
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
    name: 'DepositCapExceeded',
    inputs: [
      {
        name: 'totalAfterDeposit',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'cap',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'ERC20InsufficientAllowance',
    inputs: [
      {
        name: 'spender',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'allowance',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'needed',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'ERC20InsufficientBalance',
    inputs: [
      {
        name: 'sender',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'balance',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'needed',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'ERC20InvalidApprover',
    inputs: [
      {
        name: 'approver',
        type: 'address',
        internalType: 'address',
      },
    ],
  },
  {
    type: 'error',
    name: 'ERC20InvalidReceiver',
    inputs: [
      {
        name: 'receiver',
        type: 'address',
        internalType: 'address',
      },
    ],
  },
  {
    type: 'error',
    name: 'ERC20InvalidSender',
    inputs: [
      {
        name: 'sender',
        type: 'address',
        internalType: 'address',
      },
    ],
  },
  {
    type: 'error',
    name: 'ERC20InvalidSpender',
    inputs: [
      {
        name: 'spender',
        type: 'address',
        internalType: 'address',
      },
    ],
  },
  {
    type: 'error',
    name: 'ERC4626ExceededMaxDeposit',
    inputs: [
      {
        name: 'receiver',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'assets',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'max',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'ERC4626ExceededMaxMint',
    inputs: [
      {
        name: 'receiver',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'shares',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'max',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'ERC4626ExceededMaxRedeem',
    inputs: [
      {
        name: 'owner',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'shares',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'max',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'ERC4626ExceededMaxWithdraw',
    inputs: [
      {
        name: 'owner',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'assets',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'max',
        type: 'uint256',
        internalType: 'uint256',
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
    name: 'InvalidCap',
    inputs: [],
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
    name: 'SyncDataStale',
    inputs: [
      {
        name: 'lastSync',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'maxAge',
        type: 'uint256',
        internalType: 'uint256',
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
    name: 'UnauthorizedSender',
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
    name: 'UnauthorizedSource',
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
    name: 'UnknownMessageType',
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
    name: 'WithdrawalPending',
    inputs: [
      {
        name: 'amount',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'ZeroAddress',
    inputs: [],
  },
] as const;
