import type { ObiEvmContext } from '@obidot-kit/core';
import { describe, expect, it, vi } from 'vitest';
import { BatchStrategyTool } from '../src/tools/batch-strategy.js';

const MOCK_VAULT = '0x03473a95971Ba0496786a615e21b1e87bDFf0025';
const MOCK_ACCOUNT = '0x3333333333333333333333333333333333333333';
const MOCK_ASSET = '0x1111111111111111111111111111111111111111';
const MOCK_PROTOCOL = '0x2222222222222222222222222222222222222222';

const mockChain = {
  id: 420420417,
  name: 'Polkadot Hub TestNet',
  nativeCurrency: { name: 'DOT', symbol: 'DOT', decimals: 10 },
  rpcUrls: { default: { http: ['https://eth-rpc-testnet.polkadot.io/'] } },
};

const validStrategy = {
  asset: MOCK_ASSET,
  amount: '1000',
  minReturn: '950',
  maxSlippageBps: '50',
  deadline: '999999',
  nonce: '7',
  xcmCall: '0x1234',
  targetParachain: 1000,
  targetProtocol: MOCK_PROTOCOL,
  signature: '0xabcdef',
};

describe('BatchStrategyTool', () => {
  it('exposes the expected name and description', () => {
    const tool = new BatchStrategyTool({});
    expect(tool.name).toBe('execute_batch_strategies');
    expect(tool.description).toContain('Batch multiple');
    expect(tool.description).toContain('EIP-712');
  });

  it('returns an error when no vault is configured', async () => {
    const tool = new BatchStrategyTool({});
    const raw = await tool.invoke(JSON.stringify({ strategies: [validStrategy] }));
    const result = JSON.parse(raw) as { success: boolean; error: string };

    expect(result.success).toBe(false);
    expect(result.error).toContain('No vault configured');
  });

  it('returns a stub result when no wallet client is configured', async () => {
    const tool = new BatchStrategyTool({
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

    const raw = await tool.invoke(JSON.stringify({ strategies: [validStrategy, validStrategy] }));
    const result = JSON.parse(raw) as {
      success: boolean;
      data: { mode: string; batchSize: number; message: string };
    };

    expect(result.success).toBe(true);
    expect(result.data.mode).toBe('stub');
    expect(result.data.batchSize).toBe(2);
    expect(result.data.message).toContain('Batch of 2 strategies prepared');
  });

  it('surfaces malformed strategies input as an error result', async () => {
    const tool = new BatchStrategyTool({
      vaultConfig: {
        vaultAddress: MOCK_VAULT,
        assetAddress: MOCK_ASSET,
        assetDecimals: 18,
      },
    });

    const raw = await tool.invoke(JSON.stringify({ strategies: [{ ...validStrategy, targetParachain: '1000' }] }));
    const result = JSON.parse(raw) as { success: boolean; error: string };

    expect(result.success).toBe(false);
    expect(result.error).toContain('targetParachain');
  });

  it('writes the batch strategies in EVM mode', async () => {
    const mockWriteContract = vi.fn().mockResolvedValue('0xdeadbeef');
    const mockWaitForReceipt = vi.fn().mockResolvedValue({
      status: 'success',
      blockNumber: 55n,
    });

    const tool = new BatchStrategyTool({
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

    const raw = await tool.invoke(JSON.stringify({ strategies: [validStrategy] }));
    const result = JSON.parse(raw) as {
      success: boolean;
      txHash: string;
      blockNumber: number;
      data: { mode: string; batchSize: number; status: string };
    };

    expect(result.success).toBe(true);
    expect(result.txHash).toBe('0xdeadbeef');
    expect(result.blockNumber).toBe(55);
    expect(result.data.mode).toBe('evm');
    expect(result.data.batchSize).toBe(1);
    expect(result.data.status).toBe('confirmed');
    expect(mockWriteContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: MOCK_VAULT,
        functionName: 'executeStrategies',
        account: MOCK_ACCOUNT,
        args: [
          [
            {
              asset: MOCK_ASSET,
              amount: 1000n,
              minReturn: 950n,
              maxSlippageBps: 50n,
              deadline: 999999n,
              nonce: 7n,
              xcmCall: '0x1234',
              targetParachain: 1000,
              targetProtocol: MOCK_PROTOCOL,
            },
          ],
          ['0xabcdef'],
        ],
      }),
    );
    expect(mockWaitForReceipt).toHaveBeenCalledWith({ hash: '0xdeadbeef' });
  }, 15_000);
});
