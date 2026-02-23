/**
 * EVM chain abstraction layer.
 *
 * Provides a lightweight context for interacting with EVM-compatible
 * chains (e.g. Moonbeam, Astar EVM) using `viem`. This sits alongside
 * the existing `polkadot.ts` Substrate context.
 */

import { type Chain, createPublicClient, http, type PublicClient } from 'viem';

// ── Obi EVM context types ───────────────────────────────────────────────

/**
 * Bundles a `viem` `PublicClient` together with chain metadata so that
 * every EVM tool / operation in the kit has everything it needs to read
 * on-chain state from an EVM-compatible network.
 */
export interface ObiEvmContext {
  /** viem public client connected to the EVM chain. */
  readonly client: PublicClient;
  /** viem `Chain` definition (includes chain ID, RPC URLs, etc.). */
  readonly chain: Chain;
  /** Human-readable chain name for display and logging. */
  readonly chainName: string;
}

/**
 * Options accepted when constructing an `ObiEvmContext` via the helper
 * factory {@link createEvmContext}.
 */
export interface CreateEvmContextOptions {
  /** JSON-RPC URL for the EVM chain. */
  readonly rpcUrl: string;
  /** viem `Chain` definition describing the target EVM network. */
  readonly chain: Chain;
  /** Human-readable chain name for display and logging. */
  readonly chainName: string;
}

/**
 * Convenience factory that creates a ready-to-use `ObiEvmContext`.
 *
 * It instantiates a `viem` `PublicClient` configured with an HTTP
 * transport and returns the fully wired context object.
 *
 * @example
 * ```ts
 * import { createEvmContext } from '@obidot-kit/core';
 * import { moonbeam } from 'viem/chains';
 *
 * const ctx = createEvmContext({
 *   rpcUrl: 'https://rpc.api.moonbeam.network',
 *   chain: moonbeam,
 *   chainName: 'Moonbeam',
 * });
 * ```
 */
export function createEvmContext(options: CreateEvmContextOptions): ObiEvmContext {
  const client = createPublicClient({
    chain: options.chain,
    transport: http(options.rpcUrl),
  });

  return {
    client: client as PublicClient,
    chain: options.chain,
    chainName: options.chainName,
  };
}

/**
 * Tears down an EVM context by releasing transport resources.
 *
 * For HTTP transports this is essentially a no-op, but calling it
 * ensures consistent lifecycle management across all context types
 * and future-proofs against WebSocket transports.
 */
export function destroyEvmContext(_ctx: ObiEvmContext): void {
  // HTTP transports are stateless — nothing to clean up.
  // If we later support WebSocket transports, close the socket here.
}
