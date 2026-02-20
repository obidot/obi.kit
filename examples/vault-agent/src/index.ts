/**
 * Vault Agent Example
 *
 * Demonstrates how to connect an AI agent to a DeFi vault on a Polkadot-based
 * chain and perform deposit/withdraw operations using Obidot Kit.
 *
 * Usage:
 *   pnpm tsx src/index.ts
 *
 * Environment variables:
 *   OPENAI_API_KEY  – Your OpenAI API key (required for LLM-driven mode)
 *   RPC_ENDPOINT    – WebSocket RPC endpoint (default: wss://rpc.polkadot.io)
 *   VAULT_ADDRESS   – The vault contract/pallet address to interact with
 */

import type { ChainConfig, VaultConfig } from '@obidot-kit/core';
import { VaultDepositTool, VaultWithdrawTool } from '@obidot-kit/llm';
import { ObiKit } from '@obidot-kit/sdk';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const RPC_ENDPOINT = process.env['RPC_ENDPOINT'] ?? 'wss://rpc.polkadot.io';
const VAULT_ADDRESS = process.env['VAULT_ADDRESS'] ?? '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';

const chainConfig: ChainConfig = {
  endpoint: RPC_ENDPOINT,
  name: 'Polkadot',
  chainId: 'polkadot',
  ss58Prefix: 0,
};

const vaultConfig: VaultConfig = {
  id: 'demo-vault',
  name: 'Demo DOT Vault',
  address: VAULT_ADDRESS,
  chain: chainConfig,
  asset: 'DOT',
  decimals: 10,
};

// ---------------------------------------------------------------------------
// Agent Setup
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log(' Obidot Kit — Vault Agent Example');
  console.log('='.repeat(60));
  console.log();

  // 1. Initialize the SDK
  console.log('1️⃣  Initializing ObiKit SDK...');
  const kit = new ObiKit({ chainConfig });
  console.log(`   Chain  : ${chainConfig.name} (${chainConfig.chainId})`);
  console.log(`   RPC    : ${chainConfig.endpoint}`);
  console.log();

  // 2. Register the vault
  console.log('2️⃣  Registering vault...');
  kit.registerVault(vaultConfig);
  console.log(`   Vault  : ${vaultConfig.name}`);
  console.log(`   Address: ${vaultConfig.address}`);
  console.log(`   Asset  : ${vaultConfig.asset}`);
  console.log();

  // 3. Create tools directly for demonstration (no LLM required)
  console.log('3️⃣  Creating vault tools...');
  const depositTool = new VaultDepositTool({ chainConfig });
  const withdrawTool = new VaultWithdrawTool({ chainConfig });
  const tools = [depositTool, withdrawTool];
  console.log(`   ${tools.length} tool(s) available:`);
  for (const tool of tools) {
    console.log(`     • ${tool.name}: ${tool.description}`);
  }
  console.log();

  // 4. Simulate a deposit
  console.log('4️⃣  Simulating deposit of 10 DOT...');
  const depositInput = JSON.stringify({
    vaultAddress: vaultConfig.address,
    amount: '10000000000', // 10 DOT in planck (10 * 10^9 for demo)
    asset: 'DOT',
  });
  const depositResult = await depositTool.invoke(depositInput);
  console.log('   Result:', typeof depositResult === 'string' ? depositResult : JSON.stringify(depositResult));
  console.log();

  // 5. Simulate a withdrawal
  console.log('5️⃣  Simulating withdrawal of 5 DOT...');
  const withdrawInput = JSON.stringify({
    vaultAddress: vaultConfig.address,
    amount: '5000000000', // 5 DOT in planck
    token: 'DOT',
  });
  const withdrawResult = await withdrawTool.invoke(withdrawInput);
  console.log('   Result:', typeof withdrawResult === 'string' ? withdrawResult : JSON.stringify(withdrawResult));
  console.log();

  // 6. Show SDK inspection
  console.log('6️⃣  SDK state:');
  console.log(`   Chain config: ${JSON.stringify(kit.getChainConfig())}`);
  console.log(`   Registered vaults: ${kit.listVaults().length}`);
  console.log();

  // 7. Summary
  console.log('='.repeat(60));
  console.log(' ✅ Vault Agent Example Complete');
  console.log();
  console.log(' Next steps:');
  console.log('   • Connect a real LLM (e.g. ChatOpenAI) to drive the agent');
  console.log('   • Use kit.createAgent(model) to bind tools to the LLM');
  console.log('   • Implement on-chain signing via a TransactionSigner');
  console.log('   • Deploy against a testnet (Westend, Rococo) before mainnet');
  console.log('='.repeat(60));
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

main().catch((error: unknown) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
