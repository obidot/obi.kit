import type { ChainConfig } from '@obidot-kit/core';
import { describe, expect, it } from 'vitest';
import { VaultDepositTool } from '../src/tools/vault-deposit.js';

const mockChainConfig: ChainConfig = {
  endpoint: 'wss://rpc.polkadot.io',
  name: 'Polkadot',
  chainId: 'polkadot',
  ss58Prefix: 0,
};

describe('VaultDepositTool', () => {
  it('should have the correct name and description', () => {
    const tool = new VaultDepositTool({ chainConfig: mockChainConfig });
    expect(tool.name).toBe('vault_deposit');
    expect(tool.description).toContain('Deposit');
  });

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
