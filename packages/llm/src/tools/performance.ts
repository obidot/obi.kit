import { Tool } from '@langchain/core/tools';
import type { EvmVaultConfig, ObiEvmContext, ToolResult } from '@obidot-kit/core';

/**
 * Parsed input for the performance tool.
 */
export interface PerformanceInput {
  /** Optional protocol address to get per-protocol performance */
  protocol?: string;
  /** Whether to include vault-level summary (default: true) */
  includeSummary?: boolean;
}

/**
 * Options for constructing a `PerformanceTool`.
 */
export interface PerformanceToolOptions {
  /** EVM context for reading on-chain state. */
  evmContext?: ObiEvmContext;
  /** ObidotVault configuration. */
  vaultConfig?: EvmVaultConfig;
}

/**
 * LangChain tool for reading ObidotVault performance metrics.
 *
 * Returns:
 * - Vault-level performance summary (cumulative P&L, high-water mark, fees)
 * - Per-protocol performance (total deployed/returned, success rate)
 * - Key vault state (total assets, idle, remote, shares, deposit cap)
 *
 * This is a read-only tool — it only requires a public client.
 */
export class PerformanceTool extends Tool {
  name = 'vault_performance';

  description =
    'Read ObidotVault performance analytics such as cumulative P&L, high-water mark, performance fees, ' +
    'utilization, and optional per-protocol deployment results. Use this for monitoring and reporting, not ' +
    'for admin configuration changes. Input is optional JSON with "protocol" (address to fetch per-protocol ' +
    'stats) and "includeSummary" (boolean, default true).';

  private readonly evmContext: ObiEvmContext | undefined;
  private readonly vaultConfig: EvmVaultConfig | undefined;

  constructor(options: PerformanceToolOptions) {
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

  private parseInput(input: string): PerformanceInput {
    if (!input || input.trim() === '' || input.trim() === '{}') {
      return { includeSummary: true };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch {
      throw new Error(`Invalid JSON input: ${input}`);
    }

    if (typeof parsed !== 'object' || parsed === null) {
      return { includeSummary: true };
    }

    const obj = parsed as Record<string, unknown>;
    return {
      protocol: typeof obj['protocol'] === 'string' ? obj['protocol'] : undefined,
      includeSummary: typeof obj['includeSummary'] === 'boolean' ? obj['includeSummary'] : true,
    };
  }

  private async execute(input: PerformanceInput): Promise<ToolResult> {
    const vaultAddress = this.vaultConfig?.vaultAddress;
    if (!vaultAddress) {
      throw new Error('No vault configured');
    }

    const ctx = this.evmContext;
    if (!ctx) {
      return {
        success: true,
        data: { vaultAddress, mode: 'stub', message: 'No EVM context — cannot read on-chain state' },
      };
    }

    const { OBIDOT_VAULT_ABI } = await import('@obidot-kit/core');
    const data: Record<string, unknown> = { vaultAddress, mode: 'evm' };

    // Fetch vault state and performance in parallel
    if (input.includeSummary) {
      const [
        performanceSummaryResult,
        totalAssets,
        totalSupply,
        idleAssets,
        totalRemoteAssets,
        depositCap,
        paused,
        emergencyMode,
      ] = await Promise.all([
        ctx.client.readContract({
          address: vaultAddress,
          abi: OBIDOT_VAULT_ABI,
          functionName: 'performanceSummary',
        }) as Promise<readonly [bigint, bigint, bigint, string]>,
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
          functionName: 'idleAssets',
        }) as Promise<bigint>,
        ctx.client.readContract({
          address: vaultAddress,
          abi: OBIDOT_VAULT_ABI,
          functionName: 'totalRemoteAssets',
        }) as Promise<bigint>,
        ctx.client.readContract({
          address: vaultAddress,
          abi: OBIDOT_VAULT_ABI,
          functionName: 'depositCap',
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
      ]);

      const [cumulativePnL, highWaterMark, performanceFeeBps, feeTreasury] = performanceSummaryResult;

      data['performance'] = {
        cumulativePnL: cumulativePnL.toString(),
        highWaterMark: highWaterMark.toString(),
        performanceFeeBps: performanceFeeBps.toString(),
        feeTreasury,
      };

      data['vaultState'] = {
        totalAssets: totalAssets.toString(),
        totalSupply: totalSupply.toString(),
        idleAssets: idleAssets.toString(),
        totalRemoteAssets: totalRemoteAssets.toString(),
        depositCap: depositCap.toString(),
        utilizationBps: totalAssets > 0n ? ((totalRemoteAssets * 10000n) / totalAssets).toString() : '0',
        paused,
        emergencyMode,
      };
    }

    // Fetch per-protocol performance if requested
    if (input.protocol) {
      const protocolAddr = input.protocol as `0x${string}`;
      const protocolResult = (await ctx.client.readContract({
        address: vaultAddress,
        abi: OBIDOT_VAULT_ABI,
        functionName: 'getProtocolPerformance',
        args: [protocolAddr],
      })) as readonly [bigint, bigint, bigint, bigint, bigint];

      const [totalDeployed, totalReturned, executionCount, successCount, lastExecutedAt] = protocolResult;
      const successRate = executionCount > 0n ? `${((successCount * 10000n) / executionCount).toString()} bps` : 'N/A';

      data['protocolPerformance'] = {
        protocol: protocolAddr,
        totalDeployed: totalDeployed.toString(),
        totalReturned: totalReturned.toString(),
        executionCount: executionCount.toString(),
        successCount: successCount.toString(),
        successRate,
        pnl: (totalReturned - totalDeployed).toString(),
        lastExecutedAt: lastExecutedAt.toString(),
      };
    }

    return {
      success: true,
      data,
      message: `Vault performance data retrieved for ${vaultAddress}.`,
    };
  }
}
