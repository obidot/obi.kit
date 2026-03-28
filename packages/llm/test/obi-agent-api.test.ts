import { Tool } from '@langchain/core/tools';
import type { ChainConfig, ObiPolkadotContext, SatelliteVaultConfig } from '@obidot-kit/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { PolkadotAgentApiMock } = vi.hoisted(() => ({
  PolkadotAgentApiMock: vi.fn(),
}));

vi.mock('@polkadot-agent-kit/llm', () => ({
  PolkadotAgentApi: PolkadotAgentApiMock,
}));

import { ObiAgentApi } from '../src/obi-agent-api.js';

class DummyTool extends Tool {
  name: string;
  description: string;

  constructor(name: string) {
    super();
    this.name = name;
    this.description = `${name} test tool`;
  }

  protected async _call(_input: string): Promise<string> {
    return JSON.stringify({
      success: true,
      tool: this.name,
    });
  }
}

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

const moonbeamChainConfig: ChainConfig = {
  endpoint: 'https://rpc.api.moonbeam.network',
  chainId: 'moonbeam',
  name: 'Moonbeam',
};

const moonbeamSatellite: SatelliteVaultConfig = {
  id: 'moonbeam-sat',
  name: 'Moonbeam Satellite Vault',
  address: '0x1111111111111111111111111111111111111111',
  chain: moonbeamChainConfig,
  asset: 'xcDOT',
  decimals: 10,
  hubVaultAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  routerAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  rpcUrl: 'https://rpc.api.moonbeam.network',
  evmChainId: 1284,
};

const mockVault = {
  id: 'vault-1',
  name: 'DOT Vault',
  address: '5FvaultAddress1111111111111111111111111111111111111',
  asset: 'DOT',
  chain: {
    endpoint: 'wss://rpc.polkadot.io',
    chainId: 'polkadot',
    name: 'Polkadot',
  },
};

beforeEach(() => {
  PolkadotAgentApiMock.mockReset();
});

describe('ObiAgentApi', () => {
  it('exposes empty tool collections and context getters before initialisation', () => {
    const api = new ObiAgentApi({
      polkadotContext: mockPolkadotContext,
    });

    expect(api.isPakInitialised()).toBe(false);
    expect(api.getPakAgentApi()).toBeUndefined();
    expect(api.getPakActions()).toEqual([]);
    expect(api.getVaultTools()).toEqual([]);
    expect(api.getBifrostTools()).toEqual([]);
    expect(api.getCrossChainTools()).toEqual([]);
    expect(api.getAllTools()).toEqual([]);
    expect(api.getVaults()).toEqual([]);
    expect(api.getVault('missing-vault')).toBeUndefined();
    expect(api.getPolkadotContext()).toBe(mockPolkadotContext);
    expect(api.getAddress()).toBe(mockPolkadotContext.address);
  });

  it('initialises the PAK API once and aggregates PAK, vault, bifrost, and cross-chain tools', async () => {
    const pakBalanceTool = new DummyTool('pak_balance');
    const pakTransferTool = new DummyTool('pak_transfer');
    const rawPakActions = [{ tool: pakBalanceTool }, { ignored: true }, { tool: pakTransferTool }];
    const getActions = vi.fn(() => rawPakActions);

    PolkadotAgentApiMock.mockImplementation(() => ({
      getActions,
    }));

    const api = new ObiAgentApi({
      polkadotContext: mockPolkadotContext,
      vaults: [mockVault],
      bifrostConfig: {
        adapterAddress: '0x1234567890123456789012345678901234567890',
      },
      crossChainConfig: {
        hubVaultAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        routerAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        satellites: [moonbeamSatellite],
        hubRpcUrl: 'https://hub.example',
      },
    });

    await api.init();
    await api.init();

    expect(PolkadotAgentApiMock).toHaveBeenCalledOnce();
    expect(PolkadotAgentApiMock).toHaveBeenCalledWith(mockPolkadotContext.api);
    expect(api.isPakInitialised()).toBe(true);
    expect(api.getPakAgentApi()).toBeDefined();
    expect(api.getPakActions()).toEqual(rawPakActions);
    expect(getActions).toHaveBeenCalledWith(mockPolkadotContext.signer, mockPolkadotContext.address);
    expect(api.getVaults()).toEqual([mockVault]);
    expect(api.getVault('vault-1')).toEqual(mockVault);
    expect(api.getVaultTools().map((tool) => tool.name)).toEqual(['vault_deposit', 'vault_withdraw']);
    expect(api.getBifrostTools().map((tool) => tool.name)).toEqual([
      'fetch_bifrost_yields',
      'execute_bifrost_strategy',
    ]);
    expect(api.getCrossChainTools().map((tool) => tool.name)).toEqual([
      'fetch_cross_chain_state',
      'find_cross_chain_routes',
      'execute_cross_chain_rebalance',
    ]);
    expect(api.getAllTools().map((tool) => tool.name)).toEqual([
      'pak_balance',
      'pak_transfer',
      'vault_deposit',
      'vault_withdraw',
      'fetch_bifrost_yields',
      'execute_bifrost_strategy',
      'fetch_cross_chain_state',
      'find_cross_chain_routes',
      'execute_cross_chain_rebalance',
    ]);
  });

  it('gracefully degrades when PAK initialisation fails and still returns non-PAK tools', async () => {
    PolkadotAgentApiMock.mockImplementation(() => {
      throw new Error('missing PAK dependency');
    });

    const api = new ObiAgentApi({
      polkadotContext: mockPolkadotContext,
      vaults: [mockVault],
      bifrostConfig: {
        adapterAddress: '0x1234567890123456789012345678901234567890',
      },
      crossChainConfig: {
        hubVaultAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        routerAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        satellites: [moonbeamSatellite],
      },
    });

    await expect(api.init()).resolves.toBeUndefined();

    expect(api.isPakInitialised()).toBe(false);
    expect(api.getPakAgentApi()).toBeUndefined();
    expect(api.getPakActions()).toEqual([]);
    expect(api.getAllTools().map((tool) => tool.name)).toEqual([
      'vault_deposit',
      'vault_withdraw',
      'fetch_bifrost_yields',
      'execute_bifrost_strategy',
      'fetch_cross_chain_state',
      'find_cross_chain_routes',
      'execute_cross_chain_rebalance',
    ]);
  });
});
