import { Tool } from '@langchain/core/tools';
import type {
  ChainConfig,
  EvmVaultConfig,
  ObiEvmContext,
  ObiPolkadotContext,
  ToolResult,
  VaultAction,
} from '@obidot-kit/core';
import { OBIDOT_VAULT_ABI } from '@obidot-kit/core';

export interface VaultWithdrawInput {
  /** The vault address or identifier to withdraw from */
  vaultAddress: string;
  /** The amount of assets to withdraw (as a string to preserve precision) */
  amount: string;
  /** The asset/token identifier to withdraw */
  asset?: string;
  /** The receiver address for assets (defaults to signer). */
  receiver?: string;
  /** Whether to redeem shares instead of withdrawing assets. */
  redeemShares?: boolean;
}

/**
 * Options for constructing a `VaultWithdrawTool`.
 *
 * Supports three modes:
 * 1. **EVM mode** — with `evmContext` + `vaultConfig` for real ObidotVault ERC-4626 withdrawals.
 * 2. **Polkadot mode** — with `polkadotContext` for substrate-based withdrawals.
 * 3. **Offline mode** — with only `chainConfig` for stubs.
 */
export interface VaultWithdrawToolOptions {
  /** Minimal chain metadata used for display and routing. */
  chainConfig?: ChainConfig;

  /** Fully initialised Polkadot context. When provided, uses PAK path. */
  polkadotContext?: ObiPolkadotContext;

  /** EVM context with public + wallet client for ObidotVault interactions. */
  evmContext?: ObiEvmContext;

  /** ObidotVault ERC-4626 configuration on Polkadot Hub EVM. */
  vaultConfig?: EvmVaultConfig;
}

/**
 * LangChain tool for withdrawing assets from the ObidotVault ERC-4626 contract.
 *
 * In **EVM mode** (with `evmContext` + `vaultConfig`), the tool supports:
 * - `withdraw(assets, receiver, owner)` — withdraw a specific asset amount.
 * - `redeem(shares, receiver, owner)` — redeem shares for assets.
 *
 * In **offline mode**, returns a "pending" stub result.
 */
export class VaultWithdrawTool extends Tool {
  name = 'vault_withdraw';

  description =
    'Withdraw assets or redeem shares from the ObidotVault ERC-4626 vault on Polkadot Hub. ' +
    'Input is JSON with "amount" in base units, optional "vaultAddress", optional "asset", optional ' +
    '"receiver", and optional "redeemShares" (boolean, default false). Use "redeemShares": true when the ' +
    'amount represents vault shares; otherwise the amount is treated as asset units for withdraw(). ' +
    'Without a wallet it returns a prepared stub result, and with an EVM wallet it submits the real call.';

  private chainConfig: ChainConfig | undefined;
  private polkadotContext: ObiPolkadotContext | undefined;
  private evmContext: ObiEvmContext | undefined;
  private vaultConfig: EvmVaultConfig | undefined;

  constructor(options: VaultWithdrawToolOptions) {
    super();
    this.chainConfig = options.chainConfig;
    this.polkadotContext = options.polkadotContext;
    this.evmContext = options.evmContext;
    this.vaultConfig = options.vaultConfig;
  }

  private getChainConfig(): ChainConfig {
    if (this.chainConfig) return this.chainConfig;
    return { endpoint: 'context-managed' };
  }

  hasPolkadotContext(): boolean {
    return this.polkadotContext !== undefined;
  }

  hasEvmContext(): boolean {
    return this.evmContext !== undefined && this.vaultConfig !== undefined;
  }

  setChainConfig(config: ChainConfig): void {
    this.chainConfig = config;
  }

  setPolkadotContext(ctx: ObiPolkadotContext): void {
    this.polkadotContext = ctx;
  }

  setEvmContext(ctx: ObiEvmContext, vaultConfig: EvmVaultConfig): void {
    this.evmContext = ctx;
    this.vaultConfig = vaultConfig;
  }

  protected async _call(input: string): Promise<string> {
    try {
      const parsed = this.parseInput(input);
      const config = this.getChainConfig();
      const action: VaultAction = {
        type: parsed.redeemShares ? 'redeem' : 'withdraw',
        vaultAddress: parsed.vaultAddress,
        amount: parsed.amount,
        asset: parsed.asset ?? 'native',
        chainId: config.chainId,
      };

      const result = await this.executeWithdraw(action, parsed.receiver, parsed.redeemShares);
      return JSON.stringify(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const errorResult: ToolResult = {
        success: false,
        error: message,
      };
      return JSON.stringify(errorResult);
    }
  }

  private parseInput(input: string): VaultWithdrawInput {
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

    const vaultAddress =
      typeof obj['vaultAddress'] === 'string' && obj['vaultAddress'].length > 0
        ? obj['vaultAddress']
        : this.vaultConfig?.vaultAddress;

    if (!vaultAddress) {
      throw new Error('Missing "vaultAddress" field and no vault configured');
    }

    if (typeof obj['amount'] !== 'string' || obj['amount'].length === 0) {
      throw new Error('Missing or invalid "amount" field');
    }

    return {
      vaultAddress,
      amount: obj['amount'],
      asset: typeof obj['asset'] === 'string' ? obj['asset'] : undefined,
      receiver: typeof obj['receiver'] === 'string' ? obj['receiver'] : undefined,
      redeemShares: typeof obj['redeemShares'] === 'boolean' ? obj['redeemShares'] : false,
    };
  }

  protected async executeWithdraw(action: VaultAction, receiver?: string, redeemShares?: boolean): Promise<ToolResult> {
    // EVM mode: real on-chain withdraw/redeem via viem
    if (this.evmContext?.walletClient && this.vaultConfig) {
      return this.executeEvmWithdraw(action, receiver, redeemShares, this.evmContext);
    }

    // Polkadot mode: if the polkadot context has an embedded EVM context,
    // delegate to the EVM path (Polkadot Hub uses pallet-revive + ETH-RPC,
    // not a substrate extrinsic — see polkadot.ts for rationale).
    if (this.polkadotContext) {
      const embeddedEvm = this.polkadotContext.evmContext;
      if (embeddedEvm?.walletClient && this.vaultConfig) {
        return this.executeEvmWithdraw(action, receiver, redeemShares, embeddedEvm);
      }

      // No EVM context available — return pending stub
      return {
        success: true,
        data: {
          action: action.type,
          vaultAddress: action.vaultAddress,
          amount: action.amount,
          asset: action.asset,
          signerAddress: this.polkadotContext.address,
          mode: 'polkadot',
          status: 'pending',
          message: `Withdraw of ${action.amount} from vault ${action.vaultAddress} prepared for on-chain submission`,
        },
      };
    }

    // Offline fallback
    return {
      success: true,
      data: {
        action: action.type,
        vaultAddress: action.vaultAddress,
        amount: action.amount,
        asset: action.asset,
        chainId: action.chainId,
        endpoint: this.getChainConfig().endpoint,
        status: 'pending',
        message: `Withdraw of ${action.amount} from vault ${action.vaultAddress} submitted (offline mode)`,
      },
    };
  }

  /**
   * Execute a real ERC-4626 withdraw or redeem via viem.
   *
   * @param ctx - The EVM context to use. May be `this.evmContext` (direct EVM
   *   mode) or `this.polkadotContext.evmContext` (Polkadot mode with embedded
   *   viem client targeting the Polkadot Hub ETH-RPC).
   */
  private async executeEvmWithdraw(
    action: VaultAction,
    receiver: string | undefined,
    redeemShares: boolean | undefined,
    ctx: ObiEvmContext,
  ): Promise<ToolResult> {
    const wallet = ctx.walletClient;
    const account = ctx.account;
    if (!wallet || !account) {
      throw new Error('Wallet client and account are required for EVM withdrawals');
    }
    const vaultAddress = action.vaultAddress as `0x${string}`;
    const amount = BigInt(action.amount);
    const receiverAddress = (receiver ?? account) as `0x${string}`;

    if (redeemShares) {
      // Redeem mode: shares -> assets
      const assetsPreview = (await ctx.client.readContract({
        address: vaultAddress,
        abi: OBIDOT_VAULT_ABI,
        functionName: 'previewRedeem',
        args: [amount],
      })) as bigint;

      const hash = await wallet.writeContract({
        address: vaultAddress,
        abi: OBIDOT_VAULT_ABI,
        functionName: 'redeem',
        args: [amount, receiverAddress, account],
        chain: ctx.chain,
        account: account as `0x${string}`,
      });

      const receipt = await ctx.client.waitForTransactionReceipt({ hash });

      return {
        success: true,
        data: {
          action: 'redeem',
          vaultAddress,
          sharesRedeemed: amount.toString(),
          assetsReceived: assetsPreview.toString(),
          receiver: receiverAddress,
          mode: 'evm',
          status: receipt.status === 'success' ? 'confirmed' : 'failed',
          blockNumber: Number(receipt.blockNumber),
          message: `Redeemed ${amount.toString()} shares for ~${assetsPreview.toString()} assets.`,
        },
        txHash: hash,
        blockNumber: Number(receipt.blockNumber),
      };
    }

    // Withdraw mode: assets -> shares burned
    const sharesPreview = (await ctx.client.readContract({
      address: vaultAddress,
      abi: OBIDOT_VAULT_ABI,
      functionName: 'previewWithdraw',
      args: [amount],
    })) as bigint;

    const hash = await wallet.writeContract({
      address: vaultAddress,
      abi: OBIDOT_VAULT_ABI,
      functionName: 'withdraw',
      args: [amount, receiverAddress, account],
      chain: ctx.chain,
      account: account as `0x${string}`,
    });

    const receipt = await ctx.client.waitForTransactionReceipt({ hash });

    return {
      success: true,
      data: {
        action: 'withdraw',
        vaultAddress,
        assetsWithdrawn: amount.toString(),
        sharesBurned: sharesPreview.toString(),
        receiver: receiverAddress,
        mode: 'evm',
        status: receipt.status === 'success' ? 'confirmed' : 'failed',
        blockNumber: Number(receipt.blockNumber),
        message: `Withdrew ${amount.toString()} assets, burning ~${sharesPreview.toString()} shares.`,
      },
      txHash: hash,
      blockNumber: Number(receipt.blockNumber),
    };
  }
}
