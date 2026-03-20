import { Tool } from '@langchain/core/tools';
import type { EvmVaultConfig, ObiEvmContext, ToolResult } from '@obidot-kit/core';
import { OBIDOT_VAULT_ABI } from '@obidot-kit/core';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Parsed input for VaultPolicyTool.
 */
export interface VaultPolicyInput {
  /** Check policy for a specific parachain ID (uint32). */
  parachainId?: number;
  /** Check policy for a specific protocol address. */
  protocol?: string;
  /** Whether to include parachain allow-list summary (default: true). */
  includeParachains?: boolean;
  /** Whether to include protocol whitelist summary (default: true). */
  includeProtocols?: boolean;
}

/**
 * Options for constructing a `VaultPolicyTool`.
 */
export interface VaultPolicyToolOptions {
  /** EVM context with public client for on-chain reads. */
  evmContext?: ObiEvmContext;
  /** ObidotVault configuration. */
  vaultConfig?: EvmVaultConfig;
}

// ─── Tool ─────────────────────────────────────────────────────────────────────

/**
 * LangChain tool for reading ObidotVault policy settings.
 *
 * Returns:
 * - Allowed parachains (per-ID if specified)
 * - Allowed protocols and their exposure caps
 * - Withdrawal timelock duration
 * - Deposit cap
 * - Emergency mode status
 *
 * Read-only — no wallet required.
 */
export class VaultPolicyTool extends Tool {
  name = 'vault_policy';

  description =
    'Read ObidotVault policy settings: allowed parachains, whitelisted protocols, ' +
    'protocol exposure caps, withdrawal timelock, deposit cap, and emergency mode. ' +
    'Input: optional JSON with "parachainId" (uint32 to check one parachain), ' +
    '"protocol" (address to check one protocol), "includeParachains" (bool), ' +
    '"includeProtocols" (bool).';

  private readonly evmContext: ObiEvmContext | undefined;
  private readonly vaultConfig: EvmVaultConfig | undefined;

  constructor(options: VaultPolicyToolOptions) {
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

  private parseInput(input: string): VaultPolicyInput {
    if (!input || input.trim() === '' || input.trim() === '{}') {
      return { includeParachains: true, includeProtocols: true };
    }
    try {
      const parsed = JSON.parse(input) as Record<string, unknown>;
      return {
        parachainId: typeof parsed['parachainId'] === 'number' ? parsed['parachainId'] : undefined,
        protocol: typeof parsed['protocol'] === 'string' ? parsed['protocol'] : undefined,
        includeParachains: typeof parsed['includeParachains'] === 'boolean' ? parsed['includeParachains'] : true,
        includeProtocols: typeof parsed['includeProtocols'] === 'boolean' ? parsed['includeProtocols'] : true,
      };
    } catch {
      return { includeParachains: true, includeProtocols: true };
    }
  }

  private async execute(input: VaultPolicyInput): Promise<ToolResult> {
    const vaultAddress = this.vaultConfig?.vaultAddress;
    if (!vaultAddress) throw new Error('No vault configured');

    const ctx = this.evmContext;
    if (!ctx) {
      return {
        success: true,
        data: {
          vaultAddress,
          mode: 'stub',
          message: 'No EVM context — cannot read on-chain policy',
        },
      };
    }

    // Always fetch: depositCap, withdrawalTimelock, emergencyMode
    const [depositCap, withdrawalTimelock, emergencyMode] = await Promise.all([
      ctx.client.readContract({
        address: vaultAddress,
        abi: OBIDOT_VAULT_ABI,
        functionName: 'depositCap',
      }) as Promise<bigint>,
      ctx.client.readContract({
        address: vaultAddress,
        abi: OBIDOT_VAULT_ABI,
        functionName: 'withdrawalTimelock',
      }) as Promise<bigint>,
      ctx.client.readContract({
        address: vaultAddress,
        abi: OBIDOT_VAULT_ABI,
        functionName: 'emergencyMode',
      }) as Promise<boolean>,
    ]);

    const data: Record<string, unknown> = {
      vaultAddress,
      mode: 'evm',
      depositCap: depositCap.toString(),
      withdrawalTimelockSecs: withdrawalTimelock.toString(),
      emergencyMode,
    };

    // Per-parachain query
    if (input.parachainId !== undefined) {
      const allowed = await ctx.client.readContract({
        address: vaultAddress,
        abi: OBIDOT_VAULT_ABI,
        functionName: 'allowedParachains',
        args: [input.parachainId],
      });
      data['parachain'] = {
        parachainId: input.parachainId,
        allowed: Boolean(allowed),
      };
    }

    // Per-protocol query
    if (input.protocol) {
      const [allowed, exposure] = await Promise.all([
        ctx.client.readContract({
          address: vaultAddress,
          abi: OBIDOT_VAULT_ABI,
          functionName: 'allowedTargets',
          args: [input.protocol as `0x${string}`],
        }),
        ctx.client.readContract({
          address: vaultAddress,
          abi: OBIDOT_VAULT_ABI,
          functionName: 'protocolExposure',
          args: [input.protocol as `0x${string}`],
        }) as Promise<bigint>,
      ]);
      data['protocol'] = {
        address: input.protocol,
        allowed: Boolean(allowed),
        currentExposure: exposure.toString(),
      };
    }

    const summary: string[] = [
      `depositCap=${depositCap.toString()}`,
      `timelockSecs=${withdrawalTimelock.toString()}`,
      emergencyMode ? 'emergencyMode=ACTIVE' : 'emergencyMode=normal',
    ];

    return {
      success: true,
      data,
      message: `Vault policy: ${summary.join(', ')}.`,
    };
  }
}
