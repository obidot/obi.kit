import { Tool } from '@langchain/core/tools';
import {
  LIQUIDITY_PAIR_ABI,
  type ObiEvmContext,
  POLKADOT_HUB_TESTNET_CONTRACTS,
  POLKADOT_HUB_TESTNET_RPC,
  type ToolResult,
} from '@obidot-kit/core';
import { createPublicClient, http } from 'viem';
import type { RouteHop } from './swap-multi-hop.js';

export interface ArbitrageDetectInput {
  amountIn?: string;
  thresholdBps?: number;
  maxOpportunities?: number;
  pairs?: string[];
}

export interface ArbitragePoolDefinition {
  label: string;
  address: `0x${string}`;
}

export interface ArbitragePoolState extends ArbitragePoolDefinition {
  token0: `0x${string}`;
  token1: `0x${string}`;
  reserve0: bigint;
  reserve1: bigint;
}

export interface ArbitrageDetectToolOptions {
  evmContext?: ObiEvmContext;
  feeBps?: number;
  pairDefinitions?: ReadonlyArray<ArbitragePoolDefinition>;
  fetchPoolStates?: (pairs: ReadonlyArray<ArbitragePoolDefinition>) => Promise<ArbitragePoolState[]>;
}

interface DirectedEdge {
  from: `0x${string}`;
  to: `0x${string}`;
  poolLabel: string;
  poolAddress: `0x${string}`;
  reserveIn: bigint;
  reserveOut: bigint;
}

const DEFAULT_AMOUNT_IN = '1000000000000000000';
const DEFAULT_THRESHOLD_BPS = 50;
const DEFAULT_MAX_OPPORTUNITIES = 3;
const BPS_DENOMINATOR = 10_000n;

const DEFAULT_PAIRS: readonly ArbitragePoolDefinition[] = [
  { label: 'tDOT/TKB', address: POLKADOT_HUB_TESTNET_CONTRACTS.lpPairDotTkb },
  { label: 'tDOT/tUSDC', address: POLKADOT_HUB_TESTNET_CONTRACTS.lpPairDotUsdc },
  { label: 'tDOT/tETH', address: POLKADOT_HUB_TESTNET_CONTRACTS.lpPairDotEth },
  { label: 'tUSDC/tETH', address: POLKADOT_HUB_TESTNET_CONTRACTS.lpPairUsdcEth },
  { label: 'TKB/TKA', address: POLKADOT_HUB_TESTNET_CONTRACTS.lpPairTkbTka },
];

function shortAddress(value: string): string {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function simulateAmountOut(amountIn: bigint, reserveIn: bigint, reserveOut: bigint, feeBps: bigint): bigint {
  if (amountIn <= 0n || reserveIn <= 0n || reserveOut <= 0n || feeBps >= BPS_DENOMINATOR) {
    return 0n;
  }

  const amountInWithFee = amountIn * (BPS_DENOMINATOR - feeBps);
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * BPS_DENOMINATOR + amountInWithFee;
  return denominator === 0n ? 0n : numerator / denominator;
}

export class ArbitrageDetectTool extends Tool {
  name = 'arbitrage_detect';

  description =
    'Scan known Polkadot Hub liquidity pairs for multi-path spread opportunities above a threshold. ' +
    'Input is optional JSON with "amountIn" (base units as string, default 1 token unit), ' +
    '"thresholdBps" (default 50), "maxOpportunities" (default 3), and optional "pairs" ' +
    '(array of pair labels such as "tDOT/tUSDC"). Returns the top route mismatches plus ' +
    'prebuilt multi-hop route data for follow-up execution tooling.';

  private readonly evmContext: ObiEvmContext | undefined;
  private readonly feeBps: bigint;
  private readonly pairDefinitions: ReadonlyArray<ArbitragePoolDefinition>;
  private readonly fetchPoolStatesFn:
    | ((pairs: ReadonlyArray<ArbitragePoolDefinition>) => Promise<ArbitragePoolState[]>)
    | undefined;

  constructor(options: ArbitrageDetectToolOptions = {}) {
    super();
    this.evmContext = options.evmContext;
    this.feeBps = BigInt(options.feeBps ?? 30);
    this.pairDefinitions = options.pairDefinitions ?? DEFAULT_PAIRS;
    this.fetchPoolStatesFn = options.fetchPoolStates;
  }

  protected async _call(input: string): Promise<string> {
    try {
      const parsed = this.parseInput(input);
      const selectedPairs = this.selectPairs(parsed.pairs);
      const poolStates = await this.loadPoolStates(selectedPairs);
      const opportunities = this.detectOpportunities(poolStates, BigInt(parsed.amountIn), parsed.thresholdBps);

      return JSON.stringify({
        success: true,
        data: {
          amountIn: parsed.amountIn,
          thresholdBps: parsed.thresholdBps,
          scannedPairs: poolStates.length,
          opportunities: opportunities.slice(0, parsed.maxOpportunities),
          mode: this.fetchPoolStatesFn ? 'mock' : 'evm',
        },
        message: `Detected ${Math.min(opportunities.length, parsed.maxOpportunities)} spread opportunity entries.`,
      } satisfies ToolResult);
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      } satisfies ToolResult);
    }
  }

  private parseInput(input: string): Required<ArbitrageDetectInput> {
    if (!input || input.trim() === '') {
      return {
        amountIn: DEFAULT_AMOUNT_IN,
        thresholdBps: DEFAULT_THRESHOLD_BPS,
        maxOpportunities: DEFAULT_MAX_OPPORTUNITIES,
        pairs: [],
      };
    }

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
    const amountIn =
      typeof obj['amountIn'] === 'string' && obj['amountIn'].length > 0 ? obj['amountIn'] : DEFAULT_AMOUNT_IN;
    const thresholdBps =
      typeof obj['thresholdBps'] === 'number' && Number.isFinite(obj['thresholdBps'])
        ? obj['thresholdBps']
        : DEFAULT_THRESHOLD_BPS;
    const maxOpportunities =
      typeof obj['maxOpportunities'] === 'number' && Number.isFinite(obj['maxOpportunities'])
        ? obj['maxOpportunities']
        : DEFAULT_MAX_OPPORTUNITIES;
    const pairs = Array.isArray(obj['pairs'])
      ? obj['pairs'].filter((value): value is string => typeof value === 'string')
      : [];

    if (BigInt(amountIn) <= 0n) {
      throw new Error('"amountIn" must be greater than zero');
    }
    if (thresholdBps < 0) {
      throw new Error('"thresholdBps" must be zero or greater');
    }
    if (maxOpportunities <= 0) {
      throw new Error('"maxOpportunities" must be greater than zero');
    }

    return { amountIn, thresholdBps, maxOpportunities, pairs };
  }

  private selectPairs(pairLabels: string[]): ReadonlyArray<ArbitragePoolDefinition> {
    if (pairLabels.length === 0) {
      return this.pairDefinitions;
    }

    const wanted = new Set(pairLabels.map((label) => label.toLowerCase()));
    const selected = this.pairDefinitions.filter((pair) => wanted.has(pair.label.toLowerCase()));
    if (selected.length === 0) {
      throw new Error(
        `No matching pairs found. Available pairs: ${this.pairDefinitions.map((pair) => pair.label).join(', ')}`,
      );
    }
    return selected;
  }

  private async loadPoolStates(pairs: ReadonlyArray<ArbitragePoolDefinition>): Promise<ArbitragePoolState[]> {
    if (this.fetchPoolStatesFn) {
      return this.fetchPoolStatesFn(pairs);
    }

    const client = this.evmContext?.client ?? createPublicClient({ transport: http(POLKADOT_HUB_TESTNET_RPC) });

    return Promise.all(
      pairs.map(async (pair) => {
        const [token0, token1, reserves] = await Promise.all([
          client.readContract({
            address: pair.address,
            abi: LIQUIDITY_PAIR_ABI,
            functionName: 'token0',
          }) as Promise<`0x${string}`>,
          client.readContract({
            address: pair.address,
            abi: LIQUIDITY_PAIR_ABI,
            functionName: 'token1',
          }) as Promise<`0x${string}`>,
          client.readContract({
            address: pair.address,
            abi: LIQUIDITY_PAIR_ABI,
            functionName: 'getReserves',
          }) as Promise<readonly [bigint, bigint, number]>,
        ]);

        return {
          ...pair,
          token0,
          token1,
          reserve0: reserves[0],
          reserve1: reserves[1],
        };
      }),
    );
  }

  private detectOpportunities(poolStates: ArbitragePoolState[], amountIn: bigint, thresholdBps: number) {
    const edges = poolStates.flatMap((pool) => this.toEdges(pool));
    const bySource = new Map<string, DirectedEdge[]>();

    for (const edge of edges) {
      const current = bySource.get(edge.from) ?? [];
      current.push(edge);
      bySource.set(edge.from, current);
    }

    const opportunities = [];

    for (const direct of edges) {
      const firstHops = bySource.get(direct.from) ?? [];
      const directOut = simulateAmountOut(amountIn, direct.reserveIn, direct.reserveOut, this.feeBps);
      if (directOut === 0n) {
        continue;
      }

      for (const firstHop of firstHops) {
        if (firstHop.poolAddress === direct.poolAddress || firstHop.to === direct.to) {
          continue;
        }

        const secondHops = (bySource.get(firstHop.to) ?? []).filter(
          (edge) =>
            edge.to === direct.to &&
            edge.poolAddress !== firstHop.poolAddress &&
            edge.poolAddress !== direct.poolAddress,
        );

        for (const secondHop of secondHops) {
          const intermediateOut = simulateAmountOut(amountIn, firstHop.reserveIn, firstHop.reserveOut, this.feeBps);
          const routedOut = simulateAmountOut(intermediateOut, secondHop.reserveIn, secondHop.reserveOut, this.feeBps);
          if (routedOut <= directOut) {
            continue;
          }

          const spreadBps = Number(((routedOut - directOut) * BPS_DENOMINATOR) / directOut);
          if (spreadBps < thresholdBps) {
            continue;
          }

          opportunities.push({
            pair: `${shortAddress(direct.from)} -> ${shortAddress(direct.to)}`,
            entryAmountIn: amountIn.toString(),
            directPair: direct.poolLabel,
            directPairAddress: direct.poolAddress,
            directAmountOut: directOut.toString(),
            betterRoute: [firstHop.poolLabel, secondHop.poolLabel],
            routePairAddresses: [firstHop.poolAddress, secondHop.poolAddress],
            routeAmountOut: routedOut.toString(),
            estimatedExtraOut: (routedOut - directOut).toString(),
            spreadBps,
            tokenPath: [direct.from, firstHop.to, direct.to],
            routeHops: [
              {
                poolType: 3,
                pool: firstHop.poolAddress,
                tokenIn: firstHop.from,
                tokenOut: firstHop.to,
                feeBps: this.feeBps.toString(),
                data: '0x',
              },
              {
                poolType: 3,
                pool: secondHop.poolAddress,
                tokenIn: secondHop.from,
                tokenOut: secondHop.to,
                feeBps: this.feeBps.toString(),
                data: '0x',
              },
            ] satisfies RouteHop[],
          });
        }
      }
    }

    return opportunities.sort((left, right) => {
      if (right.spreadBps !== left.spreadBps) {
        return right.spreadBps - left.spreadBps;
      }
      return BigInt(right.estimatedExtraOut) > BigInt(left.estimatedExtraOut) ? 1 : -1;
    });
  }

  private toEdges(pool: ArbitragePoolState): DirectedEdge[] {
    return [
      {
        from: pool.token0,
        to: pool.token1,
        poolLabel: pool.label,
        poolAddress: pool.address,
        reserveIn: pool.reserve0,
        reserveOut: pool.reserve1,
      },
      {
        from: pool.token1,
        to: pool.token0,
        poolLabel: pool.label,
        poolAddress: pool.address,
        reserveIn: pool.reserve1,
        reserveOut: pool.reserve0,
      },
    ];
  }
}
