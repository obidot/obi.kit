#!/usr/bin/env tsx
/**
 * sync-abis.ts
 *
 * Reads Foundry JSON artifacts from obi.router/out/ and generates TypeScript
 * ABI files in packages/core/src/abis/.
 *
 * Usage:
 *   pnpm sync:abis [--router-path <path>] [--check]
 *
 * Options:
 *   --router-path <path>   Path to obi.router repo (default: ../obi.router)
 *   --check                Dry-run: fail if generated content differs from committed
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ESM/CJS-compatible __dirname
const _scriptDir = typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url));

// ─────────────────────────────────────────────────────────────────────────────
// Contract manifest
// ─────────────────────────────────────────────────────────────────────────────

interface ContractSpec {
  /** Foundry artifact path: out/<artifact>.sol/<artifact>.json */
  artifact: string;
  /** Output file name (no extension): packages/core/src/abis/<output>.ts */
  output: string;
  /** Exported constant name */
  exportName: string;
  /** Human-readable description for the file header */
  description: string;
}

const CONTRACTS: ContractSpec[] = [
  {
    artifact: 'ObidotVault',
    output: 'obidot-vault',
    exportName: 'OBIDOT_VAULT_ABI',
    description: 'ObidotVault ERC-4626 hub vault with IIntentSolver and SwapRouter integration.',
  },
  {
    artifact: 'OracleRegistry',
    output: 'oracle-registry',
    exportName: 'ORACLE_REGISTRY_ABI',
    description: 'OracleRegistry — multi-asset price oracle registry with staleness checks.',
  },
  {
    artifact: 'BifrostAdapter',
    output: 'bifrost-adapter',
    exportName: 'BIFROST_ADAPTER_ABI',
    description: 'BifrostAdapter — Bifrost SLP/SALP/DEX/Farming adapter (parachain 2030).',
  },
  {
    artifact: 'CrossChainRouter',
    output: 'cross-chain-router',
    exportName: 'CROSS_CHAIN_ROUTER_ABI',
    description: 'CrossChainRouter — hub ISMP message router (dispatches + receives).',
  },
  {
    artifact: 'ObidotVaultEVM',
    output: 'satellite-vault',
    exportName: 'SATELLITE_VAULT_ABI',
    description: 'ObidotVaultEVM — satellite ERC-4626 vault on EVM chains (Ethereum/Arbitrum/Base).',
  },
  {
    artifact: 'SwapRouter',
    output: 'swap-router',
    exportName: 'SWAP_ROUTER_ABI',
    description:
      'SwapRouter — DEX aggregator routing engine: single/multi-hop/split swaps, multicall, adapter registry.',
  },
  {
    artifact: 'SwapQuoter',
    output: 'swap-quoter',
    exportName: 'SWAP_QUOTER_ABI',
    description: 'SwapQuoter — read-only quoter: getBestQuote, getAllQuotes, quoteMultiHop, buildBestSwap.',
  },
  {
    artifact: 'HydrationOmnipoolAdapter',
    output: 'hydration-omnipool-adapter',
    exportName: 'HYDRATION_OMNIPOOL_ADAPTER_ABI',
    description: 'HydrationOmnipoolAdapter — Hydration Omnipool XCM adapter (parachain 2034).',
  },
  {
    artifact: 'IPoolAdapter',
    output: 'pool-adapter',
    exportName: 'POOL_ADAPTER_ABI',
    description: 'IPoolAdapter — universal pool adapter interface (swap, getAmountOut, supportsPair).',
  },
];

// vault-cross-chain: subset of ObidotVault ABI — cross-chain broadcast functions only
const VAULT_CROSS_CHAIN_FUNCTIONS = new Set([
  'broadcastAssetSync',
  'syncSatelliteState',
  'registerSatelliteVault',
  'getSatelliteVaults',
  'getSatelliteVaultState',
]);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function loadArtifact(routerPath: string, artifactName: string): unknown[] {
  const artifactPath = join(routerPath, 'out', `${artifactName}.sol`, `${artifactName}.json`);
  if (!existsSync(artifactPath)) {
    throw new Error(`Artifact not found: ${artifactPath}`);
  }
  const raw = readFileSync(artifactPath, 'utf-8');
  const json = JSON.parse(raw) as { abi: unknown[] };
  if (!Array.isArray(json.abi)) {
    throw new Error(`No .abi array in ${artifactPath}`);
  }
  return json.abi;
}

/**
 * Serialize a value to Biome-clean TypeScript literal style:
 *   - single-quoted strings
 *   - trailing commas on all object/array entries
 *   - 2-space indentation
 */
function toTsLiteral(value: unknown, indent = 0): string {
  const pad = ' '.repeat(indent);
  const innerPad = ' '.repeat(indent + 2);

  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    // Escape single quotes, wrap in single quotes
    return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map((v) => `${innerPad}${toTsLiteral(v, indent + 2)},`).join('\n');
    return `[\n${items}\n${pad}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    const items = entries.map(([k, v]) => `${innerPad}${k}: ${toTsLiteral(v, indent + 2)},`).join('\n');
    return `{\n${items}\n${pad}}`;
  }
  return JSON.stringify(value);
}

function generateFileContent(spec: ContractSpec, abi: unknown[], routerPath: string): string {
  const timestamp = new Date().toISOString();
  const items = (abi as unknown[]).map((entry) => `  ${toTsLiteral(entry, 2)},`).join('\n');

  return `// AUTO-GENERATED — do not edit manually.
// Source: obi.router/out/${spec.artifact}.sol/${spec.artifact}.json
// Router path: ${routerPath}
// Synced: ${timestamp}
//
// ${spec.description}

export const ${spec.exportName} = [
${items}
] as const;
`;
}

function generateVaultCrossChainContent(vaultAbi: unknown[], routerPath: string): string {
  const timestamp = new Date().toISOString();
  const filtered = (vaultAbi as Array<{ type: string; name?: string }>).filter(
    (entry) =>
      entry.type === 'error' ||
      entry.type === 'event' ||
      (entry.type === 'function' && entry.name !== undefined && VAULT_CROSS_CHAIN_FUNCTIONS.has(entry.name)),
  );

  const items = filtered.map((entry) => `  ${toTsLiteral(entry, 2)},`).join('\n');

  return `// AUTO-GENERATED — do not edit manually.
// Source: obi.router/out/ObidotVault.sol/ObidotVault.json (cross-chain subset)
// Router path: ${routerPath}
// Synced: ${timestamp}
//
// VAULT_CROSS_CHAIN_ABI — subset of ObidotVault ABI containing only the
// cross-chain broadcast/sync functions used by CrossChainRouter and satellites.

export const VAULT_CROSS_CHAIN_ABI = [
${items}
] as const;
`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

function main(): void {
  const args = process.argv.slice(2);
  const checkMode = args.includes('--check');
  const routerPathIdx = args.indexOf('--router-path');
  const routerPath = resolve(
    routerPathIdx !== -1 && args[routerPathIdx + 1] ? args[routerPathIdx + 1] : join(_scriptDir, '../../obi.router'),
  );

  const abisDir = resolve(_scriptDir, '../packages/core/src/abis');

  console.log(`sync-abis: router path = ${routerPath}`);
  console.log(`sync-abis: output dir  = ${abisDir}`);
  console.log(`sync-abis: mode        = ${checkMode ? 'check' : 'write'}`);
  console.log();

  let driftCount = 0;

  // Process each contract
  for (const spec of CONTRACTS) {
    let abi: unknown[];
    try {
      abi = loadArtifact(routerPath, spec.artifact);
    } catch (err) {
      console.error(`  [SKIP] ${spec.artifact}: ${(err as Error).message}`);
      continue;
    }

    const content = generateFileContent(spec, abi, routerPath);
    const outputPath = join(abisDir, `${spec.output}.ts`);

    if (checkMode) {
      if (!existsSync(outputPath)) {
        console.error(`  [MISSING] ${spec.output}.ts`);
        driftCount++;
      } else {
        const existing = readFileSync(outputPath, 'utf-8');
        // Compare only the ABI content (skip timestamp line)
        const stripTimestamp = (s: string) => s.replace(/^\/\/ Synced: .+$/m, '// Synced: <ts>');
        if (stripTimestamp(existing) !== stripTimestamp(content)) {
          console.error(`  [DRIFT]   ${spec.output}.ts — differs from current Foundry artifact`);
          driftCount++;
        } else {
          console.log(`  [OK]      ${spec.output}.ts`);
        }
      }
    } else {
      writeFileSync(outputPath, content, 'utf-8');
      console.log(`  [WROTE]   ${spec.output}.ts (${abi.length} ABI entries)`);
    }
  }

  // vault-cross-chain: special subset of ObidotVault
  let vaultAbi: unknown[];
  try {
    vaultAbi = loadArtifact(routerPath, 'ObidotVault');
    const vaultCrossChainContent = generateVaultCrossChainContent(vaultAbi, routerPath);
    const outputPath = join(abisDir, 'vault-cross-chain.ts');

    if (checkMode) {
      if (!existsSync(outputPath)) {
        console.error('  [MISSING] vault-cross-chain.ts');
        driftCount++;
      } else {
        const existing = readFileSync(outputPath, 'utf-8');
        const stripTimestamp = (s: string) => s.replace(/^\/\/ Synced: .+$/m, '// Synced: <ts>');
        if (stripTimestamp(existing) !== stripTimestamp(vaultCrossChainContent)) {
          console.error('  [DRIFT]   vault-cross-chain.ts — differs from current Foundry artifact');
          driftCount++;
        } else {
          console.log('  [OK]      vault-cross-chain.ts');
        }
      }
    } else {
      writeFileSync(outputPath, vaultCrossChainContent, 'utf-8');
      console.log(`  [WROTE]   vault-cross-chain.ts (cross-chain subset)`);
    }
  } catch (err) {
    console.error(`  [SKIP] vault-cross-chain: ${(err as Error).message}`);
  }

  // Update abis/index.ts to reflect actual exports
  if (!checkMode) {
    updateAbisIndex(abisDir);
  }

  console.log();
  if (checkMode) {
    if (driftCount > 0) {
      console.error(`sync-abis: ${driftCount} file(s) have drifted. Run "pnpm sync:abis" to fix.`);
      process.exit(1);
    } else {
      console.log('sync-abis: all ABI files are up to date.');
    }
  } else {
    console.log('sync-abis: done.');
  }
}

function updateAbisIndex(abisDir: string): void {
  // Read existing index to preserve any manual exports (e.g. pool-adapter)
  const indexPath = join(abisDir, 'index.ts');
  const allSpecs = [...CONTRACTS, { output: 'vault-cross-chain', exportName: 'VAULT_CROSS_CHAIN_ABI' }];

  const lines = allSpecs.map((s) => `export { ${s.exportName} } from './${s.output}.js';`).sort();

  const content = `// AUTO-GENERATED — do not edit manually.
// Run "pnpm sync:abis" to regenerate.

${lines.join('\n')}
`;
  writeFileSync(indexPath, content, 'utf-8');
  console.log('  [WROTE]   abis/index.ts');
}

main();
