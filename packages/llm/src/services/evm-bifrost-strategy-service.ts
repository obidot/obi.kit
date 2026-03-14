import type { BifrostCurrencyId, BifrostStrategyType, ObiEvmContext } from '@obidot-kit/core';
import { BIFROST_ADAPTER_ABI } from '@obidot-kit/core';
import type { BifrostStrategyService } from '../tools/bifrost-strategy.js';

// ─────────────────────────────────────────────────────────────────────────────
//  EvmBifrostStrategyService
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Real viem-backed implementation of `BifrostStrategyService`.
 *
 * Calls `BifrostAdapter.previewStrategy()` to validate inputs and
 * `BifrostAdapter.executeBifrostStrategy()` to dispatch an XCM message
 * to Bifrost parachain 2030.
 *
 * Because `previewStrategy` is a `pure` function that returns only the
 * encoded XCM calldata (not on-chain amounts), `previewStrategy()` here
 * returns a conservative estimate: `{ expectedOut: amount, fee: 0n }`.
 * Actual output is determined asynchronously on Bifrost via XCM.
 *
 * @example
 * ```ts
 * import { createEvmContext } from '@obidot-kit/core';
 * import { EvmBifrostStrategyService } from '@obidot-kit/llm';
 *
 * const ctx = createEvmContext({ rpcUrl, chain, chainName, account });
 * const service = new EvmBifrostStrategyService(
 *   ctx,
 *   '0x265Cb785De0fF2e5BcebDEb53095aDCAE9175527',
 * );
 * const { expectedOut } = await service.previewStrategy(0, 0, 1_000_000_000n, 0);
 * const { txHash } = await service.executeStrategy(0, 0, 1_000_000_000n, 0n, 0);
 * ```
 */
export class EvmBifrostStrategyService implements BifrostStrategyService {
  constructor(
    private readonly evmContext: ObiEvmContext,
    private readonly adapterAddress: `0x${string}`,
  ) {}

  /**
   * Preview a Bifrost strategy by calling `BifrostAdapter.previewStrategy()`.
   *
   * The contract function is `pure` — it validates inputs and encodes the
   * XCM message but does not return an expected output amount (the swap
   * happens asynchronously on Bifrost via XCM). This function therefore
   * returns a conservative estimate:
   * - `expectedOut = amount` (1:1, no slippage assumed)
   * - `fee = 0n` (XCM delivery fee is paid by the BifrostAdapter DOT balance)
   */
  async previewStrategy(
    strategyType: BifrostStrategyType,
    currencyIn: BifrostCurrencyId,
    amount: bigint,
    poolId: number,
  ): Promise<{ expectedOut: bigint; fee: bigint }> {
    // Build the BifrostStrategy struct — use currencyIn for both A and B
    // (currencyIdB is the output currency; for SLP/DEX we use the same ID
    // as a placeholder since the contract is pure and the output isn't read).
    const strategy = {
      strategyType: strategyType as number,
      currencyIdA: currencyIn as number,
      currencyIdB: currencyIn as number,
      amount,
      minOutput: 0n,
      poolId: BigInt(poolId),
      beneficiary: `0x${'00'.repeat(32)}` as `0x${string}`,
    };

    // readContract calls the pure function — validates inputs and encodes the
    // XCM message without sending a tx. If the contract reverts (e.g. invalid
    // strategyType/currency), this throws.
    await this.evmContext.client.readContract({
      address: this.adapterAddress,
      abi: BIFROST_ADAPTER_ABI,
      functionName: 'previewStrategy',
      args: [strategy],
    });

    // previewStrategy is pure — actual output is determined on Bifrost.
    // Return a conservative 1:1 estimate.
    return { expectedOut: amount, fee: 0n };
  }

  /**
   * Execute a Bifrost strategy on-chain by calling
   * `BifrostAdapter.executeBifrostStrategy()`.
   *
   * This dispatches an XCM message to Bifrost parachain 2030.
   * The `amountOut` returned is an estimate (same as `amount`) because the
   * actual output is determined asynchronously on the Bifrost side.
   */
  async executeStrategy(
    strategyType: BifrostStrategyType,
    currencyIn: BifrostCurrencyId,
    amount: bigint,
    minOut: bigint,
    poolId: number,
  ): Promise<{ amountOut: bigint; txHash: string }> {
    if (!this.evmContext.walletClient || !this.evmContext.account) {
      throw new Error('EvmBifrostStrategyService: walletClient and account are required for executeStrategy');
    }

    // Pad the signer address to bytes32 as the XCM beneficiary.
    const beneficiary = this.padAddressToBytes32(this.evmContext.account);

    const strategy = {
      strategyType: strategyType as number,
      currencyIdA: currencyIn as number,
      currencyIdB: currencyIn as number,
      amount,
      minOutput: minOut,
      poolId: BigInt(poolId),
      beneficiary,
    };

    const txHash = await this.evmContext.walletClient.writeContract({
      address: this.adapterAddress,
      abi: BIFROST_ADAPTER_ABI,
      functionName: 'executeBifrostStrategy',
      args: [strategy],
      chain: this.evmContext.chain,
      account: this.evmContext.account as `0x${string}`,
    });

    await this.evmContext.client.waitForTransactionReceipt({ hash: txHash });

    // Actual amountOut is cross-chain and async — return amount as estimate.
    return { amountOut: amount, txHash };
  }

  // ── helpers ─────────────────────────────────────────────────────────────

  /**
   * Left-pads a 20-byte EVM address to a 32-byte `bytes32` value.
   * The address is placed in the lower 20 bytes (right-aligned).
   */
  private padAddressToBytes32(address: `0x${string}`): `0x${string}` {
    const stripped = address.slice(2).toLowerCase();
    return `0x${'00'.repeat(12)}${stripped}`;
  }
}
