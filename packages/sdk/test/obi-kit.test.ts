import type { Chain, ChainConfig, EvmVaultConfig, ObiPolkadotContext, SwapRouterConfig } from '@obidot-kit/core';
import { createEvmContext } from '@obidot-kit/core';
import { VaultDepositTool } from '@obidot-kit/llm';
import { describe, expect, it, vi } from 'vitest';
import { ObiKit } from '../src/obi-kit.js';

const mockChainConfig: ChainConfig = {
  endpoint: 'wss://rpc.polkadot.io',
  chainId: 'polkadot',
  name: 'Polkadot',
};

const mockKusamaConfig: ChainConfig = {
  endpoint: 'wss://kusama-rpc.polkadot.io',
  chainId: 'kusama',
  name: 'Kusama',
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

const mockHubChain: Chain = {
  id: 420420417,
  name: 'Polkadot Hub TestNet',
  nativeCurrency: {
    name: 'Paseo DOT',
    symbol: 'PAS',
    decimals: 10,
  },
  rpcUrls: {
    default: {
      http: ['https://eth-rpc-testnet.polkadot.io/'],
    },
  },
};

const mockHubEvmContext = createEvmContext({
  rpcUrl: 'https://eth-rpc-testnet.polkadot.io/',
  chain: mockHubChain,
  chainName: 'Polkadot Hub TestNet',
});

const mockEvmVaultConfig: EvmVaultConfig = {
  vaultAddress: '0x03473a95971Ba0496786a615e21b1e87bDFf0025',
  assetAddress: '0x2402C804aD8a6217BF73D8483dA7564065c56083',
  assetDecimals: 18,
  oracleRegistryAddress: '0x8b7C7345d6cF9de45f4aacC61F56F0241d47e88B',
};

const mockSwapRouterConfig: SwapRouterConfig = {
  routerAddress: '0x60a72d1e20c5dc40Bb5a24394f0583d863201A3c',
  quoterAddress: '0x81d7aCFEF474DA6c76eC1b5A05a137cB9f3A5Db1',
  adapters: {
    0: '0x0000000000000000000000000000000000000001',
    1: '0x0000000000000000000000000000000000000002',
  },
};

describe('ObiKit SDK', () => {
  describe('offline / stub mode', () => {
    it('should create an ObiKit instance with chain config only', () => {
      const kit = new ObiKit({ chainConfig: mockChainConfig });

      expect(kit).toBeInstanceOf(ObiKit);
      expect(kit.getChainConfig()).toEqual(mockChainConfig);
      expect(kit.isOnChainMode()).toBe(false);
      expect(kit.getPolkadotContext()).toBeUndefined();
      expect(kit.getAgentApi()).toBeUndefined();
    });

    it('should return an empty tools array when no vaults registered', () => {
      const kit = new ObiKit({ chainConfig: mockChainConfig });
      const tools = kit.getTools();
      expect(tools).toEqual([]);
    });

    it('should return stub vault tools when vaults are registered', () => {
      const kit = new ObiKit({
        chainConfig: mockChainConfig,
        vaults: [
          {
            id: 'v1',
            name: 'DOT Vault',
            address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
            chain: mockChainConfig,
            asset: 'DOT',
          },
        ],
      });

      const tools = kit.getTools();
      expect(tools.length).toBe(2);

      const names = tools.map((t) => t.name);
      expect(names).toContain('vault_deposit');
      expect(names).toContain('vault_withdraw');
    });

    it('should allow updating chain config', () => {
      const kit = new ObiKit({ chainConfig: mockChainConfig });

      kit.setChainConfig(mockKusamaConfig);

      expect(kit.getChainConfig()).toEqual(mockKusamaConfig);
    });
  });

  describe('evm mode', () => {
    it('should expose EVM vault and swap tools when configured', () => {
      const kit = new ObiKit({
        hubEvmContext: mockHubEvmContext,
        evmVaultConfig: mockEvmVaultConfig,
        swapRouterConfig: mockSwapRouterConfig,
      });

      expect(kit.isEvmMode()).toBe(true);
      expect(kit.getHubEvmContext()).toBe(mockHubEvmContext);
      expect(kit.getEvmVaultConfig()).toEqual(mockEvmVaultConfig);
      expect(kit.getSwapRouterConfig()).toEqual(mockSwapRouterConfig);

      const names = kit.getTools().map((tool) => tool.name);
      expect(names).toContain('vault_state');
      expect(names).toContain('vault_deposit');
      expect(names).toContain('swap_quote');
      expect(names).toContain('swap_execute');
      expect(names).toContain('swap_multi_hop');
      expect(names).toContain('execute_local_swap');
      expect(names).toContain('execute_intent');
    });

    it('should support updating EVM vault and swap router config after construction', () => {
      const kit = new ObiKit({ chainConfig: mockChainConfig });

      kit.setEvmVault(mockHubEvmContext, mockEvmVaultConfig);
      kit.registerSwapRouter(mockSwapRouterConfig);

      expect(kit.isEvmMode()).toBe(true);
      expect(kit.getEvmVaultConfig()).toEqual(mockEvmVaultConfig);
      expect(kit.getSwapRouterConfig()).toEqual(mockSwapRouterConfig);
      expect(kit.getPoolAdapters()).toEqual({
        0: '0x0000000000000000000000000000000000000001',
        1: '0x0000000000000000000000000000000000000002',
      });
    });

    it('returns an empty pool adapter map when swap router config is absent', () => {
      const kit = new ObiKit({ hubEvmContext: mockHubEvmContext, evmVaultConfig: mockEvmVaultConfig });
      expect(kit.getPoolAdapters()).toEqual({});
    });
  });

  describe('on-chain mode (with polkadotContext)', () => {
    it('should create an ObiKit instance with polkadotContext', () => {
      const kit = new ObiKit({
        polkadotContext: mockPolkadotContext,
      });

      expect(kit).toBeInstanceOf(ObiKit);
      expect(kit.isOnChainMode()).toBe(true);
      expect(kit.getPolkadotContext()).toBe(mockPolkadotContext);
      expect(kit.getAgentApi()).toBeDefined();
    });

    it('should return vault tools when vaults registered (before connect)', () => {
      // Before connect() is called, PAK tools are not loaded.
      // Only obi-kit vault tools should be available.
      const kit = new ObiKit({
        polkadotContext: mockPolkadotContext,
        vaults: [
          {
            id: 'v1',
            name: 'DOT Vault',
            address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
            chain: mockChainConfig,
            asset: 'DOT',
          },
        ],
      });

      const tools = kit.getTools();
      const names = tools.map((t) => t.name);
      expect(names).toContain('vault_deposit');
      expect(names).toContain('vault_withdraw');
    });

    it('should not have PAK tools before connect() is called', () => {
      const kit = new ObiKit({
        polkadotContext: mockPolkadotContext,
      });

      expect(kit.isPakReady()).toBe(false);
    });

    it('should allow setting polkadot context at runtime', () => {
      const kit = new ObiKit({ chainConfig: mockChainConfig });

      expect(kit.isOnChainMode()).toBe(false);

      kit.setPolkadotContext(mockPolkadotContext);

      expect(kit.isOnChainMode()).toBe(true);
      expect(kit.getPolkadotContext()).toBe(mockPolkadotContext);
      expect(kit.getAgentApi()).toBeDefined();
    });
  });

  describe('vault registry', () => {
    it('should register and retrieve vaults', () => {
      const kit = new ObiKit({ chainConfig: mockChainConfig });

      const vault = {
        id: 'v1',
        name: 'DOT Vault',
        address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
        chain: mockChainConfig,
        asset: 'DOT',
      };

      kit.registerVault(vault);

      expect(kit.getVault('v1')).toEqual(vault);
      expect(kit.listVaults()).toHaveLength(1);
      expect(kit.listVaults()[0]).toEqual(vault);
    });

    it('should remove vaults', () => {
      const kit = new ObiKit({ chainConfig: mockChainConfig });

      kit.registerVault({
        id: 'v1',
        name: 'DOT Vault',
        address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
        chain: mockChainConfig,
        asset: 'DOT',
      });

      expect(kit.removeVault('v1')).toBe(true);
      expect(kit.getVault('v1')).toBeUndefined();
      expect(kit.listVaults()).toHaveLength(0);
    });

    it('should return false when removing non-existent vault', () => {
      const kit = new ObiKit({ chainConfig: mockChainConfig });

      expect(kit.removeVault('nonexistent')).toBe(false);
    });

    it('should rebuild agent API when vault is registered in on-chain mode', () => {
      const kit = new ObiKit({
        polkadotContext: mockPolkadotContext,
      });

      const toolsBefore = kit.getTools();
      const namesBefore = toolsBefore.map((t) => t.name);
      expect(namesBefore).not.toContain('vault_deposit');

      kit.registerVault({
        id: 'v1',
        name: 'DOT Vault',
        address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
        chain: mockChainConfig,
        asset: 'DOT',
      });

      const toolsAfter = kit.getTools();
      const namesAfter = toolsAfter.map((t) => t.name);
      expect(namesAfter).toContain('vault_deposit');
      expect(namesAfter).toContain('vault_withdraw');
    });

    it('should support method chaining for registerVault and addTool', () => {
      const kit = new ObiKit({ chainConfig: mockChainConfig });

      const customTool = new VaultDepositTool({
        chainConfig: mockChainConfig,
      });
      Object.defineProperty(customTool, 'name', { value: 'custom_tool' });

      const result = kit
        .registerVault({
          id: 'v1',
          name: 'DOT Vault',
          address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
          chain: mockChainConfig,
          asset: 'DOT',
        })
        .addTool(customTool);

      expect(result).toBe(kit);
    });
  });

  describe('custom tools', () => {
    it('should include custom tools in getTools()', () => {
      const kit = new ObiKit({ chainConfig: mockChainConfig });

      const customTool = new VaultDepositTool({
        chainConfig: mockChainConfig,
      });
      Object.defineProperty(customTool, 'name', { value: 'my_custom_tool' });

      kit.addTool(customTool);

      const tools = kit.getTools();
      const names = tools.map((t) => t.name);
      expect(names).toContain('my_custom_tool');
    });
  });

  describe('invokeTool', () => {
    it('should invoke a vault tool by name', async () => {
      const kit = new ObiKit({
        chainConfig: mockChainConfig,
        vaults: [
          {
            id: 'v1',
            name: 'DOT Vault',
            address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
            chain: mockChainConfig,
            asset: 'DOT',
          },
        ],
      });

      const result = await kit.invokeTool(
        'vault_deposit',
        JSON.stringify({
          vaultAddress: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
          amount: '1000',
          asset: 'DOT',
        }),
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should return an error for unknown tool name', async () => {
      const kit = new ObiKit({ chainConfig: mockChainConfig });

      const result = await kit.invokeTool('nonexistent_tool', '{}');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
      expect(result.message).toContain('nonexistent_tool');
    });

    it('should return raw string output when a tool response is not JSON', async () => {
      const kit = new ObiKit({ chainConfig: mockChainConfig });
      kit.addTool({
        name: 'plain_text_tool',
        invoke: async () => 'plain text result',
      } as never);

      const result = await kit.invokeTool('plain_text_tool', '{}');

      expect(result).toEqual({
        success: true,
        message: 'plain text result',
      });
    });
  });

  describe('convenience swap and intent wrappers', () => {
    it('delegates swap and intent helpers to invokeTool()', async () => {
      const kit = new ObiKit({ chainConfig: mockChainConfig });
      const invokeToolSpy = vi.spyOn(kit, 'invokeTool').mockResolvedValue({ success: true, message: 'ok' });

      await kit.getSwapQuote('{}');
      await kit.executeSwap('{}');
      await kit.executeMultiHopSwap('{}');
      await kit.executeLocalSwap('{}');
      await kit.executeUniversalIntent('{}');

      expect(invokeToolSpy).toHaveBeenNthCalledWith(1, 'swap_quote', '{}');
      expect(invokeToolSpy).toHaveBeenNthCalledWith(2, 'swap_execute', '{}');
      expect(invokeToolSpy).toHaveBeenNthCalledWith(3, 'swap_multi_hop', '{}');
      expect(invokeToolSpy).toHaveBeenNthCalledWith(4, 'execute_local_swap', '{}');
      expect(invokeToolSpy).toHaveBeenNthCalledWith(5, 'execute_intent', '{}');
    });
  });

  describe('inspect', () => {
    it('should return inspection info in offline mode', () => {
      const kit = new ObiKit({ chainConfig: mockChainConfig });

      const info = kit.inspect();

      expect(info.mode).toBe('offline');
      expect(info.chainConfig).toEqual(mockChainConfig);
      expect(info.hasPolkadotContext).toBe(false);
      expect(info.signerAddress).toBeUndefined();
      expect(info.vaultCount).toBe(0);
      expect(info.vaultIds).toEqual([]);
      expect(info.customToolCount).toBe(0);
      expect(info.customToolNames).toEqual([]);
      expect(info.hasLegacySigner).toBe(false);
      expect(typeof info.totalToolCount).toBe('number');
    });

    it('should return inspection info in on-chain mode', () => {
      const kit = new ObiKit({
        polkadotContext: mockPolkadotContext,
        vaults: [
          {
            id: 'v1',
            name: 'DOT Vault',
            address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
            chain: mockChainConfig,
            asset: 'DOT',
          },
        ],
      });

      const info = kit.inspect();

      expect(info.mode).toBe('on-chain');
      expect(info.hasPolkadotContext).toBe(true);
      expect(info.signerAddress).toBe(mockPolkadotContext.address);
      expect(info.vaultCount).toBe(1);
      expect(info.vaultIds).toEqual(['v1']);
      // At least vault tools should be counted
      expect(info.totalToolCount).toBeGreaterThanOrEqual(2);
    });

    it('should surface EVM, swap-router, and custom-tool metadata', () => {
      const customTool = new VaultDepositTool({
        chainConfig: mockChainConfig,
      });
      Object.defineProperty(customTool, 'name', { value: 'custom_evm_tool' });

      const kit = new ObiKit({
        chainConfig: mockChainConfig,
        hubEvmContext: mockHubEvmContext,
        evmVaultConfig: mockEvmVaultConfig,
        swapRouterConfig: mockSwapRouterConfig,
      });

      kit.addTool(customTool);

      const info = kit.inspect();

      expect(info.mode).toBe('evm');
      expect(info.hasEvmVault).toBe(true);
      expect(info.hasSwapRouter).toBe(true);
      expect(info.poolAdapterCount).toBe(2);
      expect(info.customToolCount).toBe(1);
      expect(info.customToolNames).toEqual(['custom_evm_tool']);
      expect(info.swapRouterAddress).toBe(mockSwapRouterConfig.routerAddress);
      expect(info.swapQuoterAddress).toBe(mockSwapRouterConfig.quoterAddress);
    });
  });

  describe('legacy signer', () => {
    it('should accept and return a legacy transaction signer', () => {
      const mockSigner = {
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        signAndSend: async () => '0xabc',
      };

      const kit = new ObiKit({
        chainConfig: mockChainConfig,
        signer: mockSigner,
      });

      expect(kit.getSigner()).toBe(mockSigner);
    });

    it('should allow replacing the legacy signer', () => {
      const kit = new ObiKit({ chainConfig: mockChainConfig });
      expect(kit.getSigner()).toBeUndefined();

      const mockSigner = {
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        signAndSend: async () => '0xabc',
      };

      kit.setSigner(mockSigner);
      expect(kit.getSigner()).toBe(mockSigner);
    });
  });

  describe('both chainConfig and polkadotContext', () => {
    it('should prefer on-chain mode when both are provided', () => {
      const kit = new ObiKit({
        chainConfig: mockChainConfig,
        polkadotContext: mockPolkadotContext,
      });

      expect(kit.isOnChainMode()).toBe(true);
      expect(kit.getChainConfig()).toEqual(mockChainConfig);
      expect(kit.getPolkadotContext()).toBe(mockPolkadotContext);
    });
  });

  describe('lifecycle', () => {
    it('disconnects the active polkadot context', async () => {
      const disconnect = vi.fn(async () => {});
      const kit = new ObiKit({
        polkadotContext: {
          ...mockPolkadotContext,
          api: {
            ...mockPolkadotContext.api,
            disconnect,
          } as ObiPolkadotContext['api'],
        },
      });

      await kit.disconnect();

      expect(disconnect).toHaveBeenCalledTimes(1);
    });
  });
});
