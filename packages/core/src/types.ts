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
