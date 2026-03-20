# Changelog

All notable changes to `obi-kit` are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [0.2.0] — 2026-03-15

### Added

#### `@obidot-kit/core`

- `ObiPolkadotContext.evmContext` — optional embedded `ObiEvmContext` for EVM
  contract calls via Polkadot Hub ETH-RPC (pallet-revive, not Frontier)
- `createPolkadotContext()` — new options: `includeEvm`, `privateKey`, `evmRpcUrl`;
  auto-creates a viem wallet client targeting `https://eth-rpc-testnet.polkadot.io/`
  when `includeEvm: true` and a private key is supplied
- `destroyPolkadotContext()` — graceful teardown helper
- `ObiWsClient` — WebSocket client for real-time event subscriptions
- ABI sync pipeline (`scripts/sync-abis.ts`) — generates TypeScript ABI files from
  Foundry `out/` artifacts; run via `pnpm sync:abis`
- `SwapRouter`, `SwapQuoter`, `PoolAdapter` ABIs
- Deployed addresses for Paseo TestNet (all 12 contracts in `addresses.ts`)
- `PoolType` enum, `SwapRouterConfig`, `ObiSwapRouterContext`
- `createSwapRouterContext()` helper

#### `@obidot-kit/llm`

- `VaultDepositTool` — Polkadot mode now delegates to EVM path when
  `polkadotContext.evmContext` is present (avoids stub for hub-side deposits)
- `VaultWithdrawTool` — same EVM delegation for polkadot mode
- `VaultPolicyTool` — read vault access-control policy on-chain
- `OracleUpdateTool` — push a new price via `KeeperOracle.setPrice()`
- `VaultAdminTool` — read vault admin state (roles, fees, pause status)
- `SwapQuoteTool`, `SwapExecuteTool`, `SwapMultiHopTool` — DEX aggregator tools
  wrapping `SwapRouter` / `SwapQuoter` on-chain
- `ExecuteLocalSwapTool`, `ExecuteIntentTool` — intent execution tools
- `EvmBifrostStrategyService` — real viem-based Bifrost strategy dispatch
- `EvmCrossChainService` — real ISMP cross-chain dispatch via `HyperExecutor`

#### `@obidot-kit/sdk`

- `ObiKit.registerSwapRouter()` — register a swap router config
- `ObiKit.buildEvmVaultTools()` — returns all 11 EVM vault tools including new
  policy, oracle, and admin tools
- `ObiKit.buildBifrostTools()` and `ObiKit.buildCrossChainTools()` use real services

#### `@obidot-kit/cli`

- `obi-kit init` — scaffold a new agent project
- `obi-kit run` — run an agent from a config file (loads `.env`, invokes agent)
- `obi-kit info` — print installed package versions and connected chain info

### Changed

- `executeEvmDeposit` / `executeEvmWithdraw` refactored to accept an explicit
  `ObiEvmContext` parameter (enables polkadot context delegation without mutation)

### Fixed

- Dynamic imports in tool `execute()` methods replaced with static imports to
  prevent Vitest test timeouts

---

## [0.1.0] — 2026-01-01

### Added

- Initial release: `@obidot-kit/core`, `@obidot-kit/llm`, `@obidot-kit/sdk`,
  `@obidot-kit/cli` (stub)
- 10 LangChain tools: `VaultDepositTool`, `VaultWithdrawTool`, `VaultStateTool`,
  `BifrostYieldTool`, `BifrostStrategyTool`, `CrossChainStateTool`,
  `CrossChainRebalanceTool`, `OracleCheckTool`, `PerformanceTool`,
  `WithdrawalQueueTool`
- Core type system: `ChainConfig`, `EvmVaultConfig`, `VaultAction`, `ToolResult`,
  Bifrost types, cross-chain types
- EVM context (`ObiEvmContext`, `createEvmContext`)
- 225 tests passing
