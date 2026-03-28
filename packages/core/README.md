# @obidot-kit/core

Core chain config, addresses, ABIs, and EVM context helpers for Obidot Kit.

## Install

```sh
pnpm add @obidot-kit/core viem
```

## Use

```ts
import { createEvmContext, OBIDOT_VAULT_ADDRESS } from "@obidot-kit/core";

const evmContext = createEvmContext({
  rpcUrl: "https://eth-rpc-testnet.polkadot.io/",
  privateKey: process.env.PRIVATE_KEY,
});
```

## What is included

- Polkadot Hub TestNet addresses and chain helpers
- ABI exports for vault, router, oracle, liquidity, and cross-chain contracts
- Adapter ABIs including Hydration, Asset Hub, RelayTeleport, and Chainflip surfaces
- Shared EVM context creation for viem-based apps and tools

For the full kit, examples, and release notes, see:
https://github.com/obidot/obi-kit
