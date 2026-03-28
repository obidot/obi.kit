import {
  BifrostYieldTool,
  CrossChainRouteTool,
  CrossChainStateTool,
  createEvmContext,
  PerformanceTool,
  POLKADOT_HUB_TESTNET_CONTRACTS,
  POLKADOT_HUB_TESTNET_RPC,
  polkadotHubTestnet,
} from '@obidot-kit/sdk';

type ToolEnvelope<T = Record<string, unknown>> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

type BifrostProduct = {
  protocol: string;
  product: string;
  category: string;
  apy: number;
  isActive: boolean;
};

type BifrostYieldData = {
  products?: BifrostProduct[];
  count?: number;
};

type PerformanceData = {
  performance?: {
    cumulativePnL: string;
    highWaterMark: string;
    performanceFeeBps: string;
    feeTreasury: string;
  };
  vaultState?: {
    totalAssets: string;
    totalSupply: string;
    idleAssets: string;
    totalRemoteAssets: string;
    depositCap: string;
    utilizationBps: string;
    paused: boolean;
    emergencyMode: boolean;
  };
};

type CrossChainSatellite = {
  chainName: string;
  totalAssets: string;
  globalTotalAssets: string;
  emergencyMode: boolean;
  lastSyncTimestamp: number;
  paused: boolean;
};

type CrossChainData = {
  totalSatelliteAssets?: string;
  globalTotalAssets?: string;
  satelliteCount?: number;
  mode?: string;
  satellites?: CrossChainSatellite[];
};

type CrossChainRoutePreview = {
  destination: string;
  status: string;
  amountOut: string;
  minAmountOut: string;
  previewOnly: boolean;
  note?: string;
};

type CrossChainRouteData = {
  routes?: CrossChainRoutePreview[];
  routeCount?: number;
};

function parseToolEnvelope<T>(raw: string): ToolEnvelope<T> {
  return JSON.parse(raw) as ToolEnvelope<T>;
}

function safeBigInt(value: string | undefined): bigint {
  if (!value) return 0n;
  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
}

function formatBps(bps: string | undefined): string {
  if (!bps) return '0.00%';
  return `${(Number(bps) / 100).toFixed(2)}%`;
}

async function main() {
  const hubRpcUrl = process.env['HUB_RPC_URL'] ?? POLKADOT_HUB_TESTNET_RPC;
  const hubVaultAddress = (process.env['HUB_VAULT_ADDRESS'] ??
    POLKADOT_HUB_TESTNET_CONTRACTS.vaultAddress) as `0x${string}`;
  const assetAddress = (process.env['ASSET_ADDRESS'] ?? POLKADOT_HUB_TESTNET_CONTRACTS.assetAddress) as `0x${string}`;
  const routerAddress = process.env['ROUTER_ADDRESS'] ?? POLKADOT_HUB_TESTNET_CONTRACTS.crossChainRouterAddress;
  const targetCategory = process.env['TARGET_CATEGORY'] ?? 'Farming';
  const minIdleAssets = safeBigInt(process.env['MIN_IDLE_ASSETS'] ?? '25000000000000000000');
  const routeTokenOut = process.env['ROUTE_TOKEN_OUT'] as `0x${string}` | undefined;

  const moonbeamSatellite = {
    id: 'moonbeam-satellite',
    name: 'Moonbeam Satellite Vault',
    address: (process.env['MOONBEAM_VAULT_ADDRESS'] ?? '0x0000000000000000000000000000000000000010') as `0x${string}`,
    chain: {
      endpoint: 'https://rpc.api.moonbeam.network',
      name: 'Moonbeam',
      chainId: '1284',
    },
    asset: 'xcDOT',
    decimals: 10,
    hubVaultAddress,
    routerAddress,
    rpcUrl: 'https://rpc.api.moonbeam.network',
    evmChainId: 1284,
  };

  const astarSatellite = {
    id: 'astar-satellite',
    name: 'Astar Satellite Vault',
    address: (process.env['ASTAR_VAULT_ADDRESS'] ?? '0x0000000000000000000000000000000000000020') as `0x${string}`,
    chain: {
      endpoint: 'https://evm.astar.network',
      name: 'Astar',
      chainId: '592',
    },
    asset: 'xcDOT',
    decimals: 10,
    hubVaultAddress,
    routerAddress,
    rpcUrl: 'https://evm.astar.network',
    evmChainId: 592,
  };

  const evmContext = createEvmContext({
    rpcUrl: hubRpcUrl,
    chain: polkadotHubTestnet,
    chainName: 'Polkadot Hub Testnet',
  });

  const performanceTool = new PerformanceTool({
    evmContext,
    vaultConfig: {
      vaultAddress: hubVaultAddress,
      assetAddress,
      rpcUrl: hubRpcUrl,
      chainId: polkadotHubTestnet.id,
      decimals: 18,
    },
  });
  const crossChainStateTool = new CrossChainStateTool({
    chainConfig: {
      endpoint: hubRpcUrl,
      name: 'Polkadot Hub Testnet',
      chainId: String(polkadotHubTestnet.id),
    },
    hubVaultAddress,
    routerAddress,
    satellites: [moonbeamSatellite, astarSatellite],
  });
  const bifrostYieldTool = new BifrostYieldTool();
  const crossChainRouteTool = new CrossChainRouteTool({
    evmContext,
    hubVaultAddress,
    routerAddress: routerAddress as `0x${string}`,
    satellites: [moonbeamSatellite, astarSatellite],
  });

  console.log('='.repeat(72));
  console.log(' Obidot Kit - Yield Optimizer Example');
  console.log('='.repeat(72));
  console.log(`Mode                : preview-only`);
  console.log(`Hub RPC             : ${hubRpcUrl}`);
  console.log(`Hub vault           : ${hubVaultAddress}`);
  console.log(`Target category     : ${targetCategory}`);
  console.log(`Idle threshold      : ${minIdleAssets.toString()}`);
  console.log('Execution boundary  : no funds move in this example');
  console.log();

  const routePreviewAmount = idleAssetsOrThreshold(minIdleAssets, 0n);
  const routePreviewPromise = routeTokenOut
    ? crossChainRouteTool.invoke(
        JSON.stringify({
          tokenIn: assetAddress,
          tokenOut: routeTokenOut,
          amountIn: routePreviewAmount.toString(),
          includeUnavailable: false,
        }),
      )
    : Promise.resolve(undefined);

  const [performanceRaw, crossChainRaw, yieldsRaw, routePreviewRaw] = await Promise.all([
    performanceTool.invoke(JSON.stringify({ includeSummary: true })),
    crossChainStateTool.invoke(JSON.stringify({ includeDetails: true })),
    bifrostYieldTool.invoke(JSON.stringify({ category: targetCategory, activeOnly: true })),
    routePreviewPromise,
  ]);

  const performance = parseToolEnvelope<PerformanceData>(performanceRaw);
  const crossChain = parseToolEnvelope<CrossChainData>(crossChainRaw);
  const yields = parseToolEnvelope<BifrostYieldData>(yieldsRaw);
  const routePreview = routePreviewRaw ? parseToolEnvelope<CrossChainRouteData>(routePreviewRaw) : undefined;

  const products = [...(yields.data?.products ?? [])].sort((a, b) => b.apy - a.apy);
  const topProduct = products[0];

  const idleAssets = safeBigInt(performance.data?.vaultState?.idleAssets);
  const totalAssets = safeBigInt(performance.data?.vaultState?.totalAssets);
  const totalRemoteAssets = safeBigInt(performance.data?.vaultState?.totalRemoteAssets);
  const hasIdleBuffer = idleAssets >= minIdleAssets;

  const blockers = [
    'CrossChainRouteTool is available for preview-only scouting, but this script still stops before automated execution.',
    'LiquidityAddTool and LiquidityRemoveTool are available, but this example does not compose them into an end-to-end rebalance transaction.',
    'BifrostYieldTool is running with the built-in catalogue unless you replace it with a live provider.',
  ];

  const recommendation = topProduct
    ? {
        action: hasIdleBuffer ? `manual-review-${topProduct.category.toLowerCase()}` : 'hold-idle-capital',
        summary: hasIdleBuffer
          ? `Research allocating idle capital toward ${topProduct.product} (${topProduct.apy.toFixed(2)}% APY) once route/liquidity execution tools are available.`
          : `Top candidate is ${topProduct.product} (${topProduct.apy.toFixed(2)}% APY), but idle assets are below the configured threshold.`,
      }
    : {
        action: 'no-candidate',
        summary: 'No active Bifrost yield candidates were returned for the selected category.',
      };

  console.log('Performance snapshot:');
  if (performance.success && performance.data?.vaultState) {
    console.log(
      JSON.stringify(
        {
          totalAssets: totalAssets.toString(),
          idleAssets: idleAssets.toString(),
          totalRemoteAssets: totalRemoteAssets.toString(),
          utilization: formatBps(performance.data.vaultState.utilizationBps),
          paused: performance.data.vaultState.paused,
          emergencyMode: performance.data.vaultState.emergencyMode,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(
      JSON.stringify(
        {
          warning: performance.error ?? 'Vault performance data is unavailable in the current environment.',
        },
        null,
        2,
      ),
    );
  }
  console.log();

  console.log('Cross-chain topology snapshot:');
  console.log(
    JSON.stringify(
      {
        success: crossChain.success,
        mode: crossChain.data?.mode ?? 'unknown',
        satelliteCount: crossChain.data?.satelliteCount ?? 0,
        totalSatelliteAssets: crossChain.data?.totalSatelliteAssets ?? '0',
        satellites: crossChain.data?.satellites ?? [],
      },
      null,
      2,
    ),
  );
  console.log();

  console.log('Top Bifrost candidates:');
  console.log(
    JSON.stringify(
      products.slice(0, 3).map((product) => ({
        product: product.product,
        category: product.category,
        apy: product.apy,
        protocol: product.protocol,
      })),
      null,
      2,
    ),
  );
  console.log();

  if (routePreview) {
    console.log('Cross-chain route preview:');
    console.log(
      JSON.stringify(
        {
          requestedTokenOut: routeTokenOut,
          routes: routePreview.data?.routes ?? [],
        },
        null,
        2,
      ),
    );
    console.log();
  }

  console.log('Recommendation:');
  console.log(
    JSON.stringify(
      {
        recommendation,
        blockers,
        notes: [
          'This example intentionally stops after ranking and context gathering.',
          'Replace the default Bifrost yield provider before treating APYs as live production inputs.',
        ],
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

function idleAssetsOrThreshold(minIdleAssets: bigint, idleAssets: bigint): bigint {
  if (idleAssets > 0n && idleAssets < minIdleAssets) {
    return idleAssets;
  }
  return minIdleAssets;
}
