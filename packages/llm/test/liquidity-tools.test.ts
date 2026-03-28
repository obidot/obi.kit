import { describe, expect, it, vi } from 'vitest';
import { LiquidityAddTool, LiquidityRemoveTool } from '../src/index.js';

const MOCK_PAIR = '0x9576F7b40bC3a8Bb5d236Cd4bEBC29dC40AF0fa4';
const MOCK_ROUTER = '0xe8A26f28207Ba060c2Fd98fF5D7dF85347f0eB08';
const MOCK_TOKEN0 = '0x2402C804aD8a6217BF73D8483dA7564065c56083';
const MOCK_TOKEN1 = '0x5298FDe9E288371ECA21db04Ac5Ddba00C1ea626';
const MOCK_ACCOUNT = '0x1111111111111111111111111111111111111111' as const;

describe('LiquidityAddTool', () => {
  it('returns a stub result when no EVM context is configured', async () => {
    const tool = new LiquidityAddTool({});
    const raw = await tool.invoke(
      JSON.stringify({
        pair: 'tDOT/tUSDC',
        amountADesired: '1000',
        amountBDesired: '4000',
      }),
    );
    const result = JSON.parse(raw) as {
      success: boolean;
      data: { mode: string; pair: string };
    };

    expect(result.success).toBe(true);
    expect(result.data.mode).toBe('stub');
    expect(result.data.pair.toLowerCase()).toBe(MOCK_PAIR.toLowerCase());
  });

  it('approves both assets and calls LiquidityRouter.addLiquidity in EVM mode', async () => {
    const mockReadContract = vi
      .fn()
      .mockResolvedValueOnce(MOCK_TOKEN0)
      .mockResolvedValueOnce(MOCK_TOKEN1)
      .mockResolvedValueOnce([1_000n, 4_000n, 0])
      .mockResolvedValueOnce(100n)
      .mockResolvedValueOnce(0n)
      .mockResolvedValueOnce(0n);
    const mockWriteContract = vi
      .fn()
      .mockResolvedValueOnce('0xapprove0')
      .mockResolvedValueOnce('0xapprove1')
      .mockResolvedValueOnce('0xadd');
    const mockWaitForReceipt = vi.fn().mockResolvedValue({ status: 'success', blockNumber: 123n });

    const tool = new LiquidityAddTool({
      evmContext: {
        client: {
          readContract: mockReadContract,
          waitForTransactionReceipt: mockWaitForReceipt,
        } as never,
        walletClient: {
          writeContract: mockWriteContract,
        } as never,
        chain: {} as never,
        account: MOCK_ACCOUNT,
      },
      liquidityRouterAddress: MOCK_ROUTER,
    });

    const raw = await tool.invoke(
      JSON.stringify({
        pair: 'tDOT/tUSDC',
        amountADesired: '2000',
        amountBDesired: '12000',
        amountAMin: '1500',
        amountBMin: '7000',
      }),
    );
    const result = JSON.parse(raw) as {
      success: boolean;
      txHash: string;
      data: {
        approvalTxHashes: string[];
        amountAUsed: string;
        amountBUsed: string;
        mode: string;
      };
    };

    expect(result.success).toBe(true);
    expect(result.txHash).toBe('0xadd');
    expect(result.data.mode).toBe('evm');
    expect(result.data.approvalTxHashes).toEqual(['0xapprove0', '0xapprove1']);
    expect(result.data.amountAUsed).toBe('2000');
    expect(result.data.amountBUsed).toBe('8000');
    expect(mockWriteContract).toHaveBeenLastCalledWith(
      expect.objectContaining({
        address: MOCK_ROUTER,
        functionName: 'addLiquidity',
      }),
    );
  });
});

describe('LiquidityRemoveTool', () => {
  it('returns a stub result when no EVM context is configured', async () => {
    const tool = new LiquidityRemoveTool({});
    const raw = await tool.invoke(
      JSON.stringify({
        pair: 'tDOT/tUSDC',
        liquidity: '25',
      }),
    );
    const result = JSON.parse(raw) as {
      success: boolean;
      data: { mode: string; status: string; pair: string };
    };

    expect(result.success).toBe(true);
    expect(result.data.mode).toBe('stub');
    expect(result.data.status).toBe('pending');
    expect(result.data.pair.toLowerCase()).toBe(MOCK_PAIR.toLowerCase());
  });

  it('returns a preview when a public client exists but no signer is available', async () => {
    const mockReadContract = vi
      .fn()
      .mockResolvedValueOnce(MOCK_TOKEN0)
      .mockResolvedValueOnce(MOCK_TOKEN1)
      .mockResolvedValueOnce([1_000n, 4_000n, 0])
      .mockResolvedValueOnce(100n);

    const tool = new LiquidityRemoveTool({
      evmContext: {
        client: {
          readContract: mockReadContract,
        } as never,
      } as never,
      liquidityRouterAddress: MOCK_ROUTER,
    });

    const raw = await tool.invoke(
      JSON.stringify({
        pair: 'tDOT/tUSDC',
        liquidity: '25',
        amountAMin: '200',
        amountBMin: '800',
      }),
    );
    const result = JSON.parse(raw) as {
      success: boolean;
      data: {
        mode: string;
        status: string;
        amountAOut: string;
        amountBOut: string;
        message: string;
      };
    };

    expect(result.success).toBe(true);
    expect(result.data.mode).toBe('stub');
    expect(result.data.status).toBe('pending');
    expect(result.data.amountAOut).toBe('250');
    expect(result.data.amountBOut).toBe('1000');
    expect(result.data.message).toContain('preview prepared');
  });

  it('approves the LP token and calls LiquidityRouter.removeLiquidity in EVM mode', async () => {
    const mockReadContract = vi
      .fn()
      .mockResolvedValueOnce(MOCK_TOKEN0)
      .mockResolvedValueOnce(MOCK_TOKEN1)
      .mockResolvedValueOnce([1_000n, 4_000n, 0])
      .mockResolvedValueOnce(100n)
      .mockResolvedValueOnce(0n);
    const mockWriteContract = vi.fn().mockResolvedValueOnce('0xapproveLp').mockResolvedValueOnce('0xremove');
    const mockWaitForReceipt = vi.fn().mockResolvedValue({ status: 'success', blockNumber: 456n });

    const tool = new LiquidityRemoveTool({
      evmContext: {
        client: {
          readContract: mockReadContract,
          waitForTransactionReceipt: mockWaitForReceipt,
        } as never,
        walletClient: {
          writeContract: mockWriteContract,
        } as never,
        chain: {} as never,
        account: MOCK_ACCOUNT,
      },
      liquidityRouterAddress: MOCK_ROUTER,
    });

    const raw = await tool.invoke(
      JSON.stringify({
        pair: 'tDOT/tUSDC',
        liquidity: '25',
        amountAMin: '200',
        amountBMin: '800',
      }),
    );
    const result = JSON.parse(raw) as {
      success: boolean;
      txHash: string;
      data: {
        approvalTxHash?: string;
        amountAOut: string;
        amountBOut: string;
        mode: string;
      };
    };

    expect(result.success).toBe(true);
    expect(result.txHash).toBe('0xremove');
    expect(result.data.mode).toBe('evm');
    expect(result.data.approvalTxHash).toBe('0xapproveLp');
    expect(result.data.amountAOut).toBe('250');
    expect(result.data.amountBOut).toBe('1000');
    expect(mockWriteContract).toHaveBeenLastCalledWith(
      expect.objectContaining({
        address: MOCK_ROUTER,
        functionName: 'removeLiquidity',
      }),
    );
  });

  it('skips approval when the LP allowance is already sufficient', async () => {
    const nowSeconds = 1_710_000_000;
    vi.useFakeTimers();
    vi.setSystemTime(new Date(nowSeconds * 1000));

    try {
      const mockReadContract = vi
        .fn()
        .mockResolvedValueOnce(MOCK_TOKEN0)
        .mockResolvedValueOnce(MOCK_TOKEN1)
        .mockResolvedValueOnce([1_000n, 4_000n, 0])
        .mockResolvedValueOnce(100n)
        .mockResolvedValueOnce(25n);
      const mockWriteContract = vi.fn().mockResolvedValueOnce('0xremoveOnly');
      const mockWaitForReceipt = vi.fn().mockResolvedValue({ status: 'success', blockNumber: 789n });

      const tool = new LiquidityRemoveTool({
        evmContext: {
          client: {
            readContract: mockReadContract,
            waitForTransactionReceipt: mockWaitForReceipt,
          } as never,
          walletClient: {
            writeContract: mockWriteContract,
          } as never,
          chain: {} as never,
          account: MOCK_ACCOUNT,
        },
        liquidityRouterAddress: MOCK_ROUTER,
      });

      const raw = await tool.invoke(
        JSON.stringify({
          pair: 'tDOT/tUSDC',
          liquidity: '25',
        }),
      );
      const result = JSON.parse(raw) as {
        success: boolean;
        txHash: string;
        data: {
          approvalTxHash?: string;
          to: string;
          deadline: string;
          mode: string;
        };
      };

      expect(result.success).toBe(true);
      expect(result.txHash).toBe('0xremoveOnly');
      expect(result.data.mode).toBe('evm');
      expect(result.data.approvalTxHash).toBeUndefined();
      expect(result.data.to).toBe(MOCK_ACCOUNT);
      expect(result.data.deadline).toBe(String(nowSeconds + 300));
      expect(mockWriteContract).toHaveBeenCalledTimes(1);
      expect(mockWriteContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'removeLiquidity',
          args: [MOCK_PAIR, 25n, 0n, 0n, MOCK_ACCOUNT, BigInt(nowSeconds + 300)],
        }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns a tool error for invalid JSON or non-positive liquidity', async () => {
    const tool = new LiquidityRemoveTool({});

    const invalidJson = JSON.parse(await tool.invoke('not-json')) as { success: boolean; error: string };
    expect(invalidJson.success).toBe(false);
    expect(invalidJson.error).toContain('Invalid JSON input');

    const nonPositive = JSON.parse(
      await tool.invoke(
        JSON.stringify({
          pair: 'tDOT/tUSDC',
          liquidity: '0',
        }),
      ),
    ) as { success: boolean; error: string };
    expect(nonPositive.success).toBe(false);
    expect(nonPositive.error).toContain('Liquidity amount must be positive');
  });
});
