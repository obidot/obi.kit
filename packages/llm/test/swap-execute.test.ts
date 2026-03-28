import type { ObiEvmContext } from '@obidot-kit/core';
import { describe, expect, it, vi } from 'vitest';
import { SwapExecuteTool } from '../src/tools/swap-execute.js';

const MOCK_ROUTER = '0xfbc3fEB4DA6f00049af278eC3ecaCAFF7f08DDbB';
const MOCK_QUOTER = '0x81d7aCFEF474DA6c76eC1b5A05a137cB9f3A5Db1';
const MOCK_DOT = '0xE72453bD8d5ECF56ccdDeF949C8AE0Cea5A41E7d';
const MOCK_USDC = '0xAf233E9f2ED78022CAdEA58a84144ce6BcDFd63E';
const MOCK_POOL = '0xf6cDB6CF3e2a37126485a2EF919cA04D19d2ADd5';
const MOCK_ACCOUNT = '0x3333333333333333333333333333333333333333';

const mockChain = {
  id: 420420417,
  name: 'Polkadot Hub TestNet',
  nativeCurrency: { name: 'DOT', symbol: 'DOT', decimals: 10 },
  rpcUrls: { default: { http: ['https://eth-rpc-testnet.polkadot.io/'] } },
};

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

    it('rejects non-object JSON payloads', async () => {
      const tool = new SwapExecuteTool({ routerAddress: MOCK_ROUTER });
      const raw = await tool.invoke('"just-a-string"');
      const result = JSON.parse(raw) as { success: boolean; error: string };
      expect(result.success).toBe(false);
      expect(result.error).toContain('JSON object');
    });
  });

  describe('evm mode', () => {
    it('computes minAmountOut from the quoter and skips approval when allowance is sufficient', async () => {
      const mockReadContract = vi
        .fn()
        .mockResolvedValueOnce({ amountOut: 1_500n })
        .mockResolvedValueOnce(2_000_000_000_000_000_000n);
      const mockWriteContract = vi.fn().mockResolvedValue('0xdeadbeef');
      const mockWaitForReceipt = vi.fn().mockResolvedValue({
        status: 'success',
        blockNumber: 42n,
      });

      const tool = new SwapExecuteTool({
        evmContext: {
          client: {
            readContract: mockReadContract,
            waitForTransactionReceipt: mockWaitForReceipt,
          } as ObiEvmContext['client'],
          walletClient: {
            writeContract: mockWriteContract,
          } as ObiEvmContext['walletClient'],
          account: MOCK_ACCOUNT,
          chain: mockChain,
        },
        routerAddress: MOCK_ROUTER,
        quoterAddress: MOCK_QUOTER,
      });

      const raw = await tool.invoke(JSON.stringify(validInput));
      const result = JSON.parse(raw) as {
        success: boolean;
        txHash: string;
        data: { minAmountOut: string; approvalTxHash?: string; to: string; status: string };
      };

      expect(result.success).toBe(true);
      expect(result.txHash).toBe('0xdeadbeef');
      expect(result.data.minAmountOut).toBe('1470');
      expect(result.data.approvalTxHash).toBeUndefined();
      expect(result.data.to).toBe(MOCK_ACCOUNT);
      expect(result.data.status).toBe('confirmed');
      expect(mockReadContract).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          address: MOCK_QUOTER,
          functionName: 'getBestQuote',
          args: [MOCK_POOL, MOCK_DOT, MOCK_USDC, 1_000_000_000_000_000_000n],
        }),
      );
      expect(mockReadContract).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          address: MOCK_DOT,
          functionName: 'allowance',
          args: [MOCK_ACCOUNT, MOCK_ROUTER],
        }),
      );
      expect(mockWriteContract).toHaveBeenCalledTimes(1);
      expect(mockWriteContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: MOCK_ROUTER,
          functionName: 'swap',
          account: MOCK_ACCOUNT,
          args: [
            expect.objectContaining({
              amountIn: 1_000_000_000_000_000_000n,
              minAmountOut: 1470n,
              to: MOCK_ACCOUNT,
            }),
          ],
        }),
      );
      expect(mockWaitForReceipt).toHaveBeenCalledWith({ hash: '0xdeadbeef' });
    }, 15_000);

    it('approves before swapping and preserves explicit execution fields', async () => {
      const mockReadContract = vi.fn().mockResolvedValueOnce(0n);
      const mockWriteContract = vi.fn().mockResolvedValueOnce('0xapprove').mockResolvedValueOnce('0xswap');
      const mockWaitForReceipt = vi
        .fn()
        .mockResolvedValueOnce({ status: 'success', blockNumber: 11n })
        .mockResolvedValueOnce({ status: 'reverted', blockNumber: 12n });

      const tool = new SwapExecuteTool({
        evmContext: {
          client: {
            readContract: mockReadContract,
            waitForTransactionReceipt: mockWaitForReceipt,
          } as ObiEvmContext['client'],
          walletClient: {
            writeContract: mockWriteContract,
          } as ObiEvmContext['walletClient'],
          account: MOCK_ACCOUNT,
          chain: mockChain,
        },
        routerAddress: MOCK_ROUTER,
      });

      const raw = await tool.invoke(
        JSON.stringify({
          ...validInput,
          feeBps: '30',
          data: '0x1234',
          minAmountOut: '900',
          to: MOCK_USDC,
          deadline: '1234567890',
        }),
      );
      const result = JSON.parse(raw) as {
        success: boolean;
        txHash: string;
        data: { approvalTxHash?: string; status: string; minAmountOut: string; to: string };
      };

      expect(result.success).toBe(true);
      expect(result.txHash).toBe('0xswap');
      expect(result.data.approvalTxHash).toBe('0xapprove');
      expect(result.data.status).toBe('failed');
      expect(result.data.minAmountOut).toBe('900');
      expect(result.data.to).toBe(MOCK_USDC);
      expect(mockWriteContract).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          address: MOCK_DOT,
          functionName: 'approve',
          args: [MOCK_ROUTER, 1_000_000_000_000_000_000n],
        }),
      );
      expect(mockWriteContract).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          address: MOCK_ROUTER,
          functionName: 'swap',
          args: [
            expect.objectContaining({
              route: expect.objectContaining({
                feeBps: 30n,
                data: '0x1234',
              }),
              minAmountOut: 900n,
              to: MOCK_USDC,
              deadline: 1234567890n,
            }),
          ],
        }),
      );
    }, 15_000);

    it('returns an error when wallet context is missing an account', async () => {
      const tool = new SwapExecuteTool({
        evmContext: {
          client: {
            readContract: vi.fn(),
            waitForTransactionReceipt: vi.fn(),
          } as ObiEvmContext['client'],
          walletClient: {
            writeContract: vi.fn(),
          } as ObiEvmContext['walletClient'],
          chain: mockChain,
        },
        routerAddress: MOCK_ROUTER,
      });

      const raw = await tool.invoke(JSON.stringify(validInput));
      const result = JSON.parse(raw) as { success: boolean; error: string };

      expect(result.success).toBe(false);
      expect(result.error).toContain('Signer account required');
    });
  });
});
