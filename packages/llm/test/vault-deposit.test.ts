import type { ChainConfig, ObiPolkadotContext } from '@obidot-kit/core';
import { describe, expect, it } from 'vitest';
import { VaultDepositTool } from '../src/tools/vault-deposit.js';

const mockChainConfig: ChainConfig = {
  endpoint: 'wss://rpc.polkadot.io',
  name: 'Polkadot',
  chainId: 'polkadot',
  ss58Prefix: 0,
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
      expect(result.data.mode).toBe('on-chain');
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

      expect(result.data.message).toContain(mockPolkadotContext.address);
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
      expect(result.data.mode).toBe('on-chain');
      expect(result.data.signerAddress).toBe(mockPolkadotContext.address);
    });
  });
});
