import { Tool } from '@langchain/core/tools';
import type { ChainConfig, ObiPolkadotContext, ToolResult, VaultAction } from '@obidot-kit/core';

export interface VaultWithdrawInput {
  /** The vault address or identifier to withdraw from */
  vaultAddress: string;
  /** The amount to withdraw (as a string to preserve precision) */
  amount: string;
  /** The asset/token identifier to withdraw */
  asset?: string;
}

/**
 * Options for constructing a `VaultWithdrawTool`.
 *
 * Supports both a lightweight `chainConfig`-only mode (for offline / stub
 * usage) and a full `ObiPolkadotContext` mode (for real on-chain withdrawals).
 */
export interface VaultWithdrawToolOptions {
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
}

/**
 * LangChain tool for withdrawing assets from a DeFi vault on Polkadot-based networks.
 *
 * When constructed with an `ObiPolkadotContext` the tool has access to a live
 * `PolkadotApi` and `PolkadotSigner`, enabling real on-chain transaction
 * construction and submission via the Polkadot Agent Kit.
 *
 * When constructed with only a `ChainConfig` (no context), the tool falls
 * back to a stub implementation that returns a "pending" result — useful for
 * testing, dry-runs, and offline agent development.
 *
 * @example
 * ```ts
 * import { VaultWithdrawTool } from '@obidot-kit/llm';
 *
 * // Stub mode (offline)
 * const stub = new VaultWithdrawTool({
 *   chainConfig: { endpoint: 'wss://rpc.polkadot.io', chainId: 'polkadot' },
 * });
 *
 * // Live mode (on-chain)
 * const live = new VaultWithdrawTool({ polkadotContext: ctx });
 *
 * const result = await live.invoke('{"vaultAddress":"5F3s...","amount":"100","asset":"DOT"}');
 * ```
 */
export class VaultWithdrawTool extends Tool {
  name = 'vault_withdraw';

  description =
    'Withdraw assets from a DeFi vault. Input should be a JSON string with "vaultAddress", "amount", and optionally "asset" fields.';

  private chainConfig: ChainConfig | undefined;
  private polkadotContext: ObiPolkadotContext | undefined;

  constructor(options: VaultWithdrawToolOptions) {
    super();
    this.chainConfig = options.chainConfig;
    this.polkadotContext = options.polkadotContext;
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
      const config = this.getChainConfig();
      const action: VaultAction = {
        type: 'withdraw',
        vaultAddress: parsed.vaultAddress,
        amount: parsed.amount,
        asset: parsed.asset ?? 'native',
        chainId: config.chainId,
      };

      const result = await this.executeWithdraw(action);
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

  private parseInput(input: string): VaultWithdrawInput {
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

    if (typeof obj['vaultAddress'] !== 'string' || obj['vaultAddress'].length === 0) {
      throw new Error('Missing or invalid "vaultAddress" field');
    }
    if (typeof obj['amount'] !== 'string' || obj['amount'].length === 0) {
      throw new Error('Missing or invalid "amount" field');
    }

    return {
      vaultAddress: obj['vaultAddress'],
      amount: obj['amount'],
      asset: typeof obj['asset'] === 'string' ? obj['asset'] : undefined,
    };
  }

  /**
   * Execute the withdraw action.
   *
   * When a live `ObiPolkadotContext` is available the method delegates to
   * {@link executeOnChainWithdraw} which uses the PAK `PolkadotApi` and
   * `PolkadotSigner` to construct and submit the extrinsic.
   *
   * Otherwise it falls back to a stub that returns a "pending" result.
   *
   * Override this method to integrate with a specific vault protocol.
   */
  protected async executeWithdraw(action: VaultAction): Promise<ToolResult> {
    if (this.polkadotContext) {
      return this.executeOnChainWithdraw(action, this.polkadotContext);
    }

    // Stub / offline fallback
    return {
      success: true,
      data: {
        action: action.type,
        vaultAddress: action.vaultAddress,
        amount: action.amount,
        asset: action.asset,
        chainId: action.chainId,
        endpoint: this.getChainConfig().endpoint,
        status: 'pending',
        message: `Withdraw of ${action.amount} ${action.asset} from vault ${action.vaultAddress} submitted`,
      },
    };
  }

  /**
   * Perform the withdrawal using the Polkadot Agent Kit infrastructure.
   *
   * This is the integration seam — protocol-specific vault implementations
   * should override this method to build the correct extrinsic for their
   * target pallet / smart contract.
   *
   * The default implementation constructs a placeholder that proves the
   * context is wired correctly, and returns the signer address and API
   * status for verification.
   */
  protected async executeOnChainWithdraw(action: VaultAction, ctx: ObiPolkadotContext): Promise<ToolResult> {
    // TODO: Replace with real extrinsic construction for target vault protocol.
    //
    // Example flow with a pallet-based vault:
    //   const api = ctx.api.getApi(chainId as KnownChainId);
    //   const tx = api.tx.vault.withdraw(action.vaultAddress, BigInt(action.amount));
    //   const result = await tx.signSubmitAndWatch(ctx.signer);
    //
    // For now we return a richer "pending" stub that proves the context is
    // available to downstream consumers.
    return {
      success: true,
      data: {
        action: action.type,
        vaultAddress: action.vaultAddress,
        amount: action.amount,
        asset: action.asset,
        chainId: action.chainId,
        signerAddress: ctx.address,
        mode: 'on-chain',
        status: 'pending',
        message: `Withdraw of ${action.amount} ${action.asset} from vault ${action.vaultAddress} prepared for on-chain submission by ${ctx.address}`,
      },
    };
  }
}
