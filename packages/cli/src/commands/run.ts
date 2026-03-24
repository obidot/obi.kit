import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RunOptions {
  configPath?: string;
  verbose?: boolean;
  /** Suppress all console output (for testing) */
  silent?: boolean;
}

interface AgentConfig {
  chainId?: number;
  endpoint?: string;
  vaultAddress?: string;
  privateKey?: string;
}

// ─── Env Loading ─────────────────────────────────────────────────────────────

/**
 * Load environment variables from a .env file into process.env.
 * Silently skips if the file does not exist.
 */
async function loadDotenv(cwd: string): Promise<void> {
  const envPath = resolve(cwd, '.env');
  let raw: string;
  try {
    raw = await readFile(envPath, 'utf8');
  } catch {
    // .env is optional
    return;
  }

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    // Only set if not already set by the environment
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

// ─── Config Loading ───────────────────────────────────────────────────────────

/**
 * Load agent configuration from a JSON or TypeScript config file.
 * Falls back to an empty config object if the file is not found.
 */
async function loadConfig(configPath: string): Promise<AgentConfig> {
  let raw: string;
  try {
    raw = await readFile(configPath, 'utf8');
  } catch {
    // Config file is optional — rely on env vars
    return {};
  }

  // Support simple JSON configs only (TS configs require a full bundler)
  if (configPath.endsWith('.json')) {
    try {
      return JSON.parse(raw) as AgentConfig;
    } catch {
      throw new Error(`Failed to parse config file: ${configPath}`);
    }
  }

  // For .ts configs, provide a helpful error
  throw new Error(
    `TypeScript config files are not yet supported. ` +
      `Convert ${configPath} to JSON or set options via environment variables.`,
  );
}

// ─── Run Command ──────────────────────────────────────────────────────────────

/**
 * Run an Obidot Kit agent with the given configuration.
 *
 * Loads .env from cwd, reads the config file, instantiates ObiKit,
 * and prints the agent info. Full interactive REPL support is
 * deferred to Phase 9 once the LLM orchestration layer is stable.
 */
export async function runAgent(options: RunOptions = {}): Promise<void> {
  const { configPath = 'obi-kit.config.json', verbose = false, silent = false } = options;

  const log = silent ? () => {} : console.log;
  const debug = verbose && !silent ? console.log : () => {};

  // 1. Load .env
  await loadDotenv(process.cwd());
  debug('[run] Loaded .env');

  // 2. Load config file
  const resolvedConfig = resolve(process.cwd(), configPath);
  debug(`[run] Loading config: ${resolvedConfig}`);

  let agentConfig: AgentConfig;
  try {
    agentConfig = await loadConfig(resolvedConfig);
    debug('[run] Config loaded:', agentConfig);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!silent) console.error(`[run] Config error: ${msg}`);
    throw err;
  }

  // 3. Resolve final config (env vars take precedence over file)
  const endpoint = process.env['RPC_URL'] ?? agentConfig.endpoint ?? 'https://eth-rpc-testnet.polkadot.io/';
  const chainId = process.env['CHAIN_ID'] ? Number(process.env['CHAIN_ID']) : (agentConfig.chainId ?? 420420417);
  const vaultAddress = process.env['VAULT_ADDRESS'] ?? agentConfig.vaultAddress ?? '';

  log('[run] Starting Obidot Kit agent');
  log(`[run]   Endpoint:  ${endpoint}`);
  log(`[run]   Chain ID:  ${chainId}`);
  log(`[run]   Vault:     ${vaultAddress || '(none)'}`);

  // 4. Dynamically import ObiKit (avoids top-level SDK bundle cost for simple CLI use)
  const { ObiKit } = await import('@obidot-kit/sdk');
  const chainConfig = {
    chainId: String(chainId),
    endpoint,
    name: 'polkadot-hub',
  };

  const kit = new ObiKit({
    chainConfig,
    vaults: vaultAddress
      ? [
          {
            id: 'obidot-vault',
            address: vaultAddress as `0x${string}`,
            name: 'ObidotVault',
            chain: chainConfig,
            asset: 'DOT',
          },
        ]
      : [],
  });

  const info = kit.inspect();
  log('[run] ObiKit initialized');
  log(`[run]   Mode:      ${String(info['mode'])}`);
  log(`[run]   Vaults:    ${String(info['vaultCount'])}`);
  log(`[run]   Tools:     ${String(info['totalToolCount'])}`);
  log('');
  log('[run] Agent ready. Interactive REPL coming in v0.2.0.');
  log('[run] Use ObiKit directly in your own script for full agent control.');
}
