import type { ObiEvmContext } from '@obidot-kit/core';
import { describe, expect, it, vi } from 'vitest';
import { WithdrawalQueueTool } from '../src/tools/withdrawal-queue.js';

const MOCK_VAULT = '0x03473a95971Ba0496786a615e21b1e87bDFf0025';
const MOCK_ASSET = '0x1111111111111111111111111111111111111111';
const MOCK_ACCOUNT = '0x3333333333333333333333333333333333333333';

const mockChain = {
  id: 420420417,
  name: 'Polkadot Hub TestNet',
  nativeCurrency: { name: 'DOT', symbol: 'DOT', decimals: 10 },
  rpcUrls: { default: { http: ['https://eth-rpc-testnet.polkadot.io/'] } },
};

describe('WithdrawalQueueTool', () => {
  it('exposes the expected name and description', () => {
    const tool = new WithdrawalQueueTool({});
    expect(tool.name).toBe('withdrawal_queue');
    expect(tool.description).toContain('withdrawal queue');
  });

  it('returns an error when no vault is configured', async () => {
    const tool = new WithdrawalQueueTool({});
    const raw = await tool.invoke(JSON.stringify({ action: 'request', shares: '100' }));
    const result = JSON.parse(raw) as { success: boolean; error: string };

    expect(result.success).toBe(false);
    expect(result.error).toContain('No vault configured');
  }, 15_000);

  it('surfaces invalid action input as an error result', async () => {
    const tool = new WithdrawalQueueTool({
      vaultConfig: {
        vaultAddress: MOCK_VAULT,
        assetAddress: MOCK_ASSET,
        assetDecimals: 18,
      },
    });

    const raw = await tool.invoke(JSON.stringify({ action: 'queue' }));
    const result = JSON.parse(raw) as { success: boolean; error: string };

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid "action"');
  });

  it('returns a stub write result when no wallet client is configured', async () => {
    const tool = new WithdrawalQueueTool({
      evmContext: {
        client: {} as ObiEvmContext['client'],
        chain: mockChain,
      },
      vaultConfig: {
        vaultAddress: MOCK_VAULT,
        assetAddress: MOCK_ASSET,
        assetDecimals: 18,
      },
    });

    const raw = await tool.invoke(JSON.stringify({ action: 'request', shares: '500' }));
    const result = JSON.parse(raw) as {
      success: boolean;
      data: { mode: string; action: string; shares: string };
    };

    expect(result.success).toBe(true);
    expect(result.data.mode).toBe('stub');
    expect(result.data.action).toBe('request');
    expect(result.data.shares).toBe('500');
  });

  it('returns a stub status result when no EVM context is configured', async () => {
    const tool = new WithdrawalQueueTool({
      vaultConfig: {
        vaultAddress: MOCK_VAULT,
        assetAddress: MOCK_ASSET,
        assetDecimals: 18,
      },
    });

    const raw = await tool.invoke(JSON.stringify({ action: 'status', requestId: '7' }));
    const result = JSON.parse(raw) as {
      success: boolean;
      data: { mode: string; status: string; message: string };
    };

    expect(result.success).toBe(true);
    expect(result.data.mode).toBe('stub');
    expect(result.data.status).toBe('unknown');
    expect(result.data.message).toContain('cannot read on-chain state');
  });

  it('reads a claimable status from chain state', async () => {
    const claimableAt = Math.floor(Date.now() / 1000) - 10;
    const mockReadContract = vi.fn().mockResolvedValue([MOCK_ACCOUNT, 100n, 95n, BigInt(claimableAt)]);

    const tool = new WithdrawalQueueTool({
      evmContext: {
        client: {
          readContract: mockReadContract,
        } as ObiEvmContext['client'],
        chain: mockChain,
      },
      vaultConfig: {
        vaultAddress: MOCK_VAULT,
        assetAddress: MOCK_ASSET,
        assetDecimals: 18,
      },
    });

    const raw = await tool.invoke(JSON.stringify({ action: 'status', requestId: '9' }));
    const result = JSON.parse(raw) as {
      success: boolean;
      data: { isClaimable: boolean; isCancelled: boolean; mode: string; shares: string; assets: string };
    };

    expect(result.success).toBe(true);
    expect(result.data.mode).toBe('evm');
    expect(result.data.isClaimable).toBe(true);
    expect(result.data.isCancelled).toBe(false);
    expect(result.data.shares).toBe('100');
    expect(result.data.assets).toBe('95');
    expect(mockReadContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: MOCK_VAULT,
        functionName: 'getWithdrawalRequest',
        args: [9n],
      }),
    );
  });

  it('writes request, fulfill, and cancel actions in EVM mode', async () => {
    const mockWriteContract = vi
      .fn()
      .mockResolvedValueOnce('0xrequest')
      .mockResolvedValueOnce('0xfulfill')
      .mockResolvedValueOnce('0xcancel');
    const mockWaitForReceipt = vi
      .fn()
      .mockResolvedValueOnce({ status: 'success', blockNumber: 21n })
      .mockResolvedValueOnce({ status: 'success', blockNumber: 22n })
      .mockResolvedValueOnce({ status: 'success', blockNumber: 23n });

    const tool = new WithdrawalQueueTool({
      evmContext: {
        client: {
          waitForTransactionReceipt: mockWaitForReceipt,
        } as ObiEvmContext['client'],
        walletClient: {
          writeContract: mockWriteContract,
        } as ObiEvmContext['walletClient'],
        account: MOCK_ACCOUNT,
        chain: mockChain,
      },
      vaultConfig: {
        vaultAddress: MOCK_VAULT,
        assetAddress: MOCK_ASSET,
        assetDecimals: 18,
      },
    });

    const requestRaw = await tool.invoke(JSON.stringify({ action: 'request', shares: '500' }));
    const fulfillRaw = await tool.invoke(JSON.stringify({ action: 'fulfill', requestId: '17' }));
    const cancelRaw = await tool.invoke(JSON.stringify({ action: 'cancel', requestId: '18' }));

    const requestResult = JSON.parse(requestRaw) as { success: boolean; txHash: string; data: { action: string } };
    const fulfillResult = JSON.parse(fulfillRaw) as { success: boolean; txHash: string; data: { action: string } };
    const cancelResult = JSON.parse(cancelRaw) as { success: boolean; txHash: string; data: { action: string } };

    expect(requestResult.success).toBe(true);
    expect(requestResult.txHash).toBe('0xrequest');
    expect(requestResult.data.action).toBe('request');
    expect(fulfillResult.success).toBe(true);
    expect(fulfillResult.txHash).toBe('0xfulfill');
    expect(fulfillResult.data.action).toBe('fulfill');
    expect(cancelResult.success).toBe(true);
    expect(cancelResult.txHash).toBe('0xcancel');
    expect(cancelResult.data.action).toBe('cancel');
    expect(mockWriteContract).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        address: MOCK_VAULT,
        functionName: 'requestWithdrawal',
        args: [500n],
      }),
    );
    expect(mockWriteContract).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        address: MOCK_VAULT,
        functionName: 'fulfillWithdrawal',
        args: [17n],
      }),
    );
    expect(mockWriteContract).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        address: MOCK_VAULT,
        functionName: 'cancelWithdrawal',
        args: [18n],
      }),
    );
  }, 15_000);
});
