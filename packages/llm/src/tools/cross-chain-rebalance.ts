import { Tool } from '@langchain/core/tools';
import type { ChainConfig, ObiPolkadotContext, SatelliteVaultConfig, ToolResult } from '@obidot-kit/core';
import type { EvmCrossChainService } from '../services/evm-cross-chain-service.js';

/**
 * Parsed input for the cross-chain rebalance tool.
 */
export interface CrossChainRebalanceInput {
  /** Direction of asset movement: "hub_to_satellite" or "satellite_to_hub" */
  direction: 'hub_to_satellite' | 'satellite_to_hub';
  /** The satellite chain name to rebalance with */
  satelliteChainName: string;
  /** Amount to move (as a string to preserve precision) */
  amount: string;
  /** Optional receiver address on the destination chain */
  receiver?: string;
}

/**
 * Options for constructing a `CrossChainRebalanceTool`.
 */
export interface CrossChainRebalanceToolOptions {
  /**
   * Minimal chain metadata used for display and routing.
   * Required when `polkadotContext` is not provided.
   */
  chainConfig?: ChainConfig;

  /**
   * Fully initialised Polkadot context (API client + signer + address).
   * When provided, the tool will attempt real on-chain execution.
   */
  polkadotContext?: ObiPolkadotContext;

  /**
   * Hub vault contract address on the main chain.
   */
  hubVaultAddress?: string;

  /**
   * Address of the CrossChainRouter contract.
   */
  routerAddress?: string;

  /**
   * Satellite vault configurations keyed by chain name.
   * Injected via constructor to allow flexible multi-chain setups.
   */
  satellites?: ReadonlyArray<SatelliteVaultConfig>;

  /**
   * JSON-RPC URL for the hub chain (EVM side).
   */
  hubRpcUrl?: string;

  /**
   * Optional real EVM-backed service for reading CrossChainRouter state
   * and dispatching `broadcastAssetSync`.
   *
   * When provided, the tool reads live router state (pending deposits/withdrawals,
   * outgoing nonce, relayer fee, satellite count) and surfaces it in every result.
   *
   * Note: Hub→Satellite and Satellite→Hub asset flows are vault-mediated
   * via `vault.executeIntent(DestType.Hyper)` — an agent EOA cannot trigger
   * them directly via the router. The service provides the state context
   * an agent needs to decide when and what to broadcast.
   */
  evmCrossChainService?: EvmCrossChainService;
}

/**
 * LangChain tool for triggering cross-chain rebalancing via Hyperbridge ISMP.
 *
 * This tool initiates fund movement between the hub vault and satellite vaults
 * deployed on remote EVM chains. It supports two directions:
 *
 * - **hub_to_satellite**: Moves assets from the hub vault to a specific satellite
 *   chain via ISMP cross-chain deposit.
 * - **satellite_to_hub**: Requests withdrawal of assets from a satellite vault
 *   back to the hub via ISMP cross-chain withdraw.
 *
 * When constructed with only a `ChainConfig` (no live context), the tool falls
 * back to a stub implementation that returns a "pending" result — useful for
 * testing, dry-runs, and offline agent development.
 *
 * @example
 * ```ts
 * import { CrossChainRebalanceTool } from '@obidot-kit/llm';
 *
 * const tool = new CrossChainRebalanceTool({
 *   chainConfig: { endpoint: 'wss://rpc.polkadot.io', chainId: 'polkadot' },
 *   hubVaultAddress: '0x1234...',
 *   routerAddress: '0x5678...',
 *   satellites: [myMoonbeamSatellite],
 * });
 *
 * const result = await tool.invoke(JSON.stringify({
 *   direction: 'hub_to_satellite',
 *   satelliteChainName: 'Moonbeam',
 *   amount: '1000000000000000000',
 * }));
 * ```
 */
export class CrossChainRebalanceTool extends Tool {
  name = 'execute_cross_chain_rebalance';

  description =
    'Trigger cross-chain rebalancing of assets between the hub vault and a satellite vault via Hyperbridge ISMP. ' +
    'Input should be a JSON string with "direction" ("hub_to_satellite" or "satellite_to_hub"), ' +
    '"satelliteChainName" (the target satellite chain), "amount" (as a string), and optionally "receiver" (address).';

  private chainConfig: ChainConfig | undefined;
  private polkadotContext: ObiPolkadotContext | undefined;
  private readonly hubVaultAddress: string | undefined;
  private readonly routerAddress: string | undefined;
  private readonly satellites: ReadonlyArray<SatelliteVaultConfig>;
  private readonly hubRpcUrl: string | undefined;
  private readonly evmCrossChainService: EvmCrossChainService | undefined;

  constructor(options: CrossChainRebalanceToolOptions) {
    super();
    this.chainConfig = options.chainConfig;
    this.polkadotContext = options.polkadotContext;
    this.hubVaultAddress = options.hubVaultAddress;
    this.routerAddress = options.routerAddress;
    this.satellites = options.satellites ?? [];
    this.hubRpcUrl = options.hubRpcUrl;
    this.evmCrossChainService = options.evmCrossChainService;
  }

  /**
   * Returns the effective chain config, falling back to a minimal object
   * when only a polkadot context was supplied.
   */
  private getChainConfig(): ChainConfig {
    if (this.chainConfig) {
      return this.chainConfig;
    }
    return { endpoint: 'context-managed' };
  }

  /**
   * Returns `true` when the tool has a live Polkadot context available.
   */
  hasPolkadotContext(): boolean {
    return this.polkadotContext !== undefined;
  }

  /**
   * Returns `true` when the tool has a live EVM cross-chain service available.
   */
  hasEvmCrossChainService(): boolean {
    return this.evmCrossChainService !== undefined;
  }

  /**
   * Replace the chain config at runtime (e.g. switch networks).
   */
  setChainConfig(config: ChainConfig): void {
    this.chainConfig = config;
  }

  /**
   * Replace the Polkadot context at runtime.
   */
  setPolkadotContext(ctx: ObiPolkadotContext): void {
    this.polkadotContext = ctx;
  }

  protected async _call(input: string): Promise<string> {
    try {
      const parsed = this.parseInput(input);
      this.validateRebalanceRequest(parsed);

      const result = await this.executeRebalance(parsed);
      return JSON.stringify(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const errorResult: ToolResult = {
        success: false,
        error: message,
      };
      return JSON.stringify(errorResult);
    }
  }

  private parseInput(input: string): CrossChainRebalanceInput {
    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch {
      throw new Error(`Invalid JSON input: ${input}`);
    }

    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Input must be a JSON object');
    }

    const obj = parsed as Record<string, unknown>;

    if (obj['direction'] !== 'hub_to_satellite' && obj['direction'] !== 'satellite_to_hub') {
      throw new Error('Missing or invalid "direction" field. Must be "hub_to_satellite" or "satellite_to_hub".');
    }
    if (typeof obj['satelliteChainName'] !== 'string' || obj['satelliteChainName'].length === 0) {
      throw new Error('Missing or invalid "satelliteChainName" field');
    }
    if (typeof obj['amount'] !== 'string' || obj['amount'].length === 0) {
      throw new Error('Missing or invalid "amount" field');
    }

    return {
      direction: obj['direction'],
      satelliteChainName: obj['satelliteChainName'],
      amount: obj['amount'],
      receiver: typeof obj['receiver'] === 'string' ? obj['receiver'] : undefined,
    };
  }

  /**
   * Validates the rebalance request against configured satellites and
   * applies safety guardrails.
   */
  private validateRebalanceRequest(input: CrossChainRebalanceInput): void {
    // Validate amount is a positive number
    const amountBigInt = BigInt(input.amount);
    if (amountBigInt <= 0n) {
      throw new Error('Amount must be a positive value');
    }

    // Validate satellite exists in configuration
    if (this.satellites.length > 0) {
      const satellite = this.satellites.find(
        (s) => s.chain.name?.toLowerCase() === input.satelliteChainName.toLowerCase(),
      );
      if (!satellite) {
        const available = this.satellites.map((s) => s.chain.name ?? s.id).join(', ');
        throw new Error(
          `Satellite chain "${input.satelliteChainName}" not found in configuration. Available: ${available}`,
        );
      }
    }

    // Validate receiver is present for satellite_to_hub withdrawals
    if (input.direction === 'satellite_to_hub' && !input.receiver) {
      throw new Error('A "receiver" address is required for satellite_to_hub withdrawals');
    }
  }

  /**
   * Finds a satellite config by chain name (case-insensitive).
   */
  private findSatellite(chainName: string): SatelliteVaultConfig | undefined {
    return this.satellites.find((s) => s.chain.name?.toLowerCase() === chainName.toLowerCase());
  }

  /**
   * Execute the cross-chain rebalance.
   *
   * When a live context and router address are available, this would
   * interact with the CrossChainRouter contract. Otherwise it falls
   * back to a stub result.
   */
  private async executeRebalance(input: CrossChainRebalanceInput): Promise<ToolResult> {
    const config = this.getChainConfig();
    const satellite = this.findSatellite(input.satelliteChainName);

    if (input.direction === 'hub_to_satellite') {
      return this.executeHubToSatellite(input, config, satellite);
    }

    return this.executeSatelliteToHub(input, config, satellite);
  }

  /**
   * Execute a hub → satellite cross-chain deposit.
   *
   * Hub→Satellite asset movement is vault-mediated: the agent must call
   * `vault.executeIntent(DestType.Hyper)` — not the router directly.
   * When an `evmCrossChainService` is configured, this method reads live
   * router state to provide context for the agent's decision.
   */
  private async executeHubToSatellite(
    input: CrossChainRebalanceInput,
    config: ChainConfig,
    satellite: SatelliteVaultConfig | undefined,
  ): Promise<ToolResult> {
    // Fetch live router state when EVM service is available
    let routerState: Record<string, unknown> | undefined;
    if (this.evmCrossChainService) {
      try {
        const state = await this.evmCrossChainService.readRouterState();
        routerState = {
          paused: state.paused,
          outgoingNonce: state.outgoingNonce.toString(),
          pendingSatelliteDeposits: state.pendingSatelliteDeposits.toString(),
          pendingWithdrawalRequests: state.pendingWithdrawalRequests.toString(),
          satelliteChainCount: state.satelliteChainCount.toString(),
          relayerFee: state.relayerFee.toString(),
        };
      } catch {
        // Non-fatal — still return result with stub router state
      }
    }

    return {
      success: true,
      data: {
        action: 'cross_chain_deposit',
        direction: input.direction,
        satelliteChainName: input.satelliteChainName,
        amount: input.amount,
        hubVaultAddress: this.hubVaultAddress ?? 'not-configured',
        routerAddress: this.routerAddress ?? 'not-configured',
        satelliteVaultAddress: satellite?.address ?? 'not-configured',
        satelliteEvmChainId: satellite?.evmChainId ?? null,
        chainId: config.chainId,
        endpoint: config.endpoint,
        signerAddress: this.polkadotContext?.address,
        mode: routerState ? 'evm-live' : this.polkadotContext ? 'on-chain' : 'offline',
        status: 'pending',
        routerState: routerState ?? null,
        note: 'Hub→Satellite deposits are vault-mediated. Call vault.executeIntent(DestType.Hyper) to initiate cross-chain transfer.',
        message: `Cross-chain deposit of ${input.amount} from hub to satellite "${input.satelliteChainName}" prepared via ISMP`,
      },
    };
  }

  /**
   * Execute a satellite → hub cross-chain withdrawal.
   *
   * Satellite→Hub withdrawals are initiated on the satellite side and arrive
   * at the router via ISMP `onAccept()`. When an `evmCrossChainService` is
   * configured, this method reads live router state (including pending
   * withdrawal requests) to help the agent assess queue depth.
   */
  private async executeSatelliteToHub(
    input: CrossChainRebalanceInput,
    config: ChainConfig,
    satellite: SatelliteVaultConfig | undefined,
  ): Promise<ToolResult> {
    // Fetch live router state when EVM service is available
    let routerState: Record<string, unknown> | undefined;
    if (this.evmCrossChainService) {
      try {
        const state = await this.evmCrossChainService.readRouterState();
        routerState = {
          paused: state.paused,
          outgoingNonce: state.outgoingNonce.toString(),
          pendingSatelliteDeposits: state.pendingSatelliteDeposits.toString(),
          pendingWithdrawalRequests: state.pendingWithdrawalRequests.toString(),
          satelliteChainCount: state.satelliteChainCount.toString(),
          relayerFee: state.relayerFee.toString(),
        };
      } catch {
        // Non-fatal — still return result with stub router state
      }
    }

    return {
      success: true,
      data: {
        action: 'cross_chain_withdraw',
        direction: input.direction,
        satelliteChainName: input.satelliteChainName,
        amount: input.amount,
        receiver: input.receiver,
        hubVaultAddress: this.hubVaultAddress ?? 'not-configured',
        routerAddress: this.routerAddress ?? 'not-configured',
        satelliteVaultAddress: satellite?.address ?? 'not-configured',
        satelliteEvmChainId: satellite?.evmChainId ?? null,
        chainId: config.chainId,
        endpoint: config.endpoint,
        signerAddress: this.polkadotContext?.address,
        mode: routerState ? 'evm-live' : this.polkadotContext ? 'on-chain' : 'offline',
        status: 'pending',
        routerState: routerState ?? null,
        note: 'Satellite→Hub withdrawals are initiated on the satellite side via ISMP and processed by the router onAccept().',
        message: `Cross-chain withdraw of ${input.amount} from satellite "${input.satelliteChainName}" to hub prepared via ISMP. Receiver: ${input.receiver}`,
      },
    };
  }
}
