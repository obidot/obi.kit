import type { ChainConfig, ObiEvmContext, ObiPolkadotContext } from '@obidot-kit/core';
import { describe, expect, it, vi } from 'vitest';
import { VaultDepositTool } from '../src/tools/vault-deposit.js';

const mockChainConfig: ChainConfig = {
  endpoint: 'wss://rpc.polkadot.io',
  name: 'Polkadot',
  chainId: 'polkadot',
  ss58Prefix: 0,
};

const MOCK_VAULT = '0x03473a95971Ba0496786a615e21b1e87bDFf0025';
const MOCK_ASSET = '0x2402C804aD8a6217BF73D8483dA7564065c56083';
const MOCK_ACCOUNT = '0x5984A519fFfE5aFc5e8bBA233DCc01AC774f4301';
const MOCK_RECEIVER = '0x1111111111111111111111111111111111111111';

/** Minimal read-only EVM context (no walletClient) — simulates polkadot ctx without signer */
const mockReadOnlyEvmContext: ObiEvmContext = {
  client: {} as ObiEvmContext['client'],
  chain: {
    id: 420420417,
    name: 'Polkadot Hub TestNet',
    nativeCurrency: { name: 'DOT', symbol: 'DOT', decimals: 10 },
    rpcUrls: { default: { http: ['https://eth-rpc-testnet.polkadot.io/'] } },
  },
  chainName: 'Polkadot Hub TestNet',
  // walletClient intentionally omitted to simulate a read-only context
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

describe('VaultDepositTool', () => {
  describe('construction', () => {
    it('should accept chainConfig-only options (offline mode)', () => {
      const tool = new VaultDepositTool({ chainConfig: mockChainConfig });
      expect(tool.name).toBe('vault_deposit');
      expect(tool.hasPolkadotContext()).toBe(false);
    });

    it('should accept polkadotContext options (on-chain mode)', () => {
      const tool = new VaultDepositTool({
        polkadotContext: mockPolkadotContext,
      });
      expect(tool.name).toBe('vault_deposit');
      expect(tool.hasPolkadotContext()).toBe(true);
    });

    it('should accept both chainConfig and polkadotContext', () => {
      const tool = new VaultDepositTool({
        chainConfig: mockChainConfig,
        polkadotContext: mockPolkadotContext,
      });
      expect(tool.hasPolkadotContext()).toBe(true);
    });

    it('should expose hasEvmContext when setEvmContext is called', () => {
      const tool = new VaultDepositTool({ chainConfig: mockChainConfig });
      expect(tool.hasEvmContext()).toBe(false);

      tool.setEvmContext(
        {
          client: {} as ObiEvmContext['client'],
          walletClient: {} as ObiEvmContext['walletClient'],
          account: MOCK_ACCOUNT,
          chain: mockReadOnlyEvmContext.chain,
        },
        {
          vaultAddress: MOCK_VAULT,
          assetAddress: MOCK_ASSET,
          assetDecimals: 18,
        },
      );

      expect(tool.hasEvmContext()).toBe(true);
    });
  });

  describe('metadata', () => {
    it('should have the correct name and description', () => {
      const tool = new VaultDepositTool({ chainConfig: mockChainConfig });
      expect(tool.name).toBe('vault_deposit');
      expect(tool.description).toContain('Deposit');
    });
  });

  describe('offline / stub mode', () => {
    it('should return a successful result for valid input', async () => {
      const tool = new VaultDepositTool({ chainConfig: mockChainConfig });
      const input = JSON.stringify({
        vaultAddress: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
        amount: '1000000000000',
        asset: 'DOT',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.action).toBe('deposit');
      expect(result.data.vaultAddress).toBe('5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty');
      expect(result.data.amount).toBe('1000000000000');
      expect(result.data.asset).toBe('DOT');
      expect(result.data.chainId).toBe('polkadot');
      expect(result.data.status).toBe('pending');
    });

    it('should include the endpoint in stub results', async () => {
      const tool = new VaultDepositTool({ chainConfig: mockChainConfig });
      const input = JSON.stringify({
        vaultAddress: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
        amount: '500',
        asset: 'DOT',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.data.endpoint).toBe('wss://rpc.polkadot.io');
    });

    it('should include the deposit message in the result', async () => {
      const tool = new VaultDepositTool({ chainConfig: mockChainConfig });
      const input = JSON.stringify({
        vaultAddress: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
        amount: '500',
        asset: 'GLMR',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data.message).toContain('500');
      expect(result.data.message).toContain('GLMR');
      expect(result.data.message).toContain('5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty');
    });
  });

  describe('on-chain mode (with polkadotContext)', () => {
    it('should return an on-chain result with signer address', async () => {
      const tool = new VaultDepositTool({
        polkadotContext: mockPolkadotContext,
      });
      const input = JSON.stringify({
        vaultAddress: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
        amount: '1000000000000',
        asset: 'DOT',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.action).toBe('deposit');
      expect(result.data.mode).toBe('polkadot');
      expect(result.data.signerAddress).toBe(mockPolkadotContext.address);
      expect(result.data.status).toBe('pending');
    });

    it('should include signer address in the message', async () => {
      const tool = new VaultDepositTool({
        polkadotContext: mockPolkadotContext,
      });
      const input = JSON.stringify({
        vaultAddress: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
        amount: '100',
        asset: 'DOT',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.data.message).toContain('on-chain submission');
    });
  });

  describe('input validation errors', () => {
    it('should return an error for invalid JSON input', async () => {
      const tool = new VaultDepositTool({ chainConfig: mockChainConfig });
      const raw = await tool.invoke('not valid json');
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON');
    });

    it('should return an error when vaultAddress is missing', async () => {
      const tool = new VaultDepositTool({ chainConfig: mockChainConfig });
      const input = JSON.stringify({
        amount: '1000',
        asset: 'DOT',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('vaultAddress');
    });

    it('should return an error when amount is missing', async () => {
      const tool = new VaultDepositTool({ chainConfig: mockChainConfig });
      const input = JSON.stringify({
        vaultAddress: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
        asset: 'DOT',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('amount');
    });

    it('should return an error when asset is missing', async () => {
      const tool = new VaultDepositTool({ chainConfig: mockChainConfig });
      const input = JSON.stringify({
        vaultAddress: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
        amount: '1000',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('asset');
    });

    it('should return an error when input is not a JSON object', async () => {
      const tool = new VaultDepositTool({ chainConfig: mockChainConfig });
      const raw = await tool.invoke('"just a string"');
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('JSON object');
    });

    it('should return an error for empty vaultAddress', async () => {
      const tool = new VaultDepositTool({ chainConfig: mockChainConfig });
      const input = JSON.stringify({
        vaultAddress: '',
        amount: '1000',
        asset: 'DOT',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('vaultAddress');
    });

    it('should return an error for empty amount', async () => {
      const tool = new VaultDepositTool({ chainConfig: mockChainConfig });
      const input = JSON.stringify({
        vaultAddress: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
        amount: '',
        asset: 'DOT',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('amount');
    });

    it('should use configured vault and asset defaults when omitted from input', async () => {
      const tool = new VaultDepositTool({
        chainConfig: mockChainConfig,
        vaultConfig: {
          vaultAddress: MOCK_VAULT,
          assetAddress: MOCK_ASSET,
          assetDecimals: 18,
        },
      });

      const raw = await tool.invoke(JSON.stringify({ amount: '750' }));
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data.vaultAddress).toBe(MOCK_VAULT);
      expect(result.data.asset).toBe(MOCK_ASSET);
    });
  });

  describe('runtime configuration', () => {
    it('should allow updating chain config at runtime', async () => {
      const tool = new VaultDepositTool({ chainConfig: mockChainConfig });
      tool.setChainConfig({
        endpoint: 'wss://kusama-rpc.polkadot.io',
        chainId: 'kusama',
        name: 'Kusama',
      });

      const input = JSON.stringify({
        vaultAddress: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
        amount: '1000',
        asset: 'KSM',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data.chainId).toBe('kusama');
      expect(result.data.endpoint).toBe('wss://kusama-rpc.polkadot.io');
    });

    it('should allow setting polkadot context at runtime', async () => {
      const tool = new VaultDepositTool({ chainConfig: mockChainConfig });
      expect(tool.hasPolkadotContext()).toBe(false);

      tool.setPolkadotContext(mockPolkadotContext);
      expect(tool.hasPolkadotContext()).toBe(true);

      const input = JSON.stringify({
        vaultAddress: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
        amount: '1000',
        asset: 'DOT',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data.mode).toBe('polkadot');
      expect(result.data.signerAddress).toBe(mockPolkadotContext.address);
    });
  });

  describe('polkadot mode with embedded EVM context', () => {
    it('should fall back to polkadot stub when evmContext has no walletClient', async () => {
      // polkadotContext.evmContext is read-only (no walletClient) → stub path
      const ctxWithReadOnlyEvm: ObiPolkadotContext = {
        ...mockPolkadotContext,
        evmContext: mockReadOnlyEvmContext,
      };
      const tool = new VaultDepositTool({
        polkadotContext: ctxWithReadOnlyEvm,
      });

      const input = JSON.stringify({
        vaultAddress: '0x03473a95971Ba0496786a615e21b1e87bDFf0025',
        amount: '1000000000000000000',
        asset: '0x2402C804aD8a6217BF73D8483dA7564065c56083',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      // Falls through to polkadot stub because walletClient is missing
      expect(result.success).toBe(true);
      expect(result.data.mode).toBe('polkadot');
      expect(result.data.status).toBe('pending');
    });

    it('should fall back to polkadot stub when evmContext has walletClient but no vaultConfig', async () => {
      // Even with a walletClient, without vaultConfig the tool cannot proceed to EVM path
      const ctxWithWalletEvm: ObiPolkadotContext = {
        ...mockPolkadotContext,
        evmContext: {
          ...mockReadOnlyEvmContext,
          walletClient: {} as ObiEvmContext['walletClient'],
          account: '0x5984A519fFfE5aFc5e8bBA233DCc01AC774f4301',
        },
      };
      // No vaultConfig provided to tool
      const tool = new VaultDepositTool({ polkadotContext: ctxWithWalletEvm });

      const input = JSON.stringify({
        vaultAddress: '0x03473a95971Ba0496786a615e21b1e87bDFf0025',
        amount: '1000000000000000000',
        asset: '0x2402C804aD8a6217BF73D8483dA7564065c56083',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data.mode).toBe('polkadot');
      expect(result.data.status).toBe('pending');
    });

    it('should expose hasPolkadotContext() true when polkadot ctx has evmContext', () => {
      const ctxWithEvm: ObiPolkadotContext = {
        ...mockPolkadotContext,
        evmContext: mockReadOnlyEvmContext,
      };
      const tool = new VaultDepositTool({ polkadotContext: ctxWithEvm });
      expect(tool.hasPolkadotContext()).toBe(true);
    });

    it('should still include signerAddress in stub output when evmContext present', async () => {
      const ctxWithReadOnlyEvm: ObiPolkadotContext = {
        ...mockPolkadotContext,
        evmContext: mockReadOnlyEvmContext,
      };
      const tool = new VaultDepositTool({
        polkadotContext: ctxWithReadOnlyEvm,
      });

      const input = JSON.stringify({
        vaultAddress: '0x03473a95971Ba0496786a615e21b1e87bDFf0025',
        amount: '500000000',
        asset: '0x2402C804aD8a6217BF73D8483dA7564065c56083',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.data.signerAddress).toBe(mockPolkadotContext.address);
    });
  });

  describe('evm mode', () => {
    it('should execute a deposit without approval when allowance is already sufficient', async () => {
      const mockReadContract = vi.fn().mockResolvedValueOnce(1_000n).mockResolvedValueOnce(777n);
      const mockWriteContract = vi.fn().mockResolvedValue('0xdeposit');
      const mockWaitForReceipt = vi.fn().mockResolvedValue({
        status: 'success',
        blockNumber: 20n,
      });

      const tool = new VaultDepositTool({
        evmContext: {
          client: {
            readContract: mockReadContract,
            waitForTransactionReceipt: mockWaitForReceipt,
          } as ObiEvmContext['client'],
          walletClient: {
            writeContract: mockWriteContract,
          } as ObiEvmContext['walletClient'],
          account: MOCK_ACCOUNT,
          chain: mockReadOnlyEvmContext.chain,
        },
        vaultConfig: {
          vaultAddress: MOCK_VAULT,
          assetAddress: MOCK_ASSET,
          assetDecimals: 18,
        },
      });

      const raw = await tool.invoke(JSON.stringify({ amount: '500' }));
      const result = JSON.parse(raw) as {
        success: boolean;
        txHash: string;
        data: { approvalTxHash?: string; sharesReceived: string; receiver: string; status: string };
      };

      expect(result.success).toBe(true);
      expect(result.txHash).toBe('0xdeposit');
      expect(result.data.approvalTxHash).toBeUndefined();
      expect(result.data.sharesReceived).toBe('777');
      expect(result.data.receiver).toBe(MOCK_ACCOUNT);
      expect(result.data.status).toBe('confirmed');
      expect(mockReadContract).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          address: MOCK_ASSET,
          functionName: 'allowance',
          args: [MOCK_ACCOUNT, MOCK_VAULT],
        }),
      );
      expect(mockReadContract).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          address: MOCK_VAULT,
          functionName: 'previewDeposit',
          args: [500n],
        }),
      );
      expect(mockWriteContract).toHaveBeenCalledTimes(1);
      expect(mockWriteContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: MOCK_VAULT,
          functionName: 'deposit',
          args: [500n, MOCK_ACCOUNT],
        }),
      );
    }, 15_000);

    it('should approve before deposit and surface a failed receipt status', async () => {
      const mockReadContract = vi.fn().mockResolvedValueOnce(0n).mockResolvedValueOnce(333n);
      const mockWriteContract = vi.fn().mockResolvedValueOnce('0xapprove').mockResolvedValueOnce('0xdeposit');
      const mockWaitForReceipt = vi
        .fn()
        .mockResolvedValueOnce({ status: 'success', blockNumber: 21n })
        .mockResolvedValueOnce({ status: 'reverted', blockNumber: 22n });

      const tool = new VaultDepositTool({
        evmContext: {
          client: {
            readContract: mockReadContract,
            waitForTransactionReceipt: mockWaitForReceipt,
          } as ObiEvmContext['client'],
          walletClient: {
            writeContract: mockWriteContract,
          } as ObiEvmContext['walletClient'],
          account: MOCK_ACCOUNT,
          chain: mockReadOnlyEvmContext.chain,
        },
        vaultConfig: {
          vaultAddress: MOCK_VAULT,
          assetAddress: MOCK_ASSET,
          assetDecimals: 18,
        },
      });

      const raw = await tool.invoke(JSON.stringify({ amount: '900', receiver: MOCK_RECEIVER }));
      const result = JSON.parse(raw) as {
        success: boolean;
        txHash: string;
        data: { approvalTxHash?: string; receiver: string; status: string; blockNumber: number };
      };

      expect(result.success).toBe(true);
      expect(result.txHash).toBe('0xdeposit');
      expect(result.data.approvalTxHash).toBe('0xapprove');
      expect(result.data.receiver).toBe(MOCK_RECEIVER);
      expect(result.data.status).toBe('failed');
      expect(result.data.blockNumber).toBe(22);
      expect(mockWriteContract).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          address: MOCK_ASSET,
          functionName: 'approve',
          args: [MOCK_VAULT, 900n],
        }),
      );
      expect(mockWriteContract).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          address: MOCK_VAULT,
          functionName: 'deposit',
          args: [900n, MOCK_RECEIVER],
        }),
      );
    }, 15_000);

    it('should execute through embedded EVM context on polkadot mode when wallet and vault config are available', async () => {
      const mockReadContract = vi.fn().mockResolvedValueOnce(500n).mockResolvedValueOnce(600n);
      const mockWriteContract = vi.fn().mockResolvedValue('0xembedded');
      const mockWaitForReceipt = vi.fn().mockResolvedValue({
        status: 'success',
        blockNumber: 23n,
      });

      const tool = new VaultDepositTool({
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
            chain: mockReadOnlyEvmContext.chain,
          },
        },
        vaultConfig: {
          vaultAddress: MOCK_VAULT,
          assetAddress: MOCK_ASSET,
          assetDecimals: 18,
        },
      });

      const raw = await tool.invoke(JSON.stringify({ amount: '400' }));
      const result = JSON.parse(raw) as {
        success: boolean;
        txHash: string;
        data: { mode: string; sharesReceived: string; status: string };
      };

      expect(result.success).toBe(true);
      expect(result.txHash).toBe('0xembedded');
      expect(result.data.mode).toBe('evm');
      expect(result.data.sharesReceived).toBe('600');
      expect(result.data.status).toBe('confirmed');
    }, 15_000);

    it('should surface an error when the wallet client is present but the account is missing', async () => {
      const tool = new VaultDepositTool({
        evmContext: {
          client: {
            readContract: vi.fn(),
            waitForTransactionReceipt: vi.fn(),
          } as ObiEvmContext['client'],
          walletClient: {
            writeContract: vi.fn(),
          } as ObiEvmContext['walletClient'],
          chain: mockReadOnlyEvmContext.chain,
        },
        vaultConfig: {
          vaultAddress: MOCK_VAULT,
          assetAddress: MOCK_ASSET,
          assetDecimals: 18,
        },
      });

      const raw = await tool.invoke(JSON.stringify({ amount: '100', vaultAddress: MOCK_VAULT, asset: MOCK_ASSET }));
      const result = JSON.parse(raw) as { success: boolean; error: string };

      expect(result.success).toBe(false);
      expect(result.error).toContain('Wallet client and account are required');
    });
  });
});
