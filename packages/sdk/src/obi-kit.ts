import type { Tool } from '@langchain/core/tools';
import type {
  ChainConfig,
  ObiEvmContext,
  ObiPolkadotContext,
  SatelliteVaultConfig,
  ToolResult,
  TransactionSigner,
  VaultConfig,
} from '@obidot-kit/core';
import type { BifrostConfig, CrossChainConfig, ObiAgentApiConfig } from '@obidot-kit/llm';
import {
  BifrostStrategyTool,
  BifrostYieldTool,
  CrossChainRebalanceTool,
  CrossChainStateTool,
  ObiAgentApi,
  VaultDepositTool,
  VaultWithdrawTool,
} from '@obidot-kit/llm';

/**
 * Configuration options for initializing the ObiKit SDK.
 */
export interface ObiKitConfig {
  /**
   * The chain configuration for on-chain interactions.
   * Required when `polkadotContext` is not provided (offline / stub mode).
   */
  readonly chainConfig?: ChainConfig;

  /**
   * Fully initialised Polkadot context (API client + signer + address).
   * When provided, the SDK is wired for real on-chain interactions using
   * the Polkadot Agent Kit infrastructure. `chainConfig` becomes optional.
   */
  readonly polkadotContext?: ObiPolkadotContext;

  /** Optional list of vaults available to the agent. */
  readonly vaults?: ReadonlyArray<VaultConfig>;

  /**
   * Optional transaction signer for submitting on-chain transactions.
   * @deprecated Prefer passing a `polkadotContext` which bundles a
   *   `PolkadotSigner` from `polkadot-api`.
   */
  readonly signer?: TransactionSigner;

  /**
   * Optional list of satellite vault configurations for cross-chain
   * vault operations.
   */
  readonly satellites?: ReadonlyArray<SatelliteVaultConfig>;

  /**
   * Optional Bifrost DeFi configuration. When provided, Bifrost yield
   * and strategy tools are automatically included in `getTools()`.
   */
  readonly bifrostConfig?: BifrostConfig;

  /**
   * Optional EVM contexts keyed by chain name. These are used by
   * cross-chain tools to read satellite vault state on remote EVM chains.
   */
  readonly evmContexts?: Map<string, ObiEvmContext>;
}

/**
 * High-level facade for the Obidot Kit SDK.
 *
 * Provides a unified API surface that combines `@obidot-kit/core` and
 * `@obidot-kit/llm` into a single, easy-to-use entry point.
 *
 * Supports two modes of operation:
 *
 * 1. **Offline / stub mode** — constructed with `chainConfig` only.
 *    Vault tools return "pending" stub results. Ideal for testing,
 *    prompt engineering, and offline development.
 *
 * 2. **On-chain mode** — constructed with an `ObiPolkadotContext`.
 *    The full suite of Polkadot Agent Kit tools (balance, transfer,
 *    XCM, staking, identity, swap, etc.) is available alongside
 *    obi-kit vault tools, all wired to a live `PolkadotApi` and
 *    `PolkadotSigner`.
 *
 * Additionally supports:
 *
 * - **Bifrost DeFi tools** — when `bifrostConfig` is provided, yield
 *   and strategy tools are automatically included.
 * - **Cross-chain tools** — when `satellites` are registered, state
 *   aggregation and rebalance tools are automatically included.
 *
 * @example
 * ```ts
 * // Offline mode
 * import { ObiKit } from '@obidot-kit/sdk';
 *
 * const kit = new ObiKit({
 *   chainConfig: { endpoint: 'wss://rpc.polkadot.io', chainId: 'polkadot' },
 * });
 * const tools = kit.getTools();
 * ```
 *
 * @example
 * ```ts
 * // On-chain mode with PAK integration
 * import { ObiKit } from '@obidot-kit/sdk';
 * import { createPolkadotContext } from '@obidot-kit/core';
 *
 * const ctx = await createPolkadotContext({
 *   signer,
 *   address: '5GrwvaEF...',
 *   allowedChains: ['polkadot'],
 * });
 *
 * const kit = new ObiKit({
 *   polkadotContext: ctx,
 *   vaults: [myVaultConfig],
 *   satellites: [moonbeamSatellite],
 *   bifrostConfig: {
 *     adapterAddress: '0x1234...',
 *     protocols: { slp: { palletIndex: 100, name: 'SLP', protocol: 'Bifrost' } },
 *   },
 * });
 *
 * // Get all tools (PAK + vault + Bifrost + cross-chain)
 * const tools = kit.getTools();
 * ```
 */
export class ObiKit {
  private chainConfig: ChainConfig | undefined;
  private polkadotContext: ObiPolkadotContext | undefined;
  private agentApi: ObiAgentApi | undefined;
  private readonly vaults: Map<string, VaultConfig>;
  private readonly satellites: Map<string, SatelliteVaultConfig>;
  private readonly customTools: Tool[];
  private signer: TransactionSigner | undefined;
  private bifrostConfig: BifrostConfig | undefined;
  private readonly evmContexts: Map<string, ObiEvmContext>;

  constructor(config: ObiKitConfig) {
    this.chainConfig = config.chainConfig;
    this.polkadotContext = config.polkadotContext;
    this.vaults = new Map();
    this.satellites = new Map();
    this.customTools = [];
    this.signer = config.signer;
    this.bifrostConfig = config.bifrostConfig;
    this.evmContexts = new Map(config.evmContexts ?? []);

    if (config.vaults) {
      for (const vault of config.vaults) {
        this.vaults.set(vault.id, vault);
      }
    }

    if (config.satellites) {
      for (const sat of config.satellites) {
        const key = sat.chain.name ?? sat.id;
        this.satellites.set(key, sat);
      }
    }

    // Build the ObiAgentApi shell when a live context is available.
    // PAK tools are loaded lazily via connect().
    if (this.polkadotContext) {
      this.rebuildAgentApi();
    }
  }

  // ── Lifecycle ────────────────────────────────────────────────────────

  /**
   * Lazily initialises the Polkadot Agent Kit tools.
   *
   * Call this **once** after construction (and `await` it) to load the
   * full PAK tool suite (balance, transfer, XCM, staking, identity,
   * swap, etc.) alongside the obi-kit vault tools.
   *
   * In offline / stub mode this is a no-op.
   *
   * @example
   * ```ts
   * const kit = new ObiKit({ polkadotContext: ctx, vaults: [myVault] });
   * await kit.connect();          // loads PAK tools
   * const tools = kit.getTools(); // PAK + vault tools
   * ```
   */
  async connect(): Promise<void> {
    if (this.agentApi) {
      await this.agentApi.init();
    }
  }

  /**
   * Gracefully disconnects all chain connections held by the Polkadot
   * context.
   *
   * After calling this method the SDK reverts to offline mode.
   */
  async disconnect(): Promise<void> {
    if (this.polkadotContext) {
      await this.polkadotContext.api.disconnect();
    }
  }

  // ── Chain configuration ──────────────────────────────────────────────

  /**
   * Returns the current chain configuration.
   * May be `undefined` when only a `polkadotContext` was supplied.
   */
  getChainConfig(): ChainConfig | undefined {
    return this.chainConfig;
  }

  /**
   * Update the chain configuration at runtime (e.g. switch networks).
   */
  setChainConfig(config: ChainConfig): void {
    this.chainConfig = config;
  }

  /**
   * Returns `true` when PAK tools have been successfully loaded via
   * {@link connect}.
   */
  isPakReady(): boolean {
    return this.agentApi?.isPakInitialised() ?? false;
  }

  // ── Polkadot context ─────────────────────────────────────────────────

  /**
   * Returns the Polkadot context, if one was provided.
   */
  getPolkadotContext(): ObiPolkadotContext | undefined {
    return this.polkadotContext;
  }

  /**
   * Returns `true` when the SDK is wired for real on-chain interactions.
   */
  isOnChainMode(): boolean {
    return this.polkadotContext !== undefined;
  }

  /**
   * Replace or set the Polkadot context at runtime.
   * This rebuilds the internal `ObiAgentApi` with the new context.
   *
   * **Note:** You must call {@link connect} again after this to load
   * PAK tools for the new context.
   */
  setPolkadotContext(ctx: ObiPolkadotContext): void {
    this.polkadotContext = ctx;
    this.rebuildAgentApi();
  }

  /**
   * Returns the ObiAgentApi instance, if the SDK is in on-chain mode.
   * Gives access to PAK tools, vault tools, and the underlying context.
   */
  getAgentApi(): ObiAgentApi | undefined {
    return this.agentApi;
  }

  // ── Legacy signer ────────────────────────────────────────────────────

  /**
   * The transaction signer, if one was provided.
   * @deprecated Prefer `getPolkadotContext()` for the `PolkadotSigner`.
   */
  getSigner(): TransactionSigner | undefined {
    return this.signer;
  }

  /**
   * Set or replace the transaction signer.
   * @deprecated Prefer `setPolkadotContext()` with a `PolkadotSigner`.
   */
  setSigner(signer: TransactionSigner): void {
    this.signer = signer;
  }

  // ── Vault registry ───────────────────────────────────────────────────

  /**
   * Register a vault so it is available to the agent.
   *
   * If in on-chain mode, the agent API is rebuilt to include the new
   * vault. **Note:** PAK tools are reset; call {@link connect} again
   * to reload them.
   */
  registerVault(vault: VaultConfig): this {
    this.vaults.set(vault.id, vault);
    if (this.polkadotContext) {
      this.rebuildAgentApi();
    }
    return this;
  }

  /**
   * Remove a previously registered vault.
   *
   * **Note:** In on-chain mode, PAK tools are reset. Call
   * {@link connect} again to reload them.
   */
  removeVault(vaultId: string): boolean {
    const removed = this.vaults.delete(vaultId);
    if (removed && this.polkadotContext) {
      this.rebuildAgentApi();
    }
    return removed;
  }

  /**
   * Get a vault by its ID.
   */
  getVault(vaultId: string): VaultConfig | undefined {
    return this.vaults.get(vaultId);
  }

  /**
   * List all registered vaults.
   */
  listVaults(): ReadonlyArray<VaultConfig> {
    return Array.from(this.vaults.values());
  }

  // ── Satellite vault registry ─────────────────────────────────────────

  /**
   * Register a satellite vault so it is available to cross-chain tools.
   *
   * If in on-chain mode, the agent API is rebuilt to include the new
   * satellite. **Note:** PAK tools are reset; call {@link connect}
   * again to reload them.
   */
  registerSatelliteVault(config: SatelliteVaultConfig): void {
    const key = config.chain.name ?? config.id;
    this.satellites.set(key, config);
    if (this.polkadotContext) {
      this.rebuildAgentApi();
    }
  }

  /**
   * Remove a previously registered satellite vault by chain name.
   *
   * **Note:** In on-chain mode, PAK tools are reset. Call
   * {@link connect} again to reload them.
   */
  removeSatelliteVault(chainName: string): boolean {
    const removed = this.satellites.delete(chainName);
    if (removed && this.polkadotContext) {
      this.rebuildAgentApi();
    }
    return removed;
  }

  /**
   * List all registered satellite vaults.
   */
  getSatelliteVaults(): SatelliteVaultConfig[] {
    return Array.from(this.satellites.values());
  }

  // ── EVM context management ───────────────────────────────────────────

  /**
   * Add an EVM context for a specific chain, enabling live on-chain
   * reads for satellite vaults deployed on that chain.
   */
  addEvmContext(chainName: string, ctx: ObiEvmContext): void {
    this.evmContexts.set(chainName, ctx);
    if (this.polkadotContext) {
      this.rebuildAgentApi();
    }
  }

  /**
   * Remove an EVM context by chain name.
   */
  removeEvmContext(chainName: string): boolean {
    const removed = this.evmContexts.delete(chainName);
    if (removed && this.polkadotContext) {
      this.rebuildAgentApi();
    }
    return removed;
  }

  /**
   * Returns all registered EVM contexts keyed by chain name.
   */
  getEvmContexts(): Map<string, ObiEvmContext> {
    return new Map(this.evmContexts);
  }

  // ── Custom tools ─────────────────────────────────────────────────────

  /**
   * Add a custom LangChain tool that will be included in `getTools()`.
   */
  addTool(tool: Tool): this {
    this.customTools.push(tool);
    return this;
  }

  // ── Bifrost tool accessors ───────────────────────────────────────────

  /**
   * Returns Bifrost-specific tools (yield fetching and strategy execution).
   *
   * In **on-chain mode** these come from the `ObiAgentApi`.
   * In **offline mode** they are created directly from `bifrostConfig`.
   *
   * Returns an empty array if no `bifrostConfig` was provided.
   */
  getBifrostTools(): Tool[] {
    if (this.agentApi) {
      return [...this.agentApi.getBifrostTools()] as Tool[];
    }
    return this.buildOfflineBifrostTools();
  }

  /**
   * Returns cross-chain-specific tools (state aggregation and rebalancing).
   *
   * In **on-chain mode** these come from the `ObiAgentApi`.
   * In **offline mode** they are created directly from satellite config.
   *
   * Returns an empty array if no satellites are configured.
   */
  getCrossChainTools(): Tool[] {
    if (this.agentApi) {
      return [...this.agentApi.getCrossChainTools()] as Tool[];
    }
    return this.buildOfflineCrossChainTools();
  }

  // ── Tool surface ─────────────────────────────────────────────────────

  /**
   * Returns all available tools.
   *
   * In **on-chain mode** this includes:
   * - All PAK tools (balance, transfer, XCM, staking, identity, swap, etc.)
   * - Obi-kit vault tools (deposit, withdraw) — if vaults are registered
   * - Bifrost tools (yield, strategy) — if `bifrostConfig` is provided
   * - Cross-chain tools (state, rebalance) — if satellites are registered
   * - Any custom tools added via `addTool()`
   *
   * In **offline / stub mode** this includes:
   * - Stub vault tools (deposit, withdraw) — if vaults are registered
   * - Bifrost tools — if `bifrostConfig` is provided
   * - Cross-chain tools — if satellites are registered
   * - Any custom tools added via `addTool()`
   */
  getTools(): Tool[] {
    const tools: Tool[] = [];

    if (this.agentApi) {
      // On-chain mode: delegate to ObiAgentApi for PAK + vault + Bifrost + cross-chain tools
      const allTools = this.agentApi.getAllTools();
      for (const t of allTools) {
        tools.push(t as unknown as Tool);
      }
    } else {
      // Offline / stub mode: create stub vault tools
      if (this.vaults.size > 0) {
        const opts = this.chainConfig
          ? { chainConfig: this.chainConfig }
          : { chainConfig: { endpoint: 'not-connected' } as ChainConfig };

        tools.push(new VaultDepositTool(opts));
        tools.push(new VaultWithdrawTool(opts));
      }

      // Offline Bifrost tools
      tools.push(...this.buildOfflineBifrostTools());

      // Offline cross-chain tools
      tools.push(...this.buildOfflineCrossChainTools());
    }

    // Append any custom tools the user registered
    tools.push(...this.customTools);

    return tools;
  }

  // ── Convenience methods ──────────────────────────────────────────────

  /**
   * Convenience method to invoke a single tool by name with the given input.
   *
   * @param toolName - The name of the tool to invoke.
   * @param input - The input string (typically JSON) for the tool.
   * @returns The parsed `ToolResult` from the tool execution.
   */
  async invokeTool(toolName: string, input: string): Promise<ToolResult> {
    const tools = this.getTools();
    const tool = tools.find((t) => t.name === toolName);
    if (!tool) {
      return {
        success: false,
        message: `Tool "${toolName}" not found. Available tools: ${tools.map((t) => t.name).join(', ')}`,
      };
    }

    const raw = await tool.invoke(input);
    try {
      return JSON.parse(typeof raw === 'string' ? raw : String(raw)) as ToolResult;
    } catch {
      return {
        success: true,
        message: typeof raw === 'string' ? raw : String(raw),
      };
    }
  }

  /**
   * Returns a summary of the current SDK configuration for debugging.
   */
  inspect(): Record<string, unknown> {
    return {
      mode: this.polkadotContext ? 'on-chain' : 'offline',
      chainConfig: this.chainConfig,
      hasPolkadotContext: this.polkadotContext !== undefined,
      signerAddress: this.polkadotContext?.address,
      vaultCount: this.vaults.size,
      vaultIds: Array.from(this.vaults.keys()),
      satelliteCount: this.satellites.size,
      satelliteChains: Array.from(this.satellites.keys()),
      hasBifrostConfig: this.bifrostConfig !== undefined,
      evmContextCount: this.evmContexts.size,
      evmContextChains: Array.from(this.evmContexts.keys()),
      customToolCount: this.customTools.length,
      customToolNames: this.customTools.map((t) => t.name),
      hasLegacySigner: this.signer !== undefined,
      totalToolCount: this.getTools().length,
    };
  }

  // ── Internal helpers ─────────────────────────────────────────────────

  /**
   * (Re)builds the internal `ObiAgentApi` using the current polkadot
   * context, vault registry, satellite registry, and Bifrost config.
   */
  private rebuildAgentApi(): void {
    if (!this.polkadotContext) {
      this.agentApi = undefined;
      return;
    }

    const satelliteArray = Array.from(this.satellites.values());

    const crossChainConfig: CrossChainConfig | undefined =
      satelliteArray.length > 0
        ? {
            hubVaultAddress: satelliteArray[0]?.hubVaultAddress ?? '',
            routerAddress: satelliteArray[0]?.routerAddress ?? '',
            satellites: satelliteArray,
            evmContexts: this.evmContexts.size > 0 ? this.evmContexts : undefined,
          }
        : undefined;

    const apiConfig: ObiAgentApiConfig = {
      polkadotContext: this.polkadotContext,
      vaults: Array.from(this.vaults.values()),
      bifrostConfig: this.bifrostConfig,
      crossChainConfig,
    };

    this.agentApi = new ObiAgentApi(apiConfig);
  }

  /**
   * Builds Bifrost tools for offline / stub mode.
   */
  private buildOfflineBifrostTools(): Tool[] {
    if (!this.bifrostConfig) {
      return [];
    }

    return [
      new BifrostYieldTool({
        provider: {
          fetchYields: this.bifrostConfig.fetchYields,
          protocols: this.bifrostConfig.protocols,
        },
      }),
      new BifrostStrategyTool({
        strategyService: this.bifrostConfig.strategyService,
        adapterAddress: this.bifrostConfig.adapterAddress,
        protocols: this.bifrostConfig.protocols,
      }),
    ];
  }

  /**
   * Builds cross-chain tools for offline / stub mode.
   */
  private buildOfflineCrossChainTools(): Tool[] {
    if (this.satellites.size === 0) {
      return [];
    }

    const satelliteArray = Array.from(this.satellites.values());
    const chainConfig = this.chainConfig;

    return [
      new CrossChainStateTool({
        chainConfig,
        hubVaultAddress: satelliteArray[0]?.hubVaultAddress,
        routerAddress: satelliteArray[0]?.routerAddress,
        satellites: satelliteArray,
        evmContexts: this.evmContexts.size > 0 ? this.evmContexts : undefined,
      }),
      new CrossChainRebalanceTool({
        chainConfig,
        hubVaultAddress: satelliteArray[0]?.hubVaultAddress,
        routerAddress: satelliteArray[0]?.routerAddress,
        satellites: satelliteArray,
      }),
    ];
  }
}
