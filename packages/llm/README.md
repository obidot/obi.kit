# @obidot-kit/llm

LangChain-compatible tools and agent helpers for Obidot Kit.

## Install

```sh
pnpm add @obidot-kit/llm @langchain/core
```

## Use

```ts
import { createAgent } from "@obidot-kit/llm";

const agent = createAgent({
  model,
  additionalTools: tools,
});
```

Tool coverage includes swaps, liquidity, cross-chain planning, vault actions,
oracle checks, and strategy helpers.

## Tool families

- Swap and routing: `SwapQuoteTool`, `SwapExecuteTool`, `SwapMultiHopTool`, `ExecuteLocalSwapTool`
- Liquidity: `LiquidityAddTool`, `LiquidityRemoveTool`, `LpPoolStateTool`
- Vault and policy: `VaultStateTool`, `VaultDepositTool`, `VaultWithdrawTool`, `VaultAdminTool`, `WithdrawalQueueTool`
- Cross-chain and yield: `CrossChainStateTool`, `CrossChainRouteTool`, `CrossChainRebalanceTool`, `BifrostYieldTool`, `BifrostStrategyTool`
- Risk and operations: `PerformanceTool`, `OracleCheckTool`, `OracleUpdateTool`, `BatchStrategyTool`, `ExecuteIntentTool`

`CrossChainRouteTool` uses the same route-status vocabulary as the app:
`live`, `simulated`, `mainnet_only`, and `coming_soon`.

For the full kit, examples, and release notes, see:
https://github.com/obidot/obi-kit
