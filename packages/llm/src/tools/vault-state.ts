import { Tool } from '@langchain/core/tools';
import type { EvmVaultConfig, ObiEvmContext, ToolResult } from '@obidot-kit/core';

/**
 * Input for the VaultStateTool.
 */
export interface VaultStateInput {
  /** Vault address to read (optional if configured). */
  vaultAddress?: string;
}

/**
 * Options for constructing a `VaultStateTool`.
 */
export interface VaultStateToolOptions {
  /** EVM context with public client for on-chain reads. */
  evmContext?: ObiEvmContext;
  /** ObidotVault ERC-4626 configuration. */
  vaultConfig?: EvmVaultConfig;
}

/**
 * LangChain tool for reading live ObidotVault state.
 *
 * Returns key vault metrics in a single call:
 * - totalAssets, totalSupply, sharePrice
 * - depositCap, maxDailyLoss, paused, swapRouter
 * - Current asset address and decimals
 *
 * Works without a wallet client — read-only via the public client.
 * In **offline mode** (no context), returns stub data.
 */
export class VaultStateTool extends Tool {
  name = 'vault_state';

  description =
    'Read live ObidotVault state: totalAssets, totalSupply, sharePrice, depositCap, ' +
    'maxDailyLoss, paused status, and swapRouter address. ' +
    'Input: optional JSON with "vaultAddress". No wallet required — read-only.';

  private readonly evmContext: ObiEvmContext | undefined;
  private readonly vaultConfig: EvmVaultConfig | undefined;

  constructor(options: VaultStateToolOptions) {
    super();
    this.evmContext = options.evmContext;
    this.vaultConfig = options.vaultConfig;
  }

  protected async _call(input: string): Promise<string> {
    try {
      const parsed = this.parseInput(input);
      const result = await this.execute(parsed);
      return JSON.stringify(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return JSON.stringify({ success: false, error: message } satisfies ToolResult);
    }
  }

  private parseInput(input: string): VaultStateInput {
    if (!input || input.trim() === '' || input.trim() === '{}') return {};
    try {
      const parsed = JSON.parse(input) as Record<string, unknown>;
      return {
        vaultAddress: typeof parsed['vaultAddress'] === 'string' ? parsed['vaultAddress'] : undefined,
      };
    } catch {
      return {};
    }
  }

  private async execute(input: VaultStateInput): Promise<ToolResult> {
    const vaultAddress = (input.vaultAddress ?? this.vaultConfig?.vaultAddress) as `0x${string}` | undefined;

    if (!vaultAddress) {
      throw new Error('No vault address configured');
    }

    const ctx = this.evmContext;
    if (!ctx) {
      return {
        success: true,
        data: {
          vaultAddress,
          mode: 'stub',
          status: 'pending',
          message: 'VaultState read prepared but not executed (no EVM context)',
        },
      };
    }

    const { OBIDOT_VAULT_ABI } = await import('@obidot-kit/core');

    // Batch all state reads in parallel
    const [totalAssets, totalSupply, paused, depositCap, asset] = await Promise.all([
      ctx.client.readContract({
        address: vaultAddress,
        abi: OBIDOT_VAULT_ABI,
        functionName: 'totalAssets',
      }) as Promise<bigint>,
      ctx.client.readContract({
        address: vaultAddress,
        abi: OBIDOT_VAULT_ABI,
        functionName: 'totalSupply',
      }) as Promise<bigint>,
      ctx.client.readContract({
        address: vaultAddress,
        abi: OBIDOT_VAULT_ABI,
        functionName: 'paused',
      }) as Promise<boolean>,
      ctx.client.readContract({
        address: vaultAddress,
        abi: OBIDOT_VAULT_ABI,
        functionName: 'depositCap',
      }) as Promise<bigint>,
      ctx.client.readContract({
        address: vaultAddress,
        abi: OBIDOT_VAULT_ABI,
        functionName: 'asset',
      }) as Promise<`0x${string}`>,
    ]);

    // Share price = totalAssets / totalSupply (or 1 if supply is 0)
    const sharePrice = totalSupply > 0n ? (totalAssets * 10n ** 18n) / totalSupply : 10n ** 18n;

    return {
      success: true,
      data: {
        vaultAddress,
        asset,
        totalAssets: totalAssets.toString(),
        totalSupply: totalSupply.toString(),
        sharePrice: sharePrice.toString(),
        depositCap: depositCap.toString(),
        paused,
        mode: 'evm',
        message: `Vault ${paused ? 'PAUSED' : 'active'} — ${totalAssets.toString()} assets, ${totalSupply.toString()} shares`,
      },
    };
  }
}
