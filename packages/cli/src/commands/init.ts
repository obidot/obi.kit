import { mkdir, writeFile } from 'node:fs/promises';
import { basename, isAbsolute, join, resolve } from 'node:path';

const SDK_VERSION = '^0.2.0';
const CORE_VERSION = '^0.3.0';
const TYPES_NODE_VERSION = '^22.15.0';
const TYPESCRIPT_VERSION = '^5.8.3';
const TSX_VERSION = '^4.19.0';
const VIEM_VERSION = '^2.21.0';
const DEFAULT_TEST_USDC_ADDRESS = '0x5298FDe9E288371ECA21db04Ac5Ddba00C1ea626';

const DEFAULT_INIT_TEMPLATE = 'starter';
const TEMPLATE_NAMES = ['starter', 'vault-agent', 'cross-chain-agent', 'dca-bot', 'yield-optimizer'] as const;

export type InitTemplate = (typeof TEMPLATE_NAMES)[number];

interface TemplateDefinition {
  description: string;
  files: (projectName: string) => Array<[string, string]>;
}

const GITIGNORE_TEMPLATE = `node_modules
dist
.env
.turbo
`;

const TSCONFIG_TEMPLATE = JSON.stringify(
  {
    compilerOptions: {
      target: 'ES2022',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      strict: true,
      outDir: 'dist',
      declaration: true,
      esModuleInterop: true,
      skipLibCheck: true,
    },
    include: ['src'],
  },
  null,
  2,
);

function packageJsonTemplate(
  name: string,
  description: string,
  dependencies: Record<string, string>,
  devDependencies: Record<string, string> = {
    '@types/node': TYPES_NODE_VERSION,
    tsx: TSX_VERSION,
    typescript: TYPESCRIPT_VERSION,
  },
): string {
  return JSON.stringify(
    {
      name,
      version: '0.1.0',
      private: true,
      type: 'module',
      description,
      scripts: {
        start: 'node --env-file=.env --import tsx src/index.ts',
        build: 'tsc',
        typecheck: 'tsc --noEmit',
      },
      dependencies,
      devDependencies,
    },
    null,
    2,
  );
}

function starterIndexTemplate(): string {
  return `import { ObiKit } from '@obidot-kit/sdk';

const chainConfig = {
  endpoint: process.env['RPC_URL'] ?? 'https://eth-rpc-testnet.polkadot.io/',
  name: 'Polkadot Hub Testnet',
  chainId: '420420417',
} as const;

async function main() {
  const vaultAddress = process.env['VAULT_ADDRESS'];
  const kit = new ObiKit({
    chainConfig,
    ...(vaultAddress
      ? {
          vaults: [
            {
              id: 'obidot-vault',
              name: 'Obidot Vault',
              address: vaultAddress,
              chain: chainConfig,
              asset: 'WDOT',
              decimals: 18,
            },
          ],
        }
      : {}),
  });

  const info = kit.inspect();

  console.log('ObiKit starter scaffold ready');
  console.log(
    JSON.stringify(
      {
        mode: info.mode,
        vaultCount: info.vaultCount,
        totalToolCount: info.totalToolCount,
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
`;
}

function starterEnvTemplate(): string {
  return `# Polkadot Hub RPC endpoint
RPC_URL=https://eth-rpc-testnet.polkadot.io/

# Optional hub vault address
VAULT_ADDRESS=0x03473a95971Ba0496786a615e21b1e87bDFf0025
`;
}

function vaultAgentIndexTemplate(): string {
  return `import {
  createEvmContext,
  POLKADOT_HUB_TESTNET_CONTRACTS,
  POLKADOT_HUB_TESTNET_RPC,
  polkadotHubTestnet,
} from '@obidot-kit/core';
import { ObiKit } from '@obidot-kit/sdk';

const hubRpcUrl = process.env['HUB_RPC_URL'] ?? POLKADOT_HUB_TESTNET_RPC;
const vaultAddress = process.env['VAULT_ADDRESS'] ?? POLKADOT_HUB_TESTNET_CONTRACTS.vaultAddress;
const assetAddress = process.env['ASSET_ADDRESS'] ?? POLKADOT_HUB_TESTNET_CONTRACTS.assetAddress;
const privateKey = process.env['PRIVATE_KEY'];

async function main() {
  const chainConfig = {
    endpoint: hubRpcUrl,
    name: 'Polkadot Hub Testnet',
    chainId: String(polkadotHubTestnet.id),
  };

  const kit = new ObiKit({ chainConfig });
  kit.registerVault({
    id: 'obidot-vault',
    name: 'Obidot ERC-4626 Vault',
    address: vaultAddress,
    chain: chainConfig,
    asset: 'WDOT',
    decimals: 18,
  });

  if (privateKey) {
    const { privateKeyToAccount } = await import('viem/accounts');
    const account = privateKeyToAccount(privateKey as \`0x\${string}\`);
    const evmContext = createEvmContext({
      rpcUrl: hubRpcUrl,
      chain: polkadotHubTestnet,
      chainName: 'Polkadot Hub Testnet',
      account,
    });

    kit.setEvmVault(evmContext, {
      vaultAddress: vaultAddress as \`0x\${string}\`,
      assetAddress: assetAddress as \`0x\${string}\`,
      rpcUrl: hubRpcUrl,
      chainId: polkadotHubTestnet.id,
    });
  }

  const info = kit.inspect();

  console.log('Vault agent scaffold ready');
  console.log(
    JSON.stringify(
      {
        mode: info.mode,
        signerAddress: info.signerAddress,
        totalToolCount: info.totalToolCount,
      },
      null,
      2,
    ),
  );
  console.log('Available tools:', kit.getTools().map((tool) => tool.name).join(', '));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
`;
}

function vaultAgentEnvTemplate(): string {
  return `# Polkadot Hub Paseo TestNet
HUB_RPC_URL=https://eth-rpc-testnet.polkadot.io/

# ObidotVault v3 (ERC-4626 hub vault)
VAULT_ADDRESS=0x03473a95971Ba0496786a615e21b1e87bDFf0025

# TestDOT ERC-20 asset
ASSET_ADDRESS=0x2402C804aD8a6217BF73D8483dA7564065c56083

# Optional signer for real EVM transactions
# PRIVATE_KEY=0x...
`;
}

function crossChainIndexTemplate(): string {
  return `import { POLKADOT_HUB_TESTNET_RPC } from '@obidot-kit/core';
import { ObiKit } from '@obidot-kit/sdk';

const hubChainConfig = {
  endpoint: process.env['HUB_RPC_URL'] ?? POLKADOT_HUB_TESTNET_RPC,
  name: 'Polkadot Hub Testnet',
  chainId: '420420417',
};

const hubVaultAddress = process.env['HUB_VAULT_ADDRESS'] ?? '0x03473a95971Ba0496786a615e21b1e87bDFf0025';
const routerAddress = process.env['ROUTER_ADDRESS'] ?? '0xE2fFfb3B5C72f99811bC20D857035611bFCe5b5d';
const bifrostAdapterAddress = process.env['BIFROST_ADAPTER_ADDRESS'] ?? '0x0000000000000000000000000000000000000000';

const satellites = [
  {
    id: 'moonbeam-satellite',
    name: 'Moonbeam Satellite Vault',
    address: process.env['MOONBEAM_VAULT_ADDRESS'] ?? '0x0000000000000000000000000000000000000010',
    chain: {
      endpoint: process.env['MOONBEAM_RPC_URL'] ?? 'https://rpc.api.moonbeam.network',
      name: 'Moonbeam',
      chainId: '1284',
    },
    asset: 'xcDOT',
    decimals: 10,
    hubVaultAddress,
    routerAddress,
    rpcUrl: process.env['MOONBEAM_RPC_URL'] ?? 'https://rpc.api.moonbeam.network',
    evmChainId: 1284,
  },
  {
    id: 'astar-satellite',
    name: 'Astar Satellite Vault',
    address: process.env['ASTAR_VAULT_ADDRESS'] ?? '0x0000000000000000000000000000000000000020',
    chain: {
      endpoint: process.env['ASTAR_RPC_URL'] ?? 'https://evm.astar.network',
      name: 'Astar',
      chainId: '592',
    },
    asset: 'xcDOT',
    decimals: 10,
    hubVaultAddress,
    routerAddress,
    rpcUrl: process.env['ASTAR_RPC_URL'] ?? 'https://evm.astar.network',
    evmChainId: 592,
  },
];

async function main() {
  const kit = new ObiKit({
    chainConfig: hubChainConfig,
    satellites,
    bifrostConfig: {
      adapterAddress: bifrostAdapterAddress,
      protocols: {
        slp: { palletIndex: 100, name: 'SLP', protocol: 'Bifrost' },
        dex: { palletIndex: 101, name: 'Bifrost DEX', protocol: 'Bifrost' },
      },
    },
  });

  const info = kit.inspect();

  console.log('Cross-chain agent scaffold ready');
  console.log(
    JSON.stringify(
      {
        mode: info.mode,
        satelliteCount: info.satelliteCount,
        totalToolCount: info.totalToolCount,
      },
      null,
      2,
    ),
  );
  console.log('Satellites:', satellites.map((satellite) => \`\${satellite.name} (\${satellite.chain.name})\`).join(', '));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
`;
}

function crossChainEnvTemplate(): string {
  return `# Hub chain
HUB_RPC_URL=https://eth-rpc-testnet.polkadot.io/
HUB_VAULT_ADDRESS=0x03473a95971Ba0496786a615e21b1e87bDFf0025
ROUTER_ADDRESS=0xE2fFfb3B5C72f99811bC20D857035611bFCe5b5d
BIFROST_ADAPTER_ADDRESS=0x0000000000000000000000000000000000000000

# Moonbeam satellite
MOONBEAM_RPC_URL=https://rpc.api.moonbeam.network
MOONBEAM_VAULT_ADDRESS=0x0000000000000000000000000000000000000010

# Astar satellite
ASTAR_RPC_URL=https://evm.astar.network
ASTAR_VAULT_ADDRESS=0x0000000000000000000000000000000000000020
`;
}

function dcaBotIndexTemplate(): string {
  return `import {
  createEvmContext,
  POLKADOT_HUB_TESTNET_CONTRACTS,
  POLKADOT_HUB_TESTNET_RPC,
  PoolType,
  SwapExecuteTool,
  SwapQuoteTool,
  polkadotHubTestnet,
} from '@obidot-kit/sdk';
import { privateKeyToAccount } from 'viem/accounts';

const TEST_USDC_ADDRESS = '${DEFAULT_TEST_USDC_ADDRESS}' as const;

type ToolEnvelope = {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  message?: string;
  txHash?: string;
};

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function parseToolEnvelope(raw: string): ToolEnvelope {
  return JSON.parse(raw) as ToolEnvelope;
}

function requirePrivateKey(privateKey: string | undefined): \`0x\${string}\` {
  if (!privateKey) {
    throw new Error('EXECUTE_SWAPS=true requires PRIVATE_KEY=0x... to be set');
  }
  return privateKey as \`0x\${string}\`;
}

async function main() {
  const hubRpcUrl = process.env['HUB_RPC_URL'] ?? POLKADOT_HUB_TESTNET_RPC;
  const privateKey = process.env['PRIVATE_KEY'];
  const executeSwaps = parseBoolean(process.env['EXECUTE_SWAPS']);
  const runLabel = process.env['RUN_LABEL'] ?? 'weekly-tusdc-to-tdot';
  const amountIn = process.env['DCA_AMOUNT_IN'] ?? '10000000000000000000';
  const tokenIn = process.env['TOKEN_IN_ADDRESS'] ?? TEST_USDC_ADDRESS;
  const tokenOut =
    process.env['TOKEN_OUT_ADDRESS'] ??
    POLKADOT_HUB_TESTNET_CONTRACTS.assetAddress;
  const pairAddress =
    process.env['LIQUIDITY_PAIR_ADDRESS'] ??
    POLKADOT_HUB_TESTNET_CONTRACTS.lpPairDotUsdc;
  const routerAddress =
    process.env['SWAP_ROUTER_ADDRESS'] ??
    POLKADOT_HUB_TESTNET_CONTRACTS.swapRouterAddress;
  const quoterAddress =
    process.env['SWAP_QUOTER_ADDRESS'] ??
    POLKADOT_HUB_TESTNET_CONTRACTS.swapQuoterAddress;
  const slippageBps = Number(process.env['SLIPPAGE_BPS'] ?? '200');

  const account =
    privateKey && (executeSwaps || privateKey.length > 0)
      ? privateKeyToAccount((executeSwaps ? requirePrivateKey(privateKey) : privateKey) as \`0x\${string}\`)
      : undefined;

  const evmContext = createEvmContext({
    rpcUrl: hubRpcUrl,
    chain: polkadotHubTestnet,
    chainName: 'Polkadot Hub Testnet',
    ...(account ? { account } : {}),
  });

  const quoteTool = new SwapQuoteTool({
    evmContext,
    quoterAddress: quoterAddress as \`0x\${string}\`,
  });
  const executeTool = new SwapExecuteTool({
    evmContext,
    routerAddress: routerAddress as \`0x\${string}\`,
    quoterAddress: quoterAddress as \`0x\${string}\`,
    slippageBps,
  });

  console.log('='.repeat(68));
  console.log(' Obidot Kit - DCA Bot Template');
  console.log('='.repeat(68));
  console.log(\`Run label         : \${runLabel}\`);
  console.log(\`Mode              : \${executeSwaps ? 'execute' : 'preview-only'}\`);
  console.log(\`Hub RPC           : \${hubRpcUrl}\`);
  console.log(\`Token in          : \${tokenIn}\`);
  console.log(\`Token out         : \${tokenOut}\`);
  console.log(\`Amount in         : \${amountIn}\`);
  console.log(\`Liquidity pair    : \${pairAddress}\`);
  console.log(\`SwapRouter        : \${routerAddress}\`);
  console.log(\`SwapQuoter        : \${quoterAddress}\`);
  console.log(\`Signer            : \${account?.address ?? 'read-only'}\`);
  console.log();

  const quotePayload = JSON.stringify({
    pool: pairAddress,
    tokenIn,
    tokenOut,
    amountIn,
  });
  const quote = parseToolEnvelope(await quoteTool.invoke(quotePayload));
  if (!quote.success) {
    throw new Error(quote.error ?? 'SwapQuoteTool returned an unknown error');
  }

  console.log('Quote result:');
  console.log(JSON.stringify(quote.data ?? quote, null, 2));
  console.log();

  if (!executeSwaps) {
    console.log('Preview complete. Set EXECUTE_SWAPS=true and PRIVATE_KEY=0x... to submit the scheduled buy.');
    return;
  }

  if (!account) {
    throw new Error('Execution requested but no signer account is available');
  }

  const executionPayload = JSON.stringify({
    poolType: PoolType.Custom,
    pool: pairAddress,
    tokenIn,
    tokenOut,
    amountIn,
    minAmountOut: '0',
  });
  const execution = parseToolEnvelope(await executeTool.invoke(executionPayload));
  if (!execution.success) {
    throw new Error(execution.error ?? 'SwapExecuteTool returned an unknown error');
  }

  console.log('Execution result:');
  console.log(JSON.stringify(execution.data ?? execution, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
`;
}

function dcaBotEnvTemplate(): string {
  return `# DCA bot template - preview by default, execution only when enabled.

# Polkadot Hub Paseo TestNet
HUB_RPC_URL=https://eth-rpc-testnet.polkadot.io/

# Weekly buy profile
RUN_LABEL=weekly-tusdc-to-tdot
DCA_AMOUNT_IN=10000000000000000000
SLIPPAGE_BPS=200

# Swap topology: default live tUSDC/tDOT UniswapV2 pair
TOKEN_IN_ADDRESS=${DEFAULT_TEST_USDC_ADDRESS}
TOKEN_OUT_ADDRESS=0x2402C804aD8a6217BF73D8483dA7564065c56083
LIQUIDITY_PAIR_ADDRESS=0x9576F7b40bC3a8Bb5d236Cd4bEBC29dC40AF0fa4
SWAP_ROUTER_ADDRESS=0x60a72d1e20c5dc40Bb5a24394f0583d863201A3c
SWAP_QUOTER_ADDRESS=0x81d7aCFEF474DA6c76eC1b5A05a137cB9f3A5Db1

# Safe by default. Toggle on only when you want to submit the buy.
EXECUTE_SWAPS=false

# Required only for execution mode
# PRIVATE_KEY=0x...
`;
}

function dcaBotReadmeTemplate(projectName: string): string {
  return `# ${projectName}

Recurring DCA scaffold for buying tDOT with tUSDC on Polkadot Hub Testnet.

## Workflow boundary

- Preview mode is the default and only fetches a live quote.
- Execution mode is opt-in via \`EXECUTE_SWAPS=true\`.
- The scaffold uses the live tUSDC/tDOT UniswapV2 pair on Polkadot Hub Testnet.

## Setup

\`\`\`sh
pnpm install
cp .env.example .env
pnpm start
\`\`\`

## Execution mode

1. Set \`PRIVATE_KEY=0x...\` in \`.env\`
2. Set \`EXECUTE_SWAPS=true\`
3. Run \`pnpm start\`

The bot will:

1. Fetch a live quote for the configured recurring buy.
2. Stop after the quote in preview mode.
3. Approve the router and submit the swap in execution mode.

## Scheduling

Use cron, GitHub Actions, or any external scheduler to run the script on your cadence:

\`\`\`sh
0 9 * * 1 pnpm start
\`\`\`

That gives you a weekly Monday 09:00 DCA run while keeping the script itself deterministic and automation-friendly.
`;
}

function yieldOptimizerIndexTemplate(): string {
  return `import {
  BifrostYieldTool,
  CrossChainStateTool,
  PerformanceTool,
  createEvmContext,
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
  return \`\${(Number(bps) / 100).toFixed(2)}%\`;
}

async function main() {
  const hubRpcUrl = process.env['HUB_RPC_URL'] ?? POLKADOT_HUB_TESTNET_RPC;
  const hubVaultAddress =
    (process.env['HUB_VAULT_ADDRESS'] ??
      POLKADOT_HUB_TESTNET_CONTRACTS.vaultAddress) as \`0x\${string}\`;
  const assetAddress =
    (process.env['ASSET_ADDRESS'] ??
      POLKADOT_HUB_TESTNET_CONTRACTS.assetAddress) as \`0x\${string}\`;
  const routerAddress =
    process.env['ROUTER_ADDRESS'] ??
    POLKADOT_HUB_TESTNET_CONTRACTS.crossChainRouterAddress;
  const targetCategory = process.env['TARGET_CATEGORY'] ?? 'Farming';
  const minIdleAssets = safeBigInt(process.env['MIN_IDLE_ASSETS'] ?? '25000000000000000000');

  const moonbeamSatellite = {
    id: 'moonbeam-satellite',
    name: 'Moonbeam Satellite Vault',
    address:
      (process.env['MOONBEAM_VAULT_ADDRESS'] ??
        '0x0000000000000000000000000000000000000010') as \`0x\${string}\`,
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
    address:
      (process.env['ASTAR_VAULT_ADDRESS'] ??
        '0x0000000000000000000000000000000000000020') as \`0x\${string}\`,
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

  console.log('='.repeat(72));
  console.log(' Obidot Kit - Yield Optimizer Template');
  console.log('='.repeat(72));
  console.log(\`Mode                : preview-only\`);
  console.log(\`Hub RPC             : \${hubRpcUrl}\`);
  console.log(\`Hub vault           : \${hubVaultAddress}\`);
  console.log(\`Target category     : \${targetCategory}\`);
  console.log(\`Idle threshold      : \${minIdleAssets.toString()}\`);
  console.log('Execution boundary  : no funds move in this template');
  console.log();

  const [performanceRaw, crossChainRaw, yieldsRaw] = await Promise.all([
    performanceTool.invoke(JSON.stringify({ includeSummary: true })),
    crossChainStateTool.invoke(JSON.stringify({ includeDetails: true })),
    bifrostYieldTool.invoke(JSON.stringify({ category: targetCategory, activeOnly: true })),
  ]);

  const performance = parseToolEnvelope<PerformanceData>(performanceRaw);
  const crossChain = parseToolEnvelope<CrossChainData>(crossChainRaw);
  const yields = parseToolEnvelope<BifrostYieldData>(yieldsRaw);

  const products = [...(yields.data?.products ?? [])].sort((a, b) => b.apy - a.apy);
  const topProduct = products[0];

  const idleAssets = safeBigInt(performance.data?.vaultState?.idleAssets);
  const totalAssets = safeBigInt(performance.data?.vaultState?.totalAssets);
  const totalRemoteAssets = safeBigInt(performance.data?.vaultState?.totalRemoteAssets);
  const hasIdleBuffer = idleAssets >= minIdleAssets;

  const blockers = [
    'CrossChainRouteTool is not available yet, so this script cannot build an executable rebalance route.',
    'LiquidityAddTool and LiquidityRemoveTool are not available yet, so this script cannot seed or unwind yield positions.',
    'BifrostYieldTool is running with the built-in catalogue unless you replace it with a live provider.',
  ];

  const recommendation = topProduct
    ? {
        action: hasIdleBuffer ? \`manual-review-\${topProduct.category.toLowerCase()}\` : 'hold-idle-capital',
        summary: hasIdleBuffer
          ? \`Research allocating idle capital toward \${topProduct.product} (\${topProduct.apy.toFixed(2)}% APY) once route/liquidity execution tools are available.\`
          : \`Top candidate is \${topProduct.product} (\${topProduct.apy.toFixed(2)}% APY), but idle assets are below the configured threshold.\`,
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

  console.log('Recommendation:');
  console.log(
    JSON.stringify(
      {
        recommendation,
        blockers,
        notes: [
          'This template intentionally stops after ranking and context gathering.',
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
`;
}

function yieldOptimizerEnvTemplate(): string {
  return `# Yield optimizer template - preview and recommendation only.

# Polkadot Hub Paseo TestNet
HUB_RPC_URL=https://eth-rpc-testnet.polkadot.io/
HUB_VAULT_ADDRESS=0x03473a95971Ba0496786a615e21b1e87bDFf0025
ASSET_ADDRESS=0x2402C804aD8a6217BF73D8483dA7564065c56083
ROUTER_ADDRESS=0x5d44B31a2A6d05b4f4d772b0f28d4F8F4E87E1f8
BIFROST_ADAPTER_ADDRESS=0x0000000000000000000000000000000000000000

# Example satellite placeholders used for the preview report
MOONBEAM_VAULT_ADDRESS=0x0000000000000000000000000000000000000010
ASTAR_VAULT_ADDRESS=0x0000000000000000000000000000000000000020

# Recommendation tuning
TARGET_CATEGORY=Farming
MIN_IDLE_ASSETS=25000000000000000000
`;
}

function yieldOptimizerReadmeTemplate(projectName: string): string {
  return `# ${projectName}

Preview-first strategy scout for comparing current Obidot vault state against the available Bifrost yield catalogue.

## Workflow boundary

- This template is intentionally read-only.
- It uses the current SDK surface only: \`PerformanceTool\`, \`CrossChainStateTool\`, and \`BifrostYieldTool\`.
- It does **not** move funds, build cross-chain routes, or add liquidity.
- \`CrossChainRouteTool\`, \`LiquidityAddTool\`, and \`LiquidityRemoveTool\` are not available yet, so the output is a recommendation report for manual follow-up.

## Data caveats

- \`PerformanceTool\` reads live Hub vault state when the configured vault is reachable.
- \`CrossChainStateTool\` reports the configured satellite topology, but defaults to stub summaries unless you wire live satellite contexts yourself.
- \`BifrostYieldTool\` uses the built-in placeholder catalogue by default. Replace it with a custom provider before treating APYs as live production inputs.

## Setup

\`\`\`sh
pnpm install
cp .env.example .env
pnpm start
\`\`\`

## What it does

1. Reads current Hub vault performance and idle asset levels.
2. Reads the configured cross-chain topology summary.
3. Fetches the current Bifrost yield catalogue for the selected category.
4. Picks the highest-APY candidate and prints a recommendation report.
5. Stops with explicit blockers instead of faking execution.
`;
}

const TEMPLATE_DEFINITIONS: Record<InitTemplate, TemplateDefinition> = {
  starter: {
    description: 'Minimal SDK scaffold for local inspection and quick experiments.',
    files: (projectName) => [
      [
        'package.json',
        packageJsonTemplate(projectName, 'Minimal Obidot Kit starter scaffold', {
          '@obidot-kit/sdk': SDK_VERSION,
        }),
      ],
      ['tsconfig.json', TSCONFIG_TEMPLATE],
      ['src/index.ts', starterIndexTemplate()],
      ['.env.example', starterEnvTemplate()],
      ['.gitignore', GITIGNORE_TEMPLATE],
    ],
  },
  'vault-agent': {
    description: 'Hub vault scaffold with optional EVM signing via viem.',
    files: (projectName) => [
      [
        'package.json',
        packageJsonTemplate(projectName, 'Obidot Kit vault agent scaffold', {
          '@obidot-kit/core': CORE_VERSION,
          '@obidot-kit/sdk': SDK_VERSION,
          viem: VIEM_VERSION,
        }),
      ],
      ['tsconfig.json', TSCONFIG_TEMPLATE],
      ['src/index.ts', vaultAgentIndexTemplate()],
      ['.env.example', vaultAgentEnvTemplate()],
      ['.gitignore', GITIGNORE_TEMPLATE],
    ],
  },
  'cross-chain-agent': {
    description: 'Cross-chain scaffold with satellite vault and Bifrost placeholders.',
    files: (projectName) => [
      [
        'package.json',
        packageJsonTemplate(projectName, 'Obidot Kit cross-chain agent scaffold', {
          '@obidot-kit/core': CORE_VERSION,
          '@obidot-kit/sdk': SDK_VERSION,
        }),
      ],
      ['tsconfig.json', TSCONFIG_TEMPLATE],
      ['src/index.ts', crossChainIndexTemplate()],
      ['.env.example', crossChainEnvTemplate()],
      ['.gitignore', GITIGNORE_TEMPLATE],
    ],
  },
  'dca-bot': {
    description: 'Recurring quote-first DCA scaffold for buying tDOT with tUSDC.',
    files: (projectName) => [
      [
        'package.json',
        packageJsonTemplate(projectName, 'Obidot Kit DCA bot scaffold', {
          '@obidot-kit/sdk': SDK_VERSION,
          viem: VIEM_VERSION,
        }),
      ],
      ['tsconfig.json', TSCONFIG_TEMPLATE],
      ['src/index.ts', dcaBotIndexTemplate()],
      ['.env.example', dcaBotEnvTemplate()],
      ['README.md', dcaBotReadmeTemplate(projectName)],
      ['.gitignore', GITIGNORE_TEMPLATE],
    ],
  },
  'yield-optimizer': {
    description: 'Preview-first yield scout that ranks Bifrost ideas and prints blockers instead of executing.',
    files: (projectName) => [
      [
        'package.json',
        packageJsonTemplate(projectName, 'Obidot Kit yield optimizer scaffold', {
          '@obidot-kit/sdk': SDK_VERSION,
        }),
      ],
      ['tsconfig.json', TSCONFIG_TEMPLATE],
      ['src/index.ts', yieldOptimizerIndexTemplate()],
      ['.env.example', yieldOptimizerEnvTemplate()],
      ['README.md', yieldOptimizerReadmeTemplate(projectName)],
      ['.gitignore', GITIGNORE_TEMPLATE],
    ],
  },
};

function parseTemplate(template: string | undefined): InitTemplate {
  if (!template) {
    return DEFAULT_INIT_TEMPLATE;
  }

  if ((TEMPLATE_NAMES as readonly string[]).includes(template)) {
    return template as InitTemplate;
  }

  const available = TEMPLATE_NAMES.join(', ');
  throw new Error(`Unknown template "${template}". Available templates: ${available}`);
}

function templateFiles(template: InitTemplate, projectName: string): Array<[string, string]> {
  return TEMPLATE_DEFINITIONS[template].files(projectName);
}

export interface InitOptions {
  targetDir?: string;
  silent?: boolean;
  template?: InitTemplate | string;
}

export interface InitResult {
  projectDir: string;
  filesCreated: string[];
  template: InitTemplate;
}

export async function runInit(projectName = 'my-obi-agent', options: InitOptions = {}): Promise<InitResult> {
  const { targetDir, silent = false, template: templateOption } = options;
  const dir = targetDir ?? (isAbsolute(projectName) ? projectName : resolve(process.cwd(), projectName));
  const scaffoldName = basename(dir) || projectName;
  const template = parseTemplate(templateOption);
  const definition = TEMPLATE_DEFINITIONS[template];

  const log = silent ? () => {} : console.log;

  log(`Scaffolding new Obidot Kit agent project: ${scaffoldName}`);
  log(`  Directory: ${dir}`);
  log(`  Template: ${template} - ${definition.description}`);

  await mkdir(dir, { recursive: true });
  await mkdir(join(dir, 'src'), { recursive: true });

  const files = templateFiles(template, scaffoldName);
  const filesCreated: string[] = [];

  for (const [relPath, content] of files) {
    const fullPath = join(dir, relPath);
    await writeFile(fullPath, content, 'utf8');
    filesCreated.push(relPath);
    log(`  Created ${relPath}`);
  }

  log('');
  log('Project scaffolded successfully.');
  log('');
  log('Next steps:');
  log(`  cd ${dir}`);
  log('  cp .env.example .env');
  log('  pnpm install');
  log('  pnpm start');

  return {
    projectDir: dir,
    filesCreated,
    template,
  };
}
