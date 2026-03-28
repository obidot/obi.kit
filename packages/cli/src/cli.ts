import { parseArgs } from 'node:util';
import { runInfo } from './commands/info.js';
import { runInit } from './commands/init.js';
import { runAgent } from './commands/run.js';
import { CLI_VERSION } from './index.js';

// ─── Help / Version ───────────────────────────────────────────────────────────

const helpText = `
  @obidot-kit/cli — Obidot Kit Agent CLI

  Usage:
    obi-kit <command> [options]

  Commands:
    init [name]   Scaffold a new Obidot Kit agent project
    run           Run an agent with the given configuration
    info          Display environment and package information

  Options:
    --help, -h    Show this help message
    --version     Show version number
    --config, -c  Path to agent config file (default: obi-kit.config.json)
    --template    Init template (starter, vault-agent, cross-chain-agent, dca-bot)
    --verbose     Enable verbose logging
`;

function printVersion(): void {
  console.log(CLI_VERSION);
}

function printHelp(): void {
  console.log(helpText);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', default: false },
      config: { type: 'string', short: 'c', default: 'obi-kit.config.json' },
      template: { type: 'string' },
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
      await runInit(positionals[1], {
        template: values.template,
      });
      break;
    case 'run':
      await runAgent({
        configPath: values.config,
        verbose: values.verbose,
      });
      break;
    case 'info':
      await runInfo();
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
