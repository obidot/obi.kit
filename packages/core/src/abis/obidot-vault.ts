/**
 * ABI for the ObidotVault ERC-4626 smart contract on Polkadot Hub EVM.
 *
 * This is the primary vault contract supporting:
 * - ERC-4626 deposit/withdraw/mint/redeem
 * - EIP-712 signed strategy execution
 * - Withdrawal queue with timelock
 * - Batch strategy execution
 * - Performance tracking & fees
 * - Oracle price checking
 * - Policy engine (parachains, protocols, exposure caps)
 * - XCM cross-chain dispatch
 */
export const OBIDOT_VAULT_ABI = [
  // ── ERC-4626 Core ─────────────────────────────────────────────────────
  {
    type: 'function',
    name: 'deposit',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'mint',
    inputs: [
      { name: 'shares', type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [{ name: 'assets', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'withdraw',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'owner', type: 'address' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'redeem',
    inputs: [
      { name: 'shares', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'owner', type: 'address' },
    ],
    outputs: [{ name: 'assets', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  // ── ERC-4626 View Functions ───────────────────────────────────────────
  {
    type: 'function',
    name: 'asset',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalAssets',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalSupply',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'convertToShares',
    inputs: [{ name: 'assets', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'convertToAssets',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'previewDeposit',
    inputs: [{ name: 'assets', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'previewMint',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'previewWithdraw',
    inputs: [{ name: 'assets', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'previewRedeem',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'maxDeposit',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'maxMint',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'maxWithdraw',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'maxRedeem',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  // ── ERC-20 ────────────────────────────────────────────────────────────
  {
    type: 'function',
    name: 'name',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'symbol',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  // ── Strategy Execution ────────────────────────────────────────────────
  {
    type: 'function',
    name: 'executeStrategy',
    inputs: [
      {
        name: 'intent',
        type: 'tuple',
        components: [
          { name: 'asset', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'minReturn', type: 'uint256' },
          { name: 'maxSlippageBps', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'xcmCall', type: 'bytes' },
          { name: 'targetParachain', type: 'uint32' },
          { name: 'targetProtocol', type: 'address' },
        ],
      },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [{ name: 'strategyId', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'executeStrategies',
    inputs: [
      {
        name: 'intents',
        type: 'tuple[]',
        components: [
          { name: 'asset', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'minReturn', type: 'uint256' },
          { name: 'maxSlippageBps', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'xcmCall', type: 'bytes' },
          { name: 'targetParachain', type: 'uint32' },
          { name: 'targetProtocol', type: 'address' },
        ],
      },
      { name: 'signatures', type: 'bytes[]' },
    ],
    outputs: [{ name: 'strategyIds', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'reportStrategyOutcome',
    inputs: [
      { name: 'strategyId', type: 'uint256' },
      { name: 'success', type: 'bool' },
      { name: 'returnedAmount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  // ── Strategy Views ────────────────────────────────────────────────────
  {
    type: 'function',
    name: 'strategies',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [
      { name: 'status', type: 'uint8' },
      { name: 'strategist', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'minReturn', type: 'uint256' },
      { name: 'targetParachain', type: 'uint32' },
      { name: 'targetProtocol', type: 'address' },
      { name: 'executedAt', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'strategyCounter',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'nonces',
    inputs: [{ name: 'strategist', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'computeIntentDigest',
    inputs: [
      {
        name: 'intent',
        type: 'tuple',
        components: [
          { name: 'asset', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'minReturn', type: 'uint256' },
          { name: 'maxSlippageBps', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'xcmCall', type: 'bytes' },
          { name: 'targetParachain', type: 'uint32' },
          { name: 'targetProtocol', type: 'address' },
        ],
      },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
  },
  // ── Withdrawal Queue ──────────────────────────────────────────────────
  {
    type: 'function',
    name: 'requestWithdrawal',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [{ name: 'requestId', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'fulfillWithdrawal',
    inputs: [{ name: 'requestId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'cancelWithdrawal',
    inputs: [{ name: 'requestId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'withdrawalRequests',
    inputs: [{ name: 'requestId', type: 'uint256' }],
    outputs: [
      { name: 'owner', type: 'address' },
      { name: 'shares', type: 'uint256' },
      { name: 'assets', type: 'uint256' },
      { name: 'claimableAt', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getWithdrawalRequest',
    inputs: [{ name: 'requestId', type: 'uint256' }],
    outputs: [
      { name: 'owner', type: 'address' },
      { name: 'shares', type: 'uint256' },
      { name: 'assets', type: 'uint256' },
      { name: 'claimableAt', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'withdrawalCounter',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'withdrawalTimelock',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  // ── Performance & Fees ────────────────────────────────────────────────
  {
    type: 'function',
    name: 'performanceSummary',
    inputs: [],
    outputs: [
      { name: '_cumulativePnL', type: 'int256' },
      { name: '_highWaterMark', type: 'uint256' },
      { name: '_performanceFeeBps', type: 'uint256' },
      { name: '_feeTreasury', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'cumulativePnL',
    inputs: [],
    outputs: [{ name: '', type: 'int256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'highWaterMark',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'performanceFeeBps',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'feeTreasury',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  // ── Protocol Performance ──────────────────────────────────────────────
  {
    type: 'function',
    name: 'getProtocolPerformance',
    inputs: [{ name: 'protocol', type: 'address' }],
    outputs: [
      { name: 'totalDeployed', type: 'uint256' },
      { name: 'totalReturned', type: 'uint256' },
      { name: 'executionCount', type: 'uint256' },
      { name: 'successCount', type: 'uint256' },
      { name: 'lastExecutedAt', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  // ── Vault State ───────────────────────────────────────────────────────
  {
    type: 'function',
    name: 'idleAssets',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalRemoteAssets',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'depositCap',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'paused',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'emergencyMode',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  // ── Daily Loss / Policy ───────────────────────────────────────────────
  {
    type: 'function',
    name: 'dailyLossStatus',
    inputs: [],
    outputs: [
      { name: 'accumulated', type: 'uint256' },
      { name: 'maxAllowed', type: 'uint256' },
      { name: 'windowResetAt', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'allowedParachains',
    inputs: [{ name: 'parachainId', type: 'uint32' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'allowedTargets',
    inputs: [{ name: 'protocol', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  // ── Oracle ────────────────────────────────────────────────────────────
  {
    type: 'function',
    name: 'priceOracle',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'oracleRegistry',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isOracleFresh',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  // ── EIP-712 ───────────────────────────────────────────────────────────
  {
    type: 'function',
    name: 'DOMAIN_SEPARATOR',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'STRATEGY_INTENT_TYPEHASH',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
  },
  // ── Roles ─────────────────────────────────────────────────────────────
  {
    type: 'function',
    name: 'STRATEGIST_ROLE',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'KEEPER_ROLE',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'hasRole',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  // ── Global Accounting ─────────────────────────────────────────────────
  {
    type: 'function',
    name: 'globalTotalAssets',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'globalTotalShares',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  // ── Events ────────────────────────────────────────────────────────────
  {
    type: 'event',
    name: 'StrategyExecuted',
    inputs: [
      { name: 'strategyId', type: 'uint256', indexed: true },
      { name: 'strategist', type: 'address', indexed: true },
      { name: 'targetParachain', type: 'uint32', indexed: true },
      { name: 'targetProtocol', type: 'address', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'minReturn', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'StrategyOutcomeReported',
    inputs: [
      { name: 'strategyId', type: 'uint256', indexed: true },
      { name: 'newStatus', type: 'uint8', indexed: false },
      { name: 'returnedAmount', type: 'uint256', indexed: false },
      { name: 'pnl', type: 'int256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'WithdrawalQueued',
    inputs: [
      { name: 'requestId', type: 'uint256', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'shares', type: 'uint256', indexed: false },
      { name: 'assets', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'WithdrawalFulfilled',
    inputs: [
      { name: 'requestId', type: 'uint256', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'assets', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'WithdrawalCancelled',
    inputs: [
      { name: 'requestId', type: 'uint256', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'PerformanceFeeMinted',
    inputs: [
      { name: 'treasury', type: 'address', indexed: true },
      { name: 'feeShares', type: 'uint256', indexed: false },
    ],
  },
] as const;
