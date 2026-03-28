import type { ChainConfig, ObiPolkadotContext, SatelliteVaultConfig } from '@obidot-kit/core';
import { VaultDepositTool } from '@obidot-kit/llm';
import { describe, expect, it } from 'vitest';
import { ObiKit } from '../src/obi-kit.js';

const mockChainConfig: ChainConfig = {
  endpoint: 'wss://rpc.polkadot.io',
  chainId: 'polkadot',
  name: 'Polkadot',
};

const mockMoonbeamConfig: ChainConfig = {
  endpoint: 'https://rpc.api.moonbeam.network',
  chainId: 'moonbeam',
  name: 'Moonbeam',
};

const mockAstarConfig: ChainConfig = {
  endpoint: 'https://evm.astar.network',
  chainId: 'astar',
  name: 'Astar',
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

const moonbeamSatellite: SatelliteVaultConfig = {
  id: 'moonbeam-sat',
  name: 'Moonbeam Satellite Vault',
  address: '0x0000000000000000000000000000000000000010',
  chain: mockMoonbeamConfig,
  asset: 'xcDOT',
  decimals: 10,
  hubVaultAddress: '0x0000000000000000000000000000000000000001',
  routerAddress: '0x0000000000000000000000000000000000000002',
  rpcUrl: 'https://rpc.api.moonbeam.network',
  evmChainId: 1284,
};

const astarSatellite: SatelliteVaultConfig = {
  id: 'astar-sat',
  name: 'Astar Satellite Vault',
  address: '0x0000000000000000000000000000000000000020',
  chain: mockAstarConfig,
  asset: 'xcDOT',
  decimals: 10,
  hubVaultAddress: '0x0000000000000000000000000000000000000001',
  routerAddress: '0x0000000000000000000000000000000000000002',
  rpcUrl: 'https://evm.astar.network',
  evmChainId: 592,
};

const bifrostConfig = {
  adapterAddress: '0x0000000000000000000000000000000000000003',
  protocols: {
    slp: { palletIndex: 100, name: 'SLP', protocol: 'Bifrost' },
    dex: { palletIndex: 101, name: 'Bifrost DEX', protocol: 'Bifrost' },
  },
};

describe('ObiKit — Cross-Chain & Bifrost Support', () => {
  // ── Satellite vault registration ─────────────────────────────────────

  describe('satellite vault registration', () => {
    it('should register satellites via constructor config', () => {
      const kit = new ObiKit({
        chainConfig: mockChainConfig,
        satellites: [moonbeamSatellite, astarSatellite],
      });

      const satellites = kit.getSatelliteVaults();
      expect(satellites).toHaveLength(2);
      expect(satellites[0]?.name).toBe('Moonbeam Satellite Vault');
      expect(satellites[1]?.name).toBe('Astar Satellite Vault');
    });

    it('should register a satellite vault at runtime', () => {
      const kit = new ObiKit({ chainConfig: mockChainConfig });

      expect(kit.getSatelliteVaults()).toHaveLength(0);

      kit.registerSatelliteVault(moonbeamSatellite);

      expect(kit.getSatelliteVaults()).toHaveLength(1);
      expect(kit.getSatelliteVaults()[0]?.evmChainId).toBe(1284);
    });

    it('should remove a satellite vault by chain name', () => {
      const kit = new ObiKit({
        chainConfig: mockChainConfig,
        satellites: [moonbeamSatellite, astarSatellite],
      });

      expect(kit.getSatelliteVaults()).toHaveLength(2);

      const removed = kit.removeSatelliteVault('Moonbeam');
      expect(removed).toBe(true);
      expect(kit.getSatelliteVaults()).toHaveLength(1);
      expect(kit.getSatelliteVaults()[0]?.chain.name).toBe('Astar');
    });

    it('should return false when removing a non-existent satellite', () => {
      const kit = new ObiKit({ chainConfig: mockChainConfig });

      expect(kit.removeSatelliteVault('Nonexistent')).toBe(false);
    });

    it('should rebuild agent API when satellite is registered in on-chain mode', () => {
      const kit = new ObiKit({
        polkadotContext: mockPolkadotContext,
      });

      const toolsBefore = kit.getTools();
      const namesBefore = toolsBefore.map((t) => t.name);
      expect(namesBefore).not.toContain('fetch_cross_chain_state');
      expect(namesBefore).not.toContain('execute_cross_chain_rebalance');

      kit.registerSatelliteVault(moonbeamSatellite);

      const toolsAfter = kit.getTools();
      const namesAfter = toolsAfter.map((t) => t.name);
      expect(namesAfter).toContain('fetch_cross_chain_state');
      expect(namesAfter).toContain('find_cross_chain_routes');
      expect(namesAfter).toContain('execute_cross_chain_rebalance');
    });
  });

  // ── Bifrost tool inclusion ───────────────────────────────────────────

  describe('bifrost tool discovery', () => {
    it('should include Bifrost tools when bifrostConfig is provided (offline)', () => {
      const kit = new ObiKit({
        chainConfig: mockChainConfig,
        bifrostConfig,
      });

      const tools = kit.getTools();
      const names = tools.map((t) => t.name);

      expect(names).toContain('fetch_bifrost_yields');
      expect(names).toContain('execute_bifrost_strategy');
    });

    it('should not include Bifrost tools when bifrostConfig is absent', () => {
      const kit = new ObiKit({ chainConfig: mockChainConfig });

      const tools = kit.getTools();
      const names = tools.map((t) => t.name);

      expect(names).not.toContain('fetch_bifrost_yields');
      expect(names).not.toContain('execute_bifrost_strategy');
    });

    it('should return Bifrost tools via getBifrostTools()', () => {
      const kit = new ObiKit({
        chainConfig: mockChainConfig,
        bifrostConfig,
      });

      const bifrostTools = kit.getBifrostTools();
      expect(bifrostTools).toHaveLength(2);

      const names = bifrostTools.map((t) => t.name);
      expect(names).toContain('fetch_bifrost_yields');
      expect(names).toContain('execute_bifrost_strategy');
    });

    it('should return empty array from getBifrostTools() when not configured', () => {
      const kit = new ObiKit({ chainConfig: mockChainConfig });

      expect(kit.getBifrostTools()).toHaveLength(0);
    });

    it('should include Bifrost tools in on-chain mode', () => {
      const kit = new ObiKit({
        polkadotContext: mockPolkadotContext,
        bifrostConfig,
      });

      const tools = kit.getTools();
      const names = tools.map((t) => t.name);

      expect(names).toContain('fetch_bifrost_yields');
      expect(names).toContain('execute_bifrost_strategy');
    });
  });

  // ── Cross-chain tool inclusion ───────────────────────────────────────

  describe('cross-chain tool discovery', () => {
    it('should include cross-chain tools when satellites are configured (offline)', () => {
      const kit = new ObiKit({
        chainConfig: mockChainConfig,
        satellites: [moonbeamSatellite],
      });

      const tools = kit.getTools();
      const names = tools.map((t) => t.name);

      expect(names).toContain('fetch_cross_chain_state');
      expect(names).toContain('find_cross_chain_routes');
      expect(names).toContain('execute_cross_chain_rebalance');
    });

    it('should not include cross-chain tools when no satellites are configured', () => {
      const kit = new ObiKit({ chainConfig: mockChainConfig });

      const tools = kit.getTools();
      const names = tools.map((t) => t.name);

      expect(names).not.toContain('fetch_cross_chain_state');
      expect(names).not.toContain('find_cross_chain_routes');
      expect(names).not.toContain('execute_cross_chain_rebalance');
    });

    it('should return cross-chain tools via getCrossChainTools()', () => {
      const kit = new ObiKit({
        chainConfig: mockChainConfig,
        satellites: [moonbeamSatellite, astarSatellite],
      });

      const ccTools = kit.getCrossChainTools();
      expect(ccTools).toHaveLength(3);

      const names = ccTools.map((t) => t.name);
      expect(names).toContain('fetch_cross_chain_state');
      expect(names).toContain('find_cross_chain_routes');
      expect(names).toContain('execute_cross_chain_rebalance');
    });

    it('should return empty array from getCrossChainTools() when no satellites', () => {
      const kit = new ObiKit({ chainConfig: mockChainConfig });

      expect(kit.getCrossChainTools()).toHaveLength(0);
    });

    it('should include cross-chain tools in on-chain mode', () => {
      const kit = new ObiKit({
        polkadotContext: mockPolkadotContext,
        satellites: [moonbeamSatellite],
      });

      const tools = kit.getTools();
      const names = tools.map((t) => t.name);

      expect(names).toContain('fetch_cross_chain_state');
      expect(names).toContain('find_cross_chain_routes');
      expect(names).toContain('execute_cross_chain_rebalance');
    });
  });

  // ── Combined tool surface ────────────────────────────────────────────

  describe('combined tool surface', () => {
    it('should include vault + Bifrost + cross-chain tools in offline mode', () => {
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
        satellites: [moonbeamSatellite],
        bifrostConfig,
      });

      const tools = kit.getTools();
      const names = tools.map((t) => t.name);

      // Vault tools
      expect(names).toContain('vault_deposit');
      expect(names).toContain('vault_withdraw');

      // Bifrost tools
      expect(names).toContain('fetch_bifrost_yields');
      expect(names).toContain('execute_bifrost_strategy');

      // Cross-chain tools
      expect(names).toContain('fetch_cross_chain_state');
      expect(names).toContain('find_cross_chain_routes');
      expect(names).toContain('execute_cross_chain_rebalance');

      expect(tools).toHaveLength(7);
    });

    it('should include all tool categories in on-chain mode', () => {
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
        satellites: [moonbeamSatellite],
        bifrostConfig,
      });

      const tools = kit.getTools();
      const names = tools.map((t) => t.name);

      expect(names).toContain('vault_deposit');
      expect(names).toContain('vault_withdraw');
      expect(names).toContain('fetch_bifrost_yields');
      expect(names).toContain('execute_bifrost_strategy');
      expect(names).toContain('fetch_cross_chain_state');
      expect(names).toContain('find_cross_chain_routes');
      expect(names).toContain('execute_cross_chain_rebalance');

      expect(tools).toHaveLength(7);
    });

    it('should include custom tools alongside new tools', () => {
      const kit = new ObiKit({
        chainConfig: mockChainConfig,
        satellites: [moonbeamSatellite],
        bifrostConfig,
      });

      const customTool = new VaultDepositTool({ chainConfig: mockChainConfig });
      Object.defineProperty(customTool, 'name', { value: 'my_custom_tool' });

      kit.addTool(customTool);

      const tools = kit.getTools();
      const names = tools.map((t) => t.name);

      expect(names).toContain('my_custom_tool');
      expect(names).toContain('fetch_bifrost_yields');
      expect(names).toContain('fetch_cross_chain_state');
      expect(names).toContain('find_cross_chain_routes');
    });
  });

  // ── Backward compatibility ───────────────────────────────────────────

  describe('backward compatibility', () => {
    it('should work exactly the same without satellites or bifrostConfig', () => {
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
      expect(tools).toHaveLength(2);

      const names = tools.map((t) => t.name);
      expect(names).toContain('vault_deposit');
      expect(names).toContain('vault_withdraw');
    });

    it('should return no tools when no config of any kind is provided', () => {
      const kit = new ObiKit({ chainConfig: mockChainConfig });

      const tools = kit.getTools();
      expect(tools).toHaveLength(0);
    });

    it('should still support invokeTool with new tools', async () => {
      const kit = new ObiKit({
        chainConfig: mockChainConfig,
        bifrostConfig,
      });

      const result = await kit.invokeTool('fetch_bifrost_yields', '{}');
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should still return error for unknown tool via invokeTool', async () => {
      const kit = new ObiKit({
        chainConfig: mockChainConfig,
        bifrostConfig,
      });

      const result = await kit.invokeTool('nonexistent_tool', '{}');
      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  // ── Inspect ──────────────────────────────────────────────────────────

  describe('inspect', () => {
    it('should include satellite and Bifrost info in inspect output', () => {
      const kit = new ObiKit({
        chainConfig: mockChainConfig,
        satellites: [moonbeamSatellite, astarSatellite],
        bifrostConfig,
      });

      const info = kit.inspect();

      expect(info.mode).toBe('offline');
      expect(info.satelliteCount).toBe(2);
      expect(info.satelliteChains).toEqual(['Moonbeam', 'Astar']);
      expect(info.hasBifrostConfig).toBe(true);
      expect(info.evmContextCount).toBe(0);
      expect(info.evmContextChains).toEqual([]);
      // 5 tools: 2 Bifrost + 3 cross-chain
      expect(info.totalToolCount).toBe(5);
    });

    it('should show zero satellites and no Bifrost when not configured', () => {
      const kit = new ObiKit({ chainConfig: mockChainConfig });

      const info = kit.inspect();

      expect(info.satelliteCount).toBe(0);
      expect(info.satelliteChains).toEqual([]);
      expect(info.hasBifrostConfig).toBe(false);
      expect(info.evmContextCount).toBe(0);
    });
  });

  // ── EVM context management ───────────────────────────────────────────

  describe('EVM context management', () => {
    it('should add and retrieve EVM contexts', () => {
      const kit = new ObiKit({ chainConfig: mockChainConfig });

      const mockEvmCtx = {
        client: {} as unknown,
        chain: { id: 1284 } as unknown,
        chainName: 'Moonbeam',
      } as import('@obidot-kit/core').ObiEvmContext;

      kit.addEvmContext('Moonbeam', mockEvmCtx);

      const contexts = kit.getEvmContexts();
      expect(contexts.size).toBe(1);
      expect(contexts.get('Moonbeam')).toBeDefined();
    });

    it('should remove EVM contexts', () => {
      const kit = new ObiKit({ chainConfig: mockChainConfig });

      const mockEvmCtx = {
        client: {} as unknown,
        chain: { id: 1284 } as unknown,
        chainName: 'Moonbeam',
      } as import('@obidot-kit/core').ObiEvmContext;

      kit.addEvmContext('Moonbeam', mockEvmCtx);
      expect(kit.getEvmContexts().size).toBe(1);

      const removed = kit.removeEvmContext('Moonbeam');
      expect(removed).toBe(true);
      expect(kit.getEvmContexts().size).toBe(0);
    });

    it('should return false when removing non-existent EVM context', () => {
      const kit = new ObiKit({ chainConfig: mockChainConfig });

      expect(kit.removeEvmContext('Nonexistent')).toBe(false);
    });

    it('should accept EVM contexts via constructor', () => {
      const mockEvmCtx = {
        client: {} as unknown,
        chain: { id: 1284 } as unknown,
        chainName: 'Moonbeam',
      } as import('@obidot-kit/core').ObiEvmContext;

      const kit = new ObiKit({
        chainConfig: mockChainConfig,
        evmContexts: new Map([['Moonbeam', mockEvmCtx]]),
      });

      expect(kit.getEvmContexts().size).toBe(1);
    });
  });

  // ── Dynamic satellite + tool interaction ─────────────────────────────

  describe('dynamic satellite + tool interaction', () => {
    it('should gain cross-chain tools after dynamically adding a satellite', () => {
      const kit = new ObiKit({ chainConfig: mockChainConfig });

      expect(kit.getCrossChainTools()).toHaveLength(0);

      kit.registerSatelliteVault(moonbeamSatellite);

      expect(kit.getCrossChainTools()).toHaveLength(3);

      const names = kit.getCrossChainTools().map((t) => t.name);
      expect(names).toContain('fetch_cross_chain_state');
      expect(names).toContain('find_cross_chain_routes');
      expect(names).toContain('execute_cross_chain_rebalance');
    });

    it('should lose cross-chain tools after removing all satellites', () => {
      const kit = new ObiKit({
        chainConfig: mockChainConfig,
        satellites: [moonbeamSatellite],
      });

      expect(kit.getCrossChainTools()).toHaveLength(3);

      kit.removeSatelliteVault('Moonbeam');

      expect(kit.getCrossChainTools()).toHaveLength(0);
    });

    it('should invoke cross-chain state tool via invokeTool', async () => {
      const kit = new ObiKit({
        chainConfig: mockChainConfig,
        satellites: [moonbeamSatellite],
      });

      const result = await kit.invokeTool('fetch_cross_chain_state', '{}');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should invoke bifrost yield tool via invokeTool', async () => {
      const kit = new ObiKit({
        chainConfig: mockChainConfig,
        bifrostConfig,
      });

      const result = await kit.invokeTool('fetch_bifrost_yields', '{}');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });
});
