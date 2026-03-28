import { describe, expect, it, vi } from 'vitest';
import { OracleCheckTool } from '../src/tools/oracle-check.js';

const MOCK_VAULT = '0x03473a95971Ba0496786a615e21b1e87bDFf0025' as const;
const MOCK_ASSET = '0xE72453bD8d5ECF56ccdDeF949C8AE0Cea5A41E7d' as const;

describe('OracleCheckTool', () => {
  it('returns a stub result when no EVM context is configured', async () => {
    const tool = new OracleCheckTool({
      vaultConfig: { vaultAddress: MOCK_VAULT, assetAddress: MOCK_ASSET, assetDecimals: 18 },
    });
    const raw = await tool.invoke('{}');
    const result = JSON.parse(raw) as { success: boolean; data: { mode: string } };

    expect(result.success).toBe(true);
    expect(result.data.mode).toBe('stub');
  });

  it('returns an error when no vault is configured', async () => {
    const tool = new OracleCheckTool({});
    const raw = await tool.invoke('{}');
    const result = JSON.parse(raw) as { success: boolean; error: string };

    expect(result.success).toBe(false);
    expect(result.error).toContain('vault');
  });

  it('reads oracle freshness and daily loss status in EVM mode', async () => {
    const readContract = vi
      .fn()
      .mockResolvedValueOnce('0xpriceOracle')
      .mockResolvedValueOnce('0xoracleRegistry')
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce([25n, 100n, BigInt(Math.floor(Date.now() / 1000) + 300)]);

    const tool = new OracleCheckTool({
      vaultConfig: { vaultAddress: MOCK_VAULT, assetAddress: MOCK_ASSET, assetDecimals: 18 },
      evmContext: {
        client: { readContract } as never,
      } as never,
    });

    const raw = await tool.invoke(
      JSON.stringify({
        asset: MOCK_ASSET,
        includeDailyLoss: true,
      }),
    );
    const result = JSON.parse(raw) as {
      success: boolean;
      message: string;
      data: {
        mode: string;
        assetOracle: { status: string };
        dailyLoss: { circuitBreakerTriggered: boolean; remainingCapacity: string };
      };
    };

    expect(result.success).toBe(true);
    expect(result.data.mode).toBe('evm');
    expect(result.data.assetOracle.status).toBe('fresh');
    expect(result.data.dailyLoss.circuitBreakerTriggered).toBe(false);
    expect(result.data.dailyLoss.remainingCapacity).toBe('75');
    expect(result.message).toContain('fresh and usable');
    expect(result.message).toContain('Circuit breaker is healthy');
  }, 45_000);
});
