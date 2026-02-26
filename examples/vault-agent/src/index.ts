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
  type EvmVaultConfig,
  type VaultConfig,
  createEvmContext,
  polkadotHubTestnet,
  POLKADOT_HUB_TESTNET_RPC,
} from '@obidot-kit/core';
import {
  VaultDepositTool,
  VaultWithdrawTool,
  WithdrawalQueueTool,
  PerformanceTool,
  OracleCheckTool,
} from '@obidot-kit/llm';
import { ObiKit } from '@obidot-kit/sdk';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const HUB_RPC_URL = process.env['HUB_RPC_URL'] ?? POLKADOT_HUB_TESTNET_RPC;
const VAULT_ADDRESS = process.env['VAULT_ADDRESS'] ?? '0x0000000000000000000000000000000000000001';
const ASSET_ADDRESS = process.env['ASSET_ADDRESS'] ?? '0x0000000000000000000000000000000000000002';
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
  console.log(`   Chain  : ${chainConfig.name} (chain ID ${chainConfig.chainId})`);
  console.log(`   RPC    : ${HUB_RPC_URL}`);
  console.log(`   Vault  : ${VAULT_ADDRESS}`);
  console.log(`   Asset  : ${ASSET_ADDRESS}`);
  console.log();

  // 2. Determine mode
  const isEvmMode = !!PRIVATE_KEY;
  console.log(`[2] Mode: ${isEvmMode ? 'EVM (on-chain)' : 'Offline (stub)'}`);
  console.log();

  // 3. Create tools
  console.log('[3] Creating vault tools...');

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

  const tools = [depositTool, withdrawTool, queueTool, performanceTool, oracleTool];
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

  // 8. SDK inspection
  console.log('[8] SDK state:');
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
