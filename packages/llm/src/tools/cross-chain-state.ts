import { Tool } from '@langchain/core/tools';
import {
  type ChainConfig,
  type CrossChainVaultState,
  type ObiEvmContext,
  SATELLITE_VAULT_ABI,
  type SatelliteChainState,
  type SatelliteVaultConfig,
  type ToolResult,
} from '@obidot-kit/core';

/**
 * Input schema for the cross-chain state tool.
 */
export interface CrossChainStateInput {
  /** Optional: only fetch state for a specific satellite chain by name. */
  chainName?: string;
  /** Whether to include detailed per-satellite breakdown. Defaults to true. */
  includeDetails?: boolean;
}

/**
 * Options for constructing a `CrossChainStateTool`.
 */
export interface CrossChainStateToolOptions {
  /** Minimal chain metadata for the hub chain. */
  chainConfig?: ChainConfig;

  /** The hub vault contract address. */
  hubVaultAddress?: string;

  /** The CrossChainRouter contract address. */
  routerAddress?: string;

  /** Satellite vault configurations to query. */
  satellites?: ReadonlyArray<SatelliteVaultConfig>;

  /** EVM contexts keyed by chain name for reading satellite state. */
  evmContexts?: Map<string, ObiEvmContext>;

  /**
   * Optional override for fetching cross-chain state.
   * When provided, this function is called instead of the default
   * on-chain reads, enabling mock/stub usage.
   */
  fetchState?: (satellites: ReadonlyArray<SatelliteVaultConfig>, chainName?: string) => Promise<CrossChainVaultState>;
}

/**
 * LangChain tool that aggregates state from the hub vault and all
 * satellite vaults deployed across multiple EVM chains.
 *
 * In **stub mode** (no `evmContexts` or `fetchState`), the tool returns
 * a synthetic state summary based on the configured satellite list.
 *
 * In **live mode** (with `evmContexts` or a `fetchState` override), the
 * tool reads on-chain state from each satellite vault contract and
 * aggregates it into a unified `CrossChainVaultState`.
 *
 * @example
 * ```ts
 * import { CrossChainStateTool } from '@obidot-kit/llm';
 *
 * const tool = new CrossChainStateTool({
 *   satellites: [moonbeamSatellite, astarSatellite],
 * });
 *
 * const result = await tool.invoke('{}');
 * ```
 */
export class CrossChainStateTool extends Tool {
  name = 'fetch_cross_chain_state';

  description =
    'Read aggregated hub-plus-satellite vault state across the configured cross-chain deployment. ' +
    'This is a read-only inventory and health tool: use it for balances, paused/emergency flags, and ' +
    'last sync timestamps, not for route discovery or transaction execution. Input is optional JSON with ' +
    '"chainName" to filter to one satellite and "includeDetails" (boolean, default true) to include the ' +
    'per-satellite breakdown.';

  private readonly chainConfig: ChainConfig | undefined;
  private readonly hubVaultAddress: string | undefined;
  private readonly routerAddress: string | undefined;
  private readonly satellites: ReadonlyArray<SatelliteVaultConfig>;
  private readonly evmContexts: Map<string, ObiEvmContext>;
  private readonly fetchStateFn:
    | ((satellites: ReadonlyArray<SatelliteVaultConfig>, chainName?: string) => Promise<CrossChainVaultState>)
    | undefined;

  constructor(options: CrossChainStateToolOptions = {}) {
    super();
    this.chainConfig = options.chainConfig;
    this.hubVaultAddress = options.hubVaultAddress;
    this.routerAddress = options.routerAddress;
    this.satellites = options.satellites ?? [];
    this.evmContexts = options.evmContexts ?? new Map();
    this.fetchStateFn = options.fetchState;
  }

  protected async _call(input: string): Promise<string> {
    try {
      const parsed = this.parseInput(input);
      const state = await this.fetchCrossChainState(parsed.chainName);
      const result = this.formatResult(state, parsed.includeDetails ?? true);
      return JSON.stringify(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const result: ToolResult = {
        success: false,
        error: message,
      };
      return JSON.stringify(result);
    }
  }

  private parseInput(input: string): CrossChainStateInput {
    if (!input || input.trim() === '') {
      return {};
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch {
      throw new Error(`Invalid JSON input: ${input}`);
    }

    if (typeof parsed !== 'object' || parsed === null) {
      return {};
    }

    const obj = parsed as Record<string, unknown>;
    return {
      chainName: typeof obj['chainName'] === 'string' ? obj['chainName'] : undefined,
      includeDetails: typeof obj['includeDetails'] === 'boolean' ? obj['includeDetails'] : undefined,
    };
  }

  private async fetchCrossChainState(chainName?: string): Promise<CrossChainVaultState> {
    // If a custom fetch function is provided, use it
    if (this.fetchStateFn) {
      return this.fetchStateFn(this.satellites, chainName);
    }

    // Filter satellites if a specific chain was requested
    const targetSatellites = chainName
      ? this.satellites.filter((s) => s.chain.name?.toLowerCase() === chainName.toLowerCase())
      : this.satellites;

    if (targetSatellites.length === 0 && chainName) {
      throw new Error(
        `No satellite vault configured for chain "${chainName}". ` +
          `Available chains: ${this.satellites.map((s) => s.chain.name ?? s.id).join(', ') || 'none'}`,
      );
    }

    // Check if we have live EVM contexts for on-chain reads
    const hasLiveContexts = targetSatellites.some((s) => {
      const name = s.chain.name ?? s.id;
      return this.evmContexts.has(name);
    });

    if (hasLiveContexts) {
      return this.fetchLiveState(targetSatellites);
    }

    // Stub mode — return synthetic state
    return this.buildStubState(targetSatellites);
  }

  private async fetchLiveState(satellites: ReadonlyArray<SatelliteVaultConfig>): Promise<CrossChainVaultState> {
    const satelliteAssets = new Map<string, SatelliteChainState>();
    let totalSatelliteAssets = 0n;

    for (const sat of satellites) {
      const name = sat.chain.name ?? sat.id;
      const evmCtx = this.evmContexts.get(name);

      if (!evmCtx) {
        // No context for this satellite — include stub entry
        satelliteAssets.set(name, {
          chainName: name,
          totalAssets: 0n,
          globalTotalAssets: 0n,
          emergencyMode: false,
          lastSyncTimestamp: 0,
          paused: false,
        });
        continue;
      }

      try {
        // Read satellite vault state via viem
        const [localAssets, globalAssets, emergency, lastSync, paused] = await Promise.all([
          evmCtx.client.readContract({
            address: sat.address as `0x${string}`,
            abi: SATELLITE_VAULT_ABI,
            functionName: 'totalAssets',
          }) as Promise<bigint>,
          evmCtx.client.readContract({
            address: sat.address as `0x${string}`,
            abi: SATELLITE_VAULT_ABI,
            functionName: 'globalTotalAssets',
          }) as Promise<bigint>,
          evmCtx.client.readContract({
            address: sat.address as `0x${string}`,
            abi: SATELLITE_VAULT_ABI,
            functionName: 'emergencyMode',
          }) as Promise<boolean>,
          evmCtx.client.readContract({
            address: sat.address as `0x${string}`,
            abi: SATELLITE_VAULT_ABI,
            functionName: 'lastSyncTimestamp',
          }) as Promise<bigint>,
          evmCtx.client.readContract({
            address: sat.address as `0x${string}`,
            abi: SATELLITE_VAULT_ABI,
            functionName: 'paused',
          }) as Promise<boolean>,
        ]);

        const state: SatelliteChainState = {
          chainName: name,
          totalAssets: localAssets,
          globalTotalAssets: globalAssets,
          emergencyMode: emergency,
          lastSyncTimestamp: Number(lastSync),
          paused,
        };

        satelliteAssets.set(name, state);
        totalSatelliteAssets += localAssets;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to read satellite vault state on ${name}: ${errMsg}`);
      }
    }

    return {
      totalSatelliteAssets,
      globalTotalAssets: totalSatelliteAssets,
      globalTotalShares: 0n,
      satelliteAssets,
    };
  }

  private buildStubState(satellites: ReadonlyArray<SatelliteVaultConfig>): CrossChainVaultState {
    const satelliteAssets = new Map<string, SatelliteChainState>();
    let totalSatelliteAssets = 0n;

    for (const sat of satellites) {
      const name = sat.chain.name ?? sat.id;
      const stubAssets = 0n;

      satelliteAssets.set(name, {
        chainName: name,
        totalAssets: stubAssets,
        globalTotalAssets: 0n,
        emergencyMode: false,
        lastSyncTimestamp: 0,
        paused: false,
      });

      totalSatelliteAssets += stubAssets;
    }

    return {
      totalSatelliteAssets,
      globalTotalAssets: totalSatelliteAssets,
      globalTotalShares: 0n,
      satelliteAssets,
    };
  }

  private formatResult(state: CrossChainVaultState, includeDetails: boolean): ToolResult {
    const satelliteSummaries: Record<string, unknown>[] = [];

    if (includeDetails) {
      for (const [, chainState] of state.satelliteAssets) {
        satelliteSummaries.push({
          chainName: chainState.chainName,
          totalAssets: chainState.totalAssets.toString(),
          globalTotalAssets: chainState.globalTotalAssets.toString(),
          emergencyMode: chainState.emergencyMode,
          lastSyncTimestamp: chainState.lastSyncTimestamp,
          paused: chainState.paused,
        });
      }
    }

    return {
      success: true,
      data: {
        totalSatelliteAssets: state.totalSatelliteAssets.toString(),
        globalTotalAssets: state.globalTotalAssets.toString(),
        globalTotalShares: state.globalTotalShares.toString(),
        satelliteCount: state.satelliteAssets.size,
        hubVaultAddress: this.hubVaultAddress ?? 'not-configured',
        routerAddress: this.routerAddress ?? 'not-configured',
        ...(includeDetails ? { satellites: satelliteSummaries } : {}),
        mode: this.evmContexts.size > 0 ? 'on-chain' : 'stub',
      },
      message:
        `Cross-chain state aggregated across ${state.satelliteAssets.size} satellite(s). ` +
        `Global total assets: ${state.globalTotalAssets.toString()}.`,
    };
  }
}
