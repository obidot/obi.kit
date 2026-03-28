import {
  ArbitrageDetectTool,
  createEvmContext,
  POLKADOT_HUB_TESTNET_CONTRACTS,
  POLKADOT_HUB_TESTNET_RPC,
  polkadotHubTestnet,
  type RouteHop,
  SwapMultiHopTool,
} from '@obidot-kit/sdk';
import { privateKeyToAccount } from 'viem/accounts';

type ToolEnvelope = {
  success: boolean;
  data?: {
    opportunities?: ArbitrageOpportunity[];
  };
  error?: string;
};

type ArbitrageOpportunity = {
  directPair: string;
  directAmountOut: string;
  betterRoute: string[];
  routeAmountOut: string;
  estimatedExtraOut: string;
  spreadBps: number;
  routeHops: RouteHop[];
};

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseToolEnvelope(raw: string): ToolEnvelope {
  return JSON.parse(raw) as ToolEnvelope;
}

function minAmountOutWithBuffer(routeAmountOut: string): string {
  return ((BigInt(routeAmountOut) * 98n) / 100n).toString();
}

function requirePrivateKey(privateKey: string | undefined): `0x${string}` {
  if (!privateKey) {
    throw new Error('EXECUTE_SWAPS=true requires PRIVATE_KEY=0x... to be set');
  }
  return privateKey as `0x${string}`;
}

async function main() {
  const hubRpcUrl = process.env['HUB_RPC_URL'] ?? POLKADOT_HUB_TESTNET_RPC;
  const routerAddress = process.env['SWAP_ROUTER_ADDRESS'] ?? POLKADOT_HUB_TESTNET_CONTRACTS.swapRouterAddress;
  const privateKey = process.env['PRIVATE_KEY'];
  const executeSwaps = parseBoolean(process.env['EXECUTE_SWAPS']);
  const runLabel = process.env['RUN_LABEL'] ?? 'uv2-spread-monitor';
  const amountIn = process.env['AMOUNT_IN'] ?? '1000000000000000000';
  const thresholdBps = Number(process.env['THRESHOLD_BPS'] ?? '50');
  const maxOpportunities = Number(process.env['MAX_OPPORTUNITIES'] ?? '3');
  const pairLabels = parseCsv(process.env['PAIRS']);

  const account = privateKey
    ? privateKeyToAccount((executeSwaps ? requirePrivateKey(privateKey) : privateKey) as `0x${string}`)
    : undefined;

  const evmContext = createEvmContext({
    rpcUrl: hubRpcUrl,
    chain: polkadotHubTestnet,
    chainName: 'Polkadot Hub Testnet',
    ...(account ? { account } : {}),
  });

  const detectTool = new ArbitrageDetectTool({ evmContext });
  const executeTool = new SwapMultiHopTool({
    evmContext,
    routerAddress: routerAddress as `0x${string}`,
  });

  console.log('='.repeat(68));
  console.log(' Obidot Kit - Arbitrage Bot Example');
  console.log('='.repeat(68));
  console.log(`Run label         : ${runLabel}`);
  console.log(`Mode              : ${executeSwaps ? 'execute-best-route' : 'preview-only'}`);
  console.log(`Hub RPC           : ${hubRpcUrl}`);
  console.log(`Amount in         : ${amountIn}`);
  console.log(`Threshold (bps)   : ${thresholdBps}`);
  console.log(`Max opportunities : ${maxOpportunities}`);
  console.log(`Pairs filter      : ${pairLabels.join(', ') || 'default known pairs'}`);
  console.log(`SwapRouter        : ${routerAddress}`);
  console.log(`Signer            : ${account?.address ?? 'read-only'}`);
  console.log();

  const detectionPayload = JSON.stringify({
    amountIn,
    thresholdBps,
    maxOpportunities,
    ...(pairLabels.length > 0 ? { pairs: pairLabels } : {}),
  });
  const detection = parseToolEnvelope(await detectTool.invoke(detectionPayload));
  if (!detection.success) {
    throw new Error(detection.error ?? 'ArbitrageDetectTool returned an unknown error');
  }

  const opportunities = detection.data?.opportunities ?? [];
  console.log('Detected opportunities:');
  console.log(JSON.stringify(opportunities, null, 2));
  console.log();

  const bestOpportunity = opportunities[0];
  if (!bestOpportunity) {
    console.log('No opportunities met the configured threshold.');
    return;
  }

  if (!executeSwaps) {
    console.log('Preview complete. Set EXECUTE_SWAPS=true and PRIVATE_KEY=0x... to submit the top route.');
    return;
  }

  if (!account) {
    throw new Error('Execution requested but no signer account is available');
  }

  const executionPayload = JSON.stringify({
    routes: bestOpportunity.routeHops,
    amountIn,
    minAmountOut: minAmountOutWithBuffer(bestOpportunity.routeAmountOut),
  });
  const execution = parseToolEnvelope(await executeTool.invoke(executionPayload));
  if (!execution.success) {
    throw new Error(execution.error ?? 'SwapMultiHopTool returned an unknown error');
  }

  console.log('Execution result:');
  console.log(JSON.stringify(execution.data ?? execution, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
