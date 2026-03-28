// AUTO-GENERATED — do not edit manually.
// Source: obi.router/out/ObidotVault.sol/ObidotVault.json (cross-chain subset)
// Router path: /home/harry-riddle/dev/github.com/obidot/obi.router
// Synced: 2026-03-28T07:01:46.127Z
//
// VAULT_CROSS_CHAIN_ABI — subset of ObidotVault ABI containing only the
// cross-chain broadcast/sync functions used by CrossChainRouter and satellites.

export const VAULT_CROSS_CHAIN_ABI = [
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
    name: 'AssetSyncBroadcasted',
    inputs: [
      {
        name: 'totalAssets',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'totalShares',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'remoteAssets',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'BifrostAdapterUpdated',
    inputs: [
      {
        name: 'newAdapter',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'BifrostStrategyExecuted',
    inputs: [
      {
        name: 'strategyId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'bifrostStrategyType',
        type: 'uint8',
        indexed: false,
        internalType: 'uint8',
      },
      {
        name: 'amount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'CrossChainRouterUpdated',
    inputs: [
      {
        name: 'newRouter',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'DailyLossThresholdUpdated',
    inputs: [
      {
        name: 'newThreshold',
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
    name: 'EmergencyModeToggled',
    inputs: [
      {
        name: 'enabled',
        type: 'bool',
        indexed: false,
        internalType: 'bool',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'ExecutorUpdated',
    inputs: [
      {
        name: 'newExecutor',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'ExposureCapUpdated',
    inputs: [
      {
        name: 'protocol',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
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
    name: 'HyperExecutorUpdated',
    inputs: [
      {
        name: 'newExecutor',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'IntentExecuted',
    inputs: [
      {
        name: 'messageId',
        type: 'uint64',
        indexed: true,
        internalType: 'uint64',
      },
      {
        name: 'strategist',
        type: 'address',
        indexed: true,
        internalType: 'address',
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
    name: 'LocalSwapExecuted',
    inputs: [
      {
        name: 'strategyId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'strategist',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'tokenIn',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
      {
        name: 'tokenOut',
        type: 'address',
        indexed: false,
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
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'OracleRegistryUpdated',
    inputs: [
      {
        name: 'newRegistry',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'OracleUpdated',
    inputs: [
      {
        name: 'newOracle',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'ParachainWhitelistUpdated',
    inputs: [
      {
        name: 'parachainId',
        type: 'uint32',
        indexed: true,
        internalType: 'uint32',
      },
      {
        name: 'allowed',
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
    name: 'PerformanceFeeMinted',
    inputs: [
      {
        name: 'treasury',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'feeShares',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'PerformanceFeeUpdated',
    inputs: [
      {
        name: 'newFeeBps',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'ProtocolWhitelistUpdated',
    inputs: [
      {
        name: 'protocol',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'allowed',
        type: 'bool',
        indexed: false,
        internalType: 'bool',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'RemoteAssetsAdjusted',
    inputs: [
      {
        name: 'oldValue',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'newValue',
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
    name: 'SatelliteAssetsUpdated',
    inputs: [
      {
        name: 'chainHash',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'amount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'newTotal',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'StrategyExecuted',
    inputs: [
      {
        name: 'strategyId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'strategist',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'targetParachain',
        type: 'uint32',
        indexed: true,
        internalType: 'uint32',
      },
      {
        name: 'targetProtocol',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'minReturn',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'StrategyOutcomeReported',
    inputs: [
      {
        name: 'strategyId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'newStatus',
        type: 'uint8',
        indexed: false,
        internalType: 'enum ObidotVault.StrategyStatus',
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
    name: 'SwapRouterUpdated',
    inputs: [
      {
        name: 'newRouter',
        type: 'address',
        indexed: true,
        internalType: 'address',
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
    name: 'WithdrawalCancelled',
    inputs: [
      {
        name: 'requestId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'owner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'WithdrawalFulfilled',
    inputs: [
      {
        name: 'requestId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
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
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'WithdrawalQueued',
    inputs: [
      {
        name: 'requestId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'owner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'shares',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'assets',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'WithdrawalTimelockUpdated',
    inputs: [
      {
        name: 'newTimelock',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'XcmExecutorUpdated',
    inputs: [
      {
        name: 'newExecutor',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'XcmWeightLimitsUpdated',
    inputs: [
      {
        name: 'maxRefTime',
        type: 'uint64',
        indexed: false,
        internalType: 'uint64',
      },
      {
        name: 'maxProofSize',
        type: 'uint64',
        indexed: false,
        internalType: 'uint64',
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
    name: 'ArrayLengthMismatch',
    inputs: [],
  },
  {
    type: 'error',
    name: 'AssetMismatch',
    inputs: [
      {
        name: 'expected',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'provided',
        type: 'address',
        internalType: 'address',
      },
    ],
  },
  {
    type: 'error',
    name: 'DailyLossThresholdBreached',
    inputs: [
      {
        name: 'currentLoss',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'additionalLoss',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'maxLoss',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'DeadlineExpired',
    inputs: [
      {
        name: 'deadline',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'currentTime',
        type: 'uint256',
        internalType: 'uint256',
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
    name: 'ExposureCapExceeded',
    inputs: [
      {
        name: 'protocol',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'currentExposure',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'amount',
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
    name: 'FeeTooHigh',
    inputs: [
      {
        name: 'feeBps',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'HyperExecutorNotSet',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InsufficientIdleBalance',
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
    name: 'InsufficientIdleForWithdrawal',
    inputs: [
      {
        name: 'available',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'required',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'IntentExpired',
    inputs: [
      {
        name: 'deadline',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'currentTime',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'IntentNonceMismatch',
    inputs: [
      {
        name: 'expected',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'provided',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'InvalidCap',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InvalidNonce',
    inputs: [
      {
        name: 'expected',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'provided',
        type: 'uint256',
        internalType: 'uint256',
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
    name: 'InvalidSignature',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InvalidStrategyStatus',
    inputs: [
      {
        name: 'strategyId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'current',
        type: 'uint8',
        internalType: 'enum ObidotVault.StrategyStatus',
      },
      {
        name: 'expected',
        type: 'uint8',
        internalType: 'enum ObidotVault.StrategyStatus',
      },
    ],
  },
  {
    type: 'error',
    name: 'NotWithdrawalOwner',
    inputs: [
      {
        name: 'requestId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'caller',
        type: 'address',
        internalType: 'address',
      },
    ],
  },
  {
    type: 'error',
    name: 'OracleDataInvalid',
    inputs: [
      {
        name: 'answer',
        type: 'int256',
        internalType: 'int256',
      },
      {
        name: 'updatedAt',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'OracleSlippageCheckFailed',
    inputs: [
      {
        name: 'minReturn',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'oracleMinimum',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'ParachainNotAllowed',
    inputs: [
      {
        name: 'parachainId',
        type: 'uint32',
        internalType: 'uint32',
      },
    ],
  },
  {
    type: 'error',
    name: 'ProtocolNotAllowed',
    inputs: [
      {
        name: 'protocol',
        type: 'address',
        internalType: 'address',
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
    name: 'SlippageTooHigh',
    inputs: [
      {
        name: 'maxSlippageBps',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'StrategyNotFound',
    inputs: [
      {
        name: 'strategyId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'SwapRouterNotSet',
    inputs: [],
  },
  {
    type: 'error',
    name: 'UnauthorisedStrategist',
    inputs: [
      {
        name: 'recovered',
        type: 'address',
        internalType: 'address',
      },
    ],
  },
  {
    type: 'error',
    name: 'UnauthorizedStrategist',
    inputs: [
      {
        name: 'recovered',
        type: 'address',
        internalType: 'address',
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
    name: 'WithdrawalNotClaimable',
    inputs: [
      {
        name: 'requestId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'claimableAt',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'WithdrawalNotFound',
    inputs: [
      {
        name: 'requestId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'XcmExecutorNotSet',
    inputs: [],
  },
  {
    type: 'error',
    name: 'XcmOverweight',
    inputs: [
      {
        name: 'estimatedRefTime',
        type: 'uint64',
        internalType: 'uint64',
      },
      {
        name: 'estimatedProofSize',
        type: 'uint64',
        internalType: 'uint64',
      },
      {
        name: 'maxRefTime',
        type: 'uint64',
        internalType: 'uint64',
      },
      {
        name: 'maxProofSize',
        type: 'uint64',
        internalType: 'uint64',
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
    name: 'ZeroAmount',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ZeroAmount',
    inputs: [],
  },
] as const;
