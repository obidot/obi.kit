import { Tool } from '@langchain/core/tools';
import type { ObiEvmContext, SatelliteVaultConfig, ToolResult } from '@obidot-kit/core';
import { OBIDOT_VAULT_ABI, ORACLE_REGISTRY_ABI, POLKADOT_HUB_TESTNET_CONTRACTS } from '@obidot-kit/core';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
const ERC20_DECIMALS_ABI = [
  {
    type: 'function' as const,
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view' as const,
  },
] as const;

type CrossChainRouteStatus = 'live' | 'mainnet_only' | 'simulated' | 'coming_soon';
type CrossChainRouteType = 'xcm' | 'bridge';

export interface CrossChainRouteInput {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  destination?: string;
  includeUnavailable?: boolean;
}

export interface CrossChainRouteEstimate {
  destination: string;
  routeType: CrossChainRouteType;
  status: CrossChainRouteStatus;
  previewOnly: boolean;
  amountIn: string;
  amountOut: string;
  minAmountOut: string;
  estimatedTimeSec?: number;
  note?: string;
}

export interface CrossChainRouteToolOptions {
  evmContext?: ObiEvmContext;
  hubVaultAddress?: `0x${string}`;
  oracleRegistryAddress?: `0x${string}`;
  routerAddress?: `0x${string}`;
  satellites?: ReadonlyArray<SatelliteVaultConfig>;
  fetchRoutes?: (input: CrossChainRouteInput) => Promise<CrossChainRouteEstimate[]>;
}

type RouteDefinition = {
  destination: string;
  routeType: CrossChainRouteType;
  estimatedTimeSec?: number;
  defaultStatus: CrossChainRouteStatus;
  buildEstimate: (input: {
    tokenIn: `0x${string}`;
    tokenOut: `0x${string}`;
    amountIn: bigint;
  }) => Promise<Partial<CrossChainRouteEstimate> | null>;
};

export class CrossChainRouteTool extends Tool {
  name = 'find_cross_chain_routes';

  description =
    'Find informational cross-chain routes from Polkadot Hub. ' +
    'Input is a JSON string with "tokenIn", "tokenOut", "amountIn", optional ' +
    '"destination" (filter by route label), and optional "includeUnavailable" ' +
    '(boolean, default true). Returns route statuses using the product vocabulary ' +
    '`live | simulated | mainnet_only | coming_soon`, plus oracle-backed preview ' +
    'amounts when a simulation is available.';

  private readonly evmContext: ObiEvmContext | undefined;
  private readonly hubVaultAddress: `0x${string}` | undefined;
  private readonly oracleRegistryAddress: `0x${string}` | undefined;
  private readonly routerAddress: `0x${string}`;
  private readonly satellites: ReadonlyArray<SatelliteVaultConfig>;
  private readonly fetchRoutesFn: ((input: CrossChainRouteInput) => Promise<CrossChainRouteEstimate[]>) | undefined;
  private oracleRegistryCache: `0x${string}` | null | undefined;

  constructor(options: CrossChainRouteToolOptions = {}) {
    super();
    this.evmContext = options.evmContext;
    this.hubVaultAddress = options.hubVaultAddress;
    this.oracleRegistryAddress = options.oracleRegistryAddress;
    this.routerAddress = options.routerAddress ?? POLKADOT_HUB_TESTNET_CONTRACTS.crossChainRouterAddress;
    this.satellites = options.satellites ?? [];
    this.fetchRoutesFn = options.fetchRoutes;
  }

  protected async _call(input: string): Promise<string> {
    try {
      const parsed = this.parseInput(input);
      const routes = await this.findRoutes(parsed);
      return JSON.stringify({
        success: true,
        data: {
          tokenIn: parsed.tokenIn,
          tokenOut: parsed.tokenOut,
          amountIn: parsed.amountIn,
          destination: parsed.destination,
          routerAddress: this.routerAddress,
          routeCount: routes.length,
          routes,
          mode: this.evmContext ? 'evm' : 'stub',
        },
        message:
          routes.length > 0
            ? `Found ${routes.length} cross-chain route option(s) for ${parsed.tokenIn} -> ${parsed.tokenOut}.`
            : `No cross-chain routes matched ${parsed.tokenIn} -> ${parsed.tokenOut}.`,
      } satisfies ToolResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return JSON.stringify({
        success: false,
        error: message,
      } satisfies ToolResult);
    }
  }

  private parseInput(input: string): CrossChainRouteInput {
    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch {
      throw new Error(`Invalid JSON input: ${input}`);
    }

    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Input must be a JSON object');
    }

    const obj = parsed as Record<string, unknown>;
    if (typeof obj['tokenIn'] !== 'string' || obj['tokenIn'].length === 0) {
      throw new Error('Missing or invalid "tokenIn" field');
    }
    if (typeof obj['tokenOut'] !== 'string' || obj['tokenOut'].length === 0) {
      throw new Error('Missing or invalid "tokenOut" field');
    }
    if (typeof obj['amountIn'] !== 'string' || obj['amountIn'].length === 0) {
      throw new Error('Missing or invalid "amountIn" field');
    }

    return {
      tokenIn: obj['tokenIn'],
      tokenOut: obj['tokenOut'],
      amountIn: obj['amountIn'],
      destination: typeof obj['destination'] === 'string' ? obj['destination'] : undefined,
      includeUnavailable: typeof obj['includeUnavailable'] === 'boolean' ? obj['includeUnavailable'] : true,
    };
  }

  private async findRoutes(input: CrossChainRouteInput): Promise<CrossChainRouteEstimate[]> {
    if (this.fetchRoutesFn) {
      return this.fetchRoutesFn(input);
    }

    const tokenIn = input.tokenIn as `0x${string}`;
    const tokenOut = input.tokenOut as `0x${string}`;
    const amountIn = BigInt(input.amountIn);
    if (amountIn <= 0n) {
      throw new Error('Amount must be positive');
    }

    const routes = await Promise.all(
      this.getRouteDefinitions().map(async (definition) => {
        const estimate = await definition.buildEstimate({ tokenIn, tokenOut, amountIn });
        if (!estimate) {
          return {
            destination: definition.destination,
            routeType: definition.routeType,
            status: definition.defaultStatus,
            previewOnly: definition.defaultStatus !== 'live',
            amountIn: amountIn.toString(),
            amountOut: '0',
            minAmountOut: '0',
            estimatedTimeSec: definition.estimatedTimeSec,
            note: this.buildDefaultNote(definition.defaultStatus),
          } satisfies CrossChainRouteEstimate;
        }

        return {
          destination: definition.destination,
          routeType: definition.routeType,
          status: definition.defaultStatus,
          previewOnly: definition.defaultStatus !== 'live',
          amountIn: amountIn.toString(),
          amountOut: '0',
          minAmountOut: '0',
          estimatedTimeSec: definition.estimatedTimeSec,
          ...estimate,
        } satisfies CrossChainRouteEstimate;
      }),
    );

    const filtered = routes.filter((route) => {
      if (!input.includeUnavailable && route.status !== 'live' && route.status !== 'simulated') {
        return false;
      }
      if (!input.destination) {
        return true;
      }
      return route.destination.toLowerCase().includes(input.destination.toLowerCase());
    });

    return filtered;
  }

  private getRouteDefinitions(): RouteDefinition[] {
    return [
      {
        destination: 'RelayTeleport (XCM)',
        routeType: 'xcm',
        estimatedTimeSec: 15,
        defaultStatus: 'live',
        buildEstimate: async ({ tokenIn, tokenOut, amountIn }) => {
          if (tokenIn.toLowerCase() !== tokenOut.toLowerCase()) {
            return null;
          }

          const minAmountOut = (amountIn * 9_995n) / 10_000n;
          return {
            status: 'live',
            previewOnly: false,
            amountOut: amountIn.toString(),
            minAmountOut: minAmountOut.toString(),
            note: 'Same-asset XCM transfer preview. Destination execution fees are not included.',
          };
        },
      },
      {
        destination: 'Hydration Omnipool (XCM)',
        routeType: 'xcm',
        estimatedTimeSec: 30,
        defaultStatus: 'mainnet_only',
        buildEstimate: async ({ tokenIn, tokenOut, amountIn }) => {
          const estimate = await this.estimateOracleBackedSwap(tokenIn, tokenOut, amountIn);
          if (!estimate) {
            return null;
          }

          return {
            status: 'simulated',
            previewOnly: true,
            amountOut: estimate.amountOut.toString(),
            minAmountOut: estimate.minAmountOut.toString(),
            note: 'Oracle-backed Hydration preview on testnet. Informational only; do not execute automatically.',
          };
        },
      },
      {
        destination: 'Bifrost DEX (XCM)',
        routeType: 'xcm',
        estimatedTimeSec: 30,
        defaultStatus: 'mainnet_only',
        buildEstimate: async () => null,
      },
      {
        destination: 'Karura DEX (XCM)',
        routeType: 'xcm',
        estimatedTimeSec: 30,
        defaultStatus: 'mainnet_only',
        buildEstimate: async () => null,
      },
      {
        destination: 'Interlay Loans (XCM)',
        routeType: 'xcm',
        defaultStatus: 'mainnet_only',
        buildEstimate: async () => null,
      },
      {
        destination: 'Moonbeam DEX (XCM)',
        routeType: 'xcm',
        estimatedTimeSec: 30,
        defaultStatus: 'coming_soon',
        buildEstimate: async () => null,
      },
      ...this.satellites.map<RouteDefinition>((satellite) => ({
        destination: `${satellite.chain.name ?? satellite.id} Satellite (ISMP)`,
        routeType: 'bridge',
        estimatedTimeSec: 45,
        defaultStatus: 'live',
        buildEstimate: async ({ tokenIn, tokenOut, amountIn }) => {
          if (tokenIn.toLowerCase() !== tokenOut.toLowerCase()) {
            return null;
          }

          const minAmountOut = (amountIn * 9_995n) / 10_000n;
          return {
            status: 'live',
            previewOnly: false,
            amountOut: amountIn.toString(),
            minAmountOut: minAmountOut.toString(),
            note: 'Configured satellite transfer via Hyperbridge ISMP. No remote swap is included in this estimate.',
          };
        },
      })),
    ];
  }

  private buildDefaultNote(status: CrossChainRouteStatus): string {
    if (status === 'mainnet_only') {
      return 'Route shape is known, but execution is only available on mainnet today.';
    }
    if (status === 'coming_soon') {
      return 'Route is planned but not yet available in the current deployment.';
    }
    return 'Route is available for preview.';
  }

  private async estimateOracleBackedSwap(
    tokenIn: `0x${string}`,
    tokenOut: `0x${string}`,
    amountIn: bigint,
  ): Promise<{ amountOut: bigint; minAmountOut: bigint } | null> {
    const ctx = this.evmContext;
    if (!ctx) {
      return null;
    }

    const oracleRegistryAddress = await this.getOracleRegistryAddress();
    if (!oracleRegistryAddress || oracleRegistryAddress === ZERO_ADDRESS) {
      return null;
    }

    try {
      const [priceIn, priceOut, tokenInDecimals, tokenOutDecimals] = await Promise.all([
        ctx.client.readContract({
          address: oracleRegistryAddress,
          abi: ORACLE_REGISTRY_ABI,
          functionName: 'getPriceStrict',
          args: [tokenIn],
        }) as Promise<readonly [bigint, number, bigint]>,
        ctx.client.readContract({
          address: oracleRegistryAddress,
          abi: ORACLE_REGISTRY_ABI,
          functionName: 'getPriceStrict',
          args: [tokenOut],
        }) as Promise<readonly [bigint, number, bigint]>,
        ctx.client.readContract({
          address: tokenIn,
          abi: ERC20_DECIMALS_ABI,
          functionName: 'decimals',
        }) as Promise<number>,
        ctx.client.readContract({
          address: tokenOut,
          abi: ERC20_DECIMALS_ABI,
          functionName: 'decimals',
        }) as Promise<number>,
      ]);

      const [priceInValue, priceInOracleDecimals] = priceIn;
      const [priceOutValue, priceOutOracleDecimals] = priceOut;
      if (priceInValue <= 0n || priceOutValue <= 0n) {
        return null;
      }

      let numerator = amountIn * priceInValue * 10n ** BigInt(tokenOutDecimals);
      let denominator = priceOutValue * 10n ** BigInt(tokenInDecimals);

      if (priceInOracleDecimals > priceOutOracleDecimals) {
        denominator *= 10n ** BigInt(priceInOracleDecimals - priceOutOracleDecimals);
      } else if (priceOutOracleDecimals > priceInOracleDecimals) {
        numerator *= 10n ** BigInt(priceOutOracleDecimals - priceInOracleDecimals);
      }

      let amountOut = numerator / denominator;
      if (amountOut <= 0n) {
        return null;
      }

      amountOut = (amountOut * 9_970n) / 10_000n;
      const minAmountOut = (amountOut * 9_950n) / 10_000n;

      return { amountOut, minAmountOut };
    } catch {
      return null;
    }
  }

  private async getOracleRegistryAddress(): Promise<`0x${string}` | null> {
    if (this.oracleRegistryCache !== undefined) {
      return this.oracleRegistryCache;
    }

    if (this.oracleRegistryAddress) {
      this.oracleRegistryCache = this.oracleRegistryAddress;
      return this.oracleRegistryCache;
    }

    if (!this.evmContext || !this.hubVaultAddress) {
      this.oracleRegistryCache = null;
      return this.oracleRegistryCache;
    }

    try {
      const oracleRegistryAddress = (await this.evmContext.client.readContract({
        address: this.hubVaultAddress,
        abi: OBIDOT_VAULT_ABI,
        functionName: 'oracleRegistry',
      })) as `0x${string}`;

      this.oracleRegistryCache = oracleRegistryAddress;
      return this.oracleRegistryCache;
    } catch {
      this.oracleRegistryCache = null;
      return this.oracleRegistryCache;
    }
  }
}
