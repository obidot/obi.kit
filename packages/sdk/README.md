# @obidot-kit/sdk

High-level SDK that composes `@obidot-kit/core` and `@obidot-kit/llm`.

## Install

```sh
pnpm add @obidot-kit/sdk @langchain/core viem
```

## Use

```ts
import { ObiKit } from "@obidot-kit/sdk";

const kit = new ObiKit({ evmContext });
const tools = kit.getTools();
```

Use this package when you want the quickest path to a configured Obidot Kit
instance without wiring the lower-level packages yourself.

## What it composes

- `@obidot-kit/core` addresses, ABIs, and chain helpers
- `@obidot-kit/llm` tool families for swap, liquidity, vault, cross-chain, and ops workflows
- preconfigured route-status vocabulary and shipped Hub testnet defaults used across the app and examples

For the full kit, examples, and release notes, see:
https://github.com/obidot/obi-kit
