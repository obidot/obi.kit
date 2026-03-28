import type { ObiEvmContext } from '@obidot-kit/core';
import { describe, expect, it, vi } from 'vitest';
import { ExecuteIntentTool } from '../src/tools/execute-intent.js';

const MOCK_VAULT = '0x03473a95971Ba0496786a615e21b1e87bDFf0025';
const MOCK_IN_ASSET = '0x1111111111111111111111111111111111111111';
const MOCK_OUT_ASSET = '0x2222222222222222222222222222222222222222';
const MOCK_ACCOUNT = '0x3333333333333333333333333333333333333333';

const mockChain = {
  id: 420420417,
  name: 'Polkadot Hub TestNet',
  nativeCurrency: { name: 'DOT', symbol: 'DOT', decimals: 10 },
  rpcUrls: { default: { http: ['https://eth-rpc-testnet.polkadot.io/'] } },
};

describe('ExecuteIntentTool', () => {
  it('exposes the expected name and description', () => {
    const tool = new ExecuteIntentTool({});
    expect(tool.name).toBe('execute_intent');
    expect(tool.description).toContain('cross-chain intent');
    expect(tool.description).toContain('executeIntent');
  });

  it('returns an error when no vault is configured', async () => {
    const tool = new ExecuteIntentTool({});
    const raw = await tool.invoke(
      JSON.stringify({
        inAssetToken: MOCK_IN_ASSET,
        outAssetToken: MOCK_OUT_ASSET,
        amount: '1000',
        minOut: '900',
        destType: 0,
        calldata: '0x1234',
        nonce: '7',
        deadline: '999999',
        signature: '0xabcdef',
      }),
    );
    const result = JSON.parse(raw) as { success: boolean; error: string };

    expect(result.success).toBe(false);
    expect(result.error).toContain('No vault configured');
  });

  it('returns a stub result when no wallet client is configured', async () => {
    const tool = new ExecuteIntentTool({
      evmContext: {
        client: {} as ObiEvmContext['client'],
        chain: mockChain,
      },
      vaultConfig: {
        vaultAddress: MOCK_VAULT,
        assetAddress: MOCK_IN_ASSET,
        assetDecimals: 18,
      },
    });

    const raw = await tool.invoke(
      JSON.stringify({
        inAssetToken: MOCK_IN_ASSET,
        outAssetToken: MOCK_OUT_ASSET,
        amount: '1000',
        minOut: '900',
        destType: 1,
        chainId: 8453,
        calldata: '0x1234',
        nonce: '7',
        deadline: '999999',
        signature: '0xabcdef',
      }),
    );
    const result = JSON.parse(raw) as {
      success: boolean;
      data: { mode: string; destination: string; message: string };
    };

    expect(result.success).toBe(true);
    expect(result.data.mode).toBe('stub');
    expect(result.data.destination).toBe('EVM chain 8453');
    expect(result.data.message).toContain('not submitted');
  });

  it('surfaces invalid JSON input as an error result', async () => {
    const tool = new ExecuteIntentTool({
      vaultConfig: {
        vaultAddress: MOCK_VAULT,
        assetAddress: MOCK_IN_ASSET,
        assetDecimals: 18,
      },
    });

    const raw = await tool.invoke('not-json');
    const result = JSON.parse(raw) as { success: boolean; error: string };

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid JSON input');
  });

  it('writes the universal intent with defaulted optional fields in EVM mode', async () => {
    const mockWriteContract = vi.fn().mockResolvedValue('0xdeadbeef');
    const mockWaitForReceipt = vi.fn().mockResolvedValue({
      status: 'success',
      blockNumber: 42n,
    });

    const tool = new ExecuteIntentTool({
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
        assetAddress: MOCK_IN_ASSET,
        assetDecimals: 18,
      },
    });

    const raw = await tool.invoke(
      JSON.stringify({
        inAssetToken: MOCK_IN_ASSET,
        outAssetToken: MOCK_OUT_ASSET,
        amount: '1000',
        minOut: '900',
        destType: 0,
        calldata: '0x1234',
        nonce: '7',
        deadline: '999999',
        signature: '0xabcdef',
      }),
    );
    const result = JSON.parse(raw) as {
      success: boolean;
      txHash: string;
      blockNumber: number;
      data: {
        mode: string;
        destination: string;
        status: string;
      };
    };

    expect(result.success).toBe(true);
    expect(result.txHash).toBe('0xdeadbeef');
    expect(result.blockNumber).toBe(42);
    expect(result.data.mode).toBe('evm');
    expect(result.data.destination).toBe('parachain 0');
    expect(result.data.status).toBe('confirmed');
    expect(mockWriteContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: MOCK_VAULT,
        functionName: 'executeIntent',
        account: MOCK_ACCOUNT,
        args: [
          {
            inAsset: { token: MOCK_IN_ASSET, assetId: 0n },
            outAsset: { token: MOCK_OUT_ASSET, assetId: 0n },
            amount: 1000n,
            minOut: 900n,
            dest: { destType: 0, paraId: 0, chainId: 0 },
            calldata_: '0x1234',
            nonce: 7n,
            deadline: 999999n,
          },
          '0xabcdef',
        ],
      }),
    );
    expect(mockWaitForReceipt).toHaveBeenCalledWith({ hash: '0xdeadbeef' });
  }, 15_000);
});
