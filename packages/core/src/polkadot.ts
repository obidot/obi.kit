/**
 * Polkadot substrate context for obi-kit.
 *
 * `ObiPolkadotContext` bundles a PAK `PolkadotApi` substrate client together
 * with a `PolkadotSigner` and an optional `ObiEvmContext` for EVM interactions
 * via the Polkadot Hub ETH-RPC endpoint.
 *
 * Polkadot Hub (pallet-revive) exposes an Ethereum-compatible JSON-RPC at
 * `https://eth-rpc-testnet.polkadot.io/` (testnet) and
 * `https://eth-rpc.polkadot.io/` (mainnet).  EVM contracts on Polkadot Hub
 * are therefore reachable via viem — there is no `ethereum::transact()`
 * substrate extrinsic on Polkadot Hub (that is a Frontier/Moonbeam concept).
 *
 * The recommended pattern for deposits/withdrawals from a substrate wallet is:
 * 1. Call `createPolkadotContext({ ..., includeEvm: true })` to attach a
 *    viem wallet client derived from the same private key.
 * 2. Use `ctx.evmContext` in the deposit/withdraw tools for the actual EVM
 *    call, while `ctx.api` / `ctx.signer` remain available for native
 *    substrate operations (e.g. XCM, governance).
 */

// ── Re-exports from @polkadot-agent-kit/common ─────────────────────────
export type { KnownChainId } from '@polkadot-agent-kit/common';
export type { IPolkadotApi } from '@polkadot-agent-kit/core';
// ── Re-exports from @polkadot-agent-kit/core ────────────────────────────
export { PolkadotApi } from '@polkadot-agent-kit/core';

// ── Re-exports from polkadot-api ────────────────────────────────────────
export type { PolkadotSigner } from 'polkadot-api';

// ── Internal ────────────────────────────────────────────────────────────
import type { ObiEvmContext } from './evm.js';

// ── Obi-kit context types ───────────────────────────────────────────────

/**
 * Bundles a connected PAK `PolkadotApi` instance together with a
 * `PolkadotSigner` so that every tool / operation in the kit has
 * everything it needs to read chain state and submit substrate transactions.
 *
 * The optional `evmContext` field provides a viem client connected to the
 * Polkadot Hub ETH-RPC endpoint so that EVM contracts on the hub can be
 * called without needing a separate EVM context.
 */
export interface ObiPolkadotContext {
  /** Initialised PAK API client (call `initializeApi()` before use). */
  readonly api: import('@polkadot-agent-kit/core').PolkadotApi;
  /** Signer used to sign and submit substrate extrinsics. */
  readonly signer: import('polkadot-api').PolkadotSigner;
  /** The on-chain SS58 address that corresponds to `signer`. */
  readonly address: string;
  /**
   * Optional viem EVM context for Polkadot Hub EVM contract interactions.
   *
   * When present, `VaultDepositTool` / `VaultWithdrawTool` will use this
   * context to send EVM transactions via the Polkadot Hub ETH-RPC rather
   * than returning a `"pending"` stub.
   *
   * Populate via `createPolkadotContext({ ..., includeEvm: true })` or
   * construct manually with `createEvmContext()`.
   */
  readonly evmContext?: ObiEvmContext;
}

/**
 * Options accepted when constructing an `ObiPolkadotContext` via the
 * helper factory {@link createPolkadotContext}.
 */
export interface CreatePolkadotContextOptions {
  /** Signer used to sign and submit extrinsics. */
  readonly signer: import('polkadot-api').PolkadotSigner;
  /** The on-chain SS58 address that corresponds to `signer`. */
  readonly address: string;
  /**
   * Optional list of chain IDs to initialise via PAK.
   * When omitted the PAK default set is used.
   */
  readonly allowedChains?: import('@polkadot-agent-kit/common').KnownChainId[];
  /**
   * When `true`, also creates a viem `ObiEvmContext` using the Polkadot Hub
   * ETH-RPC endpoint so that EVM contracts can be called directly.
   *
   * Requires a `privateKey` or `account` to be provided.
   *
   * @default false
   */
  readonly includeEvm?: boolean;
  /**
   * Private key (hex, with or without `0x` prefix) used to create the viem
   * wallet client when `includeEvm: true`.  Ignored otherwise.
   */
  readonly privateKey?: string;
  /**
   * Override the Polkadot Hub ETH-RPC URL.
   * Defaults to `https://eth-rpc-testnet.polkadot.io/` (testnet).
   */
  readonly evmRpcUrl?: string;
}

/**
 * Convenience factory that creates a ready-to-use `ObiPolkadotContext`.
 *
 * It instantiates a PAK `PolkadotApi`, calls `initializeApi()`, and returns
 * the fully wired context object.
 *
 * If `options.includeEvm` is `true` and `options.privateKey` is provided,
 * a viem `ObiEvmContext` is also created and attached as `ctx.evmContext`.
 *
 * @example
 * ```ts
 * import { createPolkadotContext, polkadotHubTestnet } from '@obidot-kit/core';
 * import { getPolkadotSigner } from 'polkadot-api/signer';
 *
 * const ctx = await createPolkadotContext({
 *   signer: getPolkadotSigner(publicKey, sign),
 *   address: '5GrwvaEF...',
 *   allowedChains: ['paseo_asset_hub'],
 *   includeEvm: true,
 *   privateKey: process.env.PRIVATE_KEY,
 * });
 * ```
 */
export async function createPolkadotContext(options: CreatePolkadotContextOptions): Promise<ObiPolkadotContext> {
  // Dynamic import so that the heavy smoldot wasm blob is only loaded
  // when this helper is actually called.
  const { PolkadotApi } = await import('@polkadot-agent-kit/core');

  const api = new PolkadotApi(options.allowedChains);
  await api.initializeApi();

  let evmContext: ObiEvmContext | undefined;
  if (options.includeEvm && options.privateKey) {
    const { createEvmContext } = await import('./evm.js');
    const { polkadotHubTestnet } = await import('./chains.js');
    const { privateKeyToAccount } = await import('viem/accounts');

    const pkHex = options.privateKey.startsWith('0x') ? options.privateKey : `0x${options.privateKey}`;
    const account = privateKeyToAccount(pkHex as `0x${string}`);
    const rpcUrl = options.evmRpcUrl ?? 'https://eth-rpc-testnet.polkadot.io/';
    evmContext = createEvmContext({
      rpcUrl,
      chain: polkadotHubTestnet,
      chainName: 'Polkadot Hub TestNet',
      account,
    });
  }

  return {
    api,
    signer: options.signer,
    address: options.address,
    evmContext,
  };
}

/**
 * Gracefully disconnects all chain connections held by the context.
 */
export async function destroyPolkadotContext(ctx: ObiPolkadotContext): Promise<void> {
  await ctx.api.disconnect();
}
