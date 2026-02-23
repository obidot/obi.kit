import { Tool } from '@langchain/core/tools';
import type { BifrostCurrencyId, BifrostProtocolConfig, BifrostStrategyType, ToolResult } from '@obidot-kit/core';

/**
 * Parsed input for the Bifrost strategy execution tool.
 */
export interface BifrostStrategyInput {
  /** The Bifrost strategy type (0-6) matching BifrostStrategyType enum */
  strategyType: number;
  /** The input currency ID (0-4) matching BifrostCurrencyId enum */
  currencyIn: number;
  /** The amount to use in the strategy (as a string to preserve precision) */
  amount: string;
  /** Minimum output amount for slippage protection (as a string) */
  minOut?: string;
  /** Pool ID for farming/DEX operations */
  poolId?: number;
}

/**
 * Service interface for executing Bifrost strategies.
 *
 * Consumers inject an implementation of this interface that handles
 * the actual on-chain interaction (e.g. via viem writeContract against
 * the BifrostAdapter contract).
 */
export interface BifrostStrategyService {
  /**
   * Preview a strategy to get expected output and fees.
   */
  previewStrategy(
    strategyType: BifrostStrategyType,
    currencyIn: BifrostCurrencyId,
    amount: bigint,
    poolId: number,
  ): Promise<{ expectedOut: bigint; fee: bigint }>;

  /**
   * Execute a Bifrost strategy on-chain.
   */
  executeStrategy(
    strategyType: BifrostStrategyType,
    currencyIn: BifrostCurrencyId,
    amount: bigint,
    minOut: bigint,
    poolId: number,
  ): Promise<{ amountOut: bigint; txHash: string }>;
}

/**
 * Options for constructing a `BifrostStrategyTool`.
 */
export interface BifrostStrategyToolOptions {
  /**
   * Optional service that handles on-chain Bifrost strategy execution.
   * When not provided, the tool runs in stub/preview mode.
   */
  strategyService?: BifrostStrategyService;

  /**
   * Address of the BifrostAdapter contract.
   */
  adapterAddress?: string;

  /**
   * Registry of Bifrost protocol pallets for context.
   */
  protocols?: Record<string, BifrostProtocolConfig>;
}

/**
 * Maximum strategy type value (SALPContribute = 6).
 */
const MAX_STRATEGY_TYPE = 6;

/**
 * Maximum currency ID value (BNC = 4).
 */
const MAX_CURRENCY_ID = 4;

/**
 * Human-readable labels for strategy types (inline fallback so we
 * don't need a runtime import of the const from core).
 */
const STRATEGY_LABELS: Record<number, string> = {
  0: 'Mint vToken (SLP)',
  1: 'Redeem vToken (SLP)',
  2: 'DEX Swap',
  3: 'Farm Deposit',
  4: 'Farm Withdraw',
  5: 'Farm Claim Rewards',
  6: 'SALP Contribute',
};

/**
 * Human-readable labels for currency IDs.
 */
const CURRENCY_LABELS: Record<number, string> = {
  0: 'DOT',
  1: 'vDOT',
  2: 'KSM',
  3: 'vKSM',
  4: 'BNC',
};

/**
 * LangChain tool for executing Bifrost DeFi strategies via the
 * BifrostAdapter contract.
 *
 * Supports all 7 Bifrost strategy types:
 * - 0: MintVToken (SLP) — mint vDOT/vKSM from DOT/KSM
 * - 1: RedeemVToken (SLP) — redeem vDOT/vKSM back to DOT/KSM
 * - 2: DEXSwap — swap tokens on the Bifrost DEX
 * - 3: FarmDeposit — deposit LP tokens into farming
 * - 4: FarmWithdraw — withdraw LP tokens from farming
 * - 5: FarmClaim — claim farming rewards
 * - 6: SALPContribute — contribute to a SALP auction
 *
 * When constructed with a `BifrostStrategyService`, the tool executes
 * real on-chain transactions. Otherwise it runs in stub/preview mode
 * returning simulated results.
 *
 * @example
 * ```ts
 * import { BifrostStrategyTool } from '@obidot-kit/llm';
 *
 * // Stub mode (no service)
 * const tool = new BifrostStrategyTool({});
 *
 * // With a real service
 * const tool = new BifrostStrategyTool({
 *   strategyService: myService,
 *   adapterAddress: '0x1234...',
 * });
 * ```
 */
export class BifrostStrategyTool extends Tool {
  name = 'execute_bifrost_strategy';

  description =
    'Execute a Bifrost DeFi strategy (SLP mint/redeem, DEX swap, farming, SALP). ' +
    'Input should be a JSON string with "strategyType" (0-6), "currencyIn" (0-4), "amount", ' +
    'optional "minOut" (default "0"), and optional "poolId" (default 0). ' +
    'Strategy types: 0=MintVToken, 1=RedeemVToken, 2=DEXSwap, 3=FarmDeposit, ' +
    '4=FarmWithdraw, 5=FarmClaim, 6=SALPContribute. ' +
    'Currency IDs: 0=DOT, 1=vDOT, 2=KSM, 3=vKSM, 4=BNC.';

  private readonly strategyService?: BifrostStrategyService;
  private readonly adapterAddress?: string;
  private readonly protocols?: Record<string, BifrostProtocolConfig>;

  constructor(options: BifrostStrategyToolOptions) {
    super();
    this.strategyService = options.strategyService;
    this.adapterAddress = options.adapterAddress;
    this.protocols = options.protocols;
  }

  protected async _call(input: string): Promise<string> {
    try {
      const parsed = this.parseInput(input);
      this.validateInput(parsed);

      const result = await this.executeStrategy(parsed);
      return JSON.stringify(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const result: ToolResult = {
        success: false,
        error: message,
      };
      return JSON.stringify(result);
    }
  }

  private parseInput(input: string): BifrostStrategyInput {
    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch {
      throw new Error(`Invalid JSON input: ${input}`);
    }

    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Input must be a JSON object');
    }

    const obj = parsed as Record<string, unknown>;

    if (typeof obj['strategyType'] !== 'number') {
      throw new Error('Missing or invalid "strategyType" field (must be a number 0-6)');
    }
    if (typeof obj['currencyIn'] !== 'number') {
      throw new Error('Missing or invalid "currencyIn" field (must be a number 0-4)');
    }
    if (typeof obj['amount'] !== 'string' || obj['amount'].length === 0) {
      throw new Error('Missing or invalid "amount" field (must be a non-empty string)');
    }

    return {
      strategyType: obj['strategyType'],
      currencyIn: obj['currencyIn'],
      amount: obj['amount'],
      minOut: typeof obj['minOut'] === 'string' ? obj['minOut'] : undefined,
      poolId: typeof obj['poolId'] === 'number' ? obj['poolId'] : undefined,
    };
  }

  private validateInput(input: BifrostStrategyInput): void {
    if (!Number.isInteger(input.strategyType) || input.strategyType < 0 || input.strategyType > MAX_STRATEGY_TYPE) {
      throw new Error(
        `Invalid strategyType: ${input.strategyType}. Must be an integer between 0 and ${MAX_STRATEGY_TYPE}.`,
      );
    }

    if (!Number.isInteger(input.currencyIn) || input.currencyIn < 0 || input.currencyIn > MAX_CURRENCY_ID) {
      throw new Error(`Invalid currencyIn: ${input.currencyIn}. Must be an integer between 0 and ${MAX_CURRENCY_ID}.`);
    }

    // Validate amount is a valid non-negative integer string
    try {
      const amountBigInt = BigInt(input.amount);
      if (amountBigInt <= 0n) {
        throw new Error('Amount must be greater than 0');
      }
    } catch (e) {
      if (e instanceof Error && e.message === 'Amount must be greater than 0') {
        throw e;
      }
      throw new Error(`Invalid amount "${input.amount}": must be a valid integer string`);
    }

    // Validate minOut if provided
    if (input.minOut !== undefined) {
      try {
        BigInt(input.minOut);
      } catch {
        throw new Error(`Invalid minOut "${input.minOut}": must be a valid integer string`);
      }
    }

    // Validate poolId if provided
    if (input.poolId !== undefined && (!Number.isInteger(input.poolId) || input.poolId < 0)) {
      throw new Error(`Invalid poolId: ${input.poolId}. Must be a non-negative integer.`);
    }

    // Strategy-specific validation
    this.validateStrategySpecific(input);
  }

  private validateStrategySpecific(input: BifrostStrategyInput): void {
    // MintVToken: must use a base currency (DOT=0, KSM=2)
    if (input.strategyType === 0) {
      if (input.currencyIn !== 0 && input.currencyIn !== 2) {
        throw new Error('MintVToken strategy requires currencyIn to be DOT (0) or KSM (2)');
      }
    }

    // RedeemVToken: must use a vToken currency (vDOT=1, vKSM=3)
    if (input.strategyType === 1) {
      if (input.currencyIn !== 1 && input.currencyIn !== 3) {
        throw new Error('RedeemVToken strategy requires currencyIn to be vDOT (1) or vKSM (3)');
      }
    }

    // FarmDeposit/FarmWithdraw/FarmClaim: poolId is required
    if (input.strategyType >= 3 && input.strategyType <= 5) {
      if (input.poolId === undefined) {
        throw new Error(`${STRATEGY_LABELS[input.strategyType] ?? 'Farm'} strategy requires a poolId`);
      }
    }
  }

  private async executeStrategy(input: BifrostStrategyInput): Promise<ToolResult> {
    const strategyLabel = STRATEGY_LABELS[input.strategyType] ?? `Strategy(${input.strategyType})`;
    const currencyLabel = CURRENCY_LABELS[input.currencyIn] ?? `Currency(${input.currencyIn})`;
    const poolId = input.poolId ?? 0;
    const minOut = input.minOut ?? '0';

    if (this.strategyService) {
      return this.executeOnChain(input, strategyLabel, currencyLabel, poolId, minOut);
    }

    // Stub / offline fallback
    return {
      success: true,
      data: {
        strategy: strategyLabel,
        strategyType: input.strategyType,
        currencyIn: currencyLabel,
        currencyInId: input.currencyIn,
        amount: input.amount,
        minOut,
        poolId,
        adapterAddress: this.adapterAddress ?? 'not-configured',
        mode: 'stub',
        status: 'simulated',
        message: `${strategyLabel} with ${input.amount} ${currencyLabel} prepared (stub mode)`,
      },
    };
  }

  private async executeOnChain(
    input: BifrostStrategyInput,
    strategyLabel: string,
    currencyLabel: string,
    poolId: number,
    minOut: string,
  ): Promise<ToolResult> {
    if (!this.strategyService) {
      throw new Error('Strategy service not available');
    }

    // First preview the strategy to get expected output
    const amount = BigInt(input.amount);
    const preview = await this.strategyService.previewStrategy(
      input.strategyType as BifrostStrategyType,
      input.currencyIn as BifrostCurrencyId,
      amount,
      poolId,
    );

    // Execute the strategy
    const result = await this.strategyService.executeStrategy(
      input.strategyType as BifrostStrategyType,
      input.currencyIn as BifrostCurrencyId,
      amount,
      BigInt(minOut),
      poolId,
    );

    return {
      success: true,
      data: {
        strategy: strategyLabel,
        strategyType: input.strategyType,
        currencyIn: currencyLabel,
        currencyInId: input.currencyIn,
        amount: input.amount,
        minOut,
        poolId,
        expectedOut: preview.expectedOut.toString(),
        fee: preview.fee.toString(),
        amountOut: result.amountOut.toString(),
        adapterAddress: this.adapterAddress ?? 'unknown',
        mode: 'on-chain',
        status: 'executed',
        message: `${strategyLabel} executed: ${input.amount} ${currencyLabel} -> ${result.amountOut.toString()} output`,
      },
      txHash: result.txHash,
    };
  }
}
