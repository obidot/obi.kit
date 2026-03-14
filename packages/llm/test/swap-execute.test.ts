import { describe, expect, it } from 'vitest';
import { SwapExecuteTool } from '../src/tools/swap-execute.js';

const MOCK_ROUTER = '0xfbc3fEB4DA6f00049af278eC3ecaCAFF7f08DDbB';
const MOCK_QUOTER = '0x81d7aCFEF474DA6c76eC1b5A05a137cB9f3A5Db1';
const MOCK_DOT = '0xE72453bD8d5ECF56ccdDeF949C8AE0Cea5A41E7d';
const MOCK_USDC = '0xAf233E9f2ED78022CAdEA58a84144ce6BcDFd63E';
const MOCK_POOL = '0xf6cDB6CF3e2a37126485a2EF919cA04D19d2ADd5';

const validInput = {
  poolType: 0,
  pool: MOCK_POOL,
  tokenIn: MOCK_DOT,
  tokenOut: MOCK_USDC,
  amountIn: '1000000000000000000',
  minAmountOut: '0',
};

describe('SwapExecuteTool', () => {
  describe('construction', () => {
    it('creates with router address', () => {
      const tool = new SwapExecuteTool({ routerAddress: MOCK_ROUTER });
      expect(tool.name).toBe('swap_execute');
    });

    it('accepts quoter and slippage config', () => {
      const tool = new SwapExecuteTool({
        routerAddress: MOCK_ROUTER,
        quoterAddress: MOCK_QUOTER,
        slippageBps: 100,
      });
      expect(tool.name).toBe('swap_execute');
    });
  });

  describe('offline mode (no EVM context)', () => {
    it('returns stub result when no walletClient', async () => {
      const tool = new SwapExecuteTool({ routerAddress: MOCK_ROUTER });
      const raw = await tool.invoke(JSON.stringify(validInput));
      const result = JSON.parse(raw) as { success: boolean; data: { mode: string } };
      expect(result.success).toBe(true);
      expect(result.data.mode).toBe('stub');
    });

    it('returns error when no router address', async () => {
      const tool = new SwapExecuteTool({});
      const raw = await tool.invoke(JSON.stringify(validInput));
      const result = JSON.parse(raw) as { success: boolean; error: string };
      expect(result.success).toBe(false);
      expect(result.error).toContain('SwapRouter');
    });
  });

  describe('input validation', () => {
    it('rejects missing poolType', async () => {
      const tool = new SwapExecuteTool({ routerAddress: MOCK_ROUTER });
      const input = { pool: MOCK_POOL, tokenIn: MOCK_DOT, tokenOut: MOCK_USDC, amountIn: '100', minAmountOut: '0' };
      const raw = await tool.invoke(JSON.stringify(input));
      const result = JSON.parse(raw) as { success: boolean; error: string };
      expect(result.success).toBe(false);
    });

    it('rejects invalid JSON', async () => {
      const tool = new SwapExecuteTool({ routerAddress: MOCK_ROUTER });
      const raw = await tool.invoke('not-json');
      const result = JSON.parse(raw) as { success: boolean; error: string };
      expect(result.success).toBe(false);
    });
  });
});
