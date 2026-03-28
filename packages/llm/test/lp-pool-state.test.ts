import { describe, expect, it, vi } from 'vitest';
import { LpPoolStateTool } from '../src/tools/lp-pool-state.js';

const MOCK_PAIR = '0x9576F7b40bC3a8Bb5d236Cd4bEBC29dC40AF0fa4';

describe('LpPoolStateTool', () => {
  it('returns reserves and ratio for a known pair label', async () => {
    const readContract = vi
      .fn()
      .mockResolvedValueOnce('0xtoken0')
      .mockResolvedValueOnce('0xtoken1')
      .mockResolvedValueOnce([1_000n, 2_500n, 0])
      .mockResolvedValueOnce(10_000n);

    const tool = new LpPoolStateTool({
      evmContext: {
        client: { readContract } as never,
      } as never,
    });

    const raw = await tool.invoke('tDOT/tUSDC');
    const result = JSON.parse(raw) as {
      pair: string;
      token0: string;
      token1: string;
      reserve0: string;
      reserve1: string;
      totalSupply: string;
      priceRatio: string;
    };

    expect(result.token0).toBe('0xtoken0');
    expect(result.token1).toBe('0xtoken1');
    expect(result.reserve0).toBe('1000');
    expect(result.reserve1).toBe('2500');
    expect(result.totalSupply).toBe('10000');
    expect(result.priceRatio).toBe('2.500000');
    expect(typeof result.pair).toBe('string');
  });

  it('returns a readable error for an unknown pair label', async () => {
    const tool = new LpPoolStateTool({
      evmContext: {
        client: { readContract: vi.fn() } as never,
      } as never,
    });

    const raw = await tool.invoke('not-a-pair');

    expect(raw).toContain('Error reading LP pool state');
    expect(raw).toContain('Unknown pair');
  });

  it('accepts a raw pair address', async () => {
    const readContract = vi
      .fn()
      .mockResolvedValueOnce('0xtoken0')
      .mockResolvedValueOnce('0xtoken1')
      .mockResolvedValueOnce([0n, 500n, 0])
      .mockResolvedValueOnce(123n);

    const tool = new LpPoolStateTool({
      evmContext: {
        client: { readContract } as never,
      } as never,
    });

    const raw = await tool.invoke(MOCK_PAIR);
    const result = JSON.parse(raw) as { pair: string; priceRatio: string };

    expect(result.pair).toBe(MOCK_PAIR);
    expect(result.priceRatio).toBe('0');
  });
});
