import { Tool } from '@langchain/core/tools';
import type { EvmVaultConfig, ObiEvmContext, ToolResult } from '@obidot-kit/core';

/**
 * Parsed input for the oracle check tool.
 */
export interface OracleCheckInput {
  /** Asset address to check oracle freshness for */
  asset?: string;
  /** Whether to fetch the daily loss status (default: true) */
  includeDailyLoss?: boolean;
}

/**
 * Options for constructing an `OracleCheckTool`.
 */
export interface OracleCheckToolOptions {
  /** EVM context for reading on-chain state. */
  evmContext?: ObiEvmContext;
  /** ObidotVault configuration. */
  vaultConfig?: EvmVaultConfig;
}

/**
 * LangChain tool for checking oracle freshness and price feeds.
 *
 * Returns:
 * - Oracle freshness status for a specific asset.
 * - Oracle and OracleRegistry addresses from the vault.
 * - Daily loss circuit breaker status.
 *
 * This is a read-only tool — it only requires a public client.
 */
export class OracleCheckTool extends Tool {
  name = 'oracle_check';

  description =
    'Check oracle freshness and price feed status for the ObidotVault. ' +
    'Input is an optional JSON string with "asset" (ERC-20 address to check freshness for) ' +
    'and "includeDailyLoss" (boolean, default true — include daily loss circuit breaker status).';

  private readonly evmContext: ObiEvmContext | undefined;
  private readonly vaultConfig: EvmVaultConfig | undefined;

  constructor(options: OracleCheckToolOptions) {
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

  private parseInput(input: string): OracleCheckInput {
    if (!input || input.trim() === '' || input.trim() === '{}') {
      return { includeDailyLoss: true };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch {
      throw new Error(`Invalid JSON input: ${input}`);
    }

    if (typeof parsed !== 'object' || parsed === null) {
      return { includeDailyLoss: true };
    }

    const obj = parsed as Record<string, unknown>;
    return {
      asset: typeof obj['asset'] === 'string' ? obj['asset'] : undefined,
      includeDailyLoss: typeof obj['includeDailyLoss'] === 'boolean' ? obj['includeDailyLoss'] : true,
    };
  }

  private async execute(input: OracleCheckInput): Promise<ToolResult> {
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

    // Build parallel read calls
    const readPromises: Promise<unknown>[] = [
      ctx.client.readContract({
        address: vaultAddress,
        abi: OBIDOT_VAULT_ABI,
        functionName: 'priceOracle',
      }),
      ctx.client.readContract({
        address: vaultAddress,
        abi: OBIDOT_VAULT_ABI,
        functionName: 'oracleRegistry',
      }),
    ];

    // Check freshness for specific asset
    if (input.asset) {
      readPromises.push(
        ctx.client.readContract({
          address: vaultAddress,
          abi: OBIDOT_VAULT_ABI,
          functionName: 'isOracleFresh',
          args: [input.asset as `0x${string}`],
        }),
      );
    }

    // Include daily loss status
    if (input.includeDailyLoss) {
      readPromises.push(
        ctx.client.readContract({
          address: vaultAddress,
          abi: OBIDOT_VAULT_ABI,
          functionName: 'dailyLossStatus',
        }),
      );
    }

    const results = await Promise.all(readPromises);

    data['priceOracle'] = results[0] as string;
    data['oracleRegistry'] = results[1] as string;

    let resultIndex = 2;

    if (input.asset) {
      const isFresh = results[resultIndex] as boolean;
      data['assetOracle'] = {
        asset: input.asset,
        isFresh,
        status: isFresh ? 'fresh' : 'stale',
        message: isFresh
          ? `Oracle for ${input.asset} is fresh and usable.`
          : `Oracle for ${input.asset} is STALE. Strategy execution will be blocked.`,
      };
      resultIndex++;
    }

    if (input.includeDailyLoss) {
      const dailyLossResult = results[resultIndex] as readonly [bigint, bigint, bigint];
      const [accumulated, maxAllowed, windowResetAt] = dailyLossResult;
      const now = Math.floor(Date.now() / 1000);
      const remainingCapacity = accumulated < maxAllowed ? maxAllowed - accumulated : 0n;

      data['dailyLoss'] = {
        accumulated: accumulated.toString(),
        maxAllowed: maxAllowed.toString(),
        remainingCapacity: remainingCapacity.toString(),
        utilizationBps: maxAllowed > 0n ? ((accumulated * 10000n) / maxAllowed).toString() : '0',
        windowResetAt: windowResetAt.toString(),
        windowResetIn: windowResetAt > BigInt(now) ? `${Number(windowResetAt) - now}s` : 'expired',
        circuitBreakerTriggered: accumulated >= maxAllowed,
      };
    }

    const messages: string[] = [];
    if (input.asset) {
      const assetOracle = data['assetOracle'] as { message: string };
      messages.push(assetOracle.message);
    }
    if (input.includeDailyLoss) {
      const dailyLoss = data['dailyLoss'] as { circuitBreakerTriggered: boolean };
      messages.push(
        dailyLoss.circuitBreakerTriggered
          ? 'Circuit breaker is TRIGGERED — vault is paused.'
          : 'Circuit breaker is healthy.',
      );
    }

    return {
      success: true,
      data,
      message: messages.join(' ') || `Oracle status for vault ${vaultAddress}.`,
    };
  }
}
