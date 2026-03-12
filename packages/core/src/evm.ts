/**
 * EVM chain abstraction layer.
 *
 * Provides a lightweight context for interacting with EVM-compatible
 * chains (e.g. Moonbeam, Astar EVM, Polkadot Hub EVM) using `viem`.
 * This sits alongside the existing `polkadot.ts` Substrate context.
 */

import {
  type Account,
  type Chain,
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
} from "viem";

import type { PoolType } from "./types.js";

// ── Obi EVM context types ───────────────────────────────────────────────

/**
 * Bundles a `viem` `PublicClient` together with chain metadata so that
 * every EVM tool / operation in the kit has everything it needs to read
 * on-chain state from an EVM-compatible network.
 *
 * Optionally includes a `WalletClient` for write operations (deposits,
 * withdrawals, strategy execution, etc.).
 */
export interface ObiEvmContext {
  /** viem public client connected to the EVM chain. */
  readonly client: PublicClient;
  /** viem wallet client for signing transactions. Undefined in read-only mode. */
  readonly walletClient?: WalletClient;
  /** viem `Chain` definition (includes chain ID, RPC URLs, etc.). */
  readonly chain: Chain;
  /** Human-readable chain name for display and logging. */
  readonly chainName: string;
  /** The signer account address. Undefined in read-only mode. */
  readonly account?: `0x${string}`;
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
  /**
   * Optional viem `Account` for signing transactions.
   * When provided, a `WalletClient` is also created.
   * Accepts a viem `Account` object (e.g. from `privateKeyToAccount()`).
   */
  readonly account?: Account;
}

/**
 * Convenience factory that creates a ready-to-use `ObiEvmContext`.
 *
 * It instantiates a `viem` `PublicClient` configured with an HTTP
 * transport and returns the fully wired context object. When an
 * `account` is provided, a `WalletClient` is also created for
 * signing and submitting transactions.
 *
 * @example
 * ```ts
 * import { createEvmContext } from '@obidot-kit/core';
 * import { moonbeam } from 'viem/chains';
 *
 * // Read-only context
 * const readOnly = createEvmContext({
 *   rpcUrl: 'https://rpc.api.moonbeam.network',
 *   chain: moonbeam,
 *   chainName: 'Moonbeam',
 * });
 *
 * // Read-write context with signer
 * import { privateKeyToAccount } from 'viem/accounts';
 * const account = privateKeyToAccount('0x...');
 * const readWrite = createEvmContext({
 *   rpcUrl: 'https://rpc.api.moonbeam.network',
 *   chain: moonbeam,
 *   chainName: 'Moonbeam',
 *   account,
 * });
 * ```
 */
export function createEvmContext(
  options: CreateEvmContextOptions,
): ObiEvmContext {
  const transport = http(options.rpcUrl);

  const client = createPublicClient({
    chain: options.chain,
    transport,
  });

  let walletClient: WalletClient | undefined;
  if (options.account) {
    walletClient = createWalletClient({
      account: options.account,
      chain: options.chain,
      transport,
    });
  }

  return {
    client: client as PublicClient,
    walletClient,
    chain: options.chain,
    chainName: options.chainName,
    account: options.account?.address,
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

// ── Swap Router Context ─────────────────────────────────────────────────

/**
 * Extended EVM context that includes SwapRouter and SwapQuoter contract
 * addresses for DEX aggregation operations on Polkadot Hub.
 */
export interface ObiSwapRouterContext extends ObiEvmContext {
  /** SwapRouter contract address */
  readonly swapRouterAddress: `0x${string}`;
  /** SwapQuoter contract address */
  readonly quoterAddress: `0x${string}`;
  /** Optional: known pool adapter addresses keyed by PoolType */
  readonly adapters?: Partial<Record<PoolType, `0x${string}`>>;
}

/**
 * Options accepted when constructing an `ObiSwapRouterContext`.
 */
export interface CreateSwapRouterContextOptions extends CreateEvmContextOptions {
  /** SwapRouter contract address */
  readonly swapRouterAddress: `0x${string}`;
  /** SwapQuoter contract address */
  readonly quoterAddress: `0x${string}`;
  /** Optional: known pool adapter addresses keyed by PoolType */
  readonly adapters?: Partial<Record<PoolType, `0x${string}`>>;
}

/**
 * Creates an EVM context with SwapRouter/SwapQuoter addresses bundled in.
 *
 * @example
 * ```ts
 * import { createSwapRouterContext } from '@obidot-kit/core';
 * import { polkadotHubTestnet } from '@obidot-kit/core';
 *
 * const ctx = createSwapRouterContext({
 *   rpcUrl: 'https://eth-rpc-testnet.polkadot.io/',
 *   chain: polkadotHubTestnet,
 *   chainName: 'Polkadot Hub TestNet',
 *   swapRouterAddress: '0x...',
 *   quoterAddress: '0x...',
 * });
 * ```
 */
export function createSwapRouterContext(
  options: CreateSwapRouterContextOptions,
): ObiSwapRouterContext {
  const base = createEvmContext(options);

  return {
    ...base,
    swapRouterAddress: options.swapRouterAddress,
    quoterAddress: options.quoterAddress,
    adapters: options.adapters,
  };
}
