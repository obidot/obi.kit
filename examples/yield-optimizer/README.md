# Yield Optimizer Example

Preview-first strategy scout for comparing current Obidot vault state against the available Bifrost yield catalogue.

## Workflow boundary

- This example is intentionally read-only.
- It uses the current SDK surface: `PerformanceTool`, `CrossChainStateTool`, `CrossChainRouteTool`, and `BifrostYieldTool`.
- It can print an optional route preview when `ROUTE_TOKEN_OUT` is configured.
- It does **not** move funds or submit liquidity actions.
- `LiquidityAddTool` and `LiquidityRemoveTool` are available in the kit, but this example intentionally stops at recommendation + preview output for manual follow-up.

## Data caveats

- `PerformanceTool` reads live Hub vault state when the configured vault is reachable.
- `CrossChainStateTool` reports the configured satellite topology, but defaults to stub summaries unless you wire live satellite contexts yourself.
- `BifrostYieldTool` uses the built-in placeholder catalogue by default. Replace it with a custom provider before treating APYs as live production inputs.

## Setup

```sh
pnpm install
cp .env.example .env
pnpm start
```

## What it does

1. Reads current Hub vault performance and idle asset levels.
2. Reads the configured cross-chain topology summary.
3. Fetches the current Bifrost yield catalogue for the selected category.
4. Optionally previews currently supported cross-chain routes for `ASSET_ADDRESS -> ROUTE_TOKEN_OUT`.
5. Picks the highest-APY candidate and prints a recommendation report.
6. Stops with explicit blockers instead of faking execution.

## Example output

- The top Bifrost candidate for the chosen category
- Current idle-vs-remote vault posture
- Satellite footprint summary
- Optional route scout output with `live | simulated | mainnet_only | coming_soon` statuses
- A recommendation such as `manual-review-bifrost-farming`
- Explicit blockers explaining why no funds were moved

## Next step when the tool surface expands

Once the example is wired to strategy-specific token mapping and approval rules, it can become a two-stage flow:

1. Preview and rank the target deployment.
2. Build a route and liquidity action for explicit operator approval.
