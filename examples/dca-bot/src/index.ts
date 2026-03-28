import {
  createEvmContext,
  POLKADOT_HUB_TESTNET_CONTRACTS,
  POLKADOT_HUB_TESTNET_RPC,
  PoolType,
  polkadotHubTestnet,
  SwapExecuteTool,
  SwapQuoteTool,
} from '@obidot-kit/sdk';
import { privateKeyToAccount } from 'viem/accounts';

const TEST_USDC_ADDRESS = '0x5298FDe9E288371ECA21db04Ac5Ddba00C1ea626' as const;

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

function requirePrivateKey(privateKey: string | undefined): `0x${string}` {
  if (!privateKey) {
    throw new Error('EXECUTE_SWAPS=true requires PRIVATE_KEY=0x... to be set');
  }
  return privateKey as `0x${string}`;
}

async function main() {
  const hubRpcUrl = process.env['HUB_RPC_URL'] ?? POLKADOT_HUB_TESTNET_RPC;
  const privateKey = process.env['PRIVATE_KEY'];
  const executeSwaps = parseBoolean(process.env['EXECUTE_SWAPS']);
  const runLabel = process.env['RUN_LABEL'] ?? 'weekly-tusdc-to-tdot';
  const amountIn = process.env['DCA_AMOUNT_IN'] ?? '10000000000000000000';
  const tokenIn = process.env['TOKEN_IN_ADDRESS'] ?? TEST_USDC_ADDRESS;
  const tokenOut = process.env['TOKEN_OUT_ADDRESS'] ?? POLKADOT_HUB_TESTNET_CONTRACTS.assetAddress;
  const pairAddress = process.env['LIQUIDITY_PAIR_ADDRESS'] ?? POLKADOT_HUB_TESTNET_CONTRACTS.lpPairDotUsdc;
  const routerAddress = process.env['SWAP_ROUTER_ADDRESS'] ?? POLKADOT_HUB_TESTNET_CONTRACTS.swapRouterAddress;
  const quoterAddress = process.env['SWAP_QUOTER_ADDRESS'] ?? POLKADOT_HUB_TESTNET_CONTRACTS.swapQuoterAddress;
  const slippageBps = Number(process.env['SLIPPAGE_BPS'] ?? '200');

  const account = privateKey
    ? privateKeyToAccount((executeSwaps ? requirePrivateKey(privateKey) : privateKey) as `0x${string}`)
    : undefined;

  const evmContext = createEvmContext({
    rpcUrl: hubRpcUrl,
    chain: polkadotHubTestnet,
    chainName: 'Polkadot Hub Testnet',
    ...(account ? { account } : {}),
  });

  const quoteTool = new SwapQuoteTool({
    evmContext,
    quoterAddress: quoterAddress as `0x${string}`,
  });
  const executeTool = new SwapExecuteTool({
    evmContext,
    routerAddress: routerAddress as `0x${string}`,
    quoterAddress: quoterAddress as `0x${string}`,
    slippageBps,
  });

  console.log('='.repeat(68));
  console.log(' Obidot Kit - DCA Bot Example');
  console.log('='.repeat(68));
  console.log(`Run label         : ${runLabel}`);
  console.log(`Mode              : ${executeSwaps ? 'execute' : 'preview-only'}`);
  console.log(`Hub RPC           : ${hubRpcUrl}`);
  console.log(`Token in          : ${tokenIn}`);
  console.log(`Token out         : ${tokenOut}`);
  console.log(`Amount in         : ${amountIn}`);
  console.log(`Liquidity pair    : ${pairAddress}`);
  console.log(`SwapRouter        : ${routerAddress}`);
  console.log(`SwapQuoter        : ${quoterAddress}`);
  console.log(`Signer            : ${account?.address ?? 'read-only'}`);
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
