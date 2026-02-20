# Obidot Kit — Agent Guidelines

## Project Overview

**Obidot Kit** (`obi-kit`) is an open-source npm monorepo that extends the Polkadot Agent Kit. It provides custom LangChain tools for AI agents to interact with DeFi vaults and on-chain protocols (XCM, staking, etc.) on Polkadot-based networks.

## Repository Structure

```
obi-kit/
├── packages/
│   ├── core/       # Core types, interfaces, base tool classes, chain abstractions
│   ├── cli/        # CLI tool for scaffolding and running agents (@obidot-kit/cli)
│   ├── llm/        # LangChain tool implementations, agent factory (@obidot-kit/llm)
│   └── sdk/        # High-level SDK combining core + llm (@obidot-kit/sdk)
├── examples/
│   └── vault-agent/  # Example: connect agent to vault, deposit/withdraw
├── turbo.json        # Turborepo pipeline config
├── biome.json        # Root Biome linter/formatter config
├── tsconfig.base.json # Shared TypeScript config
├── pnpm-workspace.yaml
└── package.json      # Root workspace package
```

## Tech Stack

- **Language:** TypeScript (strict mode, ESM only)
- **Package Manager:** pnpm (monorepo workspaces)
- **Task Runner:** Turborepo
- **Linter/Formatter:** Biome
- **Testing:** Vitest (per-package)
- **Build:** tsup (per-package)
- **Versioning:** Changesets

## Package Scope

All publishable packages use the `@obidot-kit/*` npm scope. The root package is `obidot-kit` (private, not published).

### Dependency Graph

```
cli → sdk → llm → core
              └──→ core
```

## Conventions

- All source code lives in `src/` within each package.
- Tests live in `test/` within each package, using Vitest.
- Each package has its own `tsconfig.json` extending `../../tsconfig.base.json`.
- Each package has its own `biome.json` extending `"//"` (root config).
- Packages target ESM only (`"type": "module"` in package.json).
- Exports use the `exports` field in package.json, not `main`.

## Key Commands

```sh
pnpm build          # Build all packages (via turbo)
pnpm test           # Run all tests (via turbo)
pnpm lint           # Lint all packages (via turbo)
pnpm format         # Format all packages (via turbo)
pnpm typecheck      # Type-check all packages (via turbo)
pnpm changeset      # Create a new changeset for versioning
```

## Token Efficiency

- Never re-read files you just wrote or edited. You know the contents.
- Never re-run commands to "verify" unless the outcome was uncertain.
- Don't echo back large blocks of code or file contents unless asked.
- Batch related edits into single operations. Don't make 5 edits when 1 handles it.
- Skip confirmations like "I'll continue..." Just do it.
- If a task needs 1 tool call, don't use 3. Plan before acting.
- Do not summarize what you just did unless the result is ambiguous or you need additional input.