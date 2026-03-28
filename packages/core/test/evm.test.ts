import type { Chain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { describe, expect, it } from 'vitest';
import {
  type CreateEvmContextOptions,
  createEvmContext,
  createSwapRouterContext,
  destroyEvmContext,
  type ObiEvmContext,
} from '../src/evm.js';

/**
 * Minimal mock chain definition that satisfies viem's Chain type
 * for testing purposes.
 */
const mockChain: Chain = {
  id: 1284,
  name: 'Moonbeam',
  nativeCurrency: {
    name: 'Glimmer',
    symbol: 'GLMR',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.api.moonbeam.network'],
    },
  },
};

const mockAstarChain: Chain = {
  id: 592,
  name: 'Astar',
  nativeCurrency: {
    name: 'Astar',
    symbol: 'ASTR',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://evm.astar.network'],
    },
  },
};

describe('createEvmContext', () => {
  it('should create an EVM context with the given options', () => {
    const options: CreateEvmContextOptions = {
      rpcUrl: 'https://rpc.api.moonbeam.network',
      chain: mockChain,
      chainName: 'Moonbeam',
    };

    const ctx = createEvmContext(options);

    expect(ctx).toBeDefined();
    expect(ctx.chain).toBe(mockChain);
    expect(ctx.chainName).toBe('Moonbeam');
    expect(ctx.client).toBeDefined();
  });

  it('should create a client with a PublicClient interface', () => {
    const ctx = createEvmContext({
      rpcUrl: 'https://rpc.api.moonbeam.network',
      chain: mockChain,
      chainName: 'Moonbeam',
    });

    // The client should have standard viem PublicClient methods
    expect(typeof ctx.client.readContract).toBe('function');
    expect(typeof ctx.client.getBlockNumber).toBe('function');
    expect(typeof ctx.client.getBalance).toBe('function');
  });

  it('should preserve the chain metadata on the context', () => {
    const ctx = createEvmContext({
      rpcUrl: 'https://evm.astar.network',
      chain: mockAstarChain,
      chainName: 'Astar EVM',
    });

    expect(ctx.chain.id).toBe(592);
    expect(ctx.chain.name).toBe('Astar');
    expect(ctx.chainName).toBe('Astar EVM');
  });

  it('should allow creating multiple independent contexts', () => {
    const moonbeamCtx = createEvmContext({
      rpcUrl: 'https://rpc.api.moonbeam.network',
      chain: mockChain,
      chainName: 'Moonbeam',
    });

    const astarCtx = createEvmContext({
      rpcUrl: 'https://evm.astar.network',
      chain: mockAstarChain,
      chainName: 'Astar',
    });

    expect(moonbeamCtx.chainName).toBe('Moonbeam');
    expect(astarCtx.chainName).toBe('Astar');
    expect(moonbeamCtx.client).not.toBe(astarCtx.client);
    expect(moonbeamCtx.chain.id).not.toBe(astarCtx.chain.id);
  });

  it('should accept a custom RPC URL different from chain defaults', () => {
    const customRpcUrl = 'https://my-custom-moonbeam-rpc.example.com';
    const ctx = createEvmContext({
      rpcUrl: customRpcUrl,
      chain: mockChain,
      chainName: 'Moonbeam Custom',
    });

    expect(ctx).toBeDefined();
    expect(ctx.chainName).toBe('Moonbeam Custom');
    expect(ctx.chain).toBe(mockChain);
  });

  it('should create a wallet client when an account is provided', () => {
    const account = privateKeyToAccount('0x1111111111111111111111111111111111111111111111111111111111111111');

    const ctx = createEvmContext({
      rpcUrl: 'https://rpc.api.moonbeam.network',
      chain: mockChain,
      chainName: 'Moonbeam',
      account,
    });

    expect(ctx.walletClient).toBeDefined();
    expect(ctx.account).toBe(account.address);
  });

  it('should bundle swap router config on top of the base EVM context', () => {
    const ctx = createSwapRouterContext({
      rpcUrl: 'https://rpc.api.moonbeam.network',
      chain: mockChain,
      chainName: 'Moonbeam',
      swapRouterAddress: '0x0000000000000000000000000000000000000001',
      quoterAddress: '0x0000000000000000000000000000000000000002',
      adapters: {
        0: '0x0000000000000000000000000000000000000003',
      },
    });

    expect(ctx.swapRouterAddress).toBe('0x0000000000000000000000000000000000000001');
    expect(ctx.quoterAddress).toBe('0x0000000000000000000000000000000000000002');
    expect(ctx.adapters?.[0]).toBe('0x0000000000000000000000000000000000000003');
  });
});

describe('destroyEvmContext', () => {
  it('should not throw when destroying a valid context', () => {
    const ctx = createEvmContext({
      rpcUrl: 'https://rpc.api.moonbeam.network',
      chain: mockChain,
      chainName: 'Moonbeam',
    });

    expect(() => destroyEvmContext(ctx)).not.toThrow();
  });

  it('should be safe to call multiple times on the same context', () => {
    const ctx = createEvmContext({
      rpcUrl: 'https://rpc.api.moonbeam.network',
      chain: mockChain,
      chainName: 'Moonbeam',
    });

    expect(() => {
      destroyEvmContext(ctx);
      destroyEvmContext(ctx);
    }).not.toThrow();
  });
});

describe('ObiEvmContext interface', () => {
  it('should have readonly properties after creation', () => {
    const ctx = createEvmContext({
      rpcUrl: 'https://rpc.api.moonbeam.network',
      chain: mockChain,
      chainName: 'Moonbeam',
    });

    // Verify all expected properties exist
    expect(ctx).toHaveProperty('client');
    expect(ctx).toHaveProperty('chain');
    expect(ctx).toHaveProperty('chainName');
  });

  it('should satisfy the ObiEvmContext type', () => {
    const ctx: ObiEvmContext = createEvmContext({
      rpcUrl: 'https://evm.astar.network',
      chain: mockAstarChain,
      chainName: 'Astar',
    });

    // Type-level check — if this compiles, the interface is satisfied
    const _client = ctx.client;
    const _chain = ctx.chain;
    const _name = ctx.chainName;

    expect(_client).toBeDefined();
    expect(_chain).toBeDefined();
    expect(_name).toBe('Astar');
  });
});
