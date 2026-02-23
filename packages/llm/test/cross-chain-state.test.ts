import type { ChainConfig, CrossChainVaultState, SatelliteChainState, SatelliteVaultConfig } from '@obidot-kit/core';
import { describe, expect, it } from 'vitest';
import { CrossChainStateTool } from '../src/tools/cross-chain-state.js';

const hubChainConfig: ChainConfig = {
  endpoint: 'wss://rpc.polkadot.io',
  chainId: 'polkadot',
  name: 'Polkadot',
};

const moonbeamChainConfig: ChainConfig = {
  endpoint: 'https://rpc.api.moonbeam.network',
  chainId: 'moonbeam',
  name: 'Moonbeam',
};

const astarChainConfig: ChainConfig = {
  endpoint: 'https://evm.astar.network',
  chainId: 'astar',
  name: 'Astar',
};

const moonbeamSatellite: SatelliteVaultConfig = {
  id: 'moonbeam-sat',
  name: 'Moonbeam Satellite Vault',
  address: '0x1111111111111111111111111111111111111111',
  chain: moonbeamChainConfig,
  asset: 'xcDOT',
  decimals: 10,
  hubVaultAddress: '0xaaaa',
  routerAddress: '0xbbbb',
  rpcUrl: 'https://rpc.api.moonbeam.network',
  evmChainId: 1284,
};

const astarSatellite: SatelliteVaultConfig = {
  id: 'astar-sat',
  name: 'Astar Satellite Vault',
  address: '0x2222222222222222222222222222222222222222',
  chain: astarChainConfig,
  asset: 'xcDOT',
  decimals: 10,
  hubVaultAddress: '0xaaaa',
  routerAddress: '0xbbbb',
  rpcUrl: 'https://evm.astar.network',
  evmChainId: 592,
};

function buildMockState(satellites: ReadonlyArray<SatelliteVaultConfig>, _chainName?: string): CrossChainVaultState {
  const satelliteAssets = new Map<string, SatelliteChainState>();
  let totalSatelliteAssets = 0n;

  for (const sat of satellites) {
    const name = sat.chain.name ?? sat.id;
    const assets = BigInt(1000 * (satelliteAssets.size + 1));
    satelliteAssets.set(name, {
      chainName: name,
      totalAssets: assets,
      globalTotalAssets: 5000n,
      emergencyMode: false,
      lastSyncTimestamp: 1700000000,
      paused: false,
    });
    totalSatelliteAssets += assets;
  }

  return {
    totalSatelliteAssets,
    globalTotalAssets: totalSatelliteAssets + 10000n,
    globalTotalShares: totalSatelliteAssets + 10000n,
    satelliteAssets,
  };
}

describe('CrossChainStateTool', () => {
  describe('construction', () => {
    it('should create a tool with default options', () => {
      const tool = new CrossChainStateTool();
      expect(tool.name).toBe('fetch_cross_chain_state');
      expect(tool.description).toContain('cross-chain');
    });

    it('should accept satellite configurations', () => {
      const tool = new CrossChainStateTool({
        satellites: [moonbeamSatellite, astarSatellite],
      });
      expect(tool.name).toBe('fetch_cross_chain_state');
    });

    it('should accept a custom fetchState function', () => {
      const tool = new CrossChainStateTool({
        fetchState: async (sats) => buildMockState(sats),
      });
      expect(tool.name).toBe('fetch_cross_chain_state');
    });
  });

  describe('stub mode (no evmContexts or fetchState)', () => {
    it('should return stub state with zero assets for configured satellites', async () => {
      const tool = new CrossChainStateTool({
        chainConfig: hubChainConfig,
        hubVaultAddress: '0xaaaa',
        routerAddress: '0xbbbb',
        satellites: [moonbeamSatellite, astarSatellite],
      });

      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.satelliteCount).toBe(2);
      expect(result.data.totalSatelliteAssets).toBe('0');
      expect(result.data.globalTotalAssets).toBe('0');
      expect(result.data.hubVaultAddress).toBe('0xaaaa');
      expect(result.data.routerAddress).toBe('0xbbbb');
      expect(result.data.mode).toBe('stub');
    });

    it('should include per-satellite details by default', async () => {
      const tool = new CrossChainStateTool({
        satellites: [moonbeamSatellite, astarSatellite],
      });

      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data.satellites).toBeDefined();
      expect(result.data.satellites).toHaveLength(2);

      const names = result.data.satellites.map((s: { chainName: string }) => s.chainName);
      expect(names).toContain('Moonbeam');
      expect(names).toContain('Astar');
    });

    it('should omit satellite details when includeDetails is false', async () => {
      const tool = new CrossChainStateTool({
        satellites: [moonbeamSatellite],
      });

      const raw = await tool.invoke('{"includeDetails": false}');
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data.satellites).toBeUndefined();
      expect(result.data.satelliteCount).toBe(1);
    });

    it('should return empty state with no satellites configured', async () => {
      const tool = new CrossChainStateTool({});

      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data.satelliteCount).toBe(0);
      expect(result.data.totalSatelliteAssets).toBe('0');
    });
  });

  describe('with mock fetchState', () => {
    it('should use the injected fetchState function', async () => {
      const tool = new CrossChainStateTool({
        hubVaultAddress: '0xaaaa',
        routerAddress: '0xbbbb',
        satellites: [moonbeamSatellite, astarSatellite],
        fetchState: async (sats) => buildMockState(sats),
      });

      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data.satelliteCount).toBe(2);
      // buildMockState gives 1000 for first, 2000 for second => total 3000
      expect(result.data.totalSatelliteAssets).toBe('3000');
      // global = total + 10000
      expect(result.data.globalTotalAssets).toBe('13000');
    });

    it('should pass chainName filter to fetchState', async () => {
      let receivedChainName: string | undefined;

      const tool = new CrossChainStateTool({
        satellites: [moonbeamSatellite, astarSatellite],
        fetchState: async (sats, chainName) => {
          receivedChainName = chainName;
          return buildMockState(sats, chainName);
        },
      });

      await tool.invoke('{"chainName": "Moonbeam"}');

      expect(receivedChainName).toBe('Moonbeam');
    });

    it('should include satellite details from mock data', async () => {
      const tool = new CrossChainStateTool({
        satellites: [moonbeamSatellite],
        fetchState: async (sats) => buildMockState(sats),
      });

      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data.satellites).toBeDefined();
      expect(result.data.satellites).toHaveLength(1);

      const sat = result.data.satellites[0];
      expect(sat.chainName).toBe('Moonbeam');
      expect(sat.totalAssets).toBe('1000');
      expect(sat.globalTotalAssets).toBe('5000');
      expect(sat.emergencyMode).toBe(false);
      expect(sat.lastSyncTimestamp).toBe(1700000000);
      expect(sat.paused).toBe(false);
    });
  });

  describe('chain name filtering (stub mode)', () => {
    it('should filter satellites by chain name', async () => {
      const tool = new CrossChainStateTool({
        satellites: [moonbeamSatellite, astarSatellite],
      });

      const raw = await tool.invoke('{"chainName": "Moonbeam"}');
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data.satelliteCount).toBe(1);
      expect(result.data.satellites).toHaveLength(1);
      expect(result.data.satellites[0].chainName).toBe('Moonbeam');
    });

    it('should be case-insensitive for chain name filtering', async () => {
      const tool = new CrossChainStateTool({
        satellites: [moonbeamSatellite],
      });

      const raw = await tool.invoke('{"chainName": "moonbeam"}');
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data.satelliteCount).toBe(1);
    });

    it('should error when chain name does not match any satellite', async () => {
      const tool = new CrossChainStateTool({
        satellites: [moonbeamSatellite],
      });

      const raw = await tool.invoke('{"chainName": "UnknownChain"}');
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('UnknownChain');
      expect(result.error).toContain('Moonbeam');
    });
  });

  describe('input parsing', () => {
    it('should accept empty string input', async () => {
      const tool = new CrossChainStateTool({ satellites: [moonbeamSatellite] });

      const raw = await tool.invoke('');
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
    });

    it('should accept empty JSON object input', async () => {
      const tool = new CrossChainStateTool({ satellites: [moonbeamSatellite] });

      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
    });

    it('should return an error for invalid JSON', async () => {
      const tool = new CrossChainStateTool({ satellites: [moonbeamSatellite] });

      const raw = await tool.invoke('not json');
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON');
    });

    it('should ignore non-object JSON input gracefully', async () => {
      const tool = new CrossChainStateTool({ satellites: [moonbeamSatellite] });

      const raw = await tool.invoke('"just a string"');
      const result = JSON.parse(raw);

      // Should treat as empty input (no filters)
      expect(result.success).toBe(true);
    });

    it('should ignore unknown fields in input', async () => {
      const tool = new CrossChainStateTool({ satellites: [moonbeamSatellite] });

      const raw = await tool.invoke('{"unknownField": 42}');
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
    });
  });

  describe('result format', () => {
    it('should include a human-readable message', async () => {
      const tool = new CrossChainStateTool({
        satellites: [moonbeamSatellite, astarSatellite],
      });

      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.message).toContain('2 satellite(s)');
    });

    it('should report mode as stub when no evmContexts provided', async () => {
      const tool = new CrossChainStateTool({
        satellites: [moonbeamSatellite],
      });

      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw);

      expect(result.data.mode).toBe('stub');
    });

    it('should serialize bigint values as strings', async () => {
      const tool = new CrossChainStateTool({
        satellites: [moonbeamSatellite],
        fetchState: async () => ({
          totalSatelliteAssets: 999999999999999999n,
          globalTotalAssets: 1999999999999999999n,
          globalTotalShares: 1999999999999999999n,
          satelliteAssets: new Map([
            [
              'Moonbeam',
              {
                chainName: 'Moonbeam',
                totalAssets: 999999999999999999n,
                globalTotalAssets: 1999999999999999999n,
                emergencyMode: false,
                lastSyncTimestamp: 1700000000,
                paused: false,
              },
            ],
          ]),
        }),
      });

      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data.totalSatelliteAssets).toBe('999999999999999999');
      expect(result.data.globalTotalAssets).toBe('1999999999999999999');
      expect(result.data.satellites[0].totalAssets).toBe('999999999999999999');
    });

    it('should report hub and router addresses', async () => {
      const tool = new CrossChainStateTool({
        hubVaultAddress: '0xHUB',
        routerAddress: '0xROUTER',
        satellites: [moonbeamSatellite],
      });

      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw);

      expect(result.data.hubVaultAddress).toBe('0xHUB');
      expect(result.data.routerAddress).toBe('0xROUTER');
    });

    it('should report not-configured when addresses are missing', async () => {
      const tool = new CrossChainStateTool({
        satellites: [moonbeamSatellite],
      });

      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw);

      expect(result.data.hubVaultAddress).toBe('not-configured');
      expect(result.data.routerAddress).toBe('not-configured');
    });
  });

  describe('error handling', () => {
    it('should catch and return errors from fetchState', async () => {
      const tool = new CrossChainStateTool({
        satellites: [moonbeamSatellite],
        fetchState: async () => {
          throw new Error('RPC timeout');
        },
      });

      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('RPC timeout');
    });

    it('should catch non-Error throws from fetchState', async () => {
      const tool = new CrossChainStateTool({
        satellites: [moonbeamSatellite],
        fetchState: async () => {
          throw 'string error';
        },
      });

      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('string error');
    });
  });

  describe('multi-chain aggregation', () => {
    it('should aggregate state from multiple satellites correctly', async () => {
      const tool = new CrossChainStateTool({
        satellites: [moonbeamSatellite, astarSatellite],
        fetchState: async (sats) => {
          const satelliteAssets = new Map<string, SatelliteChainState>();
          let total = 0n;

          for (let i = 0; i < sats.length; i++) {
            const sat = sats[i];
            if (!sat) continue;
            const name = sat.chain.name ?? sat.id;
            const assets = BigInt((i + 1) * 5000);
            satelliteAssets.set(name, {
              chainName: name,
              totalAssets: assets,
              globalTotalAssets: 20000n,
              emergencyMode: i === 1, // second satellite in emergency
              lastSyncTimestamp: 1700000000 + i * 3600,
              paused: false,
            });
            total += assets;
          }

          return {
            totalSatelliteAssets: total,
            globalTotalAssets: total + 50000n,
            globalTotalShares: total + 50000n,
            satelliteAssets,
          };
        },
      });

      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data.satelliteCount).toBe(2);
      // 5000 + 10000 = 15000
      expect(result.data.totalSatelliteAssets).toBe('15000');
      // 15000 + 50000 = 65000
      expect(result.data.globalTotalAssets).toBe('65000');

      const moonbeam = result.data.satellites.find((s: { chainName: string }) => s.chainName === 'Moonbeam');
      const astar = result.data.satellites.find((s: { chainName: string }) => s.chainName === 'Astar');

      expect(moonbeam).toBeDefined();
      expect(moonbeam.totalAssets).toBe('5000');
      expect(moonbeam.emergencyMode).toBe(false);

      expect(astar).toBeDefined();
      expect(astar.totalAssets).toBe('10000');
      expect(astar.emergencyMode).toBe(true);
    });

    it('should handle satellites with different sync timestamps', async () => {
      const tool = new CrossChainStateTool({
        satellites: [moonbeamSatellite, astarSatellite],
        fetchState: async () => {
          const satelliteAssets = new Map<string, SatelliteChainState>();
          satelliteAssets.set('Moonbeam', {
            chainName: 'Moonbeam',
            totalAssets: 1000n,
            globalTotalAssets: 2000n,
            emergencyMode: false,
            lastSyncTimestamp: 1700000000,
            paused: false,
          });
          satelliteAssets.set('Astar', {
            chainName: 'Astar',
            totalAssets: 500n,
            globalTotalAssets: 2000n,
            emergencyMode: false,
            lastSyncTimestamp: 1699990000, // older sync
            paused: true,
          });

          return {
            totalSatelliteAssets: 1500n,
            globalTotalAssets: 2000n,
            globalTotalShares: 2000n,
            satelliteAssets,
          };
        },
      });

      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);

      const astar = result.data.satellites.find((s: { chainName: string }) => s.chainName === 'Astar');
      expect(astar.lastSyncTimestamp).toBe(1699990000);
      expect(astar.paused).toBe(true);
    });
  });
});
