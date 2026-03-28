import { describe, expect, it } from 'vitest';
import { ArbitrageDetectTool } from '../src/tools/arbitrage-detect.js';

const TOKEN_A = '0x00000000000000000000000000000000000000a1' as const;
const TOKEN_B = '0x00000000000000000000000000000000000000b1' as const;
const TOKEN_C = '0x00000000000000000000000000000000000000c1' as const;
const TOKEN_D = '0x00000000000000000000000000000000000000d1' as const;
const TOKEN_E = '0x00000000000000000000000000000000000000e1' as const;

const PAIR_AB = '0x0000000000000000000000000000000000000ab1' as const;
const PAIR_AC = '0x0000000000000000000000000000000000000ac1' as const;
const PAIR_CB = '0x0000000000000000000000000000000000000cb1' as const;
const PAIR_AD = '0x0000000000000000000000000000000000000ad1' as const;
const PAIR_AE = '0x0000000000000000000000000000000000000ae1' as const;
const PAIR_ED = '0x0000000000000000000000000000000000000ed1' as const;

const pairDefinitions = [
  { label: 'A/B', address: PAIR_AB },
  { label: 'A/C', address: PAIR_AC },
  { label: 'C/B', address: PAIR_CB },
  { label: 'A/D', address: PAIR_AD },
  { label: 'A/E', address: PAIR_AE },
  { label: 'E/D', address: PAIR_ED },
] as const;

const mockPoolStates = [
  { label: 'A/B', address: PAIR_AB, token0: TOKEN_A, token1: TOKEN_B, reserve0: 1_000_000n, reserve1: 900_000n },
  { label: 'A/C', address: PAIR_AC, token0: TOKEN_A, token1: TOKEN_C, reserve0: 1_000_000n, reserve1: 1_250_000n },
  { label: 'C/B', address: PAIR_CB, token0: TOKEN_C, token1: TOKEN_B, reserve0: 1_000_000n, reserve1: 1_220_000n },
  { label: 'A/D', address: PAIR_AD, token0: TOKEN_A, token1: TOKEN_D, reserve0: 1_000_000n, reserve1: 980_000n },
  { label: 'A/E', address: PAIR_AE, token0: TOKEN_A, token1: TOKEN_E, reserve0: 1_000_000n, reserve1: 1_070_000n },
  { label: 'E/D', address: PAIR_ED, token0: TOKEN_E, token1: TOKEN_D, reserve0: 1_000_000n, reserve1: 1_020_000n },
] as const;

describe('ArbitrageDetectTool', () => {
  it('returns top opportunities sorted by spread', async () => {
    const tool = new ArbitrageDetectTool({
      pairDefinitions,
      fetchPoolStates: async () => [...mockPoolStates],
    });

    const raw = await tool.invoke(JSON.stringify({ amountIn: '10000', thresholdBps: 50, maxOpportunities: 2 }));
    const result = JSON.parse(raw) as {
      success: boolean;
      data: {
        opportunities: Array<{
          directPair: string;
          betterRoute: string[];
          spreadBps: number;
          routeHops: Array<{ pool: string }>;
        }>;
        mode: string;
      };
    };

    expect(result.success).toBe(true);
    expect(result.data.mode).toBe('mock');
    expect(result.data.opportunities).toHaveLength(2);
    expect(result.data.opportunities[0]?.directPair).toBe('A/B');
    expect(result.data.opportunities[0]?.betterRoute).toEqual(['A/C', 'C/B']);
    expect(result.data.opportunities[0]?.spreadBps).toBeGreaterThan(result.data.opportunities[1]?.spreadBps ?? 0);
    expect(result.data.opportunities[0]?.routeHops.map((hop) => hop.pool)).toEqual([PAIR_AC, PAIR_CB]);
  });

  it('filters scanned pairs when pair labels are supplied', async () => {
    const tool = new ArbitrageDetectTool({
      pairDefinitions,
      fetchPoolStates: async (pairs) =>
        mockPoolStates.filter((pool) => pairs.some((pair) => pair.address === pool.address)),
    });

    const raw = await tool.invoke(
      JSON.stringify({ amountIn: '10000', thresholdBps: 50, pairs: ['A/B', 'A/C', 'C/B'] }),
    );
    const result = JSON.parse(raw) as {
      success: boolean;
      data: { scannedPairs: number; opportunities: Array<{ directPair: string }> };
    };

    expect(result.success).toBe(true);
    expect(result.data.scannedPairs).toBe(3);
    expect(result.data.opportunities.some((opportunity) => opportunity.directPair === 'A/B')).toBe(true);
    expect(
      result.data.opportunities.every((opportunity) => ['A/B', 'A/C', 'C/B'].includes(opportunity.directPair)),
    ).toBe(true);
  });

  it('returns an error when no matching pair labels exist', async () => {
    const tool = new ArbitrageDetectTool({
      pairDefinitions,
      fetchPoolStates: async () => [...mockPoolStates],
    });

    const raw = await tool.invoke(JSON.stringify({ pairs: ['missing-pair'] }));
    const result = JSON.parse(raw) as { success: boolean; error: string };

    expect(result.success).toBe(false);
    expect(result.error).toContain('Available pairs');
  });

  it('rejects invalid JSON input', async () => {
    const tool = new ArbitrageDetectTool({
      pairDefinitions,
      fetchPoolStates: async () => [...mockPoolStates],
    });

    const raw = await tool.invoke('not-json');
    const result = JSON.parse(raw) as { success: boolean; error: string };

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid JSON input');
  });
});
