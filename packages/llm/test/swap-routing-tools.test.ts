import { describe, expect, it, vi } from 'vitest';
import { ExecuteLocalSwapTool } from '../src/tools/execute-local-swap.js';
import { SwapMultiHopTool } from '../src/tools/swap-multi-hop.js';
import { SwapQuoteTool } from '../src/tools/swap-quote.js';

const MOCK_ACCOUNT = '0x1111111111111111111111111111111111111111' as const;
const MOCK_QUOTER = '0x81d7aCFEF474DA6c76eC1b5A05a137cB9f3A5Db1' as const;
const MOCK_ROUTER = '0xfbc3fEB4DA6f00049af278eC3ecaCAFF7f08DDbB' as const;
const MOCK_VAULT = '0x03473a95971Ba0496786a615e21b1e87bDFf0025' as const;
const MOCK_DOT = '0xE72453bD8d5ECF56ccdDeF949C8AE0Cea5A41E7d' as const;
const MOCK_USDC = '0xAf233E9f2ED78022CAdEA58a84144ce6BcDFd63E' as const;
const MOCK_POOL = '0xf6cDB6CF3e2a37126485a2EF919cA04D19d2ADd5' as const;

const validMultiHopRoute = {
  poolType: 0,
  pool: MOCK_POOL,
  tokenIn: MOCK_DOT,
  tokenOut: MOCK_USDC,
  feeBps: '30',
  data: '0x',
};

const validExecuteLocalSwapInput = {
  poolType: 0,
  pool: MOCK_POOL,
  tokenIn: MOCK_DOT,
  tokenOut: MOCK_USDC,
  amountIn: '1000',
  minAmountOut: '900',
  asset: MOCK_DOT,
  amount: '1000',
  minReturn: '900',
  maxSlippageBps: '100',
  deadline: '1735689600',
  nonce: '7',
  signature: '0x1234',
};

describe('SwapQuoteTool', () => {
  it('returns a stub result when no EVM context is configured', async () => {
    const tool = new SwapQuoteTool({ quoterAddress: MOCK_QUOTER });
    const raw = await tool.invoke(
      JSON.stringify({
        tokenIn: MOCK_DOT,
        tokenOut: MOCK_USDC,
        amountIn: '1000',
      }),
    );
    const result = JSON.parse(raw) as { success: boolean; data: { mode: string } };

    expect(result.success).toBe(true);
    expect(result.data.mode).toBe('stub');
  });

  it('returns an error when no quoter address is configured', async () => {
    const tool = new SwapQuoteTool({});
    const raw = await tool.invoke(
      JSON.stringify({
        tokenIn: MOCK_DOT,
        tokenOut: MOCK_USDC,
        amountIn: '1000',
      }),
    );
    const result = JSON.parse(raw) as { success: boolean; error: string };

    expect(result.success).toBe(false);
    expect(result.error).toContain('SwapQuoter');
  });

  it('returns the best quote in EVM mode', async () => {
    const readContract = vi.fn().mockResolvedValue({
      source: 3,
      pool: MOCK_POOL,
      feeBps: 30n,
      amountIn: 1000n,
      amountOut: 950n,
    });

    const tool = new SwapQuoteTool({
      quoterAddress: MOCK_QUOTER,
      evmContext: {
        client: { readContract } as never,
      } as never,
    });

    const raw = await tool.invoke(
      JSON.stringify({
        tokenIn: MOCK_DOT,
        tokenOut: MOCK_USDC,
        amountIn: '1000',
      }),
    );
    const result = JSON.parse(raw) as {
      success: boolean;
      data: { mode: string; bestQuote: { amountOut: string; source: number } };
    };

    expect(result.success).toBe(true);
    expect(result.data.mode).toBe('evm');
    expect(result.data.bestQuote.amountOut).toBe('950');
    expect(result.data.bestQuote.source).toBe(3);
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: MOCK_QUOTER,
        functionName: 'getBestQuote',
      }),
    );
  }, 45_000);

  it('returns all quotes when requested', async () => {
    const readContract = vi.fn().mockResolvedValue([
      {
        source: 1,
        pool: MOCK_POOL,
        feeBps: 30n,
        amountIn: 1000n,
        amountOut: 910n,
      },
      {
        source: 3,
        pool: MOCK_POOL,
        feeBps: 25n,
        amountIn: 1000n,
        amountOut: 950n,
      },
    ]);

    const tool = new SwapQuoteTool({
      quoterAddress: MOCK_QUOTER,
      evmContext: {
        client: { readContract } as never,
      } as never,
    });

    const raw = await tool.invoke(
      JSON.stringify({
        tokenIn: MOCK_DOT,
        tokenOut: MOCK_USDC,
        amountIn: '1000',
        allQuotes: true,
      }),
    );
    const result = JSON.parse(raw) as {
      success: boolean;
      data: { quotesCount: number; quotes: Array<{ amountOut: string; source: number }> };
    };

    expect(result.success).toBe(true);
    expect(result.data.quotesCount).toBe(2);
    expect(result.data.quotes[1]).toEqual(
      expect.objectContaining({
        source: 3,
        amountOut: '950',
      }),
    );
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: MOCK_QUOTER,
        functionName: 'getAllQuotes',
      }),
    );
  });
});

describe('SwapMultiHopTool', () => {
  it('returns a stub result when no wallet client is configured', async () => {
    const tool = new SwapMultiHopTool({ routerAddress: MOCK_ROUTER });
    const raw = await tool.invoke(
      JSON.stringify({
        routes: [validMultiHopRoute],
        amountIn: '1000',
        minAmountOut: '900',
      }),
    );
    const result = JSON.parse(raw) as { success: boolean; data: { mode: string; status: string } };

    expect(result.success).toBe(true);
    expect(result.data.mode).toBe('stub');
    expect(result.data.status).toBe('pending');
  });

  it('returns an error when no router is configured', async () => {
    const tool = new SwapMultiHopTool({});
    const raw = await tool.invoke(
      JSON.stringify({
        routes: [validMultiHopRoute],
        amountIn: '1000',
        minAmountOut: '900',
      }),
    );
    const result = JSON.parse(raw) as { success: boolean; error: string };

    expect(result.success).toBe(false);
    expect(result.error).toContain('SwapRouter');
  });

  it('approves the first hop token and executes the multi-hop swap in EVM mode', async () => {
    const readContract = vi.fn().mockResolvedValue(0n);
    const writeContract = vi.fn().mockResolvedValueOnce('0xapprove').mockResolvedValueOnce('0xswap');
    const waitForTransactionReceipt = vi
      .fn()
      .mockResolvedValueOnce({ status: 'success', blockNumber: 11n })
      .mockResolvedValueOnce({ status: 'success', blockNumber: 12n });

    const tool = new SwapMultiHopTool({
      routerAddress: MOCK_ROUTER,
      evmContext: {
        client: {
          readContract,
          waitForTransactionReceipt,
        } as never,
        walletClient: {
          writeContract,
        } as never,
        chain: {} as never,
        account: MOCK_ACCOUNT,
      },
    });

    const raw = await tool.invoke(
      JSON.stringify({
        routes: [
          validMultiHopRoute,
          {
            poolType: 3,
            pool: MOCK_POOL,
            tokenIn: MOCK_USDC,
            tokenOut: MOCK_DOT,
          },
        ],
        amountIn: '1000',
        minAmountOut: '900',
      }),
    );
    const result = JSON.parse(raw) as {
      success: boolean;
      txHash: string;
      data: { approvalTxHash?: string; mode: string; status: string; blockNumber: number };
    };

    expect(result.success).toBe(true);
    expect(result.txHash).toBe('0xswap');
    expect(result.data.mode).toBe('evm');
    expect(result.data.status).toBe('confirmed');
    expect(result.data.approvalTxHash).toBe('0xapprove');
    expect(result.data.blockNumber).toBe(12);
    expect(writeContract).toHaveBeenLastCalledWith(
      expect.objectContaining({
        address: MOCK_ROUTER,
        functionName: 'swapMultiHop',
      }),
    );
  });
});

describe('ExecuteLocalSwapTool', () => {
  it('returns a stub result when no wallet client is configured', async () => {
    const tool = new ExecuteLocalSwapTool({
      vaultConfig: {
        vaultAddress: MOCK_VAULT,
        assetAddress: MOCK_DOT,
        assetDecimals: 18,
      },
    });
    const raw = await tool.invoke(JSON.stringify(validExecuteLocalSwapInput));
    const result = JSON.parse(raw) as { success: boolean; data: { mode: string; status: string } };

    expect(result.success).toBe(true);
    expect(result.data.mode).toBe('stub');
    expect(result.data.status).toBe('pending');
  });

  it('returns an error when no vault is configured', async () => {
    const tool = new ExecuteLocalSwapTool({});
    const raw = await tool.invoke(JSON.stringify(validExecuteLocalSwapInput));
    const result = JSON.parse(raw) as { success: boolean; error: string };

    expect(result.success).toBe(false);
    expect(result.error).toContain('vault');
  });

  it('executes a local swap in EVM mode', async () => {
    const writeContract = vi.fn().mockResolvedValue('0xlocalswap');
    const waitForTransactionReceipt = vi.fn().mockResolvedValue({ status: 'success', blockNumber: 33n });

    const tool = new ExecuteLocalSwapTool({
      vaultConfig: {
        vaultAddress: MOCK_VAULT,
        assetAddress: MOCK_DOT,
        assetDecimals: 18,
      },
      evmContext: {
        client: {
          waitForTransactionReceipt,
        } as never,
        walletClient: {
          writeContract,
        } as never,
        chain: {} as never,
        account: MOCK_ACCOUNT,
      },
    });

    const raw = await tool.invoke(JSON.stringify(validExecuteLocalSwapInput));
    const result = JSON.parse(raw) as {
      success: boolean;
      txHash: string;
      data: { mode: string; status: string; blockNumber: number };
    };

    expect(result.success).toBe(true);
    expect(result.txHash).toBe('0xlocalswap');
    expect(result.data.mode).toBe('evm');
    expect(result.data.status).toBe('confirmed');
    expect(result.data.blockNumber).toBe(33);
    expect(writeContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: MOCK_VAULT,
        functionName: 'executeLocalSwap',
      }),
    );
  });
});
