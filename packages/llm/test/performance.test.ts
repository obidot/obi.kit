import { describe, expect, it, vi } from 'vitest';
import { PerformanceTool } from '../src/tools/performance.js';

const MOCK_VAULT = '0x03473a95971Ba0496786a615e21b1e87bDFf0025';
const MOCK_PROTOCOL = '0x1111111111111111111111111111111111111111';
const MOCK_TREASURY = '0x2222222222222222222222222222222222222222';

describe('PerformanceTool', () => {
  it('exposes the expected name and description', () => {
    const tool = new PerformanceTool({});
    expect(tool.name).toBe('vault_performance');
    expect(tool.description).toContain('performance');
    expect(tool.description).toContain('protocol');
  });

  it('returns an error when no vault is configured', async () => {
    const tool = new PerformanceTool({});
    const raw = await tool.invoke('{}');
    const result = JSON.parse(raw) as { success: boolean; error: string };

    expect(result.success).toBe(false);
    expect(result.error).toContain('No vault configured');
  });

  it('returns a stub result when no EVM context is configured', async () => {
    const tool = new PerformanceTool({
      vaultConfig: {
        vaultAddress: MOCK_VAULT,
        assetAddress: '0x0',
        assetDecimals: 18,
      },
    });

    const raw = await tool.invoke('{}');
    const result = JSON.parse(raw) as {
      success: boolean;
      data: { vaultAddress: string; mode: string; message: string };
    };

    expect(result.success).toBe(true);
    expect(result.data.vaultAddress).toBe(MOCK_VAULT);
    expect(result.data.mode).toBe('stub');
    expect(result.data.message).toContain('No EVM context');
  });

  it('surfaces invalid JSON input as an error result', async () => {
    const tool = new PerformanceTool({
      vaultConfig: {
        vaultAddress: MOCK_VAULT,
        assetAddress: '0x0',
        assetDecimals: 18,
      },
    });

    const raw = await tool.invoke('not-json');
    const result = JSON.parse(raw) as { success: boolean; error: string };

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid JSON input');
  });

  it('reads summary and per-protocol performance in EVM mode', async () => {
    const mockReadContract = vi
      .fn()
      .mockResolvedValueOnce([100n, 250n, 2000n, MOCK_TREASURY])
      .mockResolvedValueOnce(1_000n)
      .mockResolvedValueOnce(800n)
      .mockResolvedValueOnce(250n)
      .mockResolvedValueOnce(750n)
      .mockResolvedValueOnce(5_000n)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce([900n, 1_200n, 4n, 3n, 123_456n]);

    const tool = new PerformanceTool({
      evmContext: {
        client: { readContract: mockReadContract } as never,
        walletClient: undefined,
      },
      vaultConfig: {
        vaultAddress: MOCK_VAULT,
        assetAddress: '0x0',
        assetDecimals: 18,
      },
    });

    const raw = await tool.invoke(JSON.stringify({ protocol: MOCK_PROTOCOL }));
    const result = JSON.parse(raw) as {
      success: boolean;
      data: {
        mode: string;
        performance: {
          cumulativePnL: string;
          highWaterMark: string;
          performanceFeeBps: string;
          feeTreasury: string;
        };
        vaultState: {
          totalAssets: string;
          totalSupply: string;
          idleAssets: string;
          totalRemoteAssets: string;
          depositCap: string;
          utilizationBps: string;
          paused: boolean;
          emergencyMode: boolean;
        };
        protocolPerformance: {
          protocol: string;
          totalDeployed: string;
          totalReturned: string;
          executionCount: string;
          successCount: string;
          successRate: string;
          pnl: string;
          lastExecutedAt: string;
        };
      };
      message: string;
    };

    expect(result.success).toBe(true);
    expect(result.data.mode).toBe('evm');
    expect(result.data.performance).toEqual({
      cumulativePnL: '100',
      highWaterMark: '250',
      performanceFeeBps: '2000',
      feeTreasury: MOCK_TREASURY,
    });
    expect(result.data.vaultState).toEqual({
      totalAssets: '1000',
      totalSupply: '800',
      idleAssets: '250',
      totalRemoteAssets: '750',
      depositCap: '5000',
      utilizationBps: '7500',
      paused: false,
      emergencyMode: true,
    });
    expect(result.data.protocolPerformance).toEqual({
      protocol: MOCK_PROTOCOL,
      totalDeployed: '900',
      totalReturned: '1200',
      executionCount: '4',
      successCount: '3',
      successRate: '7500 bps',
      pnl: '300',
      lastExecutedAt: '123456',
    });
    expect(result.message).toContain(MOCK_VAULT);
    expect(mockReadContract).toHaveBeenCalledTimes(9);
  }, 45_000);

  it('supports protocol-only reads when includeSummary is false', async () => {
    const mockReadContract = vi.fn().mockResolvedValueOnce([900n, 1_000n, 0n, 0n, 44n]);

    const tool = new PerformanceTool({
      evmContext: {
        client: { readContract: mockReadContract } as never,
        walletClient: undefined,
      },
      vaultConfig: {
        vaultAddress: MOCK_VAULT,
        assetAddress: '0x0',
        assetDecimals: 18,
      },
    });

    const raw = await tool.invoke(JSON.stringify({ protocol: MOCK_PROTOCOL, includeSummary: false }));
    const result = JSON.parse(raw) as {
      success: boolean;
      data: {
        vaultAddress: string;
        mode: string;
        performance?: unknown;
        vaultState?: unknown;
        protocolPerformance: {
          protocol: string;
          successRate: string;
          pnl: string;
        };
      };
    };

    expect(result.success).toBe(true);
    expect(result.data.vaultAddress).toBe(MOCK_VAULT);
    expect(result.data.mode).toBe('evm');
    expect(result.data.performance).toBeUndefined();
    expect(result.data.vaultState).toBeUndefined();
    expect(result.data.protocolPerformance).toEqual({
      protocol: MOCK_PROTOCOL,
      totalDeployed: '900',
      totalReturned: '1000',
      executionCount: '0',
      successCount: '0',
      successRate: 'N/A',
      pnl: '100',
      lastExecutedAt: '44',
    });
    expect(mockReadContract).toHaveBeenCalledTimes(1);
  });
});
