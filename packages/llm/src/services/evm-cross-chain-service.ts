import type { ObiEvmContext } from "@obidot-kit/core";
import { CROSS_CHAIN_ROUTER_ABI } from "@obidot-kit/core";

// ─────────────────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * On-chain state read from the CrossChainRouter contract.
 */
export interface RouterState {
  /** Whether the router is currently paused. */
  paused: boolean;
  /** Current outgoing nonce (incremented on each broadcast). */
  outgoingNonce: bigint;
  /** Number of pending satellite deposit confirmations awaited. */
  pendingSatelliteDeposits: bigint;
  /** Number of pending withdrawal requests awaited. */
  pendingWithdrawalRequests: bigint;
  /** Number of registered satellite chains. */
  satelliteChainCount: bigint;
  /** Relayer incentive fee (in USD.h wei, 18-decimal). */
  relayerFee: bigint;
}

/**
 * Result of a `broadcastAssetSync` dispatch.
 */
export interface BroadcastSyncResult {
  /** Transaction hash of the broadcast. */
  txHash: string;
  /** Arguments passed to the contract. */
  globalTotalAssets: bigint;
  globalTotalShares: bigint;
  totalRemoteAssets: bigint;
}

/**
 * Options for constructing an `EvmCrossChainService`.
 */
export interface EvmCrossChainServiceOptions {
  /** Fully initialised EVM context (public client required; wallet client optional). */
  evmContext: ObiEvmContext;
  /** Address of the CrossChainRouter contract. */
  routerAddress: `0x${string}`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  EvmCrossChainService
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Real viem-backed service for reading and interacting with the
 * `CrossChainRouter` contract deployed on Polkadot Hub.
 *
 * ### What CrossChainRouter actually does
 *
 * The router is a **hub-side ISMP receiver**: it receives incoming ISMP
 * messages from satellite vaults and dispatches acknowledgements back.
 *
 * - Satellite→Hub flows arrive via `onAccept()` (called by the ISMP host).
 * - Hub→Satellite "push" flows (asset sync, strategy reports, emergency sync)
 *   are dispatched by calling `broadcastAssetSync()` etc., which requires
 *   `DISPATCHER_ROLE`.
 * - Hub→Satellite deposit/withdraw flows are vault-mediated: the agent must
 *   call `vault.executeIntent()` with `DestType.Hyper`, not the router directly.
 *
 * ### Role requirements
 *
 * | Function              | Required role      |
 * | --------------------- | ------------------ |
 * | `broadcastAssetSync`  | `DISPATCHER_ROLE`  |
 * | `sendDepositAck`      | `VAULT_ROLE`       |
 * | `sendWithdrawFulfill` | `VAULT_ROLE`       |
 * | All view functions    | None               |
 *
 * The admin EOA (`0x5984A519…`) holds `DEFAULT_ADMIN_ROLE` and may be granted
 * `DISPATCHER_ROLE` to call `broadcastAssetSync` directly.
 *
 * @example
 * ```ts
 * import { createEvmContext } from '@obidot-kit/core';
 * import { EvmCrossChainService } from '@obidot-kit/llm';
 *
 * const ctx = createEvmContext({ rpcUrl, chain, chainName, account });
 * const service = new EvmCrossChainService({
 *   evmContext: ctx,
 *   routerAddress: '0xE2fFfb3B5C72f99811bC20D857035611bFCe5b5d',
 * });
 *
 * const state = await service.readRouterState();
 * console.log(state.pendingSatelliteDeposits);
 *
 * const { txHash } = await service.broadcastSync(1000n, 1000n, 0n);
 * ```
 */
export class EvmCrossChainService {
  private readonly evmContext: ObiEvmContext;
  private readonly routerAddress: `0x${string}`;

  constructor(options: EvmCrossChainServiceOptions) {
    this.evmContext = options.evmContext;
    this.routerAddress = options.routerAddress;
  }

  // ── Read methods ──────────────────────────────────────────────────────────

  /**
   * Read the current state of the CrossChainRouter in a single multicall.
   *
   * Reads: `paused`, `outgoingNonce`, `pendingSatelliteDeposits`,
   * `pendingWithdrawalRequests`, `satelliteChainCount`, `relayerFee`.
   */
  async readRouterState(): Promise<RouterState> {
    const [
      paused,
      outgoingNonce,
      pendingSatelliteDeposits,
      pendingWithdrawalRequests,
      satelliteChainCount,
      relayerFee,
    ] = await Promise.all([
      this.evmContext.client.readContract({
        address: this.routerAddress,
        abi: CROSS_CHAIN_ROUTER_ABI,
        functionName: "paused",
      }) as Promise<boolean>,
      this.evmContext.client.readContract({
        address: this.routerAddress,
        abi: CROSS_CHAIN_ROUTER_ABI,
        functionName: "outgoingNonce",
      }) as Promise<bigint>,
      this.evmContext.client.readContract({
        address: this.routerAddress,
        abi: CROSS_CHAIN_ROUTER_ABI,
        functionName: "pendingSatelliteDeposits",
      }) as Promise<bigint>,
      this.evmContext.client.readContract({
        address: this.routerAddress,
        abi: CROSS_CHAIN_ROUTER_ABI,
        functionName: "pendingWithdrawalRequests",
      }) as Promise<bigint>,
      this.evmContext.client.readContract({
        address: this.routerAddress,
        abi: CROSS_CHAIN_ROUTER_ABI,
        functionName: "satelliteChainCount",
      }) as Promise<bigint>,
      this.evmContext.client.readContract({
        address: this.routerAddress,
        abi: CROSS_CHAIN_ROUTER_ABI,
        functionName: "relayerFee",
      }) as Promise<bigint>,
    ]);

    return {
      paused,
      outgoingNonce,
      pendingSatelliteDeposits,
      pendingWithdrawalRequests,
      satelliteChainCount,
      relayerFee,
    };
  }

  // ── Write methods ─────────────────────────────────────────────────────────

  /**
   * Broadcast a global asset sync to all registered satellite chains.
   *
   * Calls `CrossChainRouter.broadcastAssetSync(globalTotalAssets,
   * globalTotalShares, totalRemoteAssets)` via ISMP.
   *
   * **Requires `DISPATCHER_ROLE`** on the router for the calling account.
   *
   * @param globalTotalAssets - Total assets across hub + all satellites (18-decimal).
   * @param globalTotalShares - Total ERC-4626 shares outstanding (18-decimal).
   * @param totalRemoteAssets - Assets currently held by satellite vaults (18-decimal).
   */
  async broadcastSync(
    globalTotalAssets: bigint,
    globalTotalShares: bigint,
    totalRemoteAssets: bigint,
  ): Promise<BroadcastSyncResult> {
    if (!this.evmContext.walletClient || !this.evmContext.account) {
      throw new Error(
        "EvmCrossChainService: walletClient and account are required for broadcastSync",
      );
    }

    const txHash = await this.evmContext.walletClient.writeContract({
      address: this.routerAddress,
      abi: CROSS_CHAIN_ROUTER_ABI,
      functionName: "broadcastAssetSync",
      args: [globalTotalAssets, globalTotalShares, totalRemoteAssets],
      chain: this.evmContext.chain,
      account: this.evmContext.account as `0x${string}`,
    });

    await this.evmContext.client.waitForTransactionReceipt({ hash: txHash });

    return { txHash, globalTotalAssets, globalTotalShares, totalRemoteAssets };
  }
}
