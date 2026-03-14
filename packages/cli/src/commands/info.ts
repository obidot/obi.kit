import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CLI_VERSION } from '../index.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InfoOptions {
  /** Suppress all console output (for testing) */
  silent?: boolean;
  /** Override cwd (for testing) */
  cwd?: string;
}

export interface InfoResult {
  cliVersion: string;
  nodeVersion: string;
  platform: string;
  arch: string;
  packageVersions: Record<string, string>;
  rpcUrl: string | undefined;
  vaultAddress: string | undefined;
  chainId: number | undefined;
}

// ─── Package Version Detection ────────────────────────────────────────────────

async function readPackageVersion(packageName: string): Promise<string> {
  try {
    // Walk up from this file's location to find the installed package
    const manifestPath = resolve(
      // Resolve relative to the CLI package root (dist/ or src/)
      new URL('../../..', import.meta.url).pathname,
      'node_modules',
      packageName,
      'package.json',
    );
    const raw = await readFile(manifestPath, 'utf8');
    const { version } = JSON.parse(raw) as { version: string };
    return version;
  } catch {
    return 'not installed';
  }
}

// ─── RPC Connectivity Check ───────────────────────────────────────────────────

async function checkRpcConnectivity(rpcUrl: string): Promise<boolean> {
  try {
    const resp = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_chainId',
        params: [],
      }),
      signal: AbortSignal.timeout(5_000),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

// ─── Info Command ─────────────────────────────────────────────────────────────

/**
 * Display environment and package information for the current Obidot Kit setup.
 */
export async function runInfo(options: InfoOptions = {}): Promise<InfoResult> {
  const { silent = false, cwd = process.cwd() } = options;
  const log = silent ? () => {} : console.log;

  // Collect package versions in parallel
  const [coreVersion, llmVersion, sdkVersion] = await Promise.all([
    readPackageVersion('@obidot-kit/core'),
    readPackageVersion('@obidot-kit/llm'),
    readPackageVersion('@obidot-kit/sdk'),
  ]);

  const packageVersions: Record<string, string> = {
    '@obidot-kit/cli': CLI_VERSION,
    '@obidot-kit/core': coreVersion,
    '@obidot-kit/llm': llmVersion,
    '@obidot-kit/sdk': sdkVersion,
  };

  // Read env vars
  const rpcUrl = process.env['RPC_URL'];
  const vaultAddress = process.env['VAULT_ADDRESS'];
  const chainId = process.env['CHAIN_ID'] ? Number(process.env['CHAIN_ID']) : undefined;

  const result: InfoResult = {
    cliVersion: CLI_VERSION,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    packageVersions,
    rpcUrl,
    vaultAddress,
    chainId,
  };

  log('Obidot Kit — Environment Info');
  log('');
  log('Runtime:');
  log(`  Node.js:   ${result.nodeVersion}`);
  log(`  Platform:  ${result.platform} (${result.arch})`);
  log(`  CWD:       ${resolve(cwd)}`);
  log('');
  log('Packages:');
  for (const [pkg, version] of Object.entries(packageVersions)) {
    log(`  ${pkg.padEnd(24)} ${version}`);
  }
  log('');
  log('Configuration:');
  log(`  RPC_URL:       ${rpcUrl ?? '(not set)'}`);
  log(`  VAULT_ADDRESS: ${vaultAddress ?? '(not set)'}`);
  log(`  CHAIN_ID:      ${chainId ?? '(not set, default: 420420417)'}`);

  // Connectivity check (only when RPC_URL is set)
  if (rpcUrl) {
    log('');
    log('Connectivity:');
    const reachable = await checkRpcConnectivity(rpcUrl);
    log(`  RPC endpoint:  ${reachable ? 'reachable' : 'unreachable'}`);
  }

  log('');

  return result;
}
