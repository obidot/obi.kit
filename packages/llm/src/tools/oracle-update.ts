import { Tool } from '@langchain/core/tools';
import type { ObiEvmContext, ToolResult } from '@obidot-kit/core';

// ─── Inline KeeperOracle ABI (minimal — only needed functions) ────────────────

const KEEPER_ORACLE_ABI = [
  {
    type: 'function',
    name: 'setPrice',
    inputs: [{ name: 'price', type: 'int256', internalType: 'int256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'latestRoundData',
    inputs: [],
    outputs: [
      { name: 'roundId', type: 'uint80', internalType: 'uint80' },
      { name: 'answer', type: 'int256', internalType: 'int256' },
      { name: 'startedAt', type: 'uint256', internalType: 'uint256' },
      { name: 'updatedAt', type: 'uint256', internalType: 'uint256' },
      { name: 'answeredInRound', type: 'uint80', internalType: 'uint80' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'KEEPER_ROLE',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'hasRole',
    inputs: [
      { name: 'role', type: 'bytes32', internalType: 'bytes32' },
      { name: 'account', type: 'address', internalType: 'address' },
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
] as const;

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Parsed input for OracleUpdateTool.
 */
export interface OracleUpdateInput {
  /** Oracle contract address (KeeperOracle). */
  oracleAddress: string;
  /** New price as a decimal string (e.g. "1500000000" for $15.00 with 8 decimals). */
  price: string;
}

/**
 * Options for constructing an `OracleUpdateTool`.
 */
export interface OracleUpdateToolOptions {
  /** EVM context with both public and wallet clients (KEEPER_ROLE required). */
  evmContext?: ObiEvmContext;
  /**
   * Default oracle address to update (KeeperOracle).
   * Can be overridden per-call via input.
   */
  defaultOracleAddress?: string;
}

// ─── Tool ─────────────────────────────────────────────────────────────────────

/**
 * LangChain tool for pushing price updates to KeeperOracle.
 *
 * Requires KEEPER_ROLE on the oracle contract.
 * Calls `KeeperOracle.setPrice(int256)` via the wallet client.
 *
 * Reads back `latestRoundData()` after the update to confirm the new price.
 */
export class OracleUpdateTool extends Tool {
  name = 'oracle_update';

  description =
    'Push a new price to the KeeperOracle contract. Requires KEEPER_ROLE. ' +
    'Input: JSON with "oracleAddress" (KeeperOracle contract address) and "price" ' +
    "(new price as decimal string, in the oracle's native precision — " +
    'e.g. "1500000000" for $15.00 with 8-decimal feed).';

  private readonly evmContext: ObiEvmContext | undefined;
  private readonly defaultOracleAddress: string | undefined;

  constructor(options: OracleUpdateToolOptions) {
    super();
    this.evmContext = options.evmContext;
    this.defaultOracleAddress = options.defaultOracleAddress;
  }

  protected async _call(input: string): Promise<string> {
    try {
      const parsed = this.parseInput(input);
      const result = await this.execute(parsed);
      return JSON.stringify(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return JSON.stringify({
        success: false,
        error: message,
      } satisfies ToolResult);
    }
  }

  private parseInput(input: string): OracleUpdateInput {
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

    const oracleAddress = typeof obj['oracleAddress'] === 'string' ? obj['oracleAddress'] : this.defaultOracleAddress;

    if (!oracleAddress) {
      throw new Error('oracleAddress is required (or set defaultOracleAddress in options)');
    }

    const price = typeof obj['price'] === 'string' ? obj['price'] : String(obj['price'] ?? '');
    if (!price) throw new Error('"price" is required');

    return { oracleAddress, price };
  }

  private async execute(input: OracleUpdateInput): Promise<ToolResult> {
    const ctx = this.evmContext;
    if (!ctx) {
      return {
        success: true,
        data: {
          oracleAddress: input.oracleAddress,
          price: input.price,
          mode: 'stub',
          message: 'No EVM context — oracle update prepared but not submitted',
        },
      };
    }

    const walletClient = ctx.walletClient;
    const account = ctx.account;
    if (!walletClient || !account) {
      throw new Error('Wallet client required for oracle price updates (KEEPER_ROLE)');
    }

    const oracleAddress = input.oracleAddress as `0x${string}`;
    const price = BigInt(input.price);

    // Submit the price update
    const txHash = await walletClient.writeContract({
      address: oracleAddress,
      abi: KEEPER_ORACLE_ABI,
      functionName: 'setPrice',
      args: [price],
      chain: ctx.chain,
      account: account as `0x${string}`,
    });

    const receipt = await ctx.client.waitForTransactionReceipt({
      hash: txHash,
    });

    // Read back the new price to confirm
    let confirmedPrice: bigint | undefined;
    let confirmedAt: number | undefined;
    try {
      const roundData = await ctx.client.readContract({
        address: oracleAddress,
        abi: KEEPER_ORACLE_ABI,
        functionName: 'latestRoundData',
      });
      confirmedPrice = (roundData as readonly [bigint, bigint, bigint, bigint, bigint])[1];
      confirmedAt = Number((roundData as readonly [bigint, bigint, bigint, bigint, bigint])[3]);
    } catch {
      // Best-effort — don't fail if read-back fails
    }

    return {
      success: receipt.status === 'success',
      data: {
        oracleAddress: input.oracleAddress,
        txHash,
        blockNumber: Number(receipt.blockNumber),
        priceSet: input.price,
        confirmedPrice: confirmedPrice?.toString(),
        confirmedAt,
        mode: 'evm',
      },
      message:
        receipt.status === 'success'
          ? `Oracle price updated to ${input.price} at block ${receipt.blockNumber}.`
          : `Oracle update tx ${txHash} failed (status: ${receipt.status}).`,
    };
  }
}
