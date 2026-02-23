# Lessons Learned

## Cross-Chain + Bifrost Integration (2025-01)

### 1. ESM `require()` fails with `exports` field
- **Mistake**: A test used `require('@obidot-kit/llm')` to dynamically import `VaultDepositTool` in an ESM-only package that declares `"exports"` in `package.json`.
- **Error**: `No "exports" main defined in .../package.json`
- **Fix**: Use top-level ESM `import` instead of CommonJS `require()`.
- **Rule**: Never use `require()` in test files within this monorepo. All packages are ESM-only.

### 2. `override` modifier required for `Error.cause`
- **Mistake**: New error subclasses declared `public readonly cause?: Error` without `override`, but `Error.cause` already exists in ES2022+ targets.
- **Error**: `TS4114: This member must have an 'override' modifier because it overrides a member in the base class`
- **Fix**: Add `public override readonly cause?: Error` to any class extending `Error` (or `ObiKitError`) that re-declares `cause`.
- **Rule**: When extending built-in classes, always check if the property already exists on the parent before declaring it.

### 3. Index signature access with `noPropertyAccessFromIndexSignature`
- **Mistake**: Accessed properties on `Record<string, unknown>` return type using dot notation (e.g., `info.mode`).
- **Error**: `TS4111: Property 'mode' comes from an index signature, so it must be accessed with ['mode']`
- **Fix**: Use bracket notation `info['mode']` or define a proper return type interface.
- **Rule**: When a function returns `Record<string, unknown>`, use bracket notation for property access. Better yet, define a typed return interface to get proper IntelliSense.

### 4. Export types consumed by downstream packages
- **Mistake**: `BifrostConfig` and `CrossChainConfig` were defined and exported from `obi-agent-api.ts` but not re-exported from the LLM package's `index.ts`. The SDK package tried to re-export them and failed at DTS build.
- **Error**: `TS2459: Module '"@obidot-kit/llm"' declares 'BifrostConfig' locally, but it is not exported.`
- **Fix**: Add the types to the LLM package's `index.ts` re-exports.
- **Rule**: Any type consumed by a downstream workspace package MUST be re-exported from the package's barrel `index.ts`. Always verify the full export chain: source file → package index → downstream consumer.

### 5. Biome formatting: single quotes, not double
- **Mistake**: Manually edited files using double quotes for strings, but the project's Biome config enforces single quotes.
- **Fix**: Run `pnpm format` after manual edits, or configure editor to use single quotes.
- **Rule**: Always run `pnpm format` after editing files. Don't bother manually matching quote style — let the formatter handle it.

### 6. Biome lint: no unused imports
- **Mistake**: Left `vi` imported from `vitest` and `BifrostProtocolConfig` imported from `@obidot-kit/core` after refactoring removed their usage.
- **Fix**: Remove unused imports. Run `pnpm lint` to catch these.
- **Rule**: After any refactor, run `pnpm lint` to catch stale imports. Biome flags these as warnings that block CI.

### 7. Biome lint: no non-null assertions
- **Mistake**: Used `sats[i]!` (non-null assertion) in test code.
- **Fix**: Replace with `const sat = sats[i]; if (!sat) continue;` — a safe guard pattern.
- **Rule**: Avoid `!` non-null assertions. Use guard clauses or optional chaining instead.

## General Patterns

### Verification Checklist (run before marking any task complete)
1. `pnpm build` — all packages compile
2. `pnpm typecheck` — all packages + examples pass `tsc --noEmit`
3. `pnpm test` — all test suites green
4. `pnpm lint` — zero warnings/errors from Biome
5. `pnpm format` — no formatting drift

### Monorepo Export Chain
```
source file (export interface Foo) 
  → package/src/index.ts (export type { Foo } from './source.js')
    → downstream package import (import type { Foo } from '@obidot-kit/pkg')
```
If any link in this chain is missing, the DTS build will fail at the downstream consumer. Always trace the full path.