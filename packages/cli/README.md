# @obidot-kit/cli

Command-line entrypoint for scaffolding and inspecting Obidot Kit projects.

## Install

```sh
pnpm add -g @obidot-kit/cli
```

For one-off runs:

```sh
pnpm dlx @obidot-kit/cli info
```

## Commands

```sh
obi-kit info
obi-kit init my-agent --template starter
obi-kit init my-vault-agent --template vault-agent
obi-kit init my-cross-chain-agent --template cross-chain-agent
obi-kit init my-dca-bot --template dca-bot
obi-kit init my-yield-optimizer --template yield-optimizer
```

## Templates

- `starter` — minimal inspection scaffold
- `vault-agent` — signer-aware hub vault workflow
- `cross-chain-agent` — cross-chain state and route planning scaffold
- `dca-bot` — recurring tUSDC -> tDOT execution example
- `yield-optimizer` — preview-first optimizer example

`arbitrage-bot` remains a checked-in example in the repo, but it is not an `init` template yet.

For the full kit, examples, and release notes, see:
https://github.com/obidot/obi-kit
