# Obidot Kit (obi-kit) — Agent Guidelines

Open-source SDK monorepo for building AI agents on Polkadot. Provides LangChain
tools for DeFi vault interaction, Bifrost strategies, and cross-chain operations.

## Repository Structure

```
obi-kit/
├── packages/
│   ├── core/         # Types, chain abstractions, EVM context, ABIs
│   ├── llm/          # LangChain tool implementations (10 tools)
│   ├── sdk/          # High-level ObiKit class combining core + llm
│   └── cli/          # CLI for scaffolding and running agents
├── examples/
│   ├── vault-agent/          # ERC-4626 vault interaction example
│   └── cross-chain-agent/    # Cross-chain strategy example
├── turbo.json
├── biome.json                # Root Biome config (all packages extend this)
├── tsconfig.base.json        # Shared TypeScript config
└── pnpm-workspace.yaml
```

**Dependency graph:** `cli → sdk → llm → core`

## Build, Test & Lint Commands

```sh
# Root-level (via turbo)
pnpm build                    # Build all packages (tsup)
pnpm test                     # Run all tests (vitest, 225 tests)
pnpm typecheck                # Type-check all packages
pnpm lint                     # Biome check (lint + format check)
pnpm lint:fix                 # Biome auto-fix
pnpm format                   # Biome format --write

# Single package
pnpm --filter @obidot-kit/core run test           # Run core tests only
pnpm --filter @obidot-kit/llm run test            # Run llm tests only
pnpm --filter @obidot-kit/sdk run typecheck       # Typecheck sdk only
pnpm --filter @obidot-kit/llm run build           # Build llm only

# Single test file (via vitest)
pnpm --filter @obidot-kit/llm exec vitest run test/vault-deposit.test.ts

# Watch mode
pnpm --filter @obidot-kit/core run test:watch
```

**Critical:** The llm package must be built (`pnpm --filter @obidot-kit/llm run build`)
before the sdk typecheck will pass, because sdk resolves types from llm's `dist/` output.

## Tech Stack

- **Language:** TypeScript (strict mode, ESM only, `verbatimModuleSyntax: true`)
- **Package Manager:** pnpm 10.27.0 (workspaces)
- **Build:** tsup per package
- **Test:** Vitest 3.2.3
- **Lint/Format:** Biome 2.4.3
- **Target:** ES2022, bundler module resolution
- **Node:** >= 20

## Code Style

### Formatting (Biome)

- Single quotes, semicolons always, trailing commas all
- 2-space indent, 120 char line width
- Arrow parens always: `(x) => x`

### Imports

```typescript
// 1. External packages
import { Tool } from '@langchain/core/tools';

// 2. Type-only imports (separate statement)
import type { ChainConfig, ObiEvmContext, ToolResult } from '@obidot-kit/core';

// 3. Local imports with .js extension
import { ObiError } from '../errors.js';
```

### Naming

- `camelCase` — variables, functions, object properties
- `PascalCase` — classes, types, interfaces, enums
- `UPPER_SNAKE_CASE` — constants
- Amounts as `string` (preserve precision); `bigint` for on-chain values
- Interface properties: `readonly` where immutable

### Types

- `interface` preferred over `type` for object shapes
- `enum` for numeric on-chain constants (e.g. `BifrostStrategyType`, `BifrostCurrencyId`)
- No `any` — use `unknown` and narrow; `as unknown as Type` only for test mocks
- `import type` for type-only imports (enforced by `verbatimModuleSyntax`)
- Barrel exports via `index.ts`: `export * from './module.js'` or named re-exports

### LangChain Tools Pattern

All tools extend LangChain's `Tool` class (not `StructuredTool`):

```typescript
export class MyTool extends Tool {
  name = 'my_tool';
  description = '...';

  // Input comes as a JSON string — parse manually
  async _call(input: string): Promise<string> {
    const parsed = this.parseInput(input);
    const result = await this.execute(parsed);
    return JSON.stringify(result);
  }
}
```

- `_call(input: string)` with manual JSON parsing
- Return `ToolResult` JSON: `{ success: true, data: ... }` or `{ success: false, error: "..." }`
- Three modes: EVM (real viem calls), Polkadot (substrate stub), Offline (no context)
- All `writeContract` calls require: `chain: ctx.chain, account: ctx.account as \`0x${string}\``

### Error Handling

- Catch in `_call()`, return error as `ToolResult` JSON — never throw to LangChain
- Custom errors extend `ObiError` from `@obidot-kit/core`

### Section Headers

Use comment bars mirroring Solidity style:
```typescript
// ── Section Name ──────────────────────────────────────────────────────
```

## Testing Conventions

- **Framework:** Vitest (`describe`, `it`, `expect`, `vi`)
- **File naming:** `*.test.ts` in `test/` directory per package
- **Test naming:** `it('should do something specific')` — descriptive sentences
- **Structure:** Nested `describe` blocks by feature: construction, metadata, stub mode, input validation, error handling
- **Mocking:** Manual mock objects at top of file, `vi.fn()` for functions, `as unknown as Type` for partial mocks
- **Assertions:** `expect(result.success).toBe(true)`, deep property checks, `toContain` for strings

```typescript
import { describe, expect, it } from 'vitest';
import { MyTool } from '../src/tools/my-tool.js';

describe('MyTool', () => {
  describe('construction', () => {
    it('should create with default options', () => { ... });
  });
  describe('stub mode', () => {
    it('should return pending result without context', async () => { ... });
  });
});
```

## Key Gotchas

- ESM strict: always use `.js` extensions on local imports (even for `.ts` files)
- `verbatimModuleSyntax`: type imports MUST use `import type` syntax
- `noUncheckedIndexedAccess`: array/object index access returns `T | undefined`
- viem is a peer dependency in core — don't import viem types at top level in core
- Build order matters: `core` → `llm` → `sdk` → `cli` (turbo handles this)

## Token Efficiency

- Never re-read files you just wrote. You know the contents.
- Never re-run commands to verify unless outcome was uncertain.
- Batch related edits. Don't make 5 edits when 1 handles it.
- Skip confirmations like "I'll continue..." — just do it.
- If a task needs 1 tool call, don't use 3.
