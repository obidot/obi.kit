import { parseArgs } from 'node:util';

const helpText = `
  @obidot-kit/cli — Obidot Kit Agent CLI

  Usage:
    obi-kit <command> [options]

  Commands:
    init          Scaffold a new Obidot Kit agent project
    run           Run an agent with the given configuration
    info          Display environment and package information

  Options:
    --help, -h    Show this help message
    --version     Show version number
    --config, -c  Path to agent config file (default: obi-kit.config.ts)
    --verbose     Enable verbose logging
`;

function printVersion(): void {
  console.log('0.1.0');
}

function printHelp(): void {
  console.log(helpText);
}

async function handleInit(): Promise<void> {
  console.log('🚀 Scaffolding a new Obidot Kit agent project...');
  console.log('   (not yet implemented — coming soon)');
}

async function handleRun(config: string, verbose: boolean): Promise<void> {
  console.log(`▶ Running agent with config: ${config}`);
  if (verbose) {
    console.log('  Verbose mode enabled');
  }
  console.log('   (not yet implemented — coming soon)');
}

async function handleInfo(): Promise<void> {
  console.log('ℹ Obidot Kit Environment');
  console.log(`  Node.js:  ${process.version}`);
  console.log(`  Platform: ${process.platform}`);
  console.log(`  Arch:     ${process.arch}`);
  console.log(`  CLI:      @obidot-kit/cli@0.1.0`);
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', default: false },
      config: { type: 'string', short: 'c', default: 'obi-kit.config.ts' },
      verbose: { type: 'boolean', default: false },
    },
    strict: true,
  });

  if (values.version) {
    printVersion();
    process.exit(0);
  }

  if (values.help || positionals.length === 0) {
    printHelp();
    process.exit(0);
  }

  const command = positionals[0];

  switch (command) {
    case 'init':
      await handleInit();
      break;
    case 'run':
      await handleRun(values.config ?? 'obi-kit.config.ts', values.verbose ?? false);
      break;
    case 'info':
      await handleInfo();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
