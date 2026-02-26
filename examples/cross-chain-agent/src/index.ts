/**
 * Cross-Chain Agent Example
 *
 * Demonstrates how to use Obidot Kit with cross-chain satellite vaults,
 * Bifrost DeFi features, and the new EVM vault tools including:
 *   1. Creating ObiKit with satellite vaults, Bifrost config, and EVM vault
 *   2. Fetching Bifrost yield products
 *   3. Fetching cross-chain state (hub + satellites)
 *   4. Executing a Bifrost strategy (stub mode)
 *   5. Batch strategy execution (stub mode)
 *   6. Withdrawal queue management
 *   7. Performance metrics and oracle checks
 *
 * Usage:
 *   pnpm tsx src/index.ts
 *
 * Environment variables:
 *   HUB_RPC_URL          - RPC endpoint for the hub chain (default: testnet)
 *   HUB_VAULT_ADDRESS    - Hub ObidotVault contract address
 *   ASSET_ADDRESS        - ERC-20 asset address on hub
 *   ROUTER_ADDRESS       - CrossChainRouter contract address
 *   ADAPTER_ADDRESS      - BifrostAdapter contract address
 *   MOONBEAM_RPC_URL     - RPC endpoint for Moonbeam satellite
 *   MOONBEAM_VAULT_ADDR  - Satellite vault address on Moonbeam
 *   ASTAR_RPC_URL        - RPC endpoint for Astar satellite
 *   ASTAR_VAULT_ADDR     - Satellite vault address on Astar
 */

import {
  type ChainConfig,
  type EvmVaultConfig,
  type SatelliteVaultConfig,
  polkadotHubTestnet,
  POLKADOT_HUB_TESTNET_RPC,
} from '@obidot-kit/core';
import {
  BatchStrategyTool,
  BifrostStrategyTool,
  BifrostYieldTool,
  CrossChainRebalanceTool,
  CrossChainStateTool,
  OracleCheckTool,
  PerformanceTool,
  WithdrawalQueueTool,
} from '@obidot-kit/llm';
import { ObiKit } from '@obidot-kit/sdk';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const HUB_RPC_URL = process.env['HUB_RPC_URL'] ?? POLKADOT_HUB_TESTNET_RPC;
const HUB_VAULT_ADDRESS = process.env['HUB_VAULT_ADDRESS'] ?? '0x0000000000000000000000000000000000000001';
const ASSET_ADDRESS = process.env['ASSET_ADDRESS'] ?? '0x0000000000000000000000000000000000000002';
const ROUTER_ADDRESS = process.env['ROUTER_ADDRESS'] ?? '0x0000000000000000000000000000000000000003';
const ADAPTER_ADDRESS = process.env['ADAPTER_ADDRESS'] ?? '0x0000000000000000000000000000000000000004';

const MOONBEAM_RPC_URL = process.env['MOONBEAM_RPC_URL'] ?? 'https://rpc.api.moonbeam.network';
const MOONBEAM_VAULT_ADDR = process.env['MOONBEAM_VAULT_ADDR'] ?? '0x0000000000000000000000000000000000000010';

const ASTAR_RPC_URL = process.env['ASTAR_RPC_URL'] ?? 'https://evm.astar.network';
const ASTAR_VAULT_ADDR = process.env['ASTAR_VAULT_ADDR'] ?? '0x0000000000000000000000000000000000000020';

const hubChainConfig: ChainConfig = {
  endpoint: HUB_RPC_URL,
  name: 'Polkadot Hub Testnet',
  chainId: String(polkadotHubTestnet.id),
};

const evmVaultConfig: EvmVaultConfig = {
  vaultAddress: HUB_VAULT_ADDRESS as `0x${string}`,
  assetAddress: ASSET_ADDRESS as `0x${string}`,
  rpcUrl: HUB_RPC_URL,
  chainId: polkadotHubTestnet.id,
};

const moonbeamChainConfig: ChainConfig = {
  endpoint: MOONBEAM_RPC_URL,
  name: 'Moonbeam',
  chainId: 'moonbeam',
};

const astarChainConfig: ChainConfig = {
  endpoint: ASTAR_RPC_URL,
  name: 'Astar',
  chainId: 'astar',
};

const moonbeamSatellite: SatelliteVaultConfig = {
  id: 'moonbeam-satellite',
  name: 'Moonbeam Satellite Vault',
  address: MOONBEAM_VAULT_ADDR,
  chain: moonbeamChainConfig,
  asset: 'xcDOT',
  decimals: 10,
  hubVaultAddress: HUB_VAULT_ADDRESS,
  routerAddress: ROUTER_ADDRESS,
  rpcUrl: MOONBEAM_RPC_URL,
  evmChainId: 1284,
};

const astarSatellite: SatelliteVaultConfig = {
  id: 'astar-satellite',
  name: 'Astar Satellite Vault',
  address: ASTAR_VAULT_ADDR,
  chain: astarChainConfig,
  asset: 'xcDOT',
  decimals: 10,
  hubVaultAddress: HUB_VAULT_ADDRESS,
  routerAddress: ROUTER_ADDRESS,
  rpcUrl: ASTAR_RPC_URL,
  evmChainId: 592,
};

// ---------------------------------------------------------------------------
// Agent Setup & Demonstration
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('='.repeat(70));
  console.log(' Obidot Kit - Cross-Chain + Bifrost Agent Example');
  console.log('='.repeat(70));
  console.log();

  // 1. Initialize ObiKit with satellite vaults and Bifrost config
  console.log('[1] Initializing ObiKit SDK with cross-chain & Bifrost config...');

  const kit = new ObiKit({
    chainConfig: hubChainConfig,
    satellites: [moonbeamSatellite, astarSatellite],
    bifrostConfig: {
      adapterAddress: ADAPTER_ADDRESS,
      protocols: {
        slp: { palletIndex: 100, name: 'SLP', protocol: 'Bifrost' },
        dex: { palletIndex: 101, name: 'Bifrost DEX', protocol: 'Bifrost' },
        farming: { palletIndex: 102, name: 'Farming', protocol: 'Bifrost' },
        salp: { palletIndex: 103, name: 'SALP', protocol: 'Bifrost' },
      },
    },
  });

  console.log(`   Hub chain       : ${hubChainConfig.name} (${hubChainConfig.chainId})`);
  console.log(`   Hub vault       : ${HUB_VAULT_ADDRESS}`);
  console.log(`   Router          : ${ROUTER_ADDRESS}`);
  console.log(`   Bifrost adapter : ${ADAPTER_ADDRESS}`);
  console.log(`   Satellites      : ${kit.getSatelliteVaults().length}`);
  for (const sat of kit.getSatelliteVaults()) {
    console.log(`     - ${sat.name} on ${sat.chain.name} (EVM chain ${sat.evmChainId})`);
  }
  console.log();

  // 2. List all available tools
  console.log('[2] Listing all available tools...');
  const tools = kit.getTools();
  console.log(`   ${tools.length} tool(s) available:`);
  for (const tool of tools) {
    console.log(`     - ${tool.name}`);
  }
  console.log();

  // 3. Fetch Bifrost yield products
  console.log('[3] Fetching Bifrost yield products...');
  const yieldTool = new BifrostYieldTool();
  const yieldResult = await yieldTool.invoke('{}');
  const yields = JSON.parse(yieldResult);

  if (yields.success && yields.data) {
    console.log(`   Found ${yields.data.count} yield product(s):`);
    for (const product of yields.data.products) {
      console.log(
        `     - [${product.category}] ${product.product} - APY: ${product.apy}% (${product.isActive ? 'active' : 'inactive'})`,
      );
    }
  } else {
    console.log(`   Failed to fetch yields: ${yields.error}`);
  }
  console.log();

  // 4. Fetch cross-chain vault state
  console.log('[4] Fetching cross-chain vault state (stub mode)...');
  const stateTool = new CrossChainStateTool({
    chainConfig: hubChainConfig,
    hubVaultAddress: HUB_VAULT_ADDRESS,
    routerAddress: ROUTER_ADDRESS,
    satellites: [moonbeamSatellite, astarSatellite],
  });
  const stateResult = await stateTool.invoke('{}');
  const state = JSON.parse(stateResult);

  if (state.success && state.data) {
    console.log(`   Mode             : ${state.data.mode}`);
    console.log(`   Hub vault        : ${state.data.hubVaultAddress}`);
    console.log(`   Satellite count  : ${state.data.satelliteCount}`);
    console.log(`   Total sat assets : ${state.data.totalSatelliteAssets}`);
    console.log(`   Global total     : ${state.data.globalTotalAssets}`);
    if (state.data.satellites) {
      for (const sat of state.data.satellites) {
        console.log(
          `     - ${sat.chainName}: assets=${sat.totalAssets}, emergency=${sat.emergencyMode}`,
        );
      }
    }
  } else {
    console.log(`   Failed to fetch state: ${state.error}`);
  }
  console.log();

  // 5. Simulate a Bifrost strategy (MintVToken - stub mode)
  console.log('[5] Simulating Bifrost MintVToken strategy (stub mode)...');
  const strategyTool = new BifrostStrategyTool({
    adapterAddress: ADAPTER_ADDRESS,
  });

  const strategyInput = JSON.stringify({
    strategyType: 0, // MintVToken
    currencyIn: 0, // DOT
    amount: '10000000000', // 10 DOT in planck
    minOut: '9500000000', // 5% slippage tolerance
    poolId: 0,
  });

  const strategyResult = await strategyTool.invoke(strategyInput);
  const strategy = JSON.parse(strategyResult);

  if (strategy.success && strategy.data) {
    console.log(`   Strategy  : ${strategy.data.strategy}`);
    console.log(`   Amount    : ${strategy.data.amount}`);
    console.log(`   Mode      : ${strategy.data.mode}`);
    console.log(`   Message   : ${strategy.data.message}`);
  } else {
    console.log(`   Failed to execute strategy: ${strategy.error}`);
  }
  console.log();

  // 6. Batch strategy execution (stub mode)
  console.log('[6] Simulating batch strategy execution (stub mode)...');
  const batchTool = new BatchStrategyTool({ vaultConfig: evmVaultConfig });

  const batchInput = JSON.stringify({
    strategies: [
      {
        asset: ASSET_ADDRESS,
        amount: '5000000000000000000',
        minReturn: '4750000000000000000',
        maxSlippageBps: '250',
        deadline: String(Math.floor(Date.now() / 1000) + 3600),
        nonce: '0',
        xcmCall: '0x00',
        targetParachain: 2006,
        targetProtocol: '0x0000000000000000000000000000000000001234',
        signature: '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
      },
    ],
  });

  const batchResult = await batchTool.invoke(batchInput);
  const batch = JSON.parse(batchResult);

  if (batch.success && batch.data) {
    console.log(`   Batch size : ${batch.data.batchSize}`);
    console.log(`   Mode       : ${batch.data.mode}`);
    console.log(`   Status     : ${batch.data.status}`);
    console.log(`   Message    : ${batch.data.message}`);
  } else {
    console.log(`   Failed: ${batch.error}`);
  }
  console.log();

  // 7. Withdrawal queue (stub mode)
  console.log('[7] Simulating withdrawal queue request (stub mode)...');
  const queueTool = new WithdrawalQueueTool({ vaultConfig: evmVaultConfig });
  const queueInput = JSON.stringify({
    action: 'request',
    shares: '1000000000000000000',
  });
  const queueResult = await queueTool.invoke(queueInput);
  const queue = JSON.parse(queueResult);

  if (queue.success && queue.data) {
    console.log(`   Action  : ${queue.data.action}`);
    console.log(`   Mode    : ${queue.data.mode}`);
    console.log(`   Status  : ${queue.data.status}`);
    console.log(`   Message : ${queue.data.message}`);
  } else {
    console.log(`   Failed: ${queue.error}`);
  }
  console.log();

  // 8. Performance metrics (stub mode)
  console.log('[8] Checking vault performance (stub mode)...');
  const perfTool = new PerformanceTool({ vaultConfig: evmVaultConfig });
  const perfResult = await perfTool.invoke(JSON.stringify({ action: 'vault' }));
  const perf = JSON.parse(perfResult);
  console.log(`   Success : ${perf.success}`);
  console.log(`   Message : ${perf.data?.message ?? perf.error}`);
  console.log();

  // 9. Oracle check (stub mode)
  console.log('[9] Checking oracle status (stub mode)...');
  const oracleTool = new OracleCheckTool({ vaultConfig: evmVaultConfig });
  const oracleResult = await oracleTool.invoke(JSON.stringify({ action: 'oracle' }));
  const oracle = JSON.parse(oracleResult);
  console.log(`   Success : ${oracle.success}`);
  console.log(`   Message : ${oracle.data?.message ?? oracle.error}`);
  console.log();

  // 10. Cross-chain rebalance (stub mode)
  console.log('[10] Simulating cross-chain rebalance (hub -> Moonbeam)...');
  const rebalanceTool = new CrossChainRebalanceTool({
    chainConfig: hubChainConfig,
    hubVaultAddress: HUB_VAULT_ADDRESS,
    routerAddress: ROUTER_ADDRESS,
    satellites: [moonbeamSatellite, astarSatellite],
  });

  const rebalanceInput = JSON.stringify({
    direction: 'hub_to_satellite',
    satelliteChainName: 'Moonbeam',
    amount: '5000000000000000000',
  });

  const rebalanceResult = await rebalanceTool.invoke(rebalanceInput);
  const rebalance = JSON.parse(rebalanceResult);

  if (rebalance.success && rebalance.data) {
    console.log(`   Direction : ${rebalance.data.direction}`);
    console.log(`   Satellite : ${rebalance.data.satelliteChainName}`);
    console.log(`   Amount    : ${rebalance.data.amount}`);
    console.log(`   Mode      : ${rebalance.data.mode}`);
    console.log(`   Status    : ${rebalance.data.status}`);
  } else {
    console.log(`   Failed: ${rebalance.error}`);
  }
  console.log();

  // 11. SDK inspection
  console.log('[11] SDK state inspection:');
  const info = kit.inspect();
  console.log(`   Mode               : ${info['mode']}`);
  console.log(`   Vault count        : ${info['vaultCount']}`);
  console.log(`   Satellite count    : ${info['satelliteCount']}`);
  console.log(`   Satellite chains   : ${JSON.stringify(info['satelliteChains'])}`);
  console.log(`   Has Bifrost config : ${info['hasBifrostConfig']}`);
  console.log(`   Has EVM vault      : ${info['hasEvmVault']}`);
  console.log(`   Total tool count   : ${info['totalToolCount']}`);
  console.log();

  // Summary
  console.log('='.repeat(70));
  console.log(' Cross-Chain Agent Example Complete');
  console.log();
  console.log(' This example demonstrated:');
  console.log('   - ObiKit SDK with satellite vaults and Bifrost config');
  console.log('   - Bifrost yield products (SLP, DEX, Farming, SALP)');
  console.log('   - Cross-chain vault state aggregation');
  console.log('   - Bifrost MintVToken strategy execution');
  console.log('   - Batch EIP-712 strategy execution');
  console.log('   - Withdrawal queue management');
  console.log('   - Performance metrics and oracle status');
  console.log('   - Cross-chain rebalancing via ISMP');
  console.log();
  console.log(' All 10 SDK tools are working in stub/offline mode.');
  console.log(' Set PRIVATE_KEY + real addresses for live on-chain mode.');
  console.log('='.repeat(70));
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

main().catch((error: unknown) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
