import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// ─── Templates ───────────────────────────────────────────────────────────────

const PACKAGE_JSON_TEMPLATE = (name: string) =>
  JSON.stringify(
    {
      name,
      version: '0.1.0',
      type: 'module',
      scripts: {
        start: 'tsx src/index.ts',
        build: 'tsc',
      },
      dependencies: {
        '@obidot-kit/sdk': '^0.1.0',
        tsx: '^4.0.0',
      },
      devDependencies: {
        '@types/node': '^22.0.0',
        typescript: '^5.8.0',
      },
    },
    null,
    2,
  );

const TSCONFIG_TEMPLATE = JSON.stringify(
  {
    compilerOptions: {
      target: 'ES2022',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      strict: true,
      outDir: 'dist',
      declaration: true,
    },
    include: ['src'],
  },
  null,
  2,
);

const INDEX_TS_TEMPLATE = `import { ObiKit } from '@obidot-kit/sdk';

async function main() {
  const kit = new ObiKit({
    chainConfig: {
      chainId: 420420417,
      endpoint: process.env.RPC_URL ?? 'https://eth-rpc-testnet.polkadot.io/',
      name: 'polkadot-hub-testnet',
    },
    vaults: [
      {
        address: process.env.VAULT_ADDRESS ?? '',
        name: 'ObidotVault',
        chainId: 420420417,
      },
    ],
  });

  console.log('Obidot Kit agent started');
  const info = kit.inspect();
  console.log('Mode:', info.mode);
  console.log('Vaults:', info.vaultCount);
  console.log('Tools:', info.toolCount);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
`;

const ENV_EXAMPLE_TEMPLATE = `# Obidot Kit Agent — Environment Variables

# Polkadot Hub RPC endpoint
RPC_URL=https://eth-rpc-testnet.polkadot.io/

# Private key for signing transactions (hex, without 0x prefix)
PRIVATE_KEY=

# Deployed ObidotVault address on Polkadot Hub
VAULT_ADDRESS=0x03473a95971Ba0496786a615e21b1e87bDFf0025
`;

// ─── Init Command ─────────────────────────────────────────────────────────────

export interface InitOptions {
  /** Override target directory (default: projectName) */
  targetDir?: string;
  /** Suppress all console output (for testing) */
  silent?: boolean;
}

export interface InitResult {
  projectDir: string;
  filesCreated: string[];
}

/**
 * Scaffold a new Obidot Kit agent project.
 *
 * @param projectName - Name of the new project (used as directory name and package name)
 * @param options - Additional options
 * @returns Created directory path and list of created files
 */
export async function runInit(projectName = 'my-obi-agent', options: InitOptions = {}): Promise<InitResult> {
  const { targetDir, silent = false } = options;
  const dir = targetDir ?? join(process.cwd(), projectName);

  const log = silent ? () => {} : console.log;

  log(`Scaffolding new Obidot Kit agent project: ${projectName}`);
  log(`  Directory: ${dir}`);

  // Create directory structure
  await mkdir(dir, { recursive: true });
  await mkdir(join(dir, 'src'), { recursive: true });

  // Write files
  const files: Array<[string, string]> = [
    ['package.json', PACKAGE_JSON_TEMPLATE(projectName)],
    ['tsconfig.json', TSCONFIG_TEMPLATE],
    ['src/index.ts', INDEX_TS_TEMPLATE],
    ['.env.example', ENV_EXAMPLE_TEMPLATE],
  ];

  const filesCreated: string[] = [];
  for (const [relPath, content] of files) {
    const fullPath = join(dir, relPath);
    await writeFile(fullPath, content, 'utf8');
    filesCreated.push(relPath);
    log(`  Created ${relPath}`);
  }

  log('');
  log('Project scaffolded successfully!');
  log('');
  log('Next steps:');
  log(`  cd ${projectName}`);
  log('  cp .env.example .env   # fill in your RPC_URL and PRIVATE_KEY');
  log('  pnpm install');
  log('  pnpm start');

  return { projectDir: dir, filesCreated };
}
