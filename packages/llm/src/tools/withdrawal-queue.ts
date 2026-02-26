import { Tool } from '@langchain/core/tools';
import type { EvmVaultConfig, ObiEvmContext, ToolResult } from '@obidot-kit/core';

/**
 * Parsed input for the withdrawal queue tool.
 */
export interface WithdrawalQueueInput {
  /** Action: "request", "fulfill", "cancel", or "status" */
  action: 'request' | 'fulfill' | 'cancel' | 'status';
  /** Number of shares for request action (as string) */
  shares?: string;
  /** Request ID for fulfill/cancel/status actions */
  requestId?: string;
}

/**
 * Options for constructing a `WithdrawalQueueTool`.
 */
export interface WithdrawalQueueToolOptions {
  /** EVM context with public + wallet client. */
  evmContext?: ObiEvmContext;
  /** ObidotVault ERC-4626 configuration. */
  vaultConfig?: EvmVaultConfig;
}

/**
 * LangChain tool for interacting with the ObidotVault withdrawal queue.
 *
 * Supports four actions:
 * - **request**: Queue a withdrawal by locking shares. Returns a request ID.
 * - **fulfill**: Claim assets after the timelock period has passed.
 * - **cancel**: Cancel a pending withdrawal request (returns shares).
 * - **status**: Check the status of a withdrawal request.
 *
 * All write operations require an EVM context with a wallet client.
 * Read operations (status) only need a public client.
 */
export class WithdrawalQueueTool extends Tool {
  name = 'withdrawal_queue';

  description =
    'Manage ObidotVault withdrawal queue. Input is a JSON string with "action" ' +
    '("request", "fulfill", "cancel", or "status"). ' +
    'For "request": include "shares" (amount of shares to queue). ' +
    'For "fulfill"/"cancel"/"status": include "requestId" (the withdrawal request ID).';

  private readonly evmContext: ObiEvmContext | undefined;
  private readonly vaultConfig: EvmVaultConfig | undefined;

  constructor(options: WithdrawalQueueToolOptions) {
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

  private parseInput(input: string): WithdrawalQueueInput {
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
    const action = obj['action'];

    if (action !== 'request' && action !== 'fulfill' && action !== 'cancel' && action !== 'status') {
      throw new Error('Invalid "action" — must be "request", "fulfill", "cancel", or "status"');
    }

    if (action === 'request') {
      if (typeof obj['shares'] !== 'string' || obj['shares'].length === 0) {
        throw new Error('Missing "shares" field for request action');
      }
    } else {
      if (typeof obj['requestId'] !== 'string' || obj['requestId'].length === 0) {
        throw new Error(`Missing "requestId" field for ${action} action`);
      }
    }

    return {
      action,
      shares: typeof obj['shares'] === 'string' ? obj['shares'] : undefined,
      requestId: typeof obj['requestId'] === 'string' ? obj['requestId'] : undefined,
    };
  }

  private async execute(input: WithdrawalQueueInput): Promise<ToolResult> {
    const { OBIDOT_VAULT_ABI } = await import('@obidot-kit/core');
    const vaultAddress = this.vaultConfig?.vaultAddress;

    if (!vaultAddress) {
      throw new Error('No vault configured');
    }

    if (input.action === 'status') {
      return this.getRequestStatus(vaultAddress, input.requestId!, OBIDOT_VAULT_ABI);
    }

    // Write operations require wallet client
    if (!this.evmContext?.walletClient) {
      // Stub mode
      return {
        success: true,
        data: {
          action: input.action,
          vaultAddress,
          ...(input.shares ? { shares: input.shares } : {}),
          ...(input.requestId ? { requestId: input.requestId } : {}),
          mode: 'stub',
          status: 'pending',
          message: `Withdrawal ${input.action} prepared (offline mode)`,
        },
      };
    }

    switch (input.action) {
      case 'request':
        return this.requestWithdrawal(vaultAddress, input.shares!, OBIDOT_VAULT_ABI);
      case 'fulfill':
        return this.fulfillWithdrawal(vaultAddress, input.requestId!, OBIDOT_VAULT_ABI);
      case 'cancel':
        return this.cancelWithdrawal(vaultAddress, input.requestId!, OBIDOT_VAULT_ABI);
    }
  }

  private async getRequestStatus(
    vaultAddress: `0x${string}`,
    requestId: string,
    abi: readonly unknown[],
  ): Promise<ToolResult> {
    const ctx = this.evmContext;
    if (!ctx) {
      return {
        success: true,
        data: { requestId, mode: 'stub', status: 'unknown', message: 'No EVM context — cannot read on-chain state' },
      };
    }

    const result = (await ctx.client.readContract({
      address: vaultAddress,
      abi,
      functionName: 'getWithdrawalRequest',
      args: [BigInt(requestId)],
    })) as readonly [string, bigint, bigint, bigint];

    const [owner, shares, assets, claimableAt] = result;
    const now = Math.floor(Date.now() / 1000);
    const isClaimable = Number(claimableAt) > 0 && now >= Number(claimableAt);
    const isCancelled = shares === 0n && assets === 0n;

    return {
      success: true,
      data: {
        requestId,
        owner,
        shares: shares.toString(),
        assets: assets.toString(),
        claimableAt: claimableAt.toString(),
        isClaimable,
        isCancelled,
        mode: 'evm',
        message: isCancelled
          ? `Request ${requestId} has been cancelled or fulfilled.`
          : isClaimable
            ? `Request ${requestId} is claimable. Assets: ${assets.toString()}.`
            : `Request ${requestId} is pending. Claimable at timestamp ${claimableAt.toString()}.`,
      },
    };
  }

  private async requestWithdrawal(
    vaultAddress: `0x${string}`,
    shares: string,
    abi: readonly unknown[],
  ): Promise<ToolResult> {
    const ctx = this.evmContext!;
    const wallet = ctx.walletClient!;
    const sharesBigInt = BigInt(shares);

    const hash = await wallet.writeContract({
      address: vaultAddress,
      abi,
      functionName: 'requestWithdrawal',
      args: [sharesBigInt],
      chain: ctx.chain,
      account: ctx.account as `0x${string}`,
    });

    const receipt = await ctx.client.waitForTransactionReceipt({ hash });

    return {
      success: true,
      data: {
        action: 'request',
        vaultAddress,
        shares,
        mode: 'evm',
        status: receipt.status === 'success' ? 'confirmed' : 'failed',
        blockNumber: Number(receipt.blockNumber),
        message: `Withdrawal request for ${shares} shares submitted successfully.`,
      },
      txHash: hash,
      blockNumber: Number(receipt.blockNumber),
    };
  }

  private async fulfillWithdrawal(
    vaultAddress: `0x${string}`,
    requestId: string,
    abi: readonly unknown[],
  ): Promise<ToolResult> {
    const ctx = this.evmContext!;
    const wallet = ctx.walletClient!;

    const hash = await wallet.writeContract({
      address: vaultAddress,
      abi,
      functionName: 'fulfillWithdrawal',
      args: [BigInt(requestId)],
      chain: ctx.chain,
      account: ctx.account as `0x${string}`,
    });

    const receipt = await ctx.client.waitForTransactionReceipt({ hash });

    return {
      success: true,
      data: {
        action: 'fulfill',
        vaultAddress,
        requestId,
        mode: 'evm',
        status: receipt.status === 'success' ? 'confirmed' : 'failed',
        blockNumber: Number(receipt.blockNumber),
        message: `Withdrawal request ${requestId} fulfilled.`,
      },
      txHash: hash,
      blockNumber: Number(receipt.blockNumber),
    };
  }

  private async cancelWithdrawal(
    vaultAddress: `0x${string}`,
    requestId: string,
    abi: readonly unknown[],
  ): Promise<ToolResult> {
    const ctx = this.evmContext!;
    const wallet = ctx.walletClient!;

    const hash = await wallet.writeContract({
      address: vaultAddress,
      abi,
      functionName: 'cancelWithdrawal',
      args: [BigInt(requestId)],
      chain: ctx.chain,
      account: ctx.account as `0x${string}`,
    });

    const receipt = await ctx.client.waitForTransactionReceipt({ hash });

    return {
      success: true,
      data: {
        action: 'cancel',
        vaultAddress,
        requestId,
        mode: 'evm',
        status: receipt.status === 'success' ? 'confirmed' : 'failed',
        blockNumber: Number(receipt.blockNumber),
        message: `Withdrawal request ${requestId} cancelled. Shares returned.`,
      },
      txHash: hash,
      blockNumber: Number(receipt.blockNumber),
    };
  }
}
