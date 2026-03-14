/**
 * Vault Agent Example
 *
 * Demonstrates how to connect an AI agent to the ObidotVault ERC-4626
 * contract on Polkadot Hub EVM using Obidot Kit.
 *
 * Shows two modes:
 *   1. **EVM mode** — real on-chain interactions via viem (when PRIVATE_KEY is set)
 *   2. **Offline mode** — stub results for local development
 *
 * Usage:
 *   pnpm tsx src/index.ts
 *
 * Environment variables:
 *   OPENAI_API_KEY    – Your OpenAI API key (required for LLM-driven mode)
 *   HUB_RPC_URL       – Polkadot Hub EVM RPC (default: testnet)
 *   VAULT_ADDRESS     – ObidotVault contract address
 *   ASSET_ADDRESS     – ERC-20 asset (e.g. WDOT) address
 *   PRIVATE_KEY       – Hex-encoded private key for EVM signing (optional)
 */

import {
  type ChainConfig,
  createEvmContext,
  type EvmVaultConfig,
  POLKADOT_HUB_TESTNET_CONTRACTS,
  POLKADOT_HUB_TESTNET_RPC,
  PoolType,
  polkadotHubTestnet,
  type SwapRouterConfig,
  type VaultConfig,
} from '@obidot-kit/core';
import {
  BifrostStrategyTool,
  BifrostYieldTool,
  createBifrostYieldProvider,
  EvmBifrostStrategyService,
  OracleCheckTool,
  PerformanceTool,
  VaultDepositTool,
  VaultWithdrawTool,
  WithdrawalQueueTool,
} from '@obidot-kit/llm';
import { ObiKit } from '@obidot-kit/sdk';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const HUB_RPC_URL = process.env['HUB_RPC_URL'] ?? POLKADOT_HUB_TESTNET_RPC;
const VAULT_ADDRESS = process.env['VAULT_ADDRESS'] ?? POLKADOT_HUB_TESTNET_CONTRACTS.vaultAddress;
const ASSET_ADDRESS = process.env['ASSET_ADDRESS'] ?? POLKADOT_HUB_TESTNET_CONTRACTS.assetAddress;
const PRIVATE_KEY = process.env['PRIVATE_KEY'];

const chainConfig: ChainConfig = {
  endpoint: HUB_RPC_URL,
  name: 'Polkadot Hub Testnet',
  chainId: String(polkadotHubTestnet.id),
};

const vaultConfig: VaultConfig = {
  id: 'obidot-vault',
  name: 'Obidot ERC-4626 Vault',
  address: VAULT_ADDRESS,
  chain: chainConfig,
  asset: 'WDOT',
  decimals: 18,
};

const evmVaultConfig: EvmVaultConfig = {
  vaultAddress: VAULT_ADDRESS as `0x${string}`,
  assetAddress: ASSET_ADDRESS as `0x${string}`,
  rpcUrl: HUB_RPC_URL,
  chainId: polkadotHubTestnet.id,
};

const swapRouterConfig: SwapRouterConfig = {
  routerAddress: (process.env['SWAP_ROUTER_ADDRESS'] ??
    POLKADOT_HUB_TESTNET_CONTRACTS.swapRouterAddress) as `0x${string}`,
  quoterAddress: (process.env['SWAP_QUOTER_ADDRESS'] ??
    POLKADOT_HUB_TESTNET_CONTRACTS.swapQuoterAddress) as `0x${string}`,
  adapters: {
    [PoolType.HydrationOmnipool]: POLKADOT_HUB_TESTNET_CONTRACTS.hydrationAdapterAddress,
  },
};

const BIFROST_ADAPTER_ADDRESS =
  process.env['BIFROST_ADAPTER_ADDRESS'] ?? POLKADOT_HUB_TESTNET_CONTRACTS.bifrostAdapterAddress;

// ---------------------------------------------------------------------------
// Agent Setup
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log(' Obidot Kit - Vault Agent Example');
  console.log('='.repeat(60));
  console.log();

  // 1. Initialize the SDK
  console.log('[1] Initializing ObiKit SDK...');
  const kit = new ObiKit({ chainConfig });
  kit.registerVault(vaultConfig);
  kit.registerSwapRouter(swapRouterConfig);
  console.log(`   Chain       : ${chainConfig.name} (chain ID ${chainConfig.chainId})`);
  console.log(`   RPC         : ${HUB_RPC_URL}`);
  console.log(`   Vault       : ${VAULT_ADDRESS}`);
  console.log(`   Asset       : ${ASSET_ADDRESS}`);
  console.log(`   SwapRouter  : ${swapRouterConfig.routerAddress}`);
  console.log(`   SwapQuoter  : ${swapRouterConfig.quoterAddress}`);
  console.log();

  // 2. Determine mode
  const isEvmMode = !!PRIVATE_KEY;
  console.log(`[2] Mode: ${isEvmMode ? 'EVM (on-chain)' : 'Offline (stub)'}`);
  console.log();

  // 3. Create tools
  console.log('[3] Creating vault tools...');

  let bifrostStrategyTool: BifrostStrategyTool;

  if (isEvmMode) {
    // Import viem accounts dynamically to avoid requiring it when offline
    const { privateKeyToAccount } = await import('viem/accounts');
    const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);

    const evmContext = createEvmContext({
      rpcUrl: HUB_RPC_URL,
      chain: polkadotHubTestnet,
      chainName: 'Polkadot Hub Testnet',
      account,
    });

    // Set up ObiKit with EVM vault
    kit.setEvmVault(evmContext, evmVaultConfig);
    console.log(`   Signer : ${account.address}`);
    console.log(`   EVM vault tools created (${kit.getTools().length} total)`);

    // Wire BifrostStrategyService with the real EVM context
    const bifrostService = new EvmBifrostStrategyService(evmContext, BIFROST_ADAPTER_ADDRESS as `0x${string}`);
    bifrostStrategyTool = new BifrostStrategyTool({
      strategyService: bifrostService,
      adapterAddress: BIFROST_ADAPTER_ADDRESS,
    });
  } else {
    // Offline mode: stub Bifrost strategy tool
    bifrostStrategyTool = new BifrostStrategyTool({
      adapterAddress: BIFROST_ADAPTER_ADDRESS,
    });
  }

  // Create individual tools for demonstration
  const toolOptions = isEvmMode
    ? { evmContext: kit.getHubEvmContext()!, vaultConfig: evmVaultConfig }
    : { chainConfig };

  const depositTool = new VaultDepositTool(toolOptions);
  const withdrawTool = new VaultWithdrawTool(toolOptions);
  const queueTool = new WithdrawalQueueTool(
    isEvmMode ? { evmContext: kit.getHubEvmContext()!, vaultConfig: evmVaultConfig } : {},
  );
  const performanceTool = new PerformanceTool(
    isEvmMode ? { evmContext: kit.getHubEvmContext()!, vaultConfig: evmVaultConfig } : {},
  );
  const oracleTool = new OracleCheckTool(
    isEvmMode ? { evmContext: kit.getHubEvmContext()!, vaultConfig: evmVaultConfig } : {},
  );

  // Bifrost yield tool — uses live RPC provider (falls back to static rates)
  const bifrostYieldTool = new BifrostYieldTool({
    provider: createBifrostYieldProvider({ useLiveRates: isEvmMode }),
  });

  const tools = [
    depositTool,
    withdrawTool,
    queueTool,
    performanceTool,
    oracleTool,
    bifrostStrategyTool,
    bifrostYieldTool,
  ];
  console.log(`   ${tools.length} tool(s) available:`);
  for (const tool of tools) {
    console.log(`     - ${tool.name}`);
  }
  console.log();

  // 4. Simulate a deposit
  console.log('[4] Simulating deposit of 100 WDOT...');
  const depositInput = JSON.stringify({
    vaultAddress: VAULT_ADDRESS,
    amount: '100000000000000000000', // 100 WDOT (18 decimals)
    asset: ASSET_ADDRESS,
  });
  const depositResult = await depositTool.invoke(depositInput);
  const deposit = JSON.parse(depositResult);
  console.log(`   Success : ${deposit.success}`);
  console.log(`   Mode    : ${deposit.data?.mode ?? 'unknown'}`);
  console.log(`   Status  : ${deposit.data?.status ?? 'unknown'}`);
  console.log(`   Message : ${deposit.data?.message ?? deposit.error}`);
  console.log();

  // 5. Simulate a withdrawal
  console.log('[5] Simulating withdrawal of 50 WDOT...');
  const withdrawInput = JSON.stringify({
    vaultAddress: VAULT_ADDRESS,
    amount: '50000000000000000000', // 50 WDOT
  });
  const withdrawResult = await withdrawTool.invoke(withdrawInput);
  const withdraw = JSON.parse(withdrawResult);
  console.log(`   Success : ${withdraw.success}`);
  console.log(`   Mode    : ${withdraw.data?.mode ?? 'unknown'}`);
  console.log(`   Status  : ${withdraw.data?.status ?? 'unknown'}`);
  console.log(`   Message : ${withdraw.data?.message ?? withdraw.error}`);
  console.log();

  // 6. Check oracle status
  console.log('[6] Checking oracle status...');
  const oracleInput = JSON.stringify({ action: 'oracle' });
  const oracleResult = await oracleTool.invoke(oracleInput);
  const oracle = JSON.parse(oracleResult);
  console.log(`   Success : ${oracle.success}`);
  console.log(`   Message : ${oracle.data?.message ?? oracle.error}`);
  console.log();

  // 7. Check performance metrics
  console.log('[7] Fetching vault performance...');
  const perfInput = JSON.stringify({ action: 'vault' });
  const perfResult = await performanceTool.invoke(perfInput);
  const perf = JSON.parse(perfResult);
  console.log(`   Success : ${perf.success}`);
  console.log(`   Message : ${perf.data?.message ?? perf.error}`);
  console.log();

  // 8. Fetch Bifrost yields
  console.log('[8] Fetching Bifrost yield products...');
  const yieldsResult = await bifrostYieldTool.invoke('{"category":"SLP"}');
  const yields = JSON.parse(yieldsResult);
  console.log(`   Success : ${yields.success}`);
  console.log(`   Message : ${yields.message ?? yields.error}`);
  if (yields.data?.products) {
    for (const p of yields.data.products as Array<{ product: string; apy: number }>) {
      console.log(`     ${p.product}: ${p.apy.toFixed(2)}% APY`);
    }
  }
  console.log();

  // 9. Preview a Bifrost MintVToken strategy (stub or live)
  console.log('[9] Previewing Bifrost MintVToken strategy (1 DOT)...');
  const bifrostInput = JSON.stringify({
    strategyType: 0, // MintVToken
    currencyIn: 0, // DOT
    amount: '10000000000', // 1 DOT (10 decimals on Bifrost)
  });
  const bifrostResult = await bifrostStrategyTool.invoke(bifrostInput);
  const bifrost = JSON.parse(bifrostResult);
  console.log(`   Success : ${bifrost.success}`);
  console.log(`   Mode    : ${bifrost.data?.mode ?? 'unknown'}`);
  console.log(`   Status  : ${bifrost.data?.status ?? 'unknown'}`);
  console.log(`   Message : ${bifrost.data?.message ?? bifrost.error}`);
  console.log();

  // 10. SDK inspection
  console.log('[10] SDK state:');
  const info = kit.inspect();
  console.log(`   Mode            : ${info['mode']}`);
  console.log(`   Has EVM vault   : ${info['hasEvmVault']}`);
  console.log(`   Vault address   : ${info['evmVaultAddress'] ?? 'N/A'}`);
  console.log(`   Registered vaults: ${info['vaultCount']}`);
  console.log(`   Total tools     : ${info['totalToolCount']}`);
  console.log();

  // Summary
  console.log('='.repeat(60));
  console.log(' Vault Agent Example Complete');
  console.log();
  console.log(' This example demonstrated:');
  console.log('   - ObidotVault ERC-4626 deposit/withdraw (offline or EVM mode)');
  console.log('   - Withdrawal queue management');
  console.log('   - Oracle freshness and circuit breaker checks');
  console.log('   - Vault performance metrics');
  console.log('   - Bifrost yield product discovery (SLP APY via live RPC or static rates)');
  console.log('   - Bifrost strategy execution via BifrostAdapter (MintVToken, DEXSwap, Farming, SALP)');
  console.log();
  console.log(' To enable EVM mode, set PRIVATE_KEY and real contract addresses.');
  console.log(' To add an LLM, use kit.createAgent(model) with ChatOpenAI.');
  console.log('='.repeat(60));
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

main().catch((error: unknown) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
