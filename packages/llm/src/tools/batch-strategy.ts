import { Tool } from '@langchain/core/tools';
import type { EvmVaultConfig, ObiEvmContext, ToolResult } from '@obidot-kit/core';

/**
 * A single strategy intent for batch execution.
 */
export interface BatchStrategyItem {
  /** The asset address */
  asset: string;
  /** Amount to deploy (as string) */
  amount: string;
  /** Minimum return for slippage protection (as string) */
  minReturn: string;
  /** Maximum slippage in basis points */
  maxSlippageBps: string;
  /** Deadline timestamp (as string) */
  deadline: string;
  /** Nonce for replay protection (as string) */
  nonce: string;
  /** XCM call data (hex-encoded bytes) */
  xcmCall: string;
  /** Target parachain ID */
  targetParachain: number;
  /** Target protocol address */
  targetProtocol: string;
  /** EIP-712 signature from the strategist (hex-encoded) */
  signature: string;
}

/**
 * Parsed input for the batch strategy tool.
 */
export interface BatchStrategyInput {
  /** Array of strategy items to execute */
  strategies: BatchStrategyItem[];
}

/**
 * Options for constructing a `BatchStrategyTool`.
 */
export interface BatchStrategyToolOptions {
  /** EVM context with public + wallet client. */
  evmContext?: ObiEvmContext;
  /** ObidotVault configuration. */
  vaultConfig?: EvmVaultConfig;
}

/**
 * LangChain tool for executing multiple strategies in a single batch
 * transaction via `ObidotVault.executeStrategies()`.
 *
 * Each strategy requires a pre-signed EIP-712 `StrategyIntent` signature
 * from a whitelisted strategist. The tool is permissionless — anyone can
 * relay signed intents.
 *
 * In EVM mode, the tool calls `executeStrategies(intents[], signatures[])`
 * which processes all strategies atomically.
 */
export class BatchStrategyTool extends Tool {
  name = 'execute_batch_strategies';

  description =
    'Execute multiple strategies in a single batch transaction on the ObidotVault. ' +
    'Input is a JSON string with "strategies" (array of objects). Each strategy needs: ' +
    '"asset", "amount", "minReturn", "maxSlippageBps", "deadline", "nonce", ' +
    '"xcmCall" (hex bytes), "targetParachain" (number), "targetProtocol" (address), ' +
    'and "signature" (EIP-712 hex signature from strategist).';

  private readonly evmContext: ObiEvmContext | undefined;
  private readonly vaultConfig: EvmVaultConfig | undefined;

  constructor(options: BatchStrategyToolOptions) {
    super();
    this.evmContext = options.evmContext;
    this.vaultConfig = options.vaultConfig;
  }

  protected async _call(input: string): Promise<string> {
    try {
      const parsed = this.parseInput(input);
      const result = await this.execute(parsed);
      return JSON.stringify(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return JSON.stringify({ success: false, error: message } satisfies ToolResult);
    }
  }

  private parseInput(input: string): BatchStrategyInput {
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

    if (!Array.isArray(obj['strategies'])) {
      throw new Error('Missing or invalid "strategies" array');
    }

    const strategies = obj['strategies'] as unknown[];
    if (strategies.length === 0) {
      throw new Error('Strategies array must not be empty');
    }

    return {
      strategies: strategies.map((s, i) => this.parseStrategyItem(s, i)),
    };
  }

  private parseStrategyItem(item: unknown, index: number): BatchStrategyItem {
    if (typeof item !== 'object' || item === null) {
      throw new Error(`Strategy at index ${index} must be an object`);
    }

    const obj = item as Record<string, unknown>;
    const requiredStrings = ['asset', 'amount', 'minReturn', 'maxSlippageBps', 'deadline', 'nonce', 'xcmCall', 'targetProtocol', 'signature'] as const;

    for (const field of requiredStrings) {
      if (typeof obj[field] !== 'string' || (obj[field] as string).length === 0) {
        throw new Error(`Strategy at index ${index}: missing or invalid "${field}" field`);
      }
    }

    if (typeof obj['targetParachain'] !== 'number') {
      throw new Error(`Strategy at index ${index}: missing or invalid "targetParachain" (must be number)`);
    }

    return {
      asset: obj['asset'] as string,
      amount: obj['amount'] as string,
      minReturn: obj['minReturn'] as string,
      maxSlippageBps: obj['maxSlippageBps'] as string,
      deadline: obj['deadline'] as string,
      nonce: obj['nonce'] as string,
      xcmCall: obj['xcmCall'] as string,
      targetParachain: obj['targetParachain'] as number,
      targetProtocol: obj['targetProtocol'] as string,
      signature: obj['signature'] as string,
    };
  }

  private async execute(input: BatchStrategyInput): Promise<ToolResult> {
    const vaultAddress = this.vaultConfig?.vaultAddress;
    if (!vaultAddress) {
      throw new Error('No vault configured');
    }

    if (!this.evmContext?.walletClient) {
      // Stub mode
      return {
        success: true,
        data: {
          vaultAddress,
          batchSize: input.strategies.length,
          mode: 'stub',
          status: 'pending',
          message: `Batch of ${input.strategies.length} strategies prepared (offline mode)`,
        },
      };
    }

    const ctx = this.evmContext;
    const wallet = ctx.walletClient!;
    const { OBIDOT_VAULT_ABI } = await import('@obidot-kit/core');

    // Build intents and signatures arrays
    const intents = input.strategies.map((s) => ({
      asset: s.asset as `0x${string}`,
      amount: BigInt(s.amount),
      minReturn: BigInt(s.minReturn),
      maxSlippageBps: BigInt(s.maxSlippageBps),
      deadline: BigInt(s.deadline),
      nonce: BigInt(s.nonce),
      xcmCall: s.xcmCall as `0x${string}`,
      targetParachain: s.targetParachain,
      targetProtocol: s.targetProtocol as `0x${string}`,
    }));

    const signatures = input.strategies.map((s) => s.signature as `0x${string}`);

    const hash = await wallet.writeContract({
      address: vaultAddress,
      abi: OBIDOT_VAULT_ABI,
      functionName: 'executeStrategies',
      args: [intents, signatures],
      chain: ctx.chain,
      account: ctx.account as `0x${string}`,
    });

    const receipt = await ctx.client.waitForTransactionReceipt({ hash });

    return {
      success: true,
      data: {
        vaultAddress,
        batchSize: input.strategies.length,
        mode: 'evm',
        status: receipt.status === 'success' ? 'confirmed' : 'failed',
        blockNumber: Number(receipt.blockNumber),
        message: `Batch of ${input.strategies.length} strategies executed in a single transaction.`,
      },
      txHash: hash,
      blockNumber: Number(receipt.blockNumber),
    };
  }
}
