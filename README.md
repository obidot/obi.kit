# Obidot Kit

> Agent Kit Package extending [Polkadot Agent Kit](https://github.com/parity-asia/polkadot-agent-kit) — build and publish custom LangChain tools for your DeFi vault on Polkadot.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Overview

**Obidot Kit** (`obi-kit`) is an open-source TypeScript monorepo that provides a modular framework for building AI agent tools on top of Polkadot-based networks. It abstracts the complexity of on-chain interactions (vault deposits, withdrawals, XCM cross-chain transfers, etc.) behind LangChain-compatible tools that any AI agent can invoke.

Other developers can install `@obidot-kit/sdk` (or individual packages) to enable their own AI agents to interact with your protocol — no deep Polkadot knowledge required.

## Packages

| Package                               | Description                                                                                               | npm                                                                                                     |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [`@obidot-kit/core`](./packages/core) | Core types, interfaces, error classes, ABIs, chain abstractions, EVM + Polkadot context, WebSocket client | [![npm](https://img.shields.io/npm/v/@obidot-kit/core)](https://www.npmjs.com/package/@obidot-kit/core) |
| [`@obidot-kit/llm`](./packages/llm)   | 19+ LangChain tools (vault, DEX aggregator, Bifrost, cross-chain, intent, oracle, admin), agent factory   | [![npm](https://img.shields.io/npm/v/@obidot-kit/llm)](https://www.npmjs.com/package/@obidot-kit/llm)   |
| [`@obidot-kit/sdk`](./packages/sdk)   | High-level SDK combining core + llm into a unified API                                                    | [![npm](https://img.shields.io/npm/v/@obidot-kit/sdk)](https://www.npmjs.com/package/@obidot-kit/sdk)   |
| [`@obidot-kit/cli`](./packages/cli)   | CLI tool for scaffolding and running Obidot Kit agents (`init` / `run` / `info`)                          | [![npm](https://img.shields.io/npm/v/@obidot-kit/cli)](https://www.npmjs.com/package/@obidot-kit/cli)   |

### Dependency Graph

```
cli → sdk → llm → core
             └──→ core
```

## Quick Start

### Installation

```sh
# Install the all-in-one SDK
pnpm add @obidot-kit/sdk

# Or install individual packages
pnpm add @obidot-kit/core @obidot-kit/llm
```

### Basic Usage

```ts
import { ObiKit } from "@obidot-kit/sdk";
import {
  VaultDepositTool,
  VaultWithdrawTool,
  BifrostYieldTool,
  CrossChainStateTool,
} from "@obidot-kit/llm";

import { createEvmContext } from "@obidot-kit/core";
import { OBIDOT_VAULT_ADDRESS } from "@obidot-kit/core";

// 1. Create an EVM context pointing at the deployed vault on Polkadot Hub Paseo
const evmContext = createEvmContext({
  rpcUrl: "https://eth-rpc-testnet.polkadot.io/",
  privateKey: process.env.PRIVATE_KEY as `0x${string}`,
});

// 2. Initialize the SDK
const kit = new ObiKit({ evmContext });

// 3. Register the deployed vault
kit.registerVault({
  id: "obidot-paseo",
  name: "Obidot DOT Vault",
  address: OBIDOT_VAULT_ADDRESS, // 0x03473a95971Ba0496786a615e21b1e87bDFf0025
  asset: "DOT",
  decimals: 10,
});

// 4. Get LangChain-compatible tools for your agent
const tools = kit.getTools();
// → [VaultDepositTool, VaultWithdrawTool, VaultStateTool, VaultPolicyTool,
//    VaultAdminTool, BifrostYieldTool, BifrostStrategyTool,
//    CrossChainStateTool, CrossChainRebalanceTool,
//    SwapQuoteTool, SwapExecuteTool, SwapMultiHopTool, ExecuteLocalSwapTool,
//    ExecuteIntentTool, OracleUpdateTool, OracleCheckTool, …]

// 5. Bind tools to any LangChain-compatible LLM
// const agent = kit.createAgent(yourChatModel);
```

### Using with LangChain

```ts
import { ChatOpenAI } from "@langchain/openai";
import { createAgent } from "@obidot-kit/llm";

const model = new ChatOpenAI({ model: "gpt-4" });

const agent = createAgent({
  model,
  chainConfig: {
    endpoint: "wss://rpc.polkadot.io",
    chainId: "polkadot",
  },
  additionalTools: kit.getTools(),
});

// The agent can now process natural language requests like:
// "Deposit 50 DOT into vault 5Grw..."
// "Withdraw 25 DOT from the vault"
```

## Examples

| Example                                             | Description                                                                       |
| --------------------------------------------------- | --------------------------------------------------------------------------------- |
| [`vault-agent`](./examples/vault-agent)             | Connect an AI agent to a DeFi vault and perform deposit/withdraw operations       |
| [`cross-chain-agent`](./examples/cross-chain-agent) | Fetch Bifrost yields, aggregate cross-chain state, and execute Bifrost strategies |

Run an example:

```sh
pnpm --filter @obidot-kit/example-vault-agent start
pnpm --filter @obidot-kit/example-cross-chain-agent start
```

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) >= 10

### Setup

```sh
# Clone the repository
git clone https://github.com/obidot/obi-kit.git
cd obi-kit

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Commands

| Command          | Description                            |
| ---------------- | -------------------------------------- |
| `pnpm build`     | Build all packages (via Turborepo)     |
| `pnpm test`      | Run all tests (via Vitest)             |
| `pnpm lint`      | Lint all packages (via Biome)          |
| `pnpm lint:fix`  | Lint and auto-fix all packages         |
| `pnpm format`    | Format all files (via Biome)           |
| `pnpm typecheck` | Type-check all packages (via tsc)      |
| `pnpm clean`     | Remove all build artifacts             |
| `pnpm changeset` | Create a new changeset for versioning  |
| `pnpm release`   | Build and publish all changed packages |

### Project Structure

```
obi-kit/
├── packages/
│   ├── core/           # Core types, interfaces, error classes, ABIs, EVM context, WebSocket client
│   ├── cli/            # CLI tool (@obidot-kit/cli) — init / run / info commands
│   ├── llm/            # 19+ LangChain tools & agent factory
│   └── sdk/            # High-level SDK facade
├── examples/
│   ├── vault-agent/         # Example: deposit/withdraw via agent
│   └── cross-chain-agent/   # Example: Bifrost yields + cross-chain state
├── .changeset/         # Changeset configuration
├── turbo.json          # Turborepo pipeline config
├── biome.json          # Biome linter/formatter config
├── tsconfig.base.json  # Shared TypeScript config
├── pnpm-workspace.yaml # pnpm workspace definition
└── package.json        # Root workspace package
```

### Tech Stack

- **Language:** TypeScript (strict mode, ESM only)
- **Package Manager:** pnpm with workspaces
- **Task Runner:** [Turborepo](https://turbo.build/)
- **Linter / Formatter:** [Biome](https://biomejs.dev/)
- **Testing:** [Vitest](https://vitest.dev/) (per-package)
- **Build:** [tsup](https://tsup.egoist.dev/) (per-package)
- **Versioning:** [Changesets](https://github.com/changesets/changesets)

### Writing a Custom Tool

You can extend the base tool class to create your own protocol-specific LangChain tool:

```ts
import { ObiBaseTool } from "@obidot-kit/llm";
import { z } from "zod";
import type { ChainConfig, ToolResult } from "@obidot-kit/core";

export class MyProtocolStakeTool extends ObiBaseTool<typeof inputSchema> {
  name = "my_protocol_stake";
  description = "Stake tokens in MyProtocol on a Polkadot parachain.";
  schema = inputSchema;

  protected async execute(
    input: z.infer<typeof inputSchema>,
  ): Promise<ToolResult> {
    // Your on-chain logic here
    return {
      success: true,
      message: `Staked ${input.amount} tokens successfully`,
      data: { txHash: "0x..." },
    };
  }
}

const inputSchema = z.object({
  amount: z.string().describe("Amount to stake"),
  validator: z.string().describe("Validator address"),
});
```

### Publishing

This project uses [Changesets](https://github.com/changesets/changesets) for versioning and publishing:

```sh
# 1. Create a changeset describing your changes
pnpm changeset

# 2. Version packages based on changesets
pnpm version-packages

# 3. Build and publish to npm
pnpm release
```

All packages are published with public access under the `@obidot-kit` npm scope.

## Roadmap

**v0.1.0 — Complete**

- 10 LangChain tools: vault deposit/withdraw/state/strategy, Bifrost yield/strategy, cross-chain state/rebalance, yield aggregation, vault performance
- `@obidot-kit/core` types, ABIs (BifrostAdapter, CrossChainRouter, satellite vault), EVM + Polkadot context
- `cross-chain-agent` example
- 225 tests passing

**v0.2.0 — Complete**

- Real deployed contract addresses on Polkadot Hub Paseo TestNet (chain 420420417)
- ABI sync pipeline (`scripts/sync-abis.ts`) — generates TypeScript ABI files from Foundry artifacts
- Real `EvmBifrostStrategyService` with live `viem.writeContract` calls to `BifrostAdapter`
- Real `EvmCrossChainService` with live ISMP dispatch via `CrossChainRouter`
- Real `BifrostYieldTool` data — fetches vDOT/vKSM/vGLMR/vBNC APYs from Bifrost RPC, graceful fallback
- `ObiWsClient` — WebSocket client for real-time agent event subscriptions
- Full `@obidot-kit/cli`: `obi-kit init` / `obi-kit run` / `obi-kit info`
- New tools: `VaultPolicyTool`, `OracleUpdateTool`, `VaultAdminTool`
- `ObiPolkadotContext.evmContext` — EVM delegation via Polkadot Hub ETH-RPC (`pallet-revive`)
- 19+ LangChain tools, 364 tests passing

**v0.3.0 — Planned**

- `obi.index` integration — real-time vault event indexing via GraphQL subscriptions
- Live front-end wiring (`obidot/app`) — real deposit/swap transactions on Paseo
- Autonomous AI agent (`obidot/agent`) — EIP-712 intent signing + auto-execution, 24/7 operation
- Additional DEX adapters: `RelayTeleportAdapter` (Paseo relay chain), `KaruraAdapter` (Kusama Hub)

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Create a changeset (`pnpm changeset`)
4. Commit your changes (`git commit -am 'feat: add my feature'`)
5. Push to the branch (`git push origin feature/my-feature`)
6. Open a Pull Request

## License

[MIT](LICENSE)
