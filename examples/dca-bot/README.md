# DCA Bot Example

Recurring DCA scaffold for buying tDOT with tUSDC on Polkadot Hub Testnet.

## Workflow boundary

- Preview mode is the default and only fetches a live quote.
- Execution mode is opt-in via `EXECUTE_SWAPS=true`.
- The scaffold uses the live tUSDC/tDOT UniswapV2 pair on Polkadot Hub Testnet.

## Setup

```sh
pnpm install
cp .env.example .env
pnpm start
```

## Execution mode

1. Set `PRIVATE_KEY=0x...` in `.env`
2. Set `EXECUTE_SWAPS=true`
3. Run `pnpm start`

The bot will:

1. Fetch a live quote for the configured recurring buy.
2. Stop after the quote in preview mode.
3. Approve the router and submit the swap in execution mode.

## Scheduling

Use cron, GitHub Actions, or any external scheduler to run the script on your cadence:

```sh
0 9 * * 1 pnpm start
```

That gives you a weekly Monday 09:00 DCA run while keeping the script itself deterministic and automation-friendly.
