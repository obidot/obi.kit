## Status: ✅ Complete (v0.1.0)

All tasks in this plan have been implemented. 225 tests pass. For the v0.2.0 rebuild (real contract connections, new tools, improved architecture), see [`tasks/obi-kit-rebuild-plan.md`](./tasks/obi-kit-rebuild-plan.md).

---

## System Prompt: Update `obi-kit` for Cross-Chain + Bifrost Support

You are updating the `obi-kit` SDK (obi-kit) to support the cross-chain Hyperbridge + Bifrost DeFi features that have been implemented in the `obidot` monorepo (obidot). The goal is to extract and generalize the new capabilities from the obidot agent module into reusable SDK packages.

### Context

The obidot monorepo now has:

- **12 new Solidity contracts** for cross-chain vault operations (Hyperbridge ISMP) and Bifrost DeFi (SLP, DEX, Farming, SALP)
- **6 LangChain tools** in the agent module: `fetch_yields`, `fetch_vault_state`, `execute_strategy`, `fetch_bifrost_yields`, `fetch_cross_chain_state`, `execute_bifrost_strategy`
- **New services**: `CrossChainService` (multi-chain state aggregation), `BifrostYieldService` (7 Bifrost products), extended `SignerService` (BifrostAdapter writeContract)
- **New types**: `BifrostStrategyType` (0-6), `BifrostCurrencyId` (0-4), `CrossChainVaultState`, `SatelliteChainState`, `BifrostYield`, 4-way discriminated union decisions (REALLOCATE, BIFROST_STRATEGY, CROSS_CHAIN_REBALANCE, NO_ACTION)

### obi-kit Current State

```
obi-kit/
├── packages/
│   ├── core/src/       # types.ts (ChainConfig, VaultConfig, ToolResult), errors.ts, polkadot.ts
│   ├── llm/src/        # agent.ts, obi-agent-api.ts, tools/ (base-tool, vault-deposit, vault-withdraw)
│   ├── sdk/src/        # obi-kit.ts (ObiKit class — facade with addTool, getTools, registerVault)
│   └── cli/src/        # cli.ts (stubs)
├── examples/vault-agent/
```

Dependency graph: `cli → sdk → llm → core`

### Tech Stack & Conventions

- TypeScript strict, ESM only (`"type": "module"`)
- pnpm workspaces, Turborepo, Biome (linter/formatter), Vitest (testing), tsup (build)
- `@obidot-kit/*` npm scope
- Each package: `src/` for source, `test/` for tests, own `tsconfig.json` extending `../../tsconfig.base.json`, own `biome.json`
- Build: `pnpm build`, Test: `pnpm test`, Lint: `pnpm lint`, Typecheck: `pnpm typecheck`

### Tasks to Implement

#### 1. `@obidot-kit/core` — New Types (packages/core/src/types.ts)

Add these types/interfaces (reference index.ts in obidot repo):

```typescript
// Bifrost strategy type enum (matches BifrostAdapter.sol)
export enum BifrostStrategyType {
  MintVToken = 0,
  RedeemVToken = 1,
  DEXSwap = 2,
  FarmDeposit = 3,
  FarmWithdraw = 4,
  FarmClaim = 5,
  SALPContribute = 6,
}

// Bifrost currency IDs
export enum BifrostCurrencyId {
  DOT = 0,
  vDOT = 1,
  KSM = 2,
  vKSM = 3,
  BNC = 4,
}

// Human-readable labels
export const BIFROST_STRATEGY_LABELS: Record<BifrostStrategyType, string>;

// Satellite vault config (extends VaultConfig)
export interface SatelliteVaultConfig extends VaultConfig {
  hubVaultAddress: string;
  routerAddress: string;
  rpcUrl: string;
  evmChainId: number;
}

// Cross-chain vault state
export interface CrossChainVaultState {
  totalSatelliteAssets: bigint;
  globalTotalAssets: bigint;
  globalTotalShares: bigint;
  satelliteAssets: Map<string, SatelliteChainState>;
}

// Per-satellite state
export interface SatelliteChainState {
  chainName: string;
  totalAssets: bigint;
  globalTotalAssets: bigint;
  emergencyMode: boolean;
  lastSyncTimestamp: number;
  paused: boolean;
}

// Bifrost yield product info
export interface BifrostYieldProduct {
  protocol: string;
  product: string;
  category: "SLP" | "DEX" | "Farming" | "SALP";
  apy: number;
  currencyIn: BifrostCurrencyId;
  currencyOut?: BifrostCurrencyId;
  poolId?: number;
  isActive: boolean;
}

// Cross-chain message types (for ISMP)
export enum CrossChainMessageType {
  DEPOSIT_SYNC = 1,
  WITHDRAW_REQUEST = 2,
  ASSET_SYNC = 3,
  STRATEGY_REPORT = 4,
  EMERGENCY_SYNC = 5,
  DEPOSIT_ACK = 6,
  WITHDRAW_FULFILL = 7,
}

// Bifrost protocol registry entry
export interface BifrostProtocolConfig {
  palletIndex: number;
  name: string;
  protocol: string;
}
```

#### 2. `@obidot-kit/core` — New Errors (packages/core/src/errors.ts)

```typescript
export class BifrostOperationError extends ObiKitError {
  constructor(message: string, public readonly strategyType?: BifrostStrategyType, cause?: Error)
}

export class CrossChainSyncError extends ObiKitError {
  constructor(message: string, public readonly sourceChain?: string, public readonly destChain?: string, cause?: Error)
}

export class SatelliteVaultError extends ObiKitError {
  constructor(message: string, public readonly chainName?: string, cause?: Error)
}
```

#### 3. `@obidot-kit/core` — Contract ABIs (packages/core/src/abis/)

Create a new `abis/` directory exporting typed ABI constants for:

- `BIFROST_ADAPTER_ABI` — `previewStrategy`, `executeBifrostStrategy` functions
- `CROSS_CHAIN_ROUTER_ABI` — `broadcastAssetSync`, `satelliteChains`, `paused` functions
- `SATELLITE_VAULT_ABI` — `totalAssets`, `globalTotalAssets`, `emergencyMode`, `lastSyncTimestamp`, `paused` functions
- `VAULT_CROSS_CHAIN_ABI` — `totalSatelliteAssets`, `globalTotalAssets`, `crossChainRouter`, `bifrostAdapter` functions

Reference: constants.ts in obidot repo for exact ABI definitions.

#### 4. `@obidot-kit/core` — EVM Context (packages/core/src/evm.ts)

Create a new file for EVM chain abstraction alongside the existing `polkadot.ts`:

```typescript
import { createPublicClient, http, type PublicClient, type Chain } from "viem";

export interface ObiEvmContext {
  client: PublicClient;
  chain: Chain;
  chainName: string;
}

export interface CreateEvmContextOptions {
  rpcUrl: string;
  chain: Chain;
  chainName: string;
}

export function createEvmContext(
  options: CreateEvmContextOptions,
): ObiEvmContext;
export function destroyEvmContext(ctx: ObiEvmContext): void;
```

Add `viem` as a peer dependency of `@obidot-kit/core`.

#### 5. `@obidot-kit/llm` — New Tools (packages/llm/src/tools/)

Create 4 new tool files extending `ObiBaseTool` or LangChain `Tool`:

| File                       | Class                     | Tool Name                       | Description                                                   |
| -------------------------- | ------------------------- | ------------------------------- | ------------------------------------------------------------- |
| `bifrost-yield.ts`         | `BifrostYieldTool`        | `fetch_bifrost_yields`          | Returns yield rates for all 7 Bifrost products                |
| `bifrost-strategy.ts`      | `BifrostStrategyTool`     | `execute_bifrost_strategy`      | Executes a Bifrost DeFi operation via BifrostAdapter contract |
| `cross-chain-state.ts`     | `CrossChainStateTool`     | `fetch_cross_chain_state`       | Aggregates state from hub + all satellite vaults              |
| `cross-chain-rebalance.ts` | `CrossChainRebalanceTool` | `execute_cross_chain_rebalance` | Triggers ISMP messages for hub↔satellite fund movement        |

Reference implementations: tools.ts (obidot repo). Generalize by accepting services/config through constructor injection rather than hard-coded constants.

Update index.ts to re-export all new tools.

#### 6. `@obidot-kit/llm` — Update `ObiAgentApi` (packages/llm/src/obi-agent-api.ts)

Add methods:

- `getBifrostTools(): Tool[]` — return Bifrost-specific tools
- `getCrossChainTools(): Tool[]` — return cross-chain-specific tools
- Extend `getAllTools()` to include Bifrost + cross-chain tools when configured

#### 7. `@obidot-kit/sdk` — Extend `ObiKit` Class (packages/sdk/src/obi-kit.ts)

Extend `ObiKitConfig`:

```typescript
export interface ObiKitConfig {
  chainConfig?: ChainConfig;
  polkadotContext?: ObiPolkadotContext;
  vaults?: VaultConfig[];
  signer?: TransactionSigner;
  // NEW:
  satellites?: SatelliteVaultConfig[];
  bifrostConfig?: {
    adapterAddress: string;
    protocols: Record<string, BifrostProtocolConfig>;
  };
  evmContexts?: Map<string, ObiEvmContext>;
}
```

Add methods to `ObiKit`:

```typescript
registerSatelliteVault(config: SatelliteVaultConfig): void
removeSatelliteVault(chainName: string): void
getSatelliteVaults(): SatelliteVaultConfig[]
getBifrostTools(): Tool[]
getCrossChainTools(): Tool[]
addEvmContext(chainName: string, ctx: ObiEvmContext): void
```

Extend `getTools()` to auto-include Bifrost and cross-chain tools when `bifrostConfig` or `satellites` are provided.

#### 8. Examples — New Cross-Chain Agent Example

Create `examples/cross-chain-agent/` with:

- package.json — deps on `@obidot-kit/sdk`, `viem`
- `.env.example` — required env vars (RPC URLs, contract addresses)
- index.ts — demonstrates:
  1. Creating ObiKit with satellite vaults and Bifrost config
  2. Fetching Bifrost yields
  3. Fetching cross-chain state (hub + satellites)
  4. Executing a Bifrost strategy (offline/stub mode)

#### 9. Tests

Write Vitest tests for each new component:

- `packages/core/test/types.test.ts` — validate enums, type guards
- `packages/core/test/evm.test.ts` — context creation/destruction
- `packages/llm/test/bifrost-yield.test.ts` — tool invocation with mock data
- `packages/llm/test/bifrost-strategy.test.ts` — validation, guardrails
- `packages/llm/test/cross-chain-state.test.ts` — multi-chain aggregation mock
- `packages/sdk/test/obi-kit-cross-chain.test.ts` — satellite registration, tool discovery

#### 10. Package Dependencies

Update package.json files:

- `@obidot-kit/core`: add `viem` as `peerDependency`
- `@obidot-kit/llm`: already has `@langchain/core` and `zod`
- `@obidot-kit/sdk`: no new deps (inherits through workspace)
- Root: ensure `viem` is in dev deps for testing

### Reference Files in Obidot Repo

When implementing, reference these files for exact types, ABIs, and logic:

| File                  | What to Extract                          |
| --------------------- | ---------------------------------------- |
| index.ts              | Enums, Zod schemas, type definitions     |
| constants.ts          | ABIs, protocol registry, chain configs   |
| env.ts                | Environment variable patterns            |
| crosschain.service.ts | Multi-chain state aggregation logic      |
| yield.service.ts      | Bifrost yield product definitions        |
| signer.service.ts     | BifrostAdapter writeContract patterns    |
| tools.ts              | All 6 tool implementations               |
| systemPrompt.ts       | Bifrost product descriptions, risk rules |
| BifrostAdapter.sol    | On-chain ABI reference                   |
| CrossChainRouter.sol  | On-chain ABI reference                   |
| ObidotVaultEVM.sol    | Satellite vault ABI reference            |

### Verification Checklist

After all changes:

1. `pnpm build` — all packages compile
2. `pnpm typecheck` — 0 type errors
3. `pnpm test` — all tests pass
4. `pnpm lint` — no lint errors
5. `pnpm changeset` — create changeset describing the new features
6. Verify the obidot agent module (agent) still typechecks after updating its `@obidot-kit/*` imports (run from obidot repo: `pnpm --filter @obidot/agent run typecheck`)

### Key Principles

- **Generalize, don't copy**: The agent module has hardcoded constants and services. The SDK should accept these through config/constructor injection.
- **Backward compatible**: Existing `ObiKit` usage without satellites/Bifrost must continue working unchanged.
- **ESM only**: All new code must be ESM (`import`/`export`, no `require`).
- **Strict TypeScript**: No `any`, no implicit types. Use generics where appropriate.
- **Test everything**: Each new tool and type needs Vitest coverage.
- **Keep packages focused**: Types/ABIs → `core`, Tools → `llm`, Facade → `sdk`.
