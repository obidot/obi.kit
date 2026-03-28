import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Runnable } from '@langchain/core/runnables';
import { Tool } from '@langchain/core/tools';
import type { ChainConfig, ObiPolkadotContext } from '@obidot-kit/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { ObiAgentApiMock } = vi.hoisted(() => ({
  ObiAgentApiMock: vi.fn(),
}));

vi.mock('../src/obi-agent-api.js', () => ({
  ObiAgentApi: ObiAgentApiMock,
}));

import { createAgent, createAgentWithTools } from '../src/agent.js';

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

type MockObiAgentApiInstance = {
  config: unknown;
  getAllTools: ReturnType<typeof vi.fn>;
};

const mockChainConfig: ChainConfig = {
  endpoint: 'wss://rpc.polkadot.io',
  chainId: 'polkadot',
  name: 'Polkadot',
};

const mockVault = {
  id: 'vault-1',
  name: 'DOT Vault',
  address: '5FvaultAddress1111111111111111111111111111111111111',
  asset: 'DOT',
  chain: mockChainConfig,
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

let obiTools: DummyTool[];
let lastObiAgentApiInstance: MockObiAgentApiInstance | undefined;

beforeEach(() => {
  obiTools = [new DummyTool('pak_balance'), new DummyTool('pak_transfer')];
  lastObiAgentApiInstance = undefined;

  ObiAgentApiMock.mockReset();
  ObiAgentApiMock.mockImplementation((config: unknown) => {
    lastObiAgentApiInstance = {
      config,
      getAllTools: vi.fn(() => obiTools),
    };
    return lastObiAgentApiInstance;
  });
});

describe('createAgent', () => {
  it('creates an offline agent with stub vault tools and binds the collected tools', () => {
    const boundModel = { kind: 'bound-offline-model' } as unknown as Runnable;
    const bindTools = vi.fn(() => boundModel);
    const model = { bindTools } as unknown as BaseChatModel;
    const additionalTool = new DummyTool('custom_tool');

    const agent = createAgent({
      model,
      chainConfig: mockChainConfig,
      additionalTools: [additionalTool],
    });

    expect(ObiAgentApiMock).not.toHaveBeenCalled();
    expect(agent.agentApi).toBeUndefined();
    expect(agent.chainConfig).toEqual(mockChainConfig);
    expect(agent.tools.map((tool) => tool.name)).toEqual(['vault_deposit', 'vault_withdraw', 'custom_tool']);
    expect(bindTools).toHaveBeenCalledOnce();
    expect(bindTools).toHaveBeenCalledWith(agent.tools);
    expect(agent.model).toBe(boundModel);
  });

  it('creates an on-chain agent from polkadotContext and appends additional tools', () => {
    const boundModel = { kind: 'bound-onchain-model' } as unknown as Runnable;
    const bindTools = vi.fn(() => boundModel);
    const model = { bindTools } as unknown as BaseChatModel;
    const additionalTool = new DummyTool('custom_tool');

    const agent = createAgent({
      model,
      polkadotContext: mockPolkadotContext,
      additionalTools: [additionalTool],
    });

    expect(ObiAgentApiMock).toHaveBeenCalledOnce();
    expect(ObiAgentApiMock).toHaveBeenCalledWith({
      polkadotContext: mockPolkadotContext,
    });
    expect(lastObiAgentApiInstance?.getAllTools).toHaveBeenCalledOnce();
    expect(agent.agentApi).toBe(lastObiAgentApiInstance);
    expect(agent.chainConfig).toBeUndefined();
    expect(agent.tools.map((tool) => tool.name)).toEqual(['pak_balance', 'pak_transfer', 'custom_tool']);
    expect(bindTools).toHaveBeenCalledWith(agent.tools);
    expect(agent.model).toBe(boundModel);
  });

  it('prefers an explicit ObiAgentApi config when one is supplied', () => {
    const model = {} as BaseChatModel;
    const agentApiConfig = {
      polkadotContext: mockPolkadotContext,
      vaults: [mockVault],
    };

    createAgent({
      model,
      polkadotContext: mockPolkadotContext,
      agentApiConfig,
    });

    expect(ObiAgentApiMock).toHaveBeenCalledWith(agentApiConfig);
  });

  it('returns the original model when bindTools is not available', () => {
    const model = { invoke: vi.fn() } as unknown as BaseChatModel;

    const agent = createAgent({
      model,
      chainConfig: mockChainConfig,
    });

    expect(agent.model).toBe(model);
    expect(agent.tools.map((tool) => tool.name)).toEqual(['vault_deposit', 'vault_withdraw']);
  });
});

describe('createAgentWithTools', () => {
  it('binds the provided tools and preserves chainConfig metadata', () => {
    const providedTools = [new DummyTool('custom_a'), new DummyTool('custom_b')];
    const boundModel = { kind: 'bound-custom-model' } as unknown as Runnable;
    const bindTools = vi.fn(() => boundModel);
    const model = { bindTools } as unknown as BaseChatModel;

    const agent = createAgentWithTools(model, providedTools, mockChainConfig);

    expect(bindTools).toHaveBeenCalledOnce();
    expect(bindTools).toHaveBeenCalledWith(providedTools);
    expect(agent.model).toBe(boundModel);
    expect(agent.tools).toBe(providedTools);
    expect(agent.chainConfig).toEqual(mockChainConfig);
  });

  it('skips bindTools when there are no tools to bind', () => {
    const bindTools = vi.fn();
    const model = { bindTools } as unknown as BaseChatModel;

    const agent = createAgentWithTools(model, []);

    expect(bindTools).not.toHaveBeenCalled();
    expect(agent.model).toBe(model);
    expect(agent.tools).toEqual([]);
    expect(agent.chainConfig).toBeUndefined();
  });
});
