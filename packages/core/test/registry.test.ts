import { describe, expect, it } from 'vitest';
import * as core from '../src/index.js';
import {
  EXPLORER_URLS,
  KUSAMA_HUB,
  kusamaHub,
  POLKADOT_HUB_MAINNET,
  POLKADOT_HUB_TESTNET,
  POLKADOT_HUB_TESTNET_ADMIN,
  POLKADOT_HUB_TESTNET_CONTRACTS,
  POLKADOT_HUB_TESTNET_RPC,
  polkadotHubMainnet,
  polkadotHubTestnet,
  RPC_URLS,
  XCM_PRECOMPILE_ADDRESS,
} from '../src/index.js';

describe('core registry exports', () => {
  it('re-exports the contract registry through the package entrypoint', () => {
    expect(core.POLKADOT_HUB_TESTNET_CONTRACTS).toBe(POLKADOT_HUB_TESTNET_CONTRACTS);
    expect(POLKADOT_HUB_TESTNET_CONTRACTS.swapRouterAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(POLKADOT_HUB_TESTNET_CONTRACTS.oracleRegistryAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(POLKADOT_HUB_TESTNET_ADMIN).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it('exports stable chain aliases and network constants', () => {
    expect(POLKADOT_HUB_TESTNET).toBe(polkadotHubTestnet);
    expect(POLKADOT_HUB_MAINNET).toBe(polkadotHubMainnet);
    expect(KUSAMA_HUB).toBe(kusamaHub);
    expect(POLKADOT_HUB_TESTNET_RPC).toBe(RPC_URLS.testnet);
    expect(EXPLORER_URLS.testnet).toContain('blockscout-testnet');
    expect(XCM_PRECOMPILE_ADDRESS).toBe('0x00000000000000000000000000000000000a0000');
  });

  it('keeps the expected Polkadot Hub chain metadata', () => {
    expect(POLKADOT_HUB_TESTNET.id).toBe(420_420_417);
    expect(POLKADOT_HUB_MAINNET.id).toBe(420_420_419);
    expect(KUSAMA_HUB.id).toBe(420_420_418);
    expect(POLKADOT_HUB_TESTNET.rpcUrls.default.http[0]).toBe(RPC_URLS.testnet);
    expect(POLKADOT_HUB_MAINNET.rpcUrls.default.http[0]).toBe(RPC_URLS.mainnet);
    expect(KUSAMA_HUB.rpcUrls.default.http[0]).toBe(RPC_URLS.kusama);
  });
});
