import type { ObiEvmContext, SatelliteVaultConfig } from '@obidot-kit/core';
import { describe, expect, it, vi } from 'vitest';
import { CrossChainRouteTool } from '../src/index.js';

const HUB_VAULT = '0x03473a95971Ba0496786a615e21b1e87bDFf0025' as const;
const ORACLE_REGISTRY = '0x8b7C7345d6cF9de45f4aacC61F56F0241d47e88B' as const;
const TDOT = '0x2402C804aD8a6217BF73D8483dA7564065c56083' as const;
const TUSDC = '0x5298FDe9E288371ECA21db04Ac5Ddba00C1ea626' as const;

const moonbeamSatellite: SatelliteVaultConfig = {
  id: 'moonbeam-sat',
  name: 'Moonbeam Satellite Vault',
  address: '0x0000000000000000000000000000000000000010',
  chain: {
    endpoint: 'https://rpc.api.moonbeam.network',
    chainId: 'moonbeam',
    name: 'Moonbeam',
  },
  asset: 'xcDOT',
  decimals: 10,
  hubVaultAddress: HUB_VAULT,
  routerAddress: '0xE2fFfb3B5C72f99811bC20D857035611bFCe5b5d',
  rpcUrl: 'https://rpc.api.moonbeam.network',
  evmChainId: 1284,
};

function makeEvmContext(readContract: ObiEvmContext['client']['readContract']): ObiEvmContext {
  return {
    client: {
      readContract,
      waitForTransactionReceipt: vi.fn(),
    } as never,
    chain: { id: 420420417, name: 'Polkadot Hub TestNet' } as never,
    chainName: 'Polkadot Hub TestNet',
  };
}

describe('CrossChainRouteTool', () => {
  it('returns live preview routes in stub mode for same-asset transfers', async () => {
    const tool = new CrossChainRouteTool({
      satellites: [moonbeamSatellite],
    });

    const raw = await tool.invoke(
      JSON.stringify({
        tokenIn: TDOT,
        tokenOut: TDOT,
        amountIn: '1000000000000000000',
        includeUnavailable: false,
      }),
    );

    const result = JSON.parse(raw) as {
      success: boolean;
      data: {
        routeCount: number;
        routes: Array<{ destination: string; status: string; amountOut: string }>;
      };
    };

    expect(result.success).toBe(true);
    expect(result.data.routeCount).toBe(2);
    expect(result.data.routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          destination: 'RelayTeleport (XCM)',
          status: 'live',
          amountOut: '1000000000000000000',
        }),
        expect.objectContaining({
          destination: 'Moonbeam Satellite (ISMP)',
          status: 'live',
          amountOut: '1000000000000000000',
        }),
      ]),
    );
  });

  it('returns an oracle-backed Hydration simulation when prices are available', async () => {
    const readContract = vi
      .fn()
      .mockImplementation(
        ({ address, functionName, args }: { address: string; functionName: string; args?: unknown[] }) => {
          if (address === HUB_VAULT && functionName === 'oracleRegistry') {
            return Promise.resolve(ORACLE_REGISTRY);
          }
          if (address === ORACLE_REGISTRY && functionName === 'getPriceStrict') {
            const asset = args?.[0];
            if (asset === TDOT) {
              return Promise.resolve([500000000n, 8, 1n]);
            }
            if (asset === TUSDC) {
              return Promise.resolve([100000000n, 8, 1n]);
            }
          }
          if (address === TDOT && functionName === 'decimals') {
            return Promise.resolve(18);
          }
          if (address === TUSDC && functionName === 'decimals') {
            return Promise.resolve(6);
          }
          return Promise.reject(new Error(`Unexpected read ${functionName} on ${address}`));
        },
      );

    const tool = new CrossChainRouteTool({
      evmContext: makeEvmContext(readContract as never),
      hubVaultAddress: HUB_VAULT,
    });

    const raw = await tool.invoke(
      JSON.stringify({
        tokenIn: TDOT,
        tokenOut: TUSDC,
        amountIn: '2000000000000000000',
        destination: 'Hydration',
      }),
    );

    const result = JSON.parse(raw) as {
      success: boolean;
      data: {
        routeCount: number;
        routes: Array<{
          destination: string;
          status: string;
          previewOnly: boolean;
          amountOut: string;
          minAmountOut: string;
        }>;
      };
    };

    expect(result.success).toBe(true);
    expect(result.data.routeCount).toBe(1);
    expect(result.data.routes[0]).toEqual(
      expect.objectContaining({
        destination: 'Hydration Omnipool (XCM)',
        status: 'simulated',
        previewOnly: true,
        amountOut: '9970000',
        minAmountOut: '9920150',
      }),
    );
  });

  it('uses the custom fetchRoutes override when provided', async () => {
    const fetchRoutes = vi.fn().mockResolvedValue([
      {
        destination: 'Custom Route',
        routeType: 'xcm',
        status: 'simulated',
        previewOnly: true,
        amountIn: '100',
        amountOut: '90',
        minAmountOut: '80',
      },
    ]);

    const tool = new CrossChainRouteTool({ fetchRoutes });
    const raw = await tool.invoke(
      JSON.stringify({
        tokenIn: TDOT,
        tokenOut: TUSDC,
        amountIn: '100',
      }),
    );

    const result = JSON.parse(raw) as {
      success: boolean;
      data: {
        routeCount: number;
        routes: Array<{ destination: string; amountOut: string }>;
      };
    };

    expect(result.success).toBe(true);
    expect(fetchRoutes).toHaveBeenCalledWith({
      tokenIn: TDOT,
      tokenOut: TUSDC,
      amountIn: '100',
      destination: undefined,
      includeUnavailable: true,
    });
    expect(result.data.routeCount).toBe(1);
    expect(result.data.routes[0]).toEqual(
      expect.objectContaining({
        destination: 'Custom Route',
        amountOut: '90',
      }),
    );
  });
});
