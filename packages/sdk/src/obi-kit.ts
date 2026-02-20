import type { Tool } from '@langchain/core/tools';
import type { ChainConfig, ToolResult, TransactionSigner, VaultConfig } from '@obidot-kit/core';
import { VaultDepositTool, VaultWithdrawTool } from '@obidot-kit/llm';

/**
 * Configuration options for initializing the ObiKit SDK.
 */
export interface ObiKitConfig {
  /** The chain configuration for on-chain interactions. */
  readonly chainConfig: ChainConfig;
  /** Optional list of vaults available to the agent. */
  readonly vaults?: ReadonlyArray<VaultConfig>;
  /** Optional transaction signer for submitting on-chain transactions. */
  readonly signer?: TransactionSigner;
}

/**
 * High-level facade for the Obidot Kit SDK.
 *
 * Provides a unified API surface that combines `@obidot-kit/core` and
 * `@obidot-kit/llm` into a single, easy-to-use entry point.
 *
 * @example
 * ```ts
 * import { ObiKit } from '@obidot-kit/sdk';
 *
 * const kit = new ObiKit({
 *   chainConfig: { endpoint: 'wss://rpc.polkadot.io', chainId: 'polkadot' },
 * });
 *
 * const tools = kit.getTools();
 * const chainConfig = kit.getChainConfig();
 * ```
 */
export class ObiKit {
  private chainConfig: ChainConfig;
  private readonly vaults: Map<string, VaultConfig>;
  private readonly customTools: Tool[];
  private signer: TransactionSigner | undefined;

  constructor(config: ObiKitConfig) {
    this.chainConfig = config.chainConfig;
    this.vaults = new Map();
    this.customTools = [];
    this.signer = config.signer;

    if (config.vaults) {
      for (const vault of config.vaults) {
        this.vaults.set(vault.id, vault);
      }
    }
  }

  /**
   * Returns the current chain configuration.
   */
  getChainConfig(): ChainConfig {
    return this.chainConfig;
  }

  /**
   * Update the chain configuration at runtime (e.g. switch networks).
   */
  setChainConfig(config: ChainConfig): void {
    this.chainConfig = config;
  }

  /**
   * The transaction signer, if one was provided.
   */
  getSigner(): TransactionSigner | undefined {
    return this.signer;
  }

  /**
   * Set or replace the transaction signer.
   */
  setSigner(signer: TransactionSigner): void {
    this.signer = signer;
  }

  /**
   * Register a vault so it is available to the agent.
   */
  registerVault(vault: VaultConfig): this {
    this.vaults.set(vault.id, vault);
    return this;
  }

  /**
   * Remove a previously registered vault.
   */
  removeVault(vaultId: string): boolean {
    return this.vaults.delete(vaultId);
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

  /**
   * Add a custom LangChain tool that will be included in `getTools()`.
   */
  addTool(tool: Tool): this {
    this.customTools.push(tool);
    return this;
  }

  /**
   * Returns all available tools: built-in vault tools + any custom tools.
   *
   * Built-in tools are instantiated from registered vaults. If no vaults are
   * registered, only custom tools (if any) are returned.
   */
  getTools(): Tool[] {
    const tools: Tool[] = [];

    if (this.vaults.size > 0) {
      // Create deposit and withdraw tools bound to the current chain config
      tools.push(new VaultDepositTool({ chainConfig: this.chainConfig }));
      tools.push(new VaultWithdrawTool({ chainConfig: this.chainConfig }));
    }

    // Append any custom tools the user registered
    tools.push(...this.customTools);

    return tools;
  }

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
      chainConfig: this.chainConfig,
      vaultCount: this.vaults.size,
      vaultIds: Array.from(this.vaults.keys()),
      customToolCount: this.customTools.length,
      customToolNames: this.customTools.map((t) => t.name),
      hasSigner: this.signer !== undefined,
    };
  }
}
