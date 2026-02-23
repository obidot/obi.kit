/**
 * Cross-Chain Agent Example
 *
 * Demonstrates how to use Obidot Kit with cross-chain satellite vaults
 * and Bifrost DeFi features including:
 *   1. Creating ObiKit with satellite vaults and Bifrost config
 *   2. Fetching Bifrost yield products
 *   3. Fetching cross-chain state (hub + satellites)
 *   4. Executing a Bifrost strategy (stub mode)
 *
 * Usage:
 *   pnpm tsx src/index.ts
 *
 * Environment variables:
 *   HUB_RPC_URL          – RPC endpoint for the hub chain (default: https://rpc.polkadot.io)
 *   HUB_VAULT_ADDRESS    – Hub vault contract address
 *   ROUTER_ADDRESS       – CrossChainRouter contract address
 *   ADAPTER_ADDRESS      – BifrostAdapter contract address
 *   MOONBEAM_RPC_URL     – RPC endpoint for Moonbeam satellite
 *   MOONBEAM_VAULT_ADDR  – Satellite vault address on Moonbeam
 *   ASTAR_RPC_URL        – RPC endpoint for Astar satellite
 *   ASTAR_VAULT_ADDR     – Satellite vault address on Astar
 */

import type { ChainConfig, SatelliteVaultConfig } from '@obidot-kit/core';
import { BifrostStrategyTool, BifrostYieldTool, CrossChainRebalanceTool, CrossChainStateTool } from '@obidot-kit/llm';
import { ObiKit } from '@obidot-kit/sdk';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const HUB_RPC_URL = process.env['HUB_RPC_URL'] ?? 'https://rpc.polkadot.io';
const HUB_VAULT_ADDRESS = process.env['HUB_VAULT_ADDRESS'] ?? '0x0000000000000000000000000000000000000001';
const ROUTER_ADDRESS = process.env['ROUTER_ADDRESS'] ?? '0x0000000000000000000000000000000000000002';
const ADAPTER_ADDRESS = process.env['ADAPTER_ADDRESS'] ?? '0x0000000000000000000000000000000000000003';

const MOONBEAM_RPC_URL = process.env['MOONBEAM_RPC_URL'] ?? 'https://rpc.api.moonbeam.network';
const MOONBEAM_VAULT_ADDR = process.env['MOONBEAM_VAULT_ADDR'] ?? '0x0000000000000000000000000000000000000010';

const ASTAR_RPC_URL = process.env['ASTAR_RPC_URL'] ?? 'https://evm.astar.network';
const ASTAR_VAULT_ADDR = process.env['ASTAR_VAULT_ADDR'] ?? '0x0000000000000000000000000000000000000020';

const hubChainConfig: ChainConfig = {
  endpoint: HUB_RPC_URL,
  name: 'Polkadot',
  chainId: 'polkadot',
  ss58Prefix: 0,
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
  console.log(' Obidot Kit — Cross-Chain + Bifrost Agent Example');
  console.log('='.repeat(70));
  console.log();

  // ── 1. Initialize ObiKit with satellite vaults and Bifrost config ──────

  console.log('1️⃣  Initializing ObiKit SDK with cross-chain & Bifrost config...');

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
    console.log(`     • ${sat.name} on ${sat.chain.name} (EVM chain ${sat.evmChainId})`);
  }
  console.log();

  // ── 2. List all available tools ────────────────────────────────────────

  console.log('2️⃣  Listing all available tools...');
  const tools = kit.getTools();
  console.log(`   ${tools.length} tool(s) available:`);
  for (const tool of tools) {
    console.log(`     • ${tool.name}: ${tool.description.slice(0, 80)}...`);
  }
  console.log();

  // ── 3. Fetch Bifrost yield products ────────────────────────────────────

  console.log('3️⃣  Fetching Bifrost yield products...');
  const yieldTool = new BifrostYieldTool();
  const yieldResult = await yieldTool.invoke('{}');
  const yields = JSON.parse(yieldResult);

  if (yields.success && yields.data) {
    console.log(`   Found ${yields.data.count} yield product(s):`);
    for (const product of yields.data.products) {
      console.log(
        `     • [${product.category}] ${product.product} — APY: ${product.apy}% (${product.isActive ? 'active' : 'inactive'})`,
      );
    }
  } else {
    console.log(`   ❌ Failed to fetch yields: ${yields.error}`);
  }
  console.log();

  // ── 4. Filter by SLP category ──────────────────────────────────────────

  console.log('4️⃣  Filtering for SLP (liquid staking) products only...');
  const slpResult = await yieldTool.invoke('{"category":"SLP"}');
  const slpYields = JSON.parse(slpResult);

  if (slpYields.success && slpYields.data) {
    console.log(`   Found ${slpYields.data.count} SLP product(s):`);
    for (const product of slpYields.data.products) {
      console.log(`     • ${product.product} — APY: ${product.apy}%`);
    }
  }
  console.log();

  // ── 5. Fetch cross-chain vault state ───────────────────────────────────

  console.log('5️⃣  Fetching cross-chain vault state (stub mode)...');
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
    console.log(`   Router           : ${state.data.routerAddress}`);
    console.log(`   Satellite count  : ${state.data.satelliteCount}`);
    console.log(`   Total sat assets : ${state.data.totalSatelliteAssets}`);
    console.log(`   Global total     : ${state.data.globalTotalAssets}`);
    if (state.data.satellites) {
      for (const sat of state.data.satellites) {
        console.log(
          `     • ${sat.chainName}: assets=${sat.totalAssets}, emergency=${sat.emergencyMode}, paused=${sat.paused}`,
        );
      }
    }
  } else {
    console.log(`   ❌ Failed to fetch state: ${state.error}`);
  }
  console.log();

  // ── 6. Simulate a Bifrost strategy (MintVToken — stub mode) ────────────

  console.log('6️⃣  Simulating Bifrost MintVToken strategy (stub mode)...');
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
    console.log(`   Currency  : ${strategy.data.currencyIn}`);
    console.log(`   Amount    : ${strategy.data.amount}`);
    console.log(`   Min out   : ${strategy.data.minOut}`);
    console.log(`   Adapter   : ${strategy.data.adapterAddress}`);
    console.log(`   Mode      : ${strategy.data.mode}`);
    console.log(`   Status    : ${strategy.data.status}`);
    console.log(`   Message   : ${strategy.data.message}`);
  } else {
    console.log(`   ❌ Failed to execute strategy: ${strategy.error}`);
  }
  console.log();

  // ── 7. Simulate cross-chain rebalance (hub → satellite) ────────────────

  console.log('7️⃣  Simulating cross-chain rebalance (hub → Moonbeam)...');
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
    console.log(`   Action    : ${rebalance.data.action}`);
    console.log(`   Direction : ${rebalance.data.direction}`);
    console.log(`   Satellite : ${rebalance.data.satelliteChainName}`);
    console.log(`   Amount    : ${rebalance.data.amount}`);
    console.log(`   Hub vault : ${rebalance.data.hubVaultAddress}`);
    console.log(`   Router    : ${rebalance.data.routerAddress}`);
    console.log(`   EVM chain : ${rebalance.data.satelliteEvmChainId}`);
    console.log(`   Mode      : ${rebalance.data.mode}`);
    console.log(`   Status    : ${rebalance.data.status}`);
  } else {
    console.log(`   ❌ Failed to rebalance: ${rebalance.error}`);
  }
  console.log();

  // ── 8. SDK inspection ──────────────────────────────────────────────────

  console.log('8️⃣  SDK state inspection:');
  const info = kit.inspect();
  console.log(`   Mode               : ${info['mode']}`);
  console.log(`   Vault count        : ${info['vaultCount']}`);
  console.log(`   Satellite count    : ${info['satelliteCount']}`);
  console.log(`   Satellite chains   : ${JSON.stringify(info['satelliteChains'])}`);
  console.log(`   Has Bifrost config : ${info['hasBifrostConfig']}`);
  console.log(`   EVM context count  : ${info['evmContextCount']}`);
  console.log(`   Total tool count   : ${info['totalToolCount']}`);
  console.log();

  // ── Summary ────────────────────────────────────────────────────────────

  console.log('='.repeat(70));
  console.log(' ✅ Cross-Chain Agent Example Complete');
  console.log();
  console.log(' This example demonstrated:');
  console.log('   • ObiKit SDK with satellite vaults and Bifrost config');
  console.log('   • Fetching Bifrost yield products (SLP, DEX, Farming, SALP)');
  console.log('   • Aggregating cross-chain vault state from hub + satellites');
  console.log('   • Executing a Bifrost MintVToken strategy (stub mode)');
  console.log('   • Cross-chain rebalancing via ISMP (stub mode)');
  console.log();
  console.log(' Next steps:');
  console.log('   • Connect real EVM contexts via viem for live on-chain reads');
  console.log('   • Inject a BifrostStrategyService for real strategy execution');
  console.log('   • Connect a PolkadotContext for full PAK + vault tool suite');
  console.log('   • Bind an LLM (e.g. ChatOpenAI) to drive the agent autonomously');
  console.log('='.repeat(70));
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

main().catch((error: unknown) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
