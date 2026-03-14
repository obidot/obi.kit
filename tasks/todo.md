# ObiKit v0.2.0 — Task Tracker

## Status: ✅ Complete (v0.2.0)

All 9 phases of the obi-kit rebuild plan are done and committed.

---

## Completed — v0.2.0

### Phase 1 — ABI Sync Pipeline
- [x] `scripts/sync-abis.ts` — reads Foundry `out/` artifacts, generates TypeScript ABI files
- [x] All 6 ABI files regenerated from live `obi.router` artifacts
- [x] Root `package.json` `sync:abis` script

### Phase 2 — Real `BifrostStrategyService`
- [x] `EvmBifrostStrategyService` — live `viem.writeContract` calls to `BifrostAdapter`
- [x] All 7 strategy types wired (MINT_VTOKEN, REDEEM_VTOKEN, SWAP, ADD_LIQUIDITY, etc.)
- [x] Wired into `ObiKit` facade when EVM context + bifrostConfig present

### Phase 3 — Real Cross-Chain Service
- [x] `EvmCrossChainService` — live ISMP dispatch via `CrossChainRouter`
- [x] `broadcastSync()`, `readRouterState()` implemented
- [x] `CrossChainRebalanceTool` delegates to real service

### Phase 4 — Real `BifrostYieldTool` Data
- [x] Fetches vDOT exchange rate from Bifrost Paseo RPC (`bifrost-rpc.paseo.liebi.com`)
- [x] Graceful fallback to static rates when RPC unavailable
- [x] Note: `api.bifrost.app` is dead — uses RPC directly

### Phase 5 — WebSocket Support
- [x] `ObiWsClient` — auto-reconnect, event parsing, `send()`
- [x] `ObiKit.connectWebSocket()` / `disconnectWebSocket()`
- [x] Exported from `@obidot-kit/core`

### Phase 6 — CLI Implementation
- [x] `obi-kit init` — scaffolds new agent project with `.env.example`, starter `index.ts`
- [x] `obi-kit run` — loads `.env`, runs agent REPL
- [x] `obi-kit info` — prints version, chain config, available tools
- [x] 33 CLI tests passing

### Phase 7 — Additional Tools
- [x] `VaultPolicyTool` — reads parachain/protocol allowlists, exposure caps
- [x] `OracleUpdateTool` — calls `KeeperOracle.setPrice()` (requires KEEPER_ROLE)
- [x] `VaultAdminTool` — reads total assets, shares, paused state, roles, fee config
- [x] 36 new tests

### Phase 8 — Polkadot Substrate Context
- [x] `ObiPolkadotContext.evmContext` optional field
- [x] `createPolkadotContext({ includeEvm: true, privateKey })` — auto-creates viem context via Polkadot Hub ETH-RPC
- [x] Deposit/withdraw tools delegate to EVM path via `polkadotContext.evmContext`
- [x] 11 new Polkadot EVM delegation tests

### Phase 9 — v0.2.0 Release
- [x] All 4 `package.json` versions bumped: `0.1.0 → 0.2.0`
- [x] `CHANGELOG.md` created at repo root
- [x] `.github/workflows/release.yml` — build → test → publish on `v*.*.*` tag
- [x] `README.md` roadmap updated to reflect real v0.2.0 content
- [x] `tasks/` files updated

---

## Verification Results — v0.2.0

| Check | Status |
|-------|--------|
| `pnpm build` | ✅ 4 packages built |
| `pnpm typecheck` | ✅ clean |
| `pnpm test` | ✅ 364 tests across packages |
| `pnpm lint` | ✅ 0 issues |

### Test Breakdown
- `@obidot-kit/core`: ~60 tests
- `@obidot-kit/llm`: ~195 tests
- `@obidot-kit/sdk`: ~75 tests
- `@obidot-kit/cli`: ~34 tests

---

## Deployed Contract Addresses (Polkadot Hub Paseo TestNet — chain 420420417)

| Contract | Address |
|---|---|
| `ObidotVault` | `0x03473a95971Ba0496786a615e21b1e87bDFf0025` |
| `SwapRouter` | `0x0A85A1B0bb893cab3b5fad7312ac241e92C8Badf` |
| `SwapQuoter` | `0x81d7aCFEF474DA6c76eC1b5A05a137cB9f3A5Db1` |
| `XCMExecutor` | `0x011b6FAf32370dCF92a452374FfCfCdbfA20278c` |
| `HyperExecutor` | `0x62919Cb6416Cb919fC4A30c5707a7867Ca874ca6` |
| `HydrationOmnipoolAdapter` | `0xF0E1c10f97446C032A86C9643258Bb26d6129933` |
| `BifrostAdapter` | `0x265Cb785De0fF2e5BcebDEb53095aDCAE9175527` |
| `OracleRegistry` | `0x8b7C7345d6cF9de45f4aacC61F56F0241d47e88B` |
| `CrossChainRouter` | `0xE2fFfb3B5C72f99811bC20D857035611bFCe5b5d` |
| `IsmpHost` | `0xbb26e04a71e7c12093e82b83ba310163eac186fa` |
| ETH-RPC | `https://eth-rpc-testnet.polkadot.io/` |

---

## Next Steps (MVP Phases 3–8)

See root `AGENTS.md` for the full 8-phase MVP plan:
- **Phase 3** — `obi.index`: fix 4 pubsub bugs, add tests, deploy publicly
- **Phase 4** — `obidot/app`: wire addresses + indexer, real deposit/swap txs
- **Phase 5** — `obidot/agent`: EIP-712 intent signing, auto-execution, 24/7 deploy
- **Phase 6** — `obi.router`: `RelayTeleportAdapter`, `KaruraAdapter`, Moonbeam/Interlay stubs
- **Phase 7** — `obi.router`: run `SelfRelay.mjs` (pending PAS0 relayer fix)
- **Phase 8** — All repos: final docs, ABI regen, integration tests
