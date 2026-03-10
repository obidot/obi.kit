// ── Bifrost Strategy Type Enum ──────────────────────────────────────────

/**
 * Bifrost DeFi strategy types matching the BifrostAdapter.sol contract.
 */
export enum BifrostStrategyType {
  MintVToken = 0,
  RedeemVToken = 1,
  DEXSwap = 2,
  FarmDeposit = 3,
  FarmWithdraw = 4,
  FarmClaim = 5,
  SALPContribute = 6,
}

// ── Bifrost Currency ID Enum ────────────────────────────────────────────

/**
 * Bifrost currency identifiers for SLP, DEX, and Farming operations.
 */
export enum BifrostCurrencyId {
  DOT = 0,
  vDOT = 1,
  KSM = 2,
  vKSM = 3,
  BNC = 4,
}

// ── Bifrost Strategy Labels ─────────────────────────────────────────────

/**
 * Human-readable labels for each Bifrost strategy type.
 */
export const BIFROST_STRATEGY_LABELS: Record<BifrostStrategyType, string> = {
  [BifrostStrategyType.MintVToken]: "Mint vToken (SLP)",
  [BifrostStrategyType.RedeemVToken]: "Redeem vToken (SLP)",
  [BifrostStrategyType.DEXSwap]: "DEX Swap",
  [BifrostStrategyType.FarmDeposit]: "Farm Deposit",
  [BifrostStrategyType.FarmWithdraw]: "Farm Withdraw",
  [BifrostStrategyType.FarmClaim]: "Farm Claim Rewards",
  [BifrostStrategyType.SALPContribute]: "SALP Contribute",
};

// ── Cross-Chain Message Types ───────────────────────────────────────────

/**
 * Cross-chain message types for ISMP (Hyperbridge) communication.
 */
export enum CrossChainMessageType {
  DEPOSIT_SYNC = 1,
  WITHDRAW_REQUEST = 2,
  ASSET_SYNC = 3,
  STRATEGY_REPORT = 4,
  EMERGENCY_SYNC = 5,
  DEPOSIT_ACK = 6,
  WITHDRAW_FULFILL = 7,
}

// ── Chain Configuration ─────────────────────────────────────────────────

/**
 * Configuration for connecting to a Polkadot-based chain.
 */
export interface ChainConfig {
  /** The WebSocket RPC endpoint URL (e.g. "wss://rpc.polkadot.io") */
  readonly endpoint: string;
  /** Optional chain name for display purposes */
  readonly name?: string;
  /** Optional chain ID / genesis hash */
  readonly chainId?: string;
  /** Optional SS58 address prefix */
  readonly ss58Prefix?: number;
}

/**
 * Represents a DeFi vault that agents can interact with.
 */
export interface VaultConfig {
  /** Unique identifier for the vault */
  readonly id: string;
  /** Human-readable vault name */
  readonly name: string;
  /** On-chain address of the vault contract or pallet */
  readonly address: string;
  /** The chain this vault lives on */
  readonly chain: ChainConfig;
  /** The asset denomination (e.g. "DOT", "GLMR") */
  readonly asset: string;
  /** Optional decimal precision of the vault's asset */
  readonly decimals?: number;
}

/**
 * Standardized result returned by all on-chain tool executions.
 */
export interface ToolResult<T = unknown> {
  /** Whether the operation succeeded */
  readonly success: boolean;
  /** Human-readable message describing the outcome */
  readonly message?: string;
  /** Error message if the operation failed */
  readonly error?: string;
  /** Optional typed data payload */
  readonly data?: T;
  /** Transaction hash if applicable */
  readonly txHash?: string;
  /** Block number the transaction was included in */
  readonly blockNumber?: number;
}

/**
 * Describes a vault action to be executed on-chain.
 */
export interface VaultAction {
  /** The type of action (e.g. "deposit", "withdraw") */
  readonly type: string;
  /** The vault address */
  readonly vaultAddress: string;
  /** The amount (as a string to preserve precision) */
  readonly amount: string;
  /** The asset identifier */
  readonly asset: string;
  /** The chain ID */
  readonly chainId?: string;
}

/**
 * Parameters for a vault deposit operation.
 */
export interface DepositParams {
  /** The vault to deposit into */
  readonly vaultId: string;
  /** The amount to deposit (as a string to preserve precision) */
  readonly amount: string;
  /** The depositor's account address */
  readonly sender: string;
}

/**
 * Parameters for a vault withdraw operation.
 */
export interface WithdrawParams {
  /** The vault to withdraw from */
  readonly vaultId: string;
  /** The amount to withdraw (as a string to preserve precision) */
  readonly amount: string;
  /** The recipient's account address */
  readonly recipient: string;
}

/**
 * Parameters for an XCM cross-chain transfer.
 */
export interface XcmTransferParams {
  /** Source chain configuration */
  readonly sourceChain: ChainConfig;
  /** Destination chain configuration */
  readonly destChain: ChainConfig;
  /** The asset to transfer */
  readonly asset: string;
  /** The amount to transfer (as a string to preserve precision) */
  readonly amount: string;
  /** The sender's account address on the source chain */
  readonly sender: string;
  /** The recipient's account address on the destination chain */
  readonly recipient: string;
}

/**
 * Represents the balance information for an account.
 */
export interface BalanceInfo {
  /** Free/available balance */
  readonly free: string;
  /** Reserved/locked balance */
  readonly reserved: string;
  /** Total balance (free + reserved) */
  readonly total: string;
  /** The asset denomination */
  readonly asset: string;
  /** Decimal precision */
  readonly decimals: number;
}

/**
 * Signer abstraction for submitting on-chain transactions.
 */
export interface TransactionSigner {
  /** The signer's on-chain address */
  readonly address: string;
  /** Sign and submit an extrinsic, returning the tx hash */
  signAndSend(extrinsic: unknown): Promise<string>;
}

/**
 * Registry for managing multiple vault configurations.
 */
export interface VaultRegistry {
  /** Register a new vault */
  register(vault: VaultConfig): void;
  /** Get a vault by its ID */
  get(vaultId: string): VaultConfig | undefined;
  /** List all registered vaults */
  list(): ReadonlyArray<VaultConfig>;
  /** Remove a vault by its ID */
  remove(vaultId: string): boolean;
}

/**
 * Agent configuration for initializing the Obidot Kit SDK.
 */
export interface AgentConfig {
  /** Default chain to connect to */
  readonly defaultChain: ChainConfig;
  /** Vaults the agent can interact with */
  readonly vaults: ReadonlyArray<VaultConfig>;
  /** Transaction signer */
  readonly signer: TransactionSigner;
  /** Optional LLM model name override */
  readonly modelName?: string;
  /** Optional API key for the LLM provider */
  readonly apiKey?: string;
}

// ── Satellite Vault Configuration ───────────────────────────────────────

/**
 * Configuration for a satellite vault deployed on a remote EVM chain.
 * Extends the base `VaultConfig` with cross-chain routing information.
 */
export interface SatelliteVaultConfig extends VaultConfig {
  /** Address of the hub vault on the main chain */
  readonly hubVaultAddress: string;
  /** Address of the CrossChainRouter contract */
  readonly routerAddress: string;
  /** JSON-RPC URL for the satellite EVM chain */
  readonly rpcUrl: string;
  /** EVM chain ID of the satellite chain */
  readonly evmChainId: number;
}

// ── Cross-Chain Vault State ─────────────────────────────────────────────

/**
 * Aggregated state across the hub vault and all satellite vaults.
 */
export interface CrossChainVaultState {
  /** Total assets held across all satellite vaults */
  readonly totalSatelliteAssets: bigint;
  /** Global total assets (hub + all satellites) */
  readonly globalTotalAssets: bigint;
  /** Global total shares across the entire vault system */
  readonly globalTotalShares: bigint;
  /** Per-satellite state keyed by chain name */
  readonly satelliteAssets: Map<string, SatelliteChainState>;
}

// ── Per-Satellite Chain State ───────────────────────────────────────────

/**
 * State of a single satellite vault on a remote chain.
 */
export interface SatelliteChainState {
  /** Human-readable name of the satellite chain */
  readonly chainName: string;
  /** Total assets held by this satellite vault */
  readonly totalAssets: bigint;
  /** Global total assets as reported by the satellite */
  readonly globalTotalAssets: bigint;
  /** Whether the satellite is in emergency mode */
  readonly emergencyMode: boolean;
  /** Unix timestamp of the last cross-chain sync */
  readonly lastSyncTimestamp: number;
  /** Whether the satellite vault is paused */
  readonly paused: boolean;
}

// ── Bifrost Yield Product ───────────────────────────────────────────────

/**
 * Information about a Bifrost yield product (SLP, DEX, Farming, SALP).
 */
export interface BifrostYieldProduct {
  /** Protocol name (e.g. "Bifrost") */
  readonly protocol: string;
  /** Product name (e.g. "vDOT Liquid Staking") */
  readonly product: string;
  /** Product category */
  readonly category: "SLP" | "DEX" | "Farming" | "SALP";
  /** Annual percentage yield */
  readonly apy: number;
  /** Input currency for the product */
  readonly currencyIn: BifrostCurrencyId;
  /** Output currency (if applicable, e.g. minting vDOT from DOT) */
  readonly currencyOut?: BifrostCurrencyId;
  /** Pool ID for farming/DEX operations */
  readonly poolId?: number;
  /** Whether the product is currently active */
  readonly isActive: boolean;
}

// ── Bifrost Protocol Config ─────────────────────────────────────────────

/**
 * Registry entry for a Bifrost protocol pallet.
 */
export interface BifrostProtocolConfig {
  /** Substrate pallet index */
  readonly palletIndex: number;
  /** Human-readable name */
  readonly name: string;
  /** Protocol identifier */
  readonly protocol: string;
}

// ── EVM Vault Configuration ────────────────────────────────────────────

/**
 * Configuration for connecting to the ObidotVault ERC-4626 contract
 * deployed on Polkadot Hub EVM.
 */
export interface EvmVaultConfig {
  /** The vault contract address on Polkadot Hub EVM */
  readonly vaultAddress: `0x${string}`;
  /** The underlying ERC-20 asset address */
  readonly assetAddress: `0x${string}`;
  /** JSON-RPC URL for the EVM chain */
  readonly rpcUrl: string;
  /** EVM chain ID (420420417 for Polkadot Hub Testnet) */
  readonly chainId: number;
  /** Asset decimals (default: 10 for DOT) */
  readonly decimals?: number;
  /** Optional OracleRegistry contract address */
  readonly oracleRegistryAddress?: `0x${string}`;
}

// ── Strategy Intent Types ──────────────────────────────────────────────

/**
 * On-chain strategy status matching the ObidotVault.StrategyStatus enum.
 */
export enum StrategyStatus {
  Pending = 0,
  Sent = 1,
  Executed = 2,
  Failed = 3,
}

/**
 * EIP-712 typed StrategyIntent for signing off-chain.
 */
export interface StrategyIntent {
  readonly asset: `0x${string}`;
  readonly amount: bigint;
  readonly minReturn: bigint;
  readonly maxSlippageBps: bigint;
  readonly deadline: bigint;
  readonly nonce: bigint;
  readonly xcmCall: `0x${string}`;
  readonly targetParachain: number;
  readonly targetProtocol: `0x${string}`;
}

/**
 * On-chain strategy record as returned by `strategies(uint256)`.
 */
export interface StrategyRecord {
  readonly status: StrategyStatus;
  readonly strategist: `0x${string}`;
  readonly amount: bigint;
  readonly minReturn: bigint;
  readonly targetParachain: number;
  readonly targetProtocol: `0x${string}`;
  readonly executedAt: bigint;
}

// ── Withdrawal Queue Types ─────────────────────────────────────────────

/**
 * On-chain withdrawal request as returned by `withdrawalRequests(uint256)`.
 */
export interface WithdrawalRequest {
  readonly owner: `0x${string}`;
  readonly shares: bigint;
  readonly assets: bigint;
  readonly claimableAt: bigint;
}

// ── Performance Types ──────────────────────────────────────────────────

/**
 * Vault performance summary as returned by `performanceSummary()`.
 */
export interface PerformanceSummary {
  readonly cumulativePnL: bigint;
  readonly highWaterMark: bigint;
  readonly performanceFeeBps: bigint;
  readonly feeTreasury: `0x${string}`;
}

/**
 * Per-protocol performance record as returned by `getProtocolPerformance()`.
 */
export interface ProtocolPerformanceRecord {
  readonly totalDeployed: bigint;
  readonly totalReturned: bigint;
  readonly executionCount: bigint;
  readonly successCount: bigint;
  readonly lastExecutedAt: bigint;
}

// ── DEX Aggregator Types (SwapRouter / SwapQuoter) ──────────────────────

/**
 * Pool type enum matching `ISwapRouter.PoolType` in the router contract.
 *
 * Each pool type has a corresponding adapter registered in SwapRouter.
 */
export enum PoolType {
  HydrationOmnipool = 0,
  AssetHubPair = 1,
  BifrostDEX = 2,
  Custom = 3,
}

/**
 * Human-readable labels for each pool type.
 */
export const POOL_TYPE_LABELS: Record<PoolType, string> = {
  [PoolType.HydrationOmnipool]: "Hydration Omnipool",
  [PoolType.AssetHubPair]: "AssetHub Pair",
  [PoolType.BifrostDEX]: "Bifrost DEX",
  [PoolType.Custom]: "Custom",
};

/**
 * A single swap route through a specific pool.
 * Matches `ISwapRouter.Route` struct.
 */
export interface Route {
  /** Which DEX/AMM type to use */
  readonly poolType: PoolType;
  /** The pool or adapter address to execute against */
  readonly pool: `0x${string}`;
  /** Input token address */
  readonly tokenIn: `0x${string}`;
  /** Output token address */
  readonly tokenOut: `0x${string}`;
  /** Pool fee in basis points (informational / for pool selection) */
  readonly feeBps: bigint;
  /** Pool-specific calldata (e.g. XCM encoding, pool params) */
  readonly data: `0x${string}`;
}

/**
 * Parameters for a single swap execution.
 * Matches `ISwapRouter.SwapParams` struct.
 */
export interface SwapParams {
  /** The route to execute */
  readonly route: Route;
  /** Amount of tokenIn to swap (exact-in) or 0 for transient */
  readonly amountIn: bigint;
  /** Minimum acceptable output (slippage protection) */
  readonly minAmountOut: bigint;
  /** Recipient of the output tokens */
  readonly to: `0x${string}`;
  /** Unix timestamp after which the swap reverts */
  readonly deadline: bigint;
}

/**
 * A split leg: fraction of input routed through a specific pool.
 * Matches `ISwapRouter.SplitLeg` struct.
 */
export interface SplitLeg {
  /** The pool route for this leg */
  readonly route: Route;
  /** Weight of this leg in basis points (all legs must sum to 10000) */
  readonly weight: bigint;
}

/**
 * Quote result from the SwapQuoter.
 * Matches `ISwapRouter.Quote` struct.
 */
export interface Quote {
  /** Which pool type produced this quote */
  readonly source: PoolType;
  /** The pool address */
  readonly pool: `0x${string}`;
  /** Fee tier in basis points */
  readonly feeBps: bigint;
  /** Input amount */
  readonly amountIn: bigint;
  /** Expected output amount */
  readonly amountOut: bigint;
}

// ── Universal Intent Types ──────────────────────────────────────────────

/**
 * Destination type enum matching `IntentTypes.DestType` in the router contract.
 *
 * - Native: XCMExecutor dispatches via the XCM precompile to a parachain
 * - Hyper: HyperExecutor dispatches via the Hyperbridge ISMP host
 */
export enum DestType {
  Native = 0,
  Hyper = 1,
}

/**
 * On-chain asset descriptor used in UniversalIntent.
 * Matches `IntentTypes.Asset` struct.
 */
export interface IntentAsset {
  /** The ERC-20 token address on the local chain */
  readonly token: `0x${string}`;
  /** Remote asset identifier (e.g. Hydration assetId, Uniswap pool fee tier) */
  readonly assetId: bigint;
}

/**
 * Routing destination for a UniversalIntent.
 * Matches `IntentTypes.Destination` struct.
 */
export interface Destination {
  /** Which transport layer to use */
  readonly destType: DestType;
  /** Target parachain ID (populated when destType == Native) */
  readonly paraId: number;
  /** Hyperbridge chain index (populated when destType == Hyper): 0=Ethereum, 1=Base, 2=Arbitrum */
  readonly chainId: number;
}

/**
 * Canonical intent struct signed by the off-chain AI strategist.
 * Matches `IntentTypes.UniversalIntent` struct.
 *
 * All amounts are normalised to 18 decimals.
 */
export interface UniversalIntent {
  /** The input asset being sold / deployed */
  readonly inAsset: IntentAsset;
  /** The expected output asset */
  readonly outAsset: IntentAsset;
  /** Amount of inAsset (18-decimal normalised) */
  readonly amount: bigint;
  /** Minimum acceptable amount of outAsset (slippage floor) */
  readonly minOut: bigint;
  /** Routing destination (Native XCM or Hyperbridge) */
  readonly dest: Destination;
  /** Protocol-specific payload (SCALE-encoded XCM or ABI-encoded calldata) */
  readonly calldata_: `0x${string}`;
  /** Per-strategist nonce for EIP-712 replay protection */
  readonly nonce: bigint;
  /** Unix timestamp after which this intent is invalid */
  readonly deadline: bigint;
}

// ── SwapRouter Configuration ────────────────────────────────────────────

/**
 * Configuration for connecting to the SwapRouter + SwapQuoter contracts.
 */
export interface SwapRouterConfig {
  /** The SwapRouter contract address */
  readonly routerAddress: `0x${string}`;
  /** The SwapQuoter contract address */
  readonly quoterAddress: `0x${string}`;
  /** Optional: registered pool adapter addresses keyed by PoolType */
  readonly adapters?: Partial<Record<PoolType, `0x${string}`>>;
}
