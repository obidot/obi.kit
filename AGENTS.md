# Obidot Kit (obi-kit) — Agent Guidelines

TypeScript SDK monorepo for building Obidot-aware agents and operator tooling.
This repo packages the shared contract surface from Polkadot Hub TestNet as
reusable libraries and CLI scaffolds.

## Repository Structure

```text
obi-kit/
├── packages/
│   ├── core/         # Addresses, ABIs, protocol types, EVM helpers
│   ├── llm/          # LangChain-style tools and agent helpers
│   ├── sdk/          # ObiKit facade that composes tool groups
│   └── cli/          # `obi-kit init`, `info`, and local developer flows
├── examples/
│   ├── dca-bot/
│   ├── arbitrage-bot/
│   └── yield-optimizer/
├── biome.json
├── turbo.json
└── pnpm-workspace.yaml
```

Dependency graph: `cli → sdk → llm → core`

## Commands

```sh
# Root
pnpm build
pnpm test
pnpm typecheck
pnpm lint
pnpm format

# Package-focused
pnpm --filter @obidot-kit/core run build
pnpm --filter @obidot-kit/llm run build
pnpm --filter @obidot-kit/llm run test
pnpm --filter @obidot-kit/sdk run typecheck
pnpm --filter @obidot-kit/cli run test
```

The `llm` package should be built before checking `sdk` if you are working on
workspace-local exports, because `sdk` resolves `llm` declarations from `dist/`.

## Current Surface

- `@obidot-kit/core`: typed addresses, ABIs, chain config, and low-level helpers
- `@obidot-kit/llm`: 20+ tools across swap, liquidity, vault, oracle, Bifrost,
  cross-chain, and strategy workflows
- `@obidot-kit/sdk`: `ObiKit` facade for composing vaults, chains, and tools
- `@obidot-kit/cli`: scaffolds `starter`, `vault-agent`, `cross-chain-agent`,
  `dca-bot`, and `yield-optimizer`

Checked-in examples currently include:

- `dca-bot`
- `arbitrage-bot`
- `yield-optimizer`

## Tool Families

### Swap and Liquidity

- `SwapQuoteTool`
- `SwapExecuteTool`
- `SwapMultiHopTool`
- `ExecuteLocalSwapTool`
- `LiquidityAddTool`
- `LiquidityRemoveTool`
- `LpPoolStateTool`

### Vault and Policy

- `VaultStateTool`
- `VaultDepositTool`
- `VaultWithdrawTool`
- `VaultAdminTool`
- `VaultPolicyTool`
- `WithdrawalQueueTool`

### Cross-Chain and Yield

- `CrossChainStateTool`
- `CrossChainRouteTool`
- `CrossChainRebalanceTool`
- `BifrostYieldTool`
- `BifrostStrategyTool`
- `ArbitrageDetectTool`

### Risk and Operations

- `PerformanceTool`
- `OracleCheckTool`
- `OracleUpdateTool`
- `BatchStrategyTool`
- `ExecuteIntentTool`

## Current Constraints

- Some route families remain preview-only on testnet. `CrossChainRouteTool`
  uses the same route-status vocabulary as the app: `live`, `simulated`,
  `mainnet_only`, and `coming_soon`.
- Metadata hardening, tarball verification, and release workflow are in place,
  but public npm publish is still pending final audit/coverage cleanup.
- Keep docs honest about which examples are execution-ready versus
  recommendation-only. `yield-optimizer` is intentionally preview-first.
- Manual publish should happen in dependency order: `core → llm → sdk → cli`.
- Treat `.pack-output/`, `packages/*/*.tgz`, and CLI smoke-project folders as
  generated verification artifacts, not source files.

## Code Style

- ESM only: local imports use `.js` extensions
- `import type` for type-only imports
- `unknown` over `any`
- `string` for user-facing token amounts, `bigint` for on-chain math
- Tools return structured JSON results instead of throwing through LangChain

## Verification Expectations

Before closing work in this repo, run the narrowest relevant checks plus the
package-local build when exports changed:

```sh
pnpm --filter @obidot-kit/<package> run build
pnpm --filter @obidot-kit/<package> run typecheck
pnpm --filter @obidot-kit/<package> run test
pnpm --filter @obidot-kit/<package> run lint
```
