import type { StructuredToolInterface, Tool } from '@langchain/core/tools';
import type { ObiPolkadotContext, VaultConfig } from '@obidot-kit/core';

import { VaultDepositTool } from './tools/vault-deposit.js';
import { VaultWithdrawTool } from './tools/vault-withdraw.js';

/**
 * Configuration for creating an `ObiAgentApi` instance.
 */
export interface ObiAgentApiConfig {
  /**
   * A fully initialised Polkadot context (API client + signer + address).
   * Used for both the upstream PAK tools and the obi-kit vault tools.
   */
  readonly polkadotContext: ObiPolkadotContext;

  /**
   * Optional list of vault configurations.
   * When provided, the agent will include vault deposit/withdraw tools.
   */
  readonly vaults?: ReadonlyArray<VaultConfig>;
}

/**
 * Extended agent API that wraps the Polkadot Agent Kit's `PolkadotAgentApi`
 * and layers obi-kit's vault-specific LangChain tools on top.
 *
 * This gives consumers a single API surface that exposes **both** the base
 * PAK tools (balance, transfer, XCM, staking, identity, swap, etc.) and the
 * obi-kit vault tools (deposit, withdraw) — all correctly wired to the same
 * `PolkadotApi` and `PolkadotSigner`.
 *
 * The `@polkadot-agent-kit/llm` dependency is loaded **lazily** (via dynamic
 * `import()`) so that merely importing this module does not pull in the
 * entire PAK transitive dependency tree. This keeps offline / stub usage
 * lightweight and avoids missing-optional-dep errors in test environments.
 *
 * @example
 * ```ts
 * import { ObiAgentApi } from '@obidot-kit/llm';
 * import { createPolkadotContext } from '@obidot-kit/core';
 *
 * const ctx = await createPolkadotContext({ signer, address, allowedChains: ['polkadot'] });
 *
 * const agentApi = new ObiAgentApi({
 *   polkadotContext: ctx,
 *   vaults: [{ id: 'v1', name: 'DOT Vault', address: '5F...', chain: { endpoint: 'wss://...' }, asset: 'DOT' }],
 * });
 *
 * // Lazily initialise PAK tools (must be called before getAllTools)
 * await agentApi.init();
 *
 * // Get all tools (PAK + obi-kit) for LangChain agent binding
 * const tools = agentApi.getAllTools();
 * ```
 */
export class ObiAgentApi {
  private pakAgentApi: unknown | undefined;
  private pakInitialised = false;
  private readonly ctx: ObiPolkadotContext;
  private readonly vaults: ReadonlyArray<VaultConfig>;
  private readonly vaultTools: Tool[];

  constructor(config: ObiAgentApiConfig) {
    this.ctx = config.polkadotContext;
    this.vaults = config.vaults ?? [];

    // Create vault tools wired to the live context
    this.vaultTools = [];

    if (this.vaults.length > 0) {
      this.vaultTools.push(
        new VaultDepositTool({ polkadotContext: this.ctx }),
        new VaultWithdrawTool({ polkadotContext: this.ctx }),
      );
    }
  }

  // ── Lazy PAK initialisation ─────────────────────────────────────────

  /**
   * Lazily loads `@polkadot-agent-kit/llm` and creates the upstream
   * `PolkadotAgentApi` instance. This **must** be called (and awaited)
   * before calling `getPakActions()` or `getAllTools()`.
   *
   * It is safe to call multiple times — subsequent calls are no-ops.
   */
  async init(): Promise<void> {
    if (this.pakInitialised) {
      return;
    }

    try {
      const pakLlm = await import('@polkadot-agent-kit/llm');
      this.pakAgentApi = new pakLlm.PolkadotAgentApi(this.ctx.api);
      this.pakInitialised = true;
    } catch (_error) {
      // If PAK LLM is not installed or has missing transitive deps we
      // gracefully degrade — vault tools still work, PAK tools won't.
      this.pakInitialised = false;
      this.pakAgentApi = undefined;
    }
  }

  /**
   * Returns `true` once the PAK agent API has been successfully loaded
   * via {@link init}.
   */
  isPakInitialised(): boolean {
    return this.pakInitialised && this.pakAgentApi !== undefined;
  }

  // ── PAK tool accessors ──────────────────────────────────────────────

  /**
   * Returns the upstream PAK `PolkadotAgentApi` for direct access to
   * individual PAK tools (balance, transfer, XCM, staking, etc.).
   *
   * Returns `undefined` if {@link init} has not been called or if the
   * PAK LLM package could not be loaded.
   */
  getPakAgentApi(): unknown | undefined {
    return this.pakAgentApi;
  }

  /**
   * Returns all PAK tools (balance, transfer, XCM, staking, identity,
   * swap, mint-vDOT, chain init) as a flat array of LangChain `Action`
   * objects from the upstream kit.
   *
   * Internally calls `PolkadotAgentApi.getActions()` with the context's
   * signer and address.
   *
   * Returns an empty array if PAK has not been initialised.
   */
  getPakActions(): unknown[] {
    if (!this.pakAgentApi || typeof (this.pakAgentApi as Record<string, unknown>)['getActions'] !== 'function') {
      return [];
    }
    return (
      this.pakAgentApi as {
        getActions(signer: unknown, address: string): unknown[];
      }
    ).getActions(this.ctx.signer, this.ctx.address);
  }

  // ── Obi-kit vault tool accessors ────────────────────────────────────

  /**
   * Returns the obi-kit vault tools (deposit, withdraw).
   * These are only present when at least one vault was configured.
   */
  getVaultTools(): ReadonlyArray<Tool> {
    return this.vaultTools;
  }

  // ── Combined tool surface ───────────────────────────────────────────

  /**
   * Returns **all** tools — both the PAK tools and the obi-kit vault
   * tools — as a flat `StructuredToolInterface[]` suitable for binding
   * to a LangChain chat model via `model.bindTools(tools)`.
   *
   * The PAK actions are extracted from their `Action` wrapper so that
   * every entry in the returned array is a standard LangChain tool.
   *
   * If PAK has not been initialised (via {@link init}), only vault tools
   * are returned.
   */
  getAllTools(): StructuredToolInterface[] {
    const tools: StructuredToolInterface[] = [];

    // Extract the raw LangChain tool from each PAK Action
    const pakActions = this.getPakActions();
    for (const action of pakActions) {
      // PAK Action objects have a `tool` property that is the LangChain tool
      if (action && typeof action === 'object' && 'tool' in action) {
        tools.push((action as { tool: StructuredToolInterface }).tool);
      }
    }

    // Append obi-kit vault tools (they extend LangChain's Tool which
    // implements StructuredToolInterface)
    for (const vaultTool of this.vaultTools) {
      tools.push(vaultTool as unknown as StructuredToolInterface);
    }

    return tools;
  }

  // ── Vault registry helpers ──────────────────────────────────────────

  /**
   * Returns the configured vaults.
   */
  getVaults(): ReadonlyArray<VaultConfig> {
    return this.vaults;
  }

  /**
   * Look up a vault by its ID.
   */
  getVault(vaultId: string): VaultConfig | undefined {
    return this.vaults.find((v) => v.id === vaultId);
  }

  // ── Context accessors ───────────────────────────────────────────────

  /**
   * Returns the underlying Polkadot context.
   */
  getPolkadotContext(): ObiPolkadotContext {
    return this.ctx;
  }

  /**
   * Returns the signer address from the context.
   */
  getAddress(): string {
    return this.ctx.address;
  }
}
