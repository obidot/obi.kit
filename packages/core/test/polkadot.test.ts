/**
 * Tests for the ObiPolkadotContext type, destroyPolkadotContext helper,
 * and the structural shape of createPolkadotContext.
 *
 * createPolkadotContext() bootstraps a heavy smoldot wasm blob via PAK and
 * requires a live network connection, so it is NOT called in unit tests.
 * Instead we verify:
 *  1. ObiPolkadotContext satisfies its own interface (compile-time + shape).
 *  2. destroyPolkadotContext() calls api.disconnect().
 *  3. The evmContext field is optional and wired correctly when present.
 */

import type { Chain } from 'viem';
import { describe, expect, it, vi } from 'vitest';
import { createEvmContext, type ObiEvmContext } from '../src/evm.js';
import { createPolkadotContext, destroyPolkadotContext, type ObiPolkadotContext } from '../src/polkadot.js';

const initializeApiMock = vi.fn(async () => {});
const disconnectApiMock = vi.fn(async () => {});
const polkadotApiConstructorArgs: unknown[] = [];

vi.mock('@polkadot-agent-kit/core', () => {
  class MockPolkadotApi {
    constructor(allowedChains?: unknown) {
      polkadotApiConstructorArgs.push(allowedChains);
    }

    initializeApi = initializeApiMock;
    disconnect = disconnectApiMock;
  }

  return {
    PolkadotApi: MockPolkadotApi,
  };
});

// ── Helpers ──────────────────────────────────────────────────────────────

const mockChain: Chain = {
  id: 420420417,
  name: 'Polkadot Hub TestNet',
  nativeCurrency: { name: 'DOT', symbol: 'DOT', decimals: 10 },
  rpcUrls: {
    default: { http: ['https://eth-rpc-testnet.polkadot.io/'] },
  },
};

function makeMockApi(disconnectFn = vi.fn()): ObiPolkadotContext['api'] {
  return {
    initializeApi: vi.fn(),
    disconnect: disconnectFn,
    getApi: vi.fn(),
    setApi: vi.fn(),
    getAllApis: vi.fn(() => new Map()),
    getChainSpec: vi.fn(() => ''),
    initializeChainApi: vi.fn(async () => ({
      success: true,
      chainId: 'paseo_asset_hub',
      message: 'ok',
    })),
  } as unknown as ObiPolkadotContext['api'];
}

function makeMockSigner(): ObiPolkadotContext['signer'] {
  return {
    publicKey: new Uint8Array(32),
    signTx: vi.fn(async () => new Uint8Array()),
    signBytes: vi.fn(async () => new Uint8Array()),
  } as unknown as ObiPolkadotContext['signer'];
}

function makeContext(evmContext?: ObiEvmContext): ObiPolkadotContext {
  return {
    api: makeMockApi(),
    signer: makeMockSigner(),
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    evmContext,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('ObiPolkadotContext interface', () => {
  it('should satisfy the interface shape without evmContext', () => {
    const ctx = makeContext();
    expect(ctx.api).toBeDefined();
    expect(ctx.signer).toBeDefined();
    expect(typeof ctx.address).toBe('string');
    expect(ctx.evmContext).toBeUndefined();
  });

  it('should satisfy the interface shape with evmContext', () => {
    const evm = createEvmContext({
      rpcUrl: 'https://eth-rpc-testnet.polkadot.io/',
      chain: mockChain,
      chainName: 'Polkadot Hub TestNet',
    });
    const ctx = makeContext(evm);
    expect(ctx.evmContext).toBeDefined();
    expect(ctx.evmContext?.chain.id).toBe(420420417);
    expect(ctx.evmContext?.chainName).toBe('Polkadot Hub TestNet');
  });

  it('should allow the evmContext to have a walletClient when account is set', () => {
    // Build a context without an account — walletClient should be undefined
    const readOnlyEvm = createEvmContext({
      rpcUrl: 'https://eth-rpc-testnet.polkadot.io/',
      chain: mockChain,
      chainName: 'Polkadot Hub TestNet',
    });
    expect(readOnlyEvm.walletClient).toBeUndefined();
    expect(readOnlyEvm.account).toBeUndefined();
  });
});

describe('destroyPolkadotContext', () => {
  it('should call api.disconnect()', async () => {
    const disconnectMock = vi.fn().mockResolvedValue(undefined);
    const ctx: ObiPolkadotContext = {
      api: makeMockApi(disconnectMock),
      signer: makeMockSigner(),
      address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    };

    await destroyPolkadotContext(ctx);
    expect(disconnectMock).toHaveBeenCalledTimes(1);
  });

  it('should not throw when evmContext is present', async () => {
    const evm = createEvmContext({
      rpcUrl: 'https://eth-rpc-testnet.polkadot.io/',
      chain: mockChain,
      chainName: 'Polkadot Hub TestNet',
    });
    const ctx = makeContext(evm);

    await expect(destroyPolkadotContext(ctx)).resolves.toBeUndefined();
  });

  it('should propagate errors from api.disconnect()', async () => {
    const ctx: ObiPolkadotContext = {
      api: makeMockApi(vi.fn().mockRejectedValue(new Error('disconnect failed'))),
      signer: makeMockSigner(),
      address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    };

    await expect(destroyPolkadotContext(ctx)).rejects.toThrow('disconnect failed');
  });
});

describe('createPolkadotContext options shape (compile-time)', () => {
  it('should be a function (import resolves correctly)', () => {
    // This test is deliberately NOT calling createPolkadotContext() because it
    // requires a live PAK smoldot connection (bootstraps smoldot wasm blob).
    // We just verify the import resolves and exposes the expected function.
    expect(typeof createPolkadotContext).toBe('function');
  });

  it('creates a polkadot context and initializes the mocked PAK API', async () => {
    initializeApiMock.mockClear();
    disconnectApiMock.mockClear();
    polkadotApiConstructorArgs.length = 0;

    const signer = makeMockSigner();
    const ctx = await createPolkadotContext({
      signer,
      address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      allowedChains: ['paseo_asset_hub'] as never,
    });

    expect(initializeApiMock).toHaveBeenCalledTimes(1);
    expect(polkadotApiConstructorArgs).toEqual([['paseo_asset_hub']]);
    expect(ctx.signer).toBe(signer);
    expect(ctx.address).toContain('5Grwva');
    expect(ctx.evmContext).toBeUndefined();
  });

  it('attaches an EVM context when includeEvm and privateKey are provided', async () => {
    initializeApiMock.mockClear();

    const ctx = await createPolkadotContext({
      signer: makeMockSigner(),
      address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      includeEvm: true,
      privateKey: '0x1111111111111111111111111111111111111111111111111111111111111111',
    });

    expect(initializeApiMock).toHaveBeenCalledTimes(1);
    expect(ctx.evmContext).toBeDefined();
    expect(ctx.evmContext?.chain.id).toBe(420_420_417);
    expect(ctx.evmContext?.account).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });
});
