/**
 * Polkadot Agent Kit integration layer.
 *
 * Re-exports key types from `@polkadot-agent-kit/core` and
 * `@polkadot-agent-kit/common`, and provides an `ObiPolkadotContext`
 * that bundles the API client + signer for use throughout obi-kit.
 */

// ── Re-exports from @polkadot-agent-kit/common ─────────────────────────
export type { KnownChainId } from '@polkadot-agent-kit/common';
export type { IPolkadotApi } from '@polkadot-agent-kit/core';
// ── Re-exports from @polkadot-agent-kit/core ────────────────────────────
export { PolkadotApi } from '@polkadot-agent-kit/core';

// ── Re-exports from polkadot-api ────────────────────────────────────────
export type { PolkadotSigner } from 'polkadot-api';

// ── Obi-kit context types ───────────────────────────────────────────────

/**
 * Bundles a connected `PolkadotApi` instance together with a
 * `PolkadotSigner` so that every tool / operation in the kit has
 * everything it needs to read chain state and submit transactions.
 */
export interface ObiPolkadotContext {
  /** Initialised PAK API client (call `initializeApi()` before use). */
  readonly api: import('@polkadot-agent-kit/core').PolkadotApi;
  /** Signer used to sign and submit extrinsics. */
  readonly signer: import('polkadot-api').PolkadotSigner;
  /** The on-chain SS58 address that corresponds to `signer`. */
  readonly address: string;
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
   * Optional list of chain IDs to initialise.
   * When omitted the PAK default set is used.
   */
  readonly allowedChains?: import('@polkadot-agent-kit/common').KnownChainId[];
}

/**
 * Convenience factory that creates a ready-to-use `ObiPolkadotContext`.
 *
 * It instantiates a `PolkadotApi`, calls `initializeApi()`, and returns
 * the fully wired context object.
 *
 * @example
 * ```ts
 * import { createPolkadotContext } from '@obidot-kit/core';
 * import { getPolkadotSigner } from 'polkadot-api/signer';
 *
 * const ctx = await createPolkadotContext({
 *   signer: getPolkadotSigner(/* ... *\/),
 *   address: '5GrwvaEF...',
 *   allowedChains: ['polkadot', 'polkadot_asset_hub'],
 * });
 * ```
 */
export async function createPolkadotContext(options: CreatePolkadotContextOptions): Promise<ObiPolkadotContext> {
  // Dynamic import so that the heavy smoldot wasm blob is only loaded
  // when this helper is actually called.
  const { PolkadotApi } = await import('@polkadot-agent-kit/core');

  const api = new PolkadotApi(options.allowedChains);
  await api.initializeApi();

  return {
    api,
    signer: options.signer,
    address: options.address,
  };
}

/**
 * Gracefully disconnects all chain connections held by the context.
 */
export async function destroyPolkadotContext(ctx: ObiPolkadotContext): Promise<void> {
  await ctx.api.disconnect();
}
