import type { ChainConfig, ObiEvmContext, ObiPolkadotContext } from '@obidot-kit/core';
import { describe, expect, it, vi } from 'vitest';
import { VaultWithdrawTool } from '../src/tools/vault-withdraw.js';

const MOCK_VAULT = '0x03473a95971Ba0496786a615e21b1e87bDFf0025';
const MOCK_ASSET = '0x1111111111111111111111111111111111111111';
const MOCK_ACCOUNT = '0x3333333333333333333333333333333333333333';
const MOCK_RECEIVER = '0x4444444444444444444444444444444444444444';

const mockChainConfig: ChainConfig = {
  endpoint: 'wss://rpc.polkadot.io',
  name: 'Polkadot',
  chainId: 'polkadot',
  ss58Prefix: 0,
};

const mockChain = {
  id: 420420417,
  name: 'Polkadot Hub TestNet',
  nativeCurrency: { name: 'DOT', symbol: 'DOT', decimals: 10 },
  rpcUrls: { default: { http: ['https://eth-rpc-testnet.polkadot.io/'] } },
};

const mockPolkadotContext: ObiPolkadotContext = {
  api: {
    initializeApi: async () => {},
    disconnect: async () => {},
    getApi: () => {
      throw new Error('not connected');
    },
    setApi: () => {},
    getAllApis: () => new Map(),
    getChainSpec: () => '',
    initializeChainApi: async () => ({
      success: true,
      chainId: 'polkadot',
      message: 'ok',
    }),
  } as unknown as ObiPolkadotContext['api'],
  signer: {
    publicKey: new Uint8Array(32),
    signTx: async () => new Uint8Array(),
    signBytes: async () => new Uint8Array(),
  } as unknown as ObiPolkadotContext['signer'],
  address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
};

describe('VaultWithdrawTool', () => {
  it('exposes the expected name and description', () => {
    const tool = new VaultWithdrawTool({ chainConfig: mockChainConfig });
    expect(tool.name).toBe('vault_withdraw');
    expect(tool.description).toContain('Withdraw assets');
  });

  it('returns an offline stub result for withdraw mode', async () => {
    const tool = new VaultWithdrawTool({
      chainConfig: mockChainConfig,
      vaultConfig: {
        vaultAddress: MOCK_VAULT,
        assetAddress: MOCK_ASSET,
        assetDecimals: 18,
      },
    });

    const raw = await tool.invoke(JSON.stringify({ amount: '1000' }));
    const result = JSON.parse(raw) as {
      success: boolean;
      data: { action: string; endpoint: string; status: string; asset: string };
    };

    expect(result.success).toBe(true);
    expect(result.data.action).toBe('withdraw');
    expect(result.data.endpoint).toBe('wss://rpc.polkadot.io');
    expect(result.data.status).toBe('pending');
    expect(result.data.asset).toBe('native');
  });

  it('returns a polkadot stub result when only polkadot context is configured', async () => {
    const tool = new VaultWithdrawTool({
      polkadotContext: mockPolkadotContext,
      vaultConfig: {
        vaultAddress: MOCK_VAULT,
        assetAddress: MOCK_ASSET,
        assetDecimals: 18,
      },
    });

    const raw = await tool.invoke(JSON.stringify({ amount: '250', redeemShares: true }));
    const result = JSON.parse(raw) as {
      success: boolean;
      data: { mode: string; signerAddress: string; action: string };
    };

    expect(result.success).toBe(true);
    expect(result.data.mode).toBe('polkadot');
    expect(result.data.signerAddress).toBe(mockPolkadotContext.address);
    expect(result.data.action).toBe('redeem');
  });

  it('executes redeem flow in EVM mode', async () => {
    const mockReadContract = vi.fn().mockResolvedValue(777n);
    const mockWriteContract = vi.fn().mockResolvedValue('0xdeadbeef');
    const mockWaitForReceipt = vi.fn().mockResolvedValue({
      status: 'success',
      blockNumber: 12n,
    });

    const tool = new VaultWithdrawTool({
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
      vaultConfig: {
        vaultAddress: MOCK_VAULT,
        assetAddress: MOCK_ASSET,
        assetDecimals: 18,
      },
    });

    const raw = await tool.invoke(JSON.stringify({ amount: '500', redeemShares: true, receiver: MOCK_RECEIVER }));
    const result = JSON.parse(raw) as {
      success: boolean;
      txHash: string;
      data: { action: string; assetsReceived: string; receiver: string; mode: string };
    };

    expect(result.success).toBe(true);
    expect(result.txHash).toBe('0xdeadbeef');
    expect(result.data.action).toBe('redeem');
    expect(result.data.assetsReceived).toBe('777');
    expect(result.data.receiver).toBe(MOCK_RECEIVER);
    expect(result.data.mode).toBe('evm');
    expect(mockReadContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: MOCK_VAULT,
        functionName: 'previewRedeem',
        args: [500n],
      }),
    );
    expect(mockWriteContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: MOCK_VAULT,
        functionName: 'redeem',
        args: [500n, MOCK_RECEIVER, MOCK_ACCOUNT],
      }),
    );
  }, 15_000);

  it('executes withdraw flow through embedded EVM context on polkadot mode', async () => {
    const mockReadContract = vi.fn().mockResolvedValue(321n);
    const mockWriteContract = vi.fn().mockResolvedValue('0xbeadfeed');
    const mockWaitForReceipt = vi.fn().mockResolvedValue({
      status: 'success',
      blockNumber: 13n,
    });

    const tool = new VaultWithdrawTool({
      polkadotContext: {
        ...mockPolkadotContext,
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
      },
      vaultConfig: {
        vaultAddress: MOCK_VAULT,
        assetAddress: MOCK_ASSET,
        assetDecimals: 18,
      },
    });

    const raw = await tool.invoke(JSON.stringify({ amount: '600' }));
    const result = JSON.parse(raw) as {
      success: boolean;
      txHash: string;
      data: { action: string; sharesBurned: string; receiver: string; mode: string };
    };

    expect(result.success).toBe(true);
    expect(result.txHash).toBe('0xbeadfeed');
    expect(result.data.action).toBe('withdraw');
    expect(result.data.sharesBurned).toBe('321');
    expect(result.data.receiver).toBe(MOCK_ACCOUNT);
    expect(result.data.mode).toBe('evm');
    expect(mockReadContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: MOCK_VAULT,
        functionName: 'previewWithdraw',
        args: [600n],
      }),
    );
    expect(mockWriteContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: MOCK_VAULT,
        functionName: 'withdraw',
        args: [600n, MOCK_ACCOUNT, MOCK_ACCOUNT],
      }),
    );
  }, 15_000);

  it('surfaces invalid JSON input as an error result', async () => {
    const tool = new VaultWithdrawTool({});
    const raw = await tool.invoke('not-json');
    const result = JSON.parse(raw) as { success: boolean; error: string };

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid JSON input');
  });
});
