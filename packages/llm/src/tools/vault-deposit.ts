import { Tool } from '@langchain/core/tools';
import type { ChainConfig, ToolResult, VaultAction } from '@obidot-kit/core';

export interface VaultDepositInput {
  /** The vault address or identifier to deposit into */
  vaultAddress: string;
  /** The amount to deposit (as a string to preserve precision) */
  amount: string;
  /** The asset/token identifier to deposit */
  asset: string;
}

/**
 * LangChain tool for depositing assets into a DeFi vault on Polkadot-based networks.
 *
 * @example
 * ```ts
 * import { VaultDepositTool } from '@obidot-kit/llm';
 *
 * const tool = new VaultDepositTool({
 *   chainConfig: { endpoint: 'wss://rpc.polkadot.io', chainId: 'polkadot' },
 * });
 *
 * const result = await tool.invoke('{"vaultAddress":"5F3s...","amount":"100","asset":"DOT"}');
 * ```
 */
export class VaultDepositTool extends Tool {
  name = 'vault_deposit';

  description =
    'Deposit assets into a DeFi vault. Input should be a JSON string with "vaultAddress", "amount", and "asset" fields.';

  private chainConfig: ChainConfig;

  constructor(options: { chainConfig: ChainConfig }) {
    super();
    this.chainConfig = options.chainConfig;
  }

  protected async _call(input: string): Promise<string> {
    try {
      const parsed = this.parseInput(input);
      const action: VaultAction = {
        type: 'deposit',
        vaultAddress: parsed.vaultAddress,
        amount: parsed.amount,
        asset: parsed.asset,
        chainId: this.chainConfig.chainId,
      };

      const result = await this.executeDeposit(action);
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

  private parseInput(input: string): VaultDepositInput {
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
    if (typeof obj['asset'] !== 'string' || obj['asset'].length === 0) {
      throw new Error('Missing or invalid "asset" field');
    }

    return {
      vaultAddress: obj['vaultAddress'],
      amount: obj['amount'],
      asset: obj['asset'],
    };
  }

  /**
   * Execute the deposit action against the chain.
   * Override this method to integrate with a specific vault protocol.
   */
  protected async executeDeposit(action: VaultAction): Promise<ToolResult> {
    // TODO: Implement actual on-chain deposit via Polkadot API / XCM
    // This is a stub that should be overridden or extended by protocol-specific implementations.
    return {
      success: true,
      data: {
        action: action.type,
        vaultAddress: action.vaultAddress,
        amount: action.amount,
        asset: action.asset,
        chainId: action.chainId,
        status: 'pending',
        message: `Deposit of ${action.amount} ${action.asset} into vault ${action.vaultAddress} submitted`,
      },
    };
  }
}
