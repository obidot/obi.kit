import { Tool } from "@langchain/core/tools";
import type {
  EvmVaultConfig,
  ObiEvmContext,
  ToolResult,
} from "@obidot-kit/core";

/**
 * Parsed input for the execute intent tool.
 */
export interface ExecuteIntentInput {
  // ── inAsset ──
  /** Input token address */
  inAssetToken: string;
  /** Input asset remote ID */
  inAssetId?: string;

  // ── outAsset ──
  /** Output token address */
  outAssetToken: string;
  /** Output asset remote ID */
  outAssetId?: string;

  // ── Core fields ──
  /** Amount of inAsset (18-decimal normalised, as string) */
  amount: string;
  /** Minimum acceptable output (as string) */
  minOut: string;

  // ── Destination ──
  /** Destination type: 0=Native (XCM), 1=Hyper (Hyperbridge) */
  destType: number;
  /** Target parachain ID (for Native) */
  paraId?: number;
  /** Hyperbridge chain index (for Hyper): 0=Ethereum, 1=Base, 2=Arbitrum */
  chainId?: number;

  // ── Payload ──
  /** Protocol-specific payload (hex): SCALE-encoded XCM or ABI-encoded calldata */
  calldata: string;
  /** Per-strategist nonce for EIP-712 replay protection (as string) */
  nonce: string;
  /** Unix timestamp deadline (as string) */
  deadline: string;

  // ── Signature ──
  /** EIP-712 signature (hex) */
  signature: string;
}

/**
 * Options for constructing an `ExecuteIntentTool`.
 */
export interface ExecuteIntentToolOptions {
  /** EVM context for reading and writing on-chain state. */
  evmContext?: ObiEvmContext;
  /** ObidotVault configuration. */
  vaultConfig?: EvmVaultConfig;
}

/**
 * LangChain tool for executing a universal cross-chain intent via
 * `ObidotVault.executeIntent()`.
 *
 * This is the canonical entry point for cross-chain operations. The vault
 * verifies the EIP-712 signature (SOLVER_ROLE), validates risk policy,
 * then dispatches to XCMExecutor (Native) or HyperExecutor (Hyper).
 *
 * In **EVM mode**, the tool calls `vault.executeIntent(intent, signature)`.
 * In **offline mode**, returns a stub result.
 */
export class ExecuteIntentTool extends Tool {
  name = "execute_intent";

  description =
    "Execute a universal cross-chain intent via ObidotVault.executeIntent() on Polkadot Hub. " +
    "Routes to XCMExecutor (parachain) or HyperExecutor (EVM chain) based on destination type. " +
    'Input is a JSON string with "inAssetToken", "outAssetToken" (addresses), "amount", "minOut" (strings), ' +
    '"destType" (0=Native XCM, 1=Hyperbridge), "paraId" or "chainId", "calldata" (hex payload), ' +
    '"nonce", "deadline" (strings), and "signature" (EIP-712 hex).';

  private readonly evmContext: ObiEvmContext | undefined;
  private readonly vaultConfig: EvmVaultConfig | undefined;

  constructor(options: ExecuteIntentToolOptions) {
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
      return JSON.stringify({
        success: false,
        error: message,
      } satisfies ToolResult);
    }
  }

  private parseInput(input: string): ExecuteIntentInput {
    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch {
      throw new Error(`Invalid JSON input: ${input}`);
    }

    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("Input must be a JSON object");
    }

    const obj = parsed as Record<string, unknown>;

    // Required fields
    if (typeof obj["inAssetToken"] !== "string")
      throw new Error('Missing "inAssetToken"');
    if (typeof obj["outAssetToken"] !== "string")
      throw new Error('Missing "outAssetToken"');
    if (typeof obj["amount"] !== "string") throw new Error('Missing "amount"');
    if (typeof obj["minOut"] !== "string") throw new Error('Missing "minOut"');
    if (typeof obj["destType"] !== "number")
      throw new Error('Missing "destType" (0 or 1)');
    if (typeof obj["calldata"] !== "string")
      throw new Error('Missing "calldata"');
    if (typeof obj["nonce"] !== "string") throw new Error('Missing "nonce"');
    if (typeof obj["deadline"] !== "string")
      throw new Error('Missing "deadline"');
    if (typeof obj["signature"] !== "string")
      throw new Error('Missing "signature"');

    return {
      inAssetToken: obj["inAssetToken"],
      inAssetId: typeof obj["inAssetId"] === "string" ? obj["inAssetId"] : "0",
      outAssetToken: obj["outAssetToken"],
      outAssetId:
        typeof obj["outAssetId"] === "string" ? obj["outAssetId"] : "0",
      amount: obj["amount"],
      minOut: obj["minOut"],
      destType: obj["destType"],
      paraId: typeof obj["paraId"] === "number" ? obj["paraId"] : 0,
      chainId: typeof obj["chainId"] === "number" ? obj["chainId"] : 0,
      calldata: obj["calldata"],
      nonce: obj["nonce"],
      deadline: obj["deadline"],
      signature: obj["signature"],
    };
  }

  private async execute(input: ExecuteIntentInput): Promise<ToolResult> {
    const vaultAddress = this.vaultConfig?.vaultAddress;
    if (!vaultAddress) {
      throw new Error("No vault configured");
    }

    const ctx = this.evmContext;
    if (!ctx?.walletClient) {
      const destLabel =
        input.destType === 0
          ? `parachain ${input.paraId}`
          : `EVM chain ${input.chainId}`;
      return {
        success: true,
        data: {
          vaultAddress,
          inAsset: input.inAssetToken,
          outAsset: input.outAssetToken,
          amount: input.amount,
          minOut: input.minOut,
          destination: destLabel,
          mode: "stub",
          status: "pending",
          message: `Universal intent prepared for ${destLabel} but not submitted (no wallet context)`,
        },
      };
    }

    const { OBIDOT_VAULT_ABI } = await import("@obidot-kit/core");

    const account = ctx.account!;

    // Build UniversalIntent struct
    const intent = {
      inAsset: {
        token: input.inAssetToken as `0x${string}`,
        assetId: BigInt(input.inAssetId ?? "0"),
      },
      outAsset: {
        token: input.outAssetToken as `0x${string}`,
        assetId: BigInt(input.outAssetId ?? "0"),
      },
      amount: BigInt(input.amount),
      minOut: BigInt(input.minOut),
      dest: {
        destType: input.destType,
        paraId: input.paraId ?? 0,
        chainId: input.chainId ?? 0,
      },
      calldata_: input.calldata as `0x${string}`,
      nonce: BigInt(input.nonce),
      deadline: BigInt(input.deadline),
    };

    const hash = await ctx.walletClient.writeContract({
      address: vaultAddress,
      abi: OBIDOT_VAULT_ABI,
      functionName: "executeIntent",
      args: [intent, input.signature as `0x${string}`],
      chain: ctx.chain,
      account: account as `0x${string}`,
    });

    const receipt = await ctx.client.waitForTransactionReceipt({ hash });

    const destLabel =
      input.destType === 0
        ? `parachain ${input.paraId}`
        : `EVM chain ${input.chainId}`;

    return {
      success: true,
      data: {
        action: "executeIntent",
        vaultAddress,
        inAsset: input.inAssetToken,
        outAsset: input.outAssetToken,
        amount: input.amount,
        minOut: input.minOut,
        destination: destLabel,
        destType: input.destType,
        nonce: input.nonce,
        mode: "evm",
        status: receipt.status === "success" ? "confirmed" : "failed",
        blockNumber: Number(receipt.blockNumber),
        message: `Universal intent executed to ${destLabel}: ${input.amount} ${input.inAssetToken} → ${input.outAssetToken}.`,
      },
      txHash: hash,
      blockNumber: Number(receipt.blockNumber),
    };
  }
}
