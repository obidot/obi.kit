# Arbitrage Bot Example

Spread-monitor scaffold for Polkadot Hub Testnet liquidity pairs.

## Workflow boundary

- Preview mode is the default and only scans for route mismatches.
- Execution mode is opt-in via `EXECUTE_SWAPS=true`.
- The script reports reserve-based spread estimates, not guaranteed profit.

## Setup

```sh
pnpm install
cp .env.example .env
pnpm start
```

## What it does

1. Reads the configured liquidity pairs.
2. Compares direct pool output against two-hop route output for the same entry token.
3. Prints the top opportunities above the configured threshold.
4. Optionally submits the best two-hop route through `SwapMultiHopTool`.

## Profit and risk notes

- These opportunities are reserve snapshots, not executable guarantees.
- Gas, slippage, approvals, latency, and route invalidation can erase the spread.
- Keep preview mode on until you have separate execution controls and post-trade accounting.
