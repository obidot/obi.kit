import type { Tool } from '@langchain/core/tools';
import type {
  ChainConfig,
  EvmVaultConfig,
  ObiEvmContext,
  ObiPolkadotContext,
  SatelliteVaultConfig,
  SwapRouterConfig,
  ToolResult,
  TransactionSigner,
  VaultConfig,
} from '@obidot-kit/core';
import type { BifrostConfig, CrossChainConfig, ObiAgentApiConfig } from '@obidot-kit/llm';
import {
  BatchStrategyTool,
  BifrostStrategyTool,
  BifrostYieldTool,
  CrossChainRebalanceTool,
  CrossChainStateTool,
  ExecuteIntentTool,
  ExecuteLocalSwapTool,
  ObiAgentApi,
  OracleCheckTool,
  PerformanceTool,
  SwapExecuteTool,
  SwapMultiHopTool,
  SwapQuoteTool,
  VaultDepositTool,
  VaultStateTool,
  VaultWithdrawTool,
  WithdrawalQueueTool,
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

  /**
   * EVM context for the hub vault (Polkadot Hub EVM).
   * When provided with `evmVaultConfig`, enables real ERC-4626 vault
   * operations (deposit, withdraw, performance, oracle, withdrawal queue).
   */
  readonly hubEvmContext?: ObiEvmContext;

  /**
   * ObidotVault ERC-4626 configuration on Polkadot Hub EVM.
   * Required alongside `hubEvmContext` for live vault operations.
   */
  readonly evmVaultConfig?: EvmVaultConfig;

  /**
   * Optional SwapRouter/SwapQuoter configuration. When provided with
   * `hubEvmContext`, enables on-hub DEX aggregator tools (swap quote,
   * swap execute, multi-hop swap).
   */
  readonly swapRouterConfig?: SwapRouterConfig;
}

/**
 * High-level facade for the Obidot Kit SDK.
 *
 * Provides a unified API surface that combines `@obidot-kit/core` and
 * `@obidot-kit/llm` into a single, easy-to-use entry point.
 *
 * Supports three modes of operation:
 *
 * 1. **Offline / stub mode** — constructed with `chainConfig` only.
 *    Vault tools return "pending" stub results. Ideal for testing,
 *    prompt engineering, and offline development.
 *
 * 2. **EVM mode** — constructed with `hubEvmContext` + `evmVaultConfig`.
 *    All vault tools interact with the real ObidotVault ERC-4626 contract
 *    on Polkadot Hub EVM via viem. Supports deposits, withdrawals,
 *    withdrawal queue, batch strategies, performance metrics, and oracle checks.
 *
 * 3. **On-chain mode** — constructed with an `ObiPolkadotContext`.
 *    The full suite of Polkadot Agent Kit tools (balance, transfer,
 *    XCM, staking, identity, swap, etc.) is available alongside
 *    obi-kit vault tools, all wired to a live `PolkadotApi` and
 *    `PolkadotSigner`.
 *
 * @example
 * ```ts
 * // EVM mode — real ObidotVault interactions
 * import { ObiKit } from '@obidot-kit/sdk';
 * import { createEvmContext, polkadotHubTestnet, POLKADOT_HUB_TESTNET_RPC } from '@obidot-kit/core';
 * import { privateKeyToAccount } from 'viem/accounts';
 *
 * const account = privateKeyToAccount('0x...');
 * const hubCtx = createEvmContext({
 *   rpcUrl: POLKADOT_HUB_TESTNET_RPC,
 *   chain: polkadotHubTestnet,
 *   chainName: 'Polkadot Hub Testnet',
 *   account,
 * });
 *
 * const kit = new ObiKit({
 *   hubEvmContext: hubCtx,
 *   evmVaultConfig: {
 *     vaultAddress: '0x...',
 *     assetAddress: '0x...',
 *     rpcUrl: POLKADOT_HUB_TESTNET_RPC,
 *     chainId: 420420417,
 *   },
 * });
 *
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
  private hubEvmContext: ObiEvmContext | undefined;
  private evmVaultConfig: EvmVaultConfig | undefined;
  private swapRouterConfig: SwapRouterConfig | undefined;

  constructor(config: ObiKitConfig) {
    this.chainConfig = config.chainConfig;
    this.polkadotContext = config.polkadotContext;
    this.vaults = new Map();
    this.satellites = new Map();
    this.customTools = [];
    this.signer = config.signer;
    this.bifrostConfig = config.bifrostConfig;
    this.evmContexts = new Map(config.evmContexts ?? []);
    this.hubEvmContext = config.hubEvmContext;
    this.evmVaultConfig = config.evmVaultConfig;
    this.swapRouterConfig = config.swapRouterConfig;

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
   * In offline / EVM-only mode this is a no-op.
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

  getChainConfig(): ChainConfig | undefined {
    return this.chainConfig;
  }

  setChainConfig(config: ChainConfig): void {
    this.chainConfig = config;
  }

  isPakReady(): boolean {
    return this.agentApi?.isPakInitialised() ?? false;
  }

  // ── Polkadot context ─────────────────────────────────────────────────

  getPolkadotContext(): ObiPolkadotContext | undefined {
    return this.polkadotContext;
  }

  isOnChainMode(): boolean {
    return this.polkadotContext !== undefined;
  }

  /**
   * Returns `true` when the SDK has an EVM context for the hub vault.
   */
  isEvmMode(): boolean {
    return this.hubEvmContext !== undefined && this.evmVaultConfig !== undefined;
  }

  setPolkadotContext(ctx: ObiPolkadotContext): void {
    this.polkadotContext = ctx;
    this.rebuildAgentApi();
  }

  getAgentApi(): ObiAgentApi | undefined {
    return this.agentApi;
  }

  // ── EVM Vault configuration ──────────────────────────────────────────

  /**
   * Set or replace the hub EVM context and vault config for real
   * ObidotVault interactions.
   */
  setEvmVault(ctx: ObiEvmContext, config: EvmVaultConfig): void {
    this.hubEvmContext = ctx;
    this.evmVaultConfig = config;
  }

  getEvmVaultConfig(): EvmVaultConfig | undefined {
    return this.evmVaultConfig;
  }

  getHubEvmContext(): ObiEvmContext | undefined {
    return this.hubEvmContext;
  }

  // ── SwapRouter configuration ─────────────────────────────────────────

  /**
   * Register (or replace) the SwapRouter/SwapQuoter configuration.
   */
  registerSwapRouter(config: SwapRouterConfig): void {
    this.swapRouterConfig = config;
  }

  /**
   * Returns the current SwapRouter configuration, if set.
   */
  getSwapRouterConfig(): SwapRouterConfig | undefined {
    return this.swapRouterConfig;
  }

  /**
   * Convenience: get a swap quote from the SwapQuoter contract.
   *
   * Requires `hubEvmContext` and `swapRouterConfig.quoterAddress`.
   *
   * @param input - JSON string matching `SwapQuoteInput`
   * @returns Parsed `ToolResult` with quote data
   */
  async getSwapQuote(input: string): Promise<ToolResult> {
    return this.invokeTool('swap_quote', input);
  }

  /**
   * Convenience: execute a single-hop swap via the SwapRouter.
   *
   * Requires `hubEvmContext` and `swapRouterConfig.routerAddress`.
   *
   * @param input - JSON string matching `SwapExecuteInput`
   * @returns Parsed `ToolResult` with transaction hash
   */
  async executeSwap(input: string): Promise<ToolResult> {
    return this.invokeTool('swap_execute', input);
  }

  /**
   * Convenience: execute a multi-hop swap via the SwapRouter.
   *
   * Requires `hubEvmContext` and `swapRouterConfig.routerAddress`.
   *
   * @param input - JSON string matching `SwapMultiHopInput`
   * @returns Parsed `ToolResult` with transaction hash
   */
  async executeMultiHopSwap(input: string): Promise<ToolResult> {
    return this.invokeTool('swap_multi_hop', input);
  }

  /**
   * Convenience: execute a vault-routed on-hub swap with EIP-712 auth.
   *
   * Requires `hubEvmContext` and `evmVaultConfig`.
   *
   * @param input - JSON string matching `ExecuteLocalSwapInput`
   * @returns Parsed `ToolResult` with transaction hash
   */
  async executeLocalSwap(input: string): Promise<ToolResult> {
    return this.invokeTool('execute_local_swap', input);
  }

  /**
   * Convenience: execute a universal intent for cross-chain routing.
   *
   * Requires `hubEvmContext` and `evmVaultConfig`.
   *
   * @param input - JSON string matching `ExecuteIntentInput`
   * @returns Parsed `ToolResult` with transaction hash
   */
  async executeUniversalIntent(input: string): Promise<ToolResult> {
    return this.invokeTool('execute_intent', input);
  }

  /**
   * Returns the registered pool adapter addresses from `swapRouterConfig`,
   * or an empty record if none are configured.
   */
  getPoolAdapters(): Partial<Record<string, `0x${string}`>> {
    if (!this.swapRouterConfig?.adapters) {
      return {};
    }
    const result: Record<string, `0x${string}`> = {};
    for (const [poolType, addr] of Object.entries(this.swapRouterConfig.adapters)) {
      if (addr) {
        result[poolType] = addr;
      }
    }
    return result;
  }

  // ── Legacy signer ────────────────────────────────────────────────────

  /** @deprecated Prefer `getPolkadotContext()` for the `PolkadotSigner`. */
  getSigner(): TransactionSigner | undefined {
    return this.signer;
  }

  /** @deprecated Prefer `setPolkadotContext()` with a `PolkadotSigner`. */
  setSigner(signer: TransactionSigner): void {
    this.signer = signer;
  }

  // ── Vault registry ───────────────────────────────────────────────────

  registerVault(vault: VaultConfig): this {
    this.vaults.set(vault.id, vault);
    if (this.polkadotContext) {
      this.rebuildAgentApi();
    }
    return this;
  }

  removeVault(vaultId: string): boolean {
    const removed = this.vaults.delete(vaultId);
    if (removed && this.polkadotContext) {
      this.rebuildAgentApi();
    }
    return removed;
  }

  getVault(vaultId: string): VaultConfig | undefined {
    return this.vaults.get(vaultId);
  }

  listVaults(): ReadonlyArray<VaultConfig> {
    return Array.from(this.vaults.values());
  }

  // ── Satellite vault registry ─────────────────────────────────────────

  registerSatelliteVault(config: SatelliteVaultConfig): void {
    const key = config.chain.name ?? config.id;
    this.satellites.set(key, config);
    if (this.polkadotContext) {
      this.rebuildAgentApi();
    }
  }

  removeSatelliteVault(chainName: string): boolean {
    const removed = this.satellites.delete(chainName);
    if (removed && this.polkadotContext) {
      this.rebuildAgentApi();
    }
    return removed;
  }

  getSatelliteVaults(): SatelliteVaultConfig[] {
    return Array.from(this.satellites.values());
  }

  // ── EVM context management ───────────────────────────────────────────

  addEvmContext(chainName: string, ctx: ObiEvmContext): void {
    this.evmContexts.set(chainName, ctx);
    if (this.polkadotContext) {
      this.rebuildAgentApi();
    }
  }

  removeEvmContext(chainName: string): boolean {
    const removed = this.evmContexts.delete(chainName);
    if (removed && this.polkadotContext) {
      this.rebuildAgentApi();
    }
    return removed;
  }

  getEvmContexts(): Map<string, ObiEvmContext> {
    return new Map(this.evmContexts);
  }

  // ── Custom tools ─────────────────────────────────────────────────────

  addTool(tool: Tool): this {
    this.customTools.push(tool);
    return this;
  }

  // ── Bifrost tool accessors ───────────────────────────────────────────

  getBifrostTools(): Tool[] {
    if (this.agentApi) {
      return [...this.agentApi.getBifrostTools()] as Tool[];
    }
    return this.buildOfflineBifrostTools();
  }

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
   * In **EVM mode** this includes:
   * - EVM vault tools (deposit, withdraw, withdrawal queue, performance, oracle)
   * - Batch strategy tool
   * - Bifrost tools (if `bifrostConfig` is provided)
   * - Cross-chain tools (if satellites are registered)
   * - Any custom tools
   *
   * In **on-chain mode** this includes:
   * - All PAK tools + obi-kit vault + Bifrost + cross-chain + custom
   *
   * In **offline / stub mode** this includes:
   * - Stub vault tools + Bifrost + cross-chain + custom
   */
  getTools(): Tool[] {
    const tools: Tool[] = [];

    if (this.agentApi) {
      // On-chain mode: delegate to ObiAgentApi
      const allTools = this.agentApi.getAllTools();
      for (const t of allTools) {
        tools.push(t as unknown as Tool);
      }

      // Also add EVM-specific tools if hub EVM context is available
      tools.push(...this.buildEvmVaultTools());
    } else {
      // EVM mode or offline mode
      tools.push(...this.buildEvmVaultTools());

      // If no EVM tools were added, fall back to stub vault tools
      if (tools.length === 0 && this.vaults.size > 0) {
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

    // Append any custom tools
    tools.push(...this.customTools);

    return tools;
  }

  // ── Convenience methods ──────────────────────────────────────────────

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

  inspect(): Record<string, unknown> {
    return {
      mode: this.polkadotContext ? 'on-chain' : this.hubEvmContext ? 'evm' : 'offline',
      chainConfig: this.chainConfig,
      hasPolkadotContext: this.polkadotContext !== undefined,
      signerAddress: this.polkadotContext?.address ?? this.hubEvmContext?.account,
      hasEvmVault: this.hubEvmContext !== undefined && this.evmVaultConfig !== undefined,
      evmVaultAddress: this.evmVaultConfig?.vaultAddress,
      hasSwapRouter: this.swapRouterConfig !== undefined,
      swapRouterAddress: this.swapRouterConfig?.routerAddress,
      swapQuoterAddress: this.swapRouterConfig?.quoterAddress,
      poolAdapterCount: this.swapRouterConfig?.adapters ? Object.keys(this.swapRouterConfig.adapters).length : 0,
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
   * Builds EVM vault tools when `hubEvmContext` + `evmVaultConfig` are available.
   * Returns all vault-specific tools plus swap/intent tools when configured:
   * - VaultDepositTool (ERC-4626 deposit)
   * - VaultWithdrawTool (ERC-4626 withdraw/redeem)
   * - WithdrawalQueueTool (queue request/fulfill/cancel/status)
   * - BatchStrategyTool (batch executeStrategies)
   * - PerformanceTool (read-only performance metrics)
   * - OracleCheckTool (read-only oracle/circuit breaker status)
   * - SwapQuoteTool (read-only swap quotes, requires swapRouterConfig)
   * - SwapExecuteTool (single-hop swap, requires swapRouterConfig)
   * - SwapMultiHopTool (multi-hop swap, requires swapRouterConfig)
   * - ExecuteLocalSwapTool (vault-routed on-hub swap)
   * - ExecuteIntentTool (universal cross-chain intent)
   */
  private buildEvmVaultTools(): Tool[] {
    if (!this.hubEvmContext || !this.evmVaultConfig) {
      return [];
    }

    const tools: Tool[] = [
      new VaultStateTool({
        evmContext: this.hubEvmContext,
        vaultConfig: this.evmVaultConfig,
      }),
      new VaultDepositTool({
        evmContext: this.hubEvmContext,
        vaultConfig: this.evmVaultConfig,
      }),
      new VaultWithdrawTool({
        evmContext: this.hubEvmContext,
        vaultConfig: this.evmVaultConfig,
      }),
      new WithdrawalQueueTool({
        evmContext: this.hubEvmContext,
        vaultConfig: this.evmVaultConfig,
      }),
      new BatchStrategyTool({
        evmContext: this.hubEvmContext,
        vaultConfig: this.evmVaultConfig,
      }),
      new PerformanceTool({
        evmContext: this.hubEvmContext,
        vaultConfig: this.evmVaultConfig,
      }),
      new OracleCheckTool({
        evmContext: this.hubEvmContext,
        vaultConfig: this.evmVaultConfig,
      }),
      new ExecuteLocalSwapTool({
        evmContext: this.hubEvmContext,
        vaultConfig: this.evmVaultConfig,
      }),
      new ExecuteIntentTool({
        evmContext: this.hubEvmContext,
        vaultConfig: this.evmVaultConfig,
      }),
    ];

    // Add swap router tools when SwapRouter config is available
    if (this.swapRouterConfig) {
      tools.push(
        new SwapQuoteTool({
          evmContext: this.hubEvmContext,
          vaultConfig: this.evmVaultConfig,
          quoterAddress: this.swapRouterConfig.quoterAddress,
        }),
        new SwapExecuteTool({
          evmContext: this.hubEvmContext,
          vaultConfig: this.evmVaultConfig,
          routerAddress: this.swapRouterConfig.routerAddress,
          // Pass quoter for pre-flight slippage protection
          quoterAddress: this.swapRouterConfig.quoterAddress,
          slippageBps: 200, // 2% — matches SlippageGuard on-chain ceiling
        }),
        new SwapMultiHopTool({
          evmContext: this.hubEvmContext,
          vaultConfig: this.evmVaultConfig,
          routerAddress: this.swapRouterConfig.routerAddress,
        }),
      );
    }

    return tools;
  }

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
