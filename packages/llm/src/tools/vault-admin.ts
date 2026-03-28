import { Tool } from '@langchain/core/tools';
import type { EvmVaultConfig, ObiEvmContext, ToolResult } from '@obidot-kit/core';
import { OBIDOT_VAULT_ABI } from '@obidot-kit/core';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Parsed input for VaultAdminTool.
 */
export interface VaultAdminInput {
  /** Specific role to query holders for (e.g. "DEFAULT_ADMIN_ROLE", "KEEPER_ROLE"). */
  role?: string;
}

/**
 * Options for constructing a `VaultAdminTool`.
 */
export interface VaultAdminToolOptions {
  /** EVM context with public client. */
  evmContext?: ObiEvmContext;
  /** ObidotVault configuration. */
  vaultConfig?: EvmVaultConfig;
}

// ─── Tool ─────────────────────────────────────────────────────────────────────

/**
 * LangChain tool for reading ObidotVault administrative state.
 *
 * Returns:
 * - Total shares, total assets, and share price
 * - Paused state and emergency mode
 * - Strategy counter (nonces used)
 * - Fee configuration (feeBps, feeTreasury)
 * - Role constants (DEFAULT_ADMIN_ROLE, KEEPER_ROLE, STRATEGIST_ROLE, SOLVER_ROLE)
 *
 * Read-only — no wallet required.
 */
export class VaultAdminTool extends Tool {
  name = 'vault_admin';

  description =
    'Read ObidotVault governance and admin state: role constants, fee treasury, strategyCounter, ' +
    'share totals, and paused or emergency flags. Use this for governance and control-plane inspection, ' +
    'not portfolio performance analytics. Input: optional JSON with "role" (role name to query, ' +
    'for example "DEFAULT_ADMIN_ROLE"). Read-only — no wallet required.';

  private readonly evmContext: ObiEvmContext | undefined;
  private readonly vaultConfig: EvmVaultConfig | undefined;

  constructor(options: VaultAdminToolOptions) {
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
      return JSON.stringify({
        success: false,
        error: message,
      } satisfies ToolResult);
    }
  }

  private parseInput(input: string): VaultAdminInput {
    if (!input || input.trim() === '' || input.trim() === '{}') return {};
    try {
      const parsed = JSON.parse(input) as Record<string, unknown>;
      return {
        role: typeof parsed['role'] === 'string' ? parsed['role'] : undefined,
      };
    } catch {
      return {};
    }
  }

  private async execute(input: VaultAdminInput): Promise<ToolResult> {
    const vaultAddress = this.vaultConfig?.vaultAddress;
    if (!vaultAddress) throw new Error('No vault configured');

    const ctx = this.evmContext;
    if (!ctx) {
      return {
        success: true,
        data: {
          vaultAddress,
          mode: 'stub',
          message: 'No EVM context — cannot read on-chain admin state',
        },
      };
    }

    // Batch all reads in parallel
    const [
      totalAssets,
      totalSupply,
      paused,
      emergencyMode,
      strategyCounter,
      feeTreasury,
      defaultAdminRole,
      keeperRole,
      strategistRole,
      solverRole,
    ] = await Promise.all([
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
        functionName: 'emergencyMode',
      }) as Promise<boolean>,
      ctx.client.readContract({
        address: vaultAddress,
        abi: OBIDOT_VAULT_ABI,
        functionName: 'strategyCounter',
      }) as Promise<bigint>,
      ctx.client.readContract({
        address: vaultAddress,
        abi: OBIDOT_VAULT_ABI,
        functionName: 'feeTreasury',
      }) as Promise<`0x${string}`>,
      ctx.client.readContract({
        address: vaultAddress,
        abi: OBIDOT_VAULT_ABI,
        functionName: 'DEFAULT_ADMIN_ROLE',
      }) as Promise<`0x${string}`>,
      ctx.client.readContract({
        address: vaultAddress,
        abi: OBIDOT_VAULT_ABI,
        functionName: 'KEEPER_ROLE',
      }) as Promise<`0x${string}`>,
      ctx.client.readContract({
        address: vaultAddress,
        abi: OBIDOT_VAULT_ABI,
        functionName: 'STRATEGIST_ROLE',
      }) as Promise<`0x${string}`>,
      ctx.client.readContract({
        address: vaultAddress,
        abi: OBIDOT_VAULT_ABI,
        functionName: 'SOLVER_ROLE',
      }) as Promise<`0x${string}`>,
    ]);

    const sharePrice = totalSupply > 0n ? (totalAssets * 10n ** 18n) / totalSupply : 10n ** 18n;

    // Build role map
    const roles: Record<string, string> = {
      DEFAULT_ADMIN_ROLE: defaultAdminRole,
      KEEPER_ROLE: keeperRole,
      STRATEGIST_ROLE: strategistRole,
      SOLVER_ROLE: solverRole,
    };

    // Optional: check a specific role (e.g. who holds it)
    let roleInfo: Record<string, unknown> | undefined;
    if (input.role && input.role in roles) {
      const roleHash = roles[input.role] as `0x${string}`;
      const walletAddress = ctx.walletClient?.account?.address;
      if (walletAddress) {
        const hasRole = await ctx.client.readContract({
          address: vaultAddress,
          abi: OBIDOT_VAULT_ABI,
          functionName: 'hasRole',
          args: [roleHash, walletAddress],
        });
        roleInfo = {
          role: input.role,
          roleHash,
          walletAddress,
          walletHasRole: Boolean(hasRole),
        };
      } else {
        roleInfo = { role: input.role, roleHash };
      }
    }

    const data: Record<string, unknown> = {
      vaultAddress,
      mode: 'evm',
      totalAssets: totalAssets.toString(),
      totalSupply: totalSupply.toString(),
      sharePrice: sharePrice.toString(),
      paused,
      emergencyMode,
      strategyCounter: strategyCounter.toString(),
      feeTreasury,
      roles,
    };

    if (roleInfo) data['roleQuery'] = roleInfo;

    const statusParts: string[] = [
      `${totalAssets.toString()} assets`,
      `${totalSupply.toString()} shares`,
      paused ? 'PAUSED' : 'active',
    ];
    if (emergencyMode) statusParts.push('EMERGENCY MODE');

    return {
      success: true,
      data,
      message: `Vault admin state: ${statusParts.join(', ')}.`,
    };
  }
}
