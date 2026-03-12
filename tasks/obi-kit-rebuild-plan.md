# obi-kit SDK Rebuild Plan — `packages/*`

> **Repo:** `obidot/obi-kit` (pnpm + Turborepo monorepo)
> **Status:** v0.1.0 — 225 tests passing, build/lint/typecheck clean. All tools functional in offline mode; EVM mode works for vault deposit/withdraw/oracle/performance. Bifrost strategy, cross-chain rebalance, and CLI are stubs.
> **Goal:** Ship v0.2.0 with real Bifrost service, real cross-chain ISMP dispatch, ABI sync pipeline, full CLI, WebSocket support, and Polkadot substrate context.

---

## Current State Summary

| Area | Status |
|---|---|
| `@obidot-kit/core` types + errors + EVM context | Working — 410-line type system, 128-line EVM context |
| 6 ABIs (hand-maintained) | Working but **may drift** from obi.router `forge build` artifacts |
| `VaultDepositTool` / `VaultWithdrawTool` (EVM mode) | Working — real `viem.writeContract` calls |
| `VaultDepositTool` / `VaultWithdrawTool` (Polkadot mode) | **Stub** — returns `"pending"` placeholder |
| `BifrostYieldTool` | Working — returns 7 default products with **placeholder APYs** |
| `BifrostStrategyTool` | **Offline only** — validates input, calls `BifrostStrategyService` (stub interface) |
| `CrossChainStateTool` (EVM mode) | Working — reads hub + satellite state via viem |
| `CrossChainRebalanceTool` | **Stub** — `executeHubToSatellite()` / `executeSatelliteToHub()` return `"pending"` |
| `OracleCheckTool` / `PerformanceTool` (EVM mode) | Working — reads real on-chain data |
| `WithdrawalQueueTool` (EVM mode) | Working — request/fulfill/cancel/status |
| `BatchStrategyTool` (EVM mode) | Working — batch `executeStrategies()` with EIP-712 |
| `ObiKit` facade (593 lines) | Working — manages vaults, builds tools, 3 modes |
| `ObiAgentApi` (394 lines) | Working — lazy-loads PAK, wraps all tools |
| CLI (`init` / `run` / `info`) | **All stubs** — "coming soon" messages |
| Polkadot context (`polkadot.ts`) | **Interface only** — re-exports from PAK, no tests |
| npm publish | **Not done** — no release workflow |

---

## Phase 1 — ABI Sync Pipeline

**Priority:** Critical (drift prevention)
**Files:** `packages/core/src/abis/`, new `scripts/sync-abis.ts`, root `package.json`

### 1.1 Problem

ABIs in `packages/core/src/abis/` are hand-copied from Foundry `out/` artifacts. When contracts change in `obi.router`, these ABIs can silently drift, causing runtime reverts.

Affected ABI files (6):
- `obidot-vault.ts` (624 lines)
- `oracle-registry.ts` (73 lines)
- `bifrost-adapter.ts` (73 lines)
- `cross-chain-router.ts` (101 lines)
- `satellite-vault.ts` (43 lines)
- `vault-cross-chain.ts` (57 lines)

### 1.2 Create `scripts/sync-abis.ts`

```typescript
// scripts/sync-abis.ts
// Reads Foundry JSON artifacts from obi.router/out/ and generates TypeScript ABI files.
//
// Usage: pnpm sync:abis [--router-path ../obi.router]
//
// For each contract:
//   1. Read out/<Contract>.sol/<Contract>.json
//   2. Extract .abi field
//   3. Write packages/core/src/abis/<kebab-name>.ts
//   4. Format with Biome

const CONTRACTS = [
  { artifact: "ObidotVault",       output: "obidot-vault" },
  { artifact: "OracleRegistry",    output: "oracle-registry" },
  { artifact: "BifrostAdapter",    output: "bifrost-adapter" },
  { artifact: "CrossChainRouter",  output: "cross-chain-router" },
  { artifact: "ObidotVaultEVM",    output: "satellite-vault" },
  { artifact: "ObidotVault",       output: "vault-cross-chain", filter: ["broadcastAssetSync", ...] },
];
```

Each generated file:
```typescript
// AUTO-GENERATED — do not edit manually
// Source: obi.router/out/ObidotVault.sol/ObidotVault.json
// Synced: 2026-03-05T00:00:00Z

export const OBIDOT_VAULT_ABI = [...] as const;
```

### 1.3 Add Script to Root `package.json`

```json
{
  "scripts": {
    "sync:abis": "tsx scripts/sync-abis.ts"
  }
}
```

### 1.4 CI Check (Optional)

Add a GitHub Actions step that runs `pnpm sync:abis --check` — fails if generated files differ from committed versions. This prevents merging obi-kit PRs with stale ABIs.

---

## Phase 2 — Real `BifrostStrategyService`

**Priority:** High
**Files:** `packages/llm/src/tools/bifrost-strategy.ts`, new `packages/llm/src/services/bifrost-strategy.service.ts`

### 2.1 Current Stub

`bifrost-strategy.ts:86-92` defines the `BifrostStrategyService` interface:

```typescript
export interface BifrostStrategyService {
  executeStrategy(input: BifrostStrategyInput): Promise<ToolResult>;
}
```

Tools that receive a service call it; tools without a service return offline results. The `ObiKit` facade at `obi-kit.ts:320-340` passes `undefined` for the service — meaning `BifrostStrategyTool` always runs in offline mode.

### 2.2 Create `EvmBifrostStrategyService`

New file: `packages/llm/src/services/bifrost-strategy.service.ts`

```typescript
import type { BifrostStrategyService, BifrostStrategyInput } from "../tools/bifrost-strategy.js";
import type { ToolResult } from "@obidot-kit/core";

export interface EvmBifrostStrategyServiceConfig {
  publicClient: PublicClient;
  walletClient: WalletClient;
  bifrostAdapterAddress: Address;
  vaultAddress: Address;
}

export class EvmBifrostStrategyService implements BifrostStrategyService {
  constructor(private config: EvmBifrostStrategyServiceConfig) {}

  async executeStrategy(input: BifrostStrategyInput): Promise<ToolResult> {
    // 1. Map BifrostStrategyType to on-chain enum value
    // 2. Encode currency ID using BifrostCodec rules
    // 3. Call bifrostAdapter.executeBifrostStrategy(type, amount, minReturn, currencyId)
    // 4. Return { success, data: { txHash, blockNumber }, message }
  }
}
```

### 2.3 Wire Into `ObiKit` Facade

Update `packages/sdk/src/obi-kit.ts:320-340` to instantiate `EvmBifrostStrategyService` when EVM context + `bifrostConfig` are both present:

```typescript
// obi-kit.ts — in _buildToolsForVault()
if (evmCtx && this.config.bifrostConfig) {
  const bifrostService = new EvmBifrostStrategyService({
    publicClient: evmCtx.publicClient,
    walletClient: evmCtx.walletClient,
    bifrostAdapterAddress: this.config.bifrostConfig.adapterAddress,
    vaultAddress: vaultAddress,
  });
  // Pass service to BifrostStrategyTool constructor
}
```

### 2.4 Tests

Add to `packages/llm/test/`:
- `bifrost-strategy-service.test.ts` — unit tests with mocked viem clients
- Test all 7 strategy types (MINT_VTOKEN, REDEEM_VTOKEN, SWAP, ADD_LIQUIDITY, REMOVE_LIQUIDITY, STAKE_LP, UNSTAKE_LP)
- Test currency validation (vDOT for MINT_VTOKEN, LP tokens for STAKE_LP, etc.)
- Test error paths (insufficient balance, slippage exceeded, adapter reverts)

---

## Phase 3 — Real Cross-Chain Service

**Priority:** High
**Files:** `packages/llm/src/tools/cross-chain-rebalance.ts`, new `packages/llm/src/services/cross-chain.service.ts`

### 3.1 Current Stub

`cross-chain-rebalance.ts:199-215` and `:217-233` — both `executeHubToSatellite()` and `executeSatelliteToHub()` return stub results:

```typescript
// Line 199-215
private async executeHubToSatellite(input: ...): Promise<ToolResult> {
  // ... validation ...
  return { success: true, data: { direction: "HUB_TO_SATELLITE", status: "pending" }, message: "..." };
}
```

### 3.2 Create `EvmCrossChainService`

New file: `packages/llm/src/services/cross-chain.service.ts`

```typescript
export interface EvmCrossChainServiceConfig {
  publicClient: PublicClient;
  walletClient: WalletClient;
  crossChainRouterAddress: Address;
  vaultAddress: Address;
}

export class EvmCrossChainService {
  constructor(private config: EvmCrossChainServiceConfig) {}

  /** Hub → Satellite: calls CrossChainRouter.requestCrossChainDeposit() */
  async executeHubToSatellite(
    targetChainId: bigint,
    amount: bigint,
  ): Promise<ToolResult> {
    const hash = await this.config.walletClient.writeContract({
      address: this.config.crossChainRouterAddress,
      abi: CROSS_CHAIN_ROUTER_ABI,
      functionName: "requestCrossChainDeposit",
      args: [targetChainId, amount],
    });
    const receipt = await this.config.publicClient.waitForTransactionReceipt({ hash });
    return {
      success: receipt.status === "success",
      data: { txHash: hash, blockNumber: Number(receipt.blockNumber), direction: "HUB_TO_SATELLITE" },
      message: `Cross-chain deposit to chain ${targetChainId}: ${receipt.status}`,
    };
  }

  /** Satellite → Hub: calls CrossChainRouter.requestCrossChainWithdraw() */
  async executeSatelliteToHub(
    sourceChainId: bigint,
    amount: bigint,
  ): Promise<ToolResult> {
    // Similar — calls requestCrossChainWithdraw()
  }

  /** Broadcast asset sync to all satellites */
  async broadcastSync(): Promise<ToolResult> {
    // Calls CrossChainRouter.broadcastAssetSync()
  }
}
```

### 3.3 Wire Into `CrossChainRebalanceTool`

Update `cross-chain-rebalance.ts` to accept an optional `crossChainService` in its options. When provided, `executeHubToSatellite()` and `executeSatelliteToHub()` delegate to the service instead of returning stubs.

### 3.4 Wire Into `ObiKit` Facade

Update `obi-kit.ts` — when EVM context + `crossChainRouterAddress` are present, instantiate `EvmCrossChainService` and pass it to the rebalance tool.

### 3.5 Tests

- `cross-chain-service.test.ts` — unit tests with mocked viem clients
- Test hub→satellite, satellite→hub, broadcastSync
- Test error paths (router paused, satellite stale, insufficient assets)

---

## Phase 4 — Real `BifrostYieldTool` Data

**Priority:** High
**Files:** `packages/llm/src/tools/bifrost-yield.ts`

### 4.1 Current Implementation

`bifrost-yield.ts:147-186` returns 7 hardcoded products with placeholder APYs:

```typescript
private getDefaultProducts(): BifrostYieldProduct[] {
  return [
    { id: "vDOT", name: "Bifrost vDOT", apy: 0.155, tvl: 45_000_000, ... },
    // ... 6 more
  ];
}
```

### 4.2 Add Real Bifrost API Fetcher

```typescript
// bifrost-yield.ts — new private method
private async fetchBifrostApi(): Promise<BifrostYieldProduct[]> {
  const resp = await fetch("https://api.bifrost.app/api/site", {
    signal: AbortSignal.timeout(10_000),
  });
  const data = await resp.json();
  // Map vtoken_list[].apy → BifrostYieldProduct
  // Include vDOT, vKSM, vGLMR, vMOVR, vBNC, vASTR, vFIL
}

private async fetchFarmingApi(): Promise<BifrostYieldProduct[]> {
  const resp = await fetch("https://api.bifrost.app/api/dex/farming", {
    signal: AbortSignal.timeout(10_000),
  });
  // Map farming pools → BifrostYieldProduct with category: "lp_farming"
}
```

### 4.3 Graceful Fallback

```typescript
async _call(input: string): Promise<string> {
  let products: BifrostYieldProduct[];
  try {
    const [vtokens, farming] = await Promise.all([
      this.fetchBifrostApi(),
      this.fetchFarmingApi(),
    ]);
    products = [...vtokens, ...farming];
  } catch (error) {
    // Log warning, fall back to defaults
    products = this.getDefaultProducts();
  }
  // Apply filters from input, format response
}
```

### 4.4 Constructor Options

Add optional `bifrostApiUrl` and `fetchTimeoutMs` to `BifrostYieldToolOptions`:

```typescript
export interface BifrostYieldToolOptions {
  bifrostApiUrl?: string;     // default: "https://api.bifrost.app"
  fetchTimeoutMs?: number;    // default: 10_000
  cacheTtlMs?: number;        // default: 300_000 (5 min)
}
```

---

## Phase 5 — WebSocket Support

**Priority:** Medium
**Files:** new `packages/core/src/ws.ts`, update `packages/sdk/src/obi-kit.ts`

### 5.1 Problem

The agent module has a WebSocket server (`ws://localhost:3011/ws`) that broadcasts real-time events (cycle start, decision, execution, etc.). The dashboard has a `useWebSocket` hook. But obi-kit has no WebSocket client — consumers must roll their own.

### 5.2 Create `ObiWsClient`

New file: `packages/core/src/ws.ts`

```typescript
export interface ObiWsEvent {
  type: string;
  timestamp: number;
  [key: string]: unknown;
}

export interface ObiWsClientOptions {
  url: string;                    // e.g., "ws://localhost:3011/ws"
  reconnectIntervalMs?: number;   // default: 3_000
  maxReconnectAttempts?: number;  // default: 10
  onEvent?: (event: ObiWsEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export class ObiWsClient {
  private ws: WebSocket | null = null;
  private reconnectCount = 0;

  constructor(private options: ObiWsClientOptions) {}

  connect(): void { /* ... */ }
  disconnect(): void { /* ... */ }
  get connected(): boolean { /* ... */ }

  /** Send a message to the server (e.g., chat) */
  send(data: unknown): void { /* ... */ }
}
```

### 5.3 Integrate Into `ObiKit` Facade

Update `packages/sdk/src/obi-kit.ts`:

```typescript
class ObiKit {
  private wsClient?: ObiWsClient;

  /** Connect WebSocket for real-time events */
  connectWebSocket(options: ObiWsClientOptions): ObiWsClient {
    this.wsClient = new ObiWsClient(options);
    this.wsClient.connect();
    return this.wsClient;
  }

  /** Disconnect WebSocket */
  disconnectWebSocket(): void {
    this.wsClient?.disconnect();
    this.wsClient = undefined;
  }
}
```

### 5.4 Export from Barrel

Update `packages/core/src/index.ts` to re-export `ObiWsClient` and related types.

### 5.5 Tests

- Unit test `ObiWsClient` with a mock WebSocket server
- Test auto-reconnect logic
- Test event parsing

---

## Phase 6 — CLI Implementation

**Priority:** Medium
**Files:** `packages/cli/src/cli.ts`, new `packages/cli/src/commands/`

### 6.1 Current Stubs

`cli.ts:30-92` — all 3 commands print "coming soon":

```typescript
case "init":
  console.log("obi-kit init is not yet implemented — coming soon.");
  break;
case "run":
  console.log("obi-kit run is not yet implemented — coming soon.");
  break;
case "info":
  console.log("obi-kit info is not yet implemented — coming soon.");
  break;
```

### 6.2 Implement `init` Command

New file: `packages/cli/src/commands/init.ts`

```typescript
export async function runInit(projectName?: string): Promise<void> {
  // 1. Prompt for project name (or use arg)
  // 2. Create directory structure:
  //    <project>/
  //    ├── package.json (with @obidot-kit/sdk dependency)
  //    ├── tsconfig.json
  //    ├── src/
  //    │   └── index.ts (starter agent script from examples/vault-agent)
  //    └── .env.example (with RPC_URL, PRIVATE_KEY, VAULT_ADDRESS)
  // 3. Print instructions: "cd <project> && pnpm install && pnpm start"
}
```

### 6.3 Implement `run` Command

New file: `packages/cli/src/commands/run.ts`

```typescript
export async function runAgent(configPath?: string): Promise<void> {
  // 1. Load .env from cwd (dotenv)
  // 2. Load config from configPath (default: obi-kit.config.ts)
  // 3. Instantiate ObiKit from config
  // 4. Create LangChain agent with tools
  // 5. Run interactive REPL or single-shot command
}
```

### 6.4 Implement `info` Command

New file: `packages/cli/src/commands/info.ts`

```typescript
export async function runInfo(): Promise<void> {
  // 1. Print CLI version
  // 2. Print installed package versions (@obidot-kit/core, llm, sdk)
  // 3. Check RPC connectivity (if RPC_URL env set)
  // 4. Print vault address + chain config (if configured)
  // 5. List available tools
}
```

### 6.5 Update `cli.ts` Dispatcher

```typescript
// cli.ts — replace stubs with real commands
import { runInit } from "./commands/init.js";
import { runAgent } from "./commands/run.js";
import { runInfo } from "./commands/info.js";

case "init":
  await runInit(args[1]);
  break;
case "run":
  await runAgent(args.find(a => a.startsWith("--config="))?.split("=")[1]);
  break;
case "info":
  await runInfo();
  break;
```

### 6.6 Dependencies

Add to `packages/cli/package.json`:
- `dotenv` — for `.env` loading
- `@obidot-kit/sdk` — already a dependency (workspace:*)

### 6.7 Tests

- `init.test.ts` — verify directory scaffolding (write to temp dir)
- `info.test.ts` — verify output format
- `run.test.ts` — verify config loading (mock ObiKit)

---

## Phase 7 — Additional Tools

**Priority:** Medium
**Files:** new tool files in `packages/llm/src/tools/`

### 7.1 `VaultPolicyTool`

New file: `packages/llm/src/tools/vault-policy.ts`

Reads and displays vault policy settings:
- Whitelisted parachains (`parachainAllowed` mapping)
- Whitelisted protocols (`protocolAllowed` mapping)
- Protocol exposure caps (`protocolExposureCap` mapping)
- Circuit breaker threshold (`maxDailyLoss`)
- Current daily loss vs threshold

This helps the AI agent understand what operations are permitted before attempting them.

### 7.2 `OracleUpdateTool`

New file: `packages/llm/src/tools/oracle-update.ts`

Allows the AI agent to trigger oracle price updates:
- Calls `KeeperOracle.updatePrice(int256 price)` via viem
- Requires `KEEPER_ROLE` on the oracle contract
- Input: `{ asset: string, price: string }`

### 7.3 `VaultAdminTool`

New file: `packages/llm/src/tools/vault-admin.ts`

Reads vault admin state (for authorized agents only):
- Total shares, total assets, share price
- Paused state
- Strategy nonce
- Admin role holders
- Fee configuration

### 7.4 Update Barrel Exports

Update `packages/llm/src/tools/index.ts` and `packages/llm/src/index.ts` to export new tools.

### 7.5 Update `ObiKit` Facade

Update `obi-kit.ts` to include new tools in the tool set when appropriate config is provided.

### 7.6 Tests

- Unit tests for each new tool (offline + EVM mode with mocked clients)
- Integration test: `ObiKit.getTools()` returns the new tools when configured

---

## Phase 8 — Polkadot Substrate Context

**Priority:** Medium
**Files:** `packages/core/src/polkadot.ts`, `packages/llm/src/tools/vault-deposit.ts`, `packages/llm/src/tools/vault-withdraw.ts`

### 8.1 Current State

`polkadot.ts:40-88` defines `ObiPolkadotContext` and `createPolkadotContext()`, but it's a thin wrapper over PAK (Polkadot Agent Kit). The deposit/withdraw tools have Polkadot mode stubs that return `"pending"`.

### 8.2 Flesh Out `createPolkadotContext()`

```typescript
export async function createPolkadotContext(
  options: CreatePolkadotContextOptions,
): Promise<ObiPolkadotContext> {
  const client = createClient(
    getWsProvider(options.wsEndpoint ?? "wss://polkadot-asset-hub-rpc.polkadot.io"),
  );
  const api = client.getTypedApi(paseo); // or polkadot
  return { client, api, signer: options.signer };
}
```

### 8.3 Implement Polkadot Mode in Deposit/Withdraw

For Polkadot Hub (AssetHub), vault deposit/withdraw must go through the EVM precompile since the vault is an EVM contract on the Polkadot Hub EVM pallet. The Polkadot mode should:

1. Use `polkadot-api` to submit an `ethereum.transact()` extrinsic
2. Encode the EVM call data (same ABI as the EVM mode)
3. Wait for inclusion + finality

```typescript
// vault-deposit.ts — Polkadot mode implementation
private async executePolkadotDeposit(
  ctx: ObiPolkadotContext,
  params: DepositParams,
): Promise<ToolResult> {
  // 1. Encode vault.deposit(assets, receiver) call data
  const callData = encodeFunctionData({
    abi: OBIDOT_VAULT_ABI,
    functionName: "deposit",
    args: [params.amount, params.receiver],
  });
  // 2. Submit ethereum.transact() extrinsic
  const tx = ctx.api.tx.Ethereum.transact({
    transaction: { to: params.vaultAddress, data: callData, value: 0n },
  });
  const result = await tx.signAndSubmit(ctx.signer);
  // 3. Return result
}
```

### 8.4 Tests

- Mock `polkadot-api` client
- Test `createPolkadotContext()` / `destroyPolkadotContext()`
- Test Polkadot mode deposit/withdraw (extrinsic encoding)

---

## Phase 9 — v0.2.0 Release

**Priority:** Low (after all above phases)
**Files:** All `package.json` files, new `.github/workflows/release.yml`

### 9.1 Version Bump

Bump all 4 packages from `0.1.0` → `0.2.0`:
- `packages/core/package.json`
- `packages/llm/package.json`
- `packages/sdk/package.json`
- `packages/cli/package.json`

### 9.2 Changelog

Create `CHANGELOG.md` at repo root:

```markdown
# Changelog

## v0.2.0

### @obidot-kit/core
- ABI sync pipeline from Foundry artifacts
- WebSocket client (`ObiWsClient`)
- Polkadot substrate context implementation

### @obidot-kit/llm
- Real `BifrostStrategyService` with on-chain execution
- Real cross-chain ISMP dispatch (hub↔satellite)
- Real Bifrost API yield data (with graceful fallback)
- New tools: VaultPolicyTool, OracleUpdateTool, VaultAdminTool

### @obidot-kit/sdk
- WebSocket integration in ObiKit facade
- New tools wired into tool builder

### @obidot-kit/cli
- `init` — scaffold new agent project
- `run` — interactive agent REPL
- `info` — display environment and config info
```

### 9.3 npm Publish Workflow

Create `.github/workflows/release.yml`:

```yaml
name: Release
on:
  push:
    tags: ["v*"]
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://registry.npmjs.org
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm test
      - run: pnpm -r publish --access public --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 9.4 Peer Dependency Audit

Review and pin peer dependency ranges:
- `viem` — currently `^2.0.0`, verify with latest viem 2.x
- `@langchain/core` — currently `^0.3.0`, verify compatibility
- `zod` — currently `^3.25.0`, verify range

### 9.5 Update README.md

- Add installation instructions (`npm install @obidot-kit/sdk`)
- Add quick-start code snippet showing EVM mode
- Add tool reference table
- Add link to docs site

### 9.6 Update Examples

Update `examples/vault-agent/` and `examples/cross-chain-agent/` to use the new features:
- Show real Bifrost strategy execution
- Show WebSocket event subscription
- Show cross-chain rebalance

---

## Verification Checklist

After all phases:

- [ ] `pnpm build` — all 4 packages build successfully
- [ ] `pnpm test` — all tests pass (225 existing + new tests)
- [ ] `pnpm lint` — 0 Biome errors
- [ ] `pnpm typecheck` — 0 TypeScript errors
- [ ] `pnpm sync:abis` — generates identical files (no drift)
- [ ] `ObiKit` in EVM mode creates real `EvmBifrostStrategyService`
- [ ] `BifrostStrategyTool` calls `BifrostAdapter.executeBifrostStrategy()` via viem
- [ ] `CrossChainRebalanceTool` calls `CrossChainRouter.requestCrossChainDeposit/Withdraw()` via viem
- [ ] `BifrostYieldTool` fetches real APYs from `api.bifrost.app` (falls back gracefully)
- [ ] `ObiWsClient` connects to `ws://localhost:3011/ws` and receives events
- [ ] `npx @obidot-kit/cli init my-agent` scaffolds a project directory
- [ ] `npx @obidot-kit/cli info` prints version + config info
- [ ] All examples run without errors (offline mode)
- [ ] npm publish dry-run succeeds: `pnpm -r publish --dry-run`

---

## File Manifest

| File | Action | Phase |
|---|---|---|
| `scripts/sync-abis.ts` | CREATE | 1 |
| `packages/core/src/abis/*.ts` (6 files) | REGENERATE (via script) | 1 |
| `package.json` (root) | MODIFY — add `sync:abis` script | 1 |
| `packages/llm/src/services/bifrost-strategy.service.ts` | CREATE | 2 |
| `packages/llm/src/tools/bifrost-strategy.ts` | MODIFY — wire real service | 2 |
| `packages/sdk/src/obi-kit.ts` | MODIFY — instantiate services | 2, 3, 5, 7 |
| `packages/llm/src/services/cross-chain.service.ts` | CREATE | 3 |
| `packages/llm/src/tools/cross-chain-rebalance.ts` | MODIFY — wire real service | 3 |
| `packages/llm/src/tools/bifrost-yield.ts` | MODIFY — real API fetcher + cache | 4 |
| `packages/core/src/ws.ts` | CREATE | 5 |
| `packages/core/src/index.ts` | MODIFY — export WS types | 5 |
| `packages/cli/src/commands/init.ts` | CREATE | 6 |
| `packages/cli/src/commands/run.ts` | CREATE | 6 |
| `packages/cli/src/commands/info.ts` | CREATE | 6 |
| `packages/cli/src/cli.ts` | REWRITE — wire real commands | 6 |
| `packages/cli/package.json` | MODIFY — add dotenv dep | 6 |
| `packages/llm/src/tools/vault-policy.ts` | CREATE | 7 |
| `packages/llm/src/tools/oracle-update.ts` | CREATE | 7 |
| `packages/llm/src/tools/vault-admin.ts` | CREATE | 7 |
| `packages/llm/src/tools/index.ts` | MODIFY — export new tools | 7 |
| `packages/llm/src/index.ts` | MODIFY — export new tools | 7 |
| `packages/core/src/polkadot.ts` | MODIFY — real substrate context | 8 |
| `packages/llm/src/tools/vault-deposit.ts` | MODIFY — real Polkadot mode | 8 |
| `packages/llm/src/tools/vault-withdraw.ts` | MODIFY — real Polkadot mode | 8 |
| `packages/*/package.json` (4 files) | MODIFY — version 0.1.0→0.2.0 | 9 |
| `CHANGELOG.md` | CREATE | 9 |
| `.github/workflows/release.yml` | CREATE | 9 |
| `README.md` | MODIFY — installation + usage | 9 |
| `examples/vault-agent/src/index.ts` | MODIFY — use new features | 9 |
| `examples/cross-chain-agent/src/index.ts` | MODIFY — use new features | 9 |

---

## Dependency Graph

```
Phase 1 (ABI Sync)
  ↓
Phase 2 (Bifrost Strategy Service)  ←── depends on correct ABIs
  ↓
Phase 3 (Cross-Chain Service)       ←── depends on correct ABIs
  ↓
Phase 4 (Bifrost Yield API)         ←── independent, can parallel with 2-3
  ↓
Phase 5 (WebSocket)                 ←── independent
  ↓
Phase 6 (CLI)                       ←── depends on ObiKit being stable (2-5)
  ↓
Phase 7 (Additional Tools)          ←── independent
  ↓
Phase 8 (Polkadot Context)          ←── independent
  ↓
Phase 9 (Release)                   ←── depends on ALL above
```

Phases 4, 5, 7, and 8 can run in parallel with Phases 2-3 since they have no mutual dependencies.
