import { describe, expect, it } from 'vitest';

describe('ObiKit SDK', () => {
  it('should export ObiKit class', async () => {
    const mod = await import('../src/index.js');
    expect(mod.ObiKit).toBeDefined();
  });

  it('should create an ObiKit instance with chain config', async () => {
    const { ObiKit } = await import('../src/index.js');
    const kit = new ObiKit({
      chainConfig: {
        endpoint: 'wss://rpc.polkadot.io',
        chainId: 'polkadot',
        name: 'Polkadot',
      },
    });
    expect(kit).toBeInstanceOf(ObiKit);
    expect(kit.getChainConfig()).toEqual({
      endpoint: 'wss://rpc.polkadot.io',
      chainId: 'polkadot',
      name: 'Polkadot',
    });
  });

  it('should return an empty tools array by default', async () => {
    const { ObiKit } = await import('../src/index.js');
    const kit = new ObiKit({
      chainConfig: {
        endpoint: 'wss://rpc.polkadot.io',
        chainId: 'polkadot',
      },
    });
    const tools = kit.getTools();
    expect(tools).toEqual([]);
  });

  it('should allow updating chain config', async () => {
    const { ObiKit } = await import('../src/index.js');
    const kit = new ObiKit({
      chainConfig: {
        endpoint: 'wss://rpc.polkadot.io',
        chainId: 'polkadot',
      },
    });

    kit.setChainConfig({
      endpoint: 'wss://kusama-rpc.polkadot.io',
      chainId: 'kusama',
      name: 'Kusama',
    });

    expect(kit.getChainConfig()).toEqual({
      endpoint: 'wss://kusama-rpc.polkadot.io',
      chainId: 'kusama',
      name: 'Kusama',
    });
  });
});
