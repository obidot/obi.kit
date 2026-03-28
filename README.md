<p align="center">
  <img src="logo.png" alt="Obidot" width="200" />
</p>

<h1 align="center">obi-kit — AI Agent SDK</h1>

<p align="center">
  TypeScript monorepo — LangChain tools and SDK for building AI agents on top of the Obidot protocol.
</p>

---

## Packages

| Package                               | Description                                              | Version                                                                                                 |
| ------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [`@obidot-kit/core`](./packages/core) | ABIs, types, EVM context, WebSocket client               | [![npm](https://img.shields.io/npm/v/@obidot-kit/core)](https://www.npmjs.com/package/@obidot-kit/core) |
| [`@obidot-kit/llm`](./packages/llm)   | 20+ LangChain tools — vault, swap, liquidity, cross-chain, oracle | [![npm](https://img.shields.io/npm/v/@obidot-kit/llm)](https://www.npmjs.com/package/@obidot-kit/llm)   |
| [`@obidot-kit/sdk`](./packages/sdk)   | High-level SDK combining core + llm                      | [![npm](https://img.shields.io/npm/v/@obidot-kit/sdk)](https://www.npmjs.com/package/@obidot-kit/sdk)   |
| [`@obidot-kit/cli`](./packages/cli)   | CLI — `obi-kit init / run / info`                        | [![npm](https://img.shields.io/npm/v/@obidot-kit/cli)](https://www.npmjs.com/package/@obidot-kit/cli)   |

```
cli → sdk → llm → core
```

## Quick Start

```sh
pnpm add @obidot-kit/sdk @langchain/core viem
```

```ts
import { ObiKit } from "@obidot-kit/sdk";
import { createEvmContext, OBIDOT_VAULT_ADDRESS } from "@obidot-kit/core";

const evmContext = createEvmContext({
  rpcUrl: "https://eth-rpc-testnet.polkadot.io/",
  privateKey: process.env.PRIVATE_KEY as `0x${string}`,
});

const kit = new ObiKit({ evmContext });

kit.registerVault({
  id: "obidot-polkadot-hub-testnet",
  address: OBIDOT_VAULT_ADDRESS,
  asset: "DOT",
  decimals: 10,
});

// Get LangChain-compatible tools
const tools = kit.getTools();
// VaultDepositTool, VaultWithdrawTool, SwapQuoteTool,
// ExecuteIntentTool, BifrostYieldTool, OracleUpdateTool, …
```

To use the packaged CLI:

```sh
pnpm add -g @obidot-kit/cli
obi-kit info
```

For one-off runs without a global install:

```sh
pnpm dlx @obidot-kit/cli info
```

To scaffold a recurring swap bot:

```sh
pnpm dlx @obidot-kit/cli init my-dca-bot --template dca-bot
```

To scaffold the preview-first yield optimizer example:

```sh
pnpm dlx @obidot-kit/cli init my-yield-optimizer --template yield-optimizer
```

### Package Entry Points

- `@obidot-kit/core` — ABIs, addresses, shared EVM context, typed helpers
- `@obidot-kit/llm` — LangChain-compatible tools and agent helpers
- `@obidot-kit/sdk` — higher-level composition layer around core + llm
- `@obidot-kit/cli` — `obi-kit init`, `obi-kit run`, and `obi-kit info`
  - Templates currently include `starter`, `vault-agent`, `cross-chain-agent`, `dca-bot`, and `yield-optimizer`

### Tool Highlights

- Local execution: `SwapQuoteTool`, `SwapExecuteTool`, `SwapMultiHopTool`, `ExecuteLocalSwapTool`
- Cross-chain planning: `CrossChainStateTool`, `CrossChainRouteTool`, `CrossChainRebalanceTool`
- Liquidity management: `LiquidityAddTool`, `LiquidityRemoveTool`, `LpPoolStateTool`
- Risk and operations: `PerformanceTool`, `OracleCheckTool`, `OracleUpdateTool`, `BatchStrategyTool`

### With LangChain

```ts
import { ChatOpenAI } from "@langchain/openai";
import { createAgent } from "@obidot-kit/llm";

const agent = createAgent({
  model: new ChatOpenAI({ model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini" }),
  additionalTools: kit.getTools(),
});

// "Deposit 50 DOT into the vault"
// "Get a swap quote for 10 DOT → USDC"
// "Execute a cross-chain intent to Hydration"
```

## Development

```sh
git clone https://github.com/obidot/obi-kit.git
cd obi-kit
pnpm install
pnpm build
```

| Command          | Description                  |
| ---------------- | ---------------------------- |
| `pnpm build`     | Build all packages           |
| `pnpm test`      | Run all tests (Vitest)       |
| `pnpm lint`      | Lint (Biome)                 |
| `pnpm typecheck` | Type-check all packages      |
| `pnpm pack:verify` | Verify npm tarball contents |
| `pnpm changeset` | Create a changeset           |
| `pnpm release`   | Publish all changed packages |

## Publishing

The release workflow lives in [`.github/workflows/release.yml`](./.github/workflows/release.yml).

- Tagging `v*.*.*` runs install, lint, typecheck, build, test, package verification, and publish.
- Manual `workflow_dispatch` supports a dry run before pushing a real release tag.
- Each package publishes with public access under the `@obidot-kit/*` scope.

Before tagging a release, verify the tarballs locally:

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm pack:verify --output-dir .pack-output
```

That produces the same `.tgz` publish artifacts the CI workflow validates before npm publish and fails if any package accidentally includes source or test files or omits package-level `README.md` / `LICENSE`.

### Manual npm publish order

If you are publishing manually instead of using the release workflow, publish in
dependency order after a clean build:

```sh
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm pack:verify --output-dir .pack-output

cd packages/core && npm publish --access public
cd ../llm && npm publish --access public
cd ../sdk && npm publish --access public
cd ../cli && npm publish --access public
```

The examples are not published packages. They stay in-repo as runnable references.

## Writing a Custom Tool

```ts
import { ObiBaseTool } from "@obidot-kit/llm";
import { z } from "zod";

const schema = z.object({
  amount: z.string().describe("Amount to stake"),
});

export class MyStakeTool extends ObiBaseTool<typeof schema> {
  name = "my_stake";
  description = "Stake tokens in my protocol.";
  schema = schema;

  protected async execute(input: z.infer<typeof schema>) {
    // on-chain logic
    return { success: true, message: `Staked ${input.amount}` };
  }
}
```

## License

[MIT](LICENSE)
