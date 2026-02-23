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
  [BifrostStrategyType.MintVToken]: 'Mint vToken (SLP)',
  [BifrostStrategyType.RedeemVToken]: 'Redeem vToken (SLP)',
  [BifrostStrategyType.DEXSwap]: 'DEX Swap',
  [BifrostStrategyType.FarmDeposit]: 'Farm Deposit',
  [BifrostStrategyType.FarmWithdraw]: 'Farm Withdraw',
  [BifrostStrategyType.FarmClaim]: 'Farm Claim Rewards',
  [BifrostStrategyType.SALPContribute]: 'SALP Contribute',
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
  readonly category: 'SLP' | 'DEX' | 'Farming' | 'SALP';
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
