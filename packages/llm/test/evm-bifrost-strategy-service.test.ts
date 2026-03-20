import type { ObiEvmContext } from '@obidot-kit/core';
import { BifrostCurrencyId, BifrostStrategyType } from '@obidot-kit/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EvmBifrostStrategyService } from '../src/services/evm-bifrost-strategy-service.js';

// ── Fixtures ────────────────────────────────────────────────────────────────

const ADAPTER_ADDRESS = '0x265Cb785De0fF2e5BcebDEb53095aDCAE9175527' as const;
const SIGNER_ADDRESS = '0x5984A519fFfE5aFc5e8bBA233DCc01AC774f4301' as const;
const TX_HASH = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as const;

function makeEvmContext(overrides: Partial<ObiEvmContext> = {}): ObiEvmContext {
  return {
    client: {
      simulateContract: vi.fn().mockResolvedValue({ result: '0x' }),
      readContract: vi.fn().mockResolvedValue('0x'),
      waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: 'success', blockNumber: 100n }),
    } as unknown as ObiEvmContext['client'],
    walletClient: {
      writeContract: vi.fn().mockResolvedValue(TX_HASH),
    } as unknown as NonNullable<ObiEvmContext['walletClient']>,
    chain: {
      id: 420420417,
      name: 'Polkadot Hub TestNet',
    } as ObiEvmContext['chain'],
    chainName: 'Polkadot Hub TestNet',
    account: SIGNER_ADDRESS,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('EvmBifrostStrategyService', () => {
  describe('construction', () => {
    it('should create the service with an EVM context and adapter address', () => {
      const ctx = makeEvmContext();
      const service = new EvmBifrostStrategyService(ctx, ADAPTER_ADDRESS);
      expect(service).toBeInstanceOf(EvmBifrostStrategyService);
    });
  });

  describe('previewStrategy', () => {
    it('should call readContract and return a 1:1 conservative estimate', async () => {
      const ctx = makeEvmContext();
      const service = new EvmBifrostStrategyService(ctx, ADAPTER_ADDRESS);

      const amount = 10_000_000_000n;
      const result = await service.previewStrategy(BifrostStrategyType.MintVToken, BifrostCurrencyId.DOT, amount, 0);

      expect(result.expectedOut).toBe(amount);
      expect(result.fee).toBe(0n);

      // readContract should be called with the correct args
      expect(ctx.client.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: ADAPTER_ADDRESS,
          functionName: 'previewStrategy',
          args: [
            expect.objectContaining({
              strategyType: BifrostStrategyType.MintVToken,
              currencyIdA: BifrostCurrencyId.DOT,
              amount,
            }),
          ],
        }),
      );
    });

    it('should propagate a contract revert from readContract', async () => {
      const ctx = makeEvmContext({
        client: {
          simulateContract: vi.fn(),
          readContract: vi.fn().mockRejectedValue(new Error('ContractFunctionExecutionError: revert')),
          waitForTransactionReceipt: vi.fn(),
        } as unknown as ObiEvmContext['client'],
      });
      const service = new EvmBifrostStrategyService(ctx, ADAPTER_ADDRESS);

      await expect(
        service.previewStrategy(BifrostStrategyType.MintVToken, BifrostCurrencyId.DOT, 1_000n, 0),
      ).rejects.toThrow('ContractFunctionExecutionError');
    });

    it('should encode beneficiary as zero bytes32 in previewStrategy call', async () => {
      const ctx = makeEvmContext();
      const service = new EvmBifrostStrategyService(ctx, ADAPTER_ADDRESS);

      await service.previewStrategy(BifrostStrategyType.DEXSwap, BifrostCurrencyId.DOT, 5_000n, 0);

      const call = (ctx.client.readContract as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.args[0].beneficiary).toBe(`0x${'00'.repeat(32)}`);
    });

    it('should forward poolId as bigint in the strategy struct', async () => {
      const ctx = makeEvmContext();
      const service = new EvmBifrostStrategyService(ctx, ADAPTER_ADDRESS);

      await service.previewStrategy(BifrostStrategyType.FarmDeposit, BifrostCurrencyId.vDOT, 1_000n, 5);

      const call = (ctx.client.readContract as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.args[0].poolId).toBe(5n);
    });
  });

  describe('executeStrategy', () => {
    it('should call writeContract and waitForTransactionReceipt', async () => {
      const ctx = makeEvmContext();
      const service = new EvmBifrostStrategyService(ctx, ADAPTER_ADDRESS);

      const result = await service.executeStrategy(
        BifrostStrategyType.MintVToken,
        BifrostCurrencyId.DOT,
        10_000_000_000n,
        9_000_000_000n,
        0,
      );

      expect(result.txHash).toBe(TX_HASH);
      expect(result.amountOut).toBe(10_000_000_000n);

      expect(ctx.walletClient!.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: ADAPTER_ADDRESS,
          functionName: 'executeBifrostStrategy',
          args: [
            expect.objectContaining({
              strategyType: BifrostStrategyType.MintVToken,
              currencyIdA: BifrostCurrencyId.DOT,
              amount: 10_000_000_000n,
              minOutput: 9_000_000_000n,
            }),
          ],
        }),
      );

      expect(ctx.client.waitForTransactionReceipt).toHaveBeenCalledWith({
        hash: TX_HASH,
      });
    });

    it('should pad the signer address into bytes32 as beneficiary', async () => {
      const ctx = makeEvmContext();
      const service = new EvmBifrostStrategyService(ctx, ADAPTER_ADDRESS);

      await service.executeStrategy(BifrostStrategyType.MintVToken, BifrostCurrencyId.DOT, 1_000n, 0n, 0);

      const call = (ctx.walletClient!.writeContract as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const beneficiary: string = call.args[0].beneficiary;

      // 32-byte hex: 12 zero bytes + 20-byte address
      expect(beneficiary).toMatch(/^0x[0-9a-f]{64}$/i);
      // The lower 40 hex chars should match the signer address (lowercased, no 0x)
      expect(beneficiary.slice(2).slice(24).toLowerCase()).toBe(SIGNER_ADDRESS.slice(2).toLowerCase());
    });

    it('should throw if walletClient is not available', async () => {
      const ctx = makeEvmContext({
        walletClient: undefined,
        account: undefined,
      });
      const service = new EvmBifrostStrategyService(ctx, ADAPTER_ADDRESS);

      await expect(
        service.executeStrategy(BifrostStrategyType.MintVToken, BifrostCurrencyId.DOT, 1_000n, 0n, 0),
      ).rejects.toThrow('walletClient and account are required');
    });

    it('should propagate writeContract errors', async () => {
      const ctx = makeEvmContext({
        walletClient: {
          writeContract: vi.fn().mockRejectedValue(new Error('insufficient funds')),
        } as unknown as NonNullable<ObiEvmContext['walletClient']>,
      });
      const service = new EvmBifrostStrategyService(ctx, ADAPTER_ADDRESS);

      await expect(
        service.executeStrategy(BifrostStrategyType.MintVToken, BifrostCurrencyId.DOT, 1_000n, 0n, 0),
      ).rejects.toThrow('insufficient funds');
    });

    it('should return amountOut equal to input amount (cross-chain estimate)', async () => {
      const ctx = makeEvmContext();
      const service = new EvmBifrostStrategyService(ctx, ADAPTER_ADDRESS);
      const amount = 99_000_000_000n;

      const result = await service.executeStrategy(
        BifrostStrategyType.RedeemVToken,
        BifrostCurrencyId.vDOT,
        amount,
        90_000_000_000n,
        0,
      );

      // amountOut is an estimate — equals input amount
      expect(result.amountOut).toBe(amount);
    });
  });
});
