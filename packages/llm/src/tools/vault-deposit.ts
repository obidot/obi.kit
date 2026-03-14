import { Tool } from '@langchain/core/tools';
import type {
  ChainConfig,
  EvmVaultConfig,
  ObiEvmContext,
  ObiPolkadotContext,
  ToolResult,
  VaultAction,
} from '@obidot-kit/core';

export interface VaultDepositInput {
  /** The vault address or identifier to deposit into */
  vaultAddress: string;
  /** The amount to deposit (as a string to preserve precision) */
  amount: string;
  /** The asset/token identifier to deposit */
  asset: string;
  /** The receiver address for shares (defaults to signer). */
  receiver?: string;
}

/**
 * Options for constructing a `VaultDepositTool`.
 *
 * Supports three modes:
 * 1. **EVM mode** — with `evmContext` + `vaultConfig` for real ObidotVault ERC-4626 deposits.
 * 2. **Polkadot mode** — with `polkadotContext` for substrate-based deposits.
 * 3. **Offline mode** — with only `chainConfig` for stubs.
 */
export interface VaultDepositToolOptions {
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
 * LangChain tool for depositing assets into the ObidotVault ERC-4626 contract.
 *
 * In **EVM mode** (with `evmContext` + `vaultConfig`), the tool:
 * 1. Checks the ERC-20 allowance and approves if needed.
 * 2. Calls `vault.deposit(assets, receiver)` via viem `writeContract`.
 * 3. Returns the transaction hash and shares received.
 *
 * In **Polkadot mode** (with `polkadotContext`), falls back to PAK stub.
 * In **offline mode** (no context), returns a "pending" stub result.
 */
export class VaultDepositTool extends Tool {
  name = 'vault_deposit';

  description =
    'Deposit assets into the ObidotVault ERC-4626 vault on Polkadot Hub EVM. ' +
    'Input should be a JSON string with "vaultAddress" (or omit to use configured vault), ' +
    '"amount" (in base units as string), "asset" (ERC-20 address), and optional "receiver" address.';

  private chainConfig: ChainConfig | undefined;
  private polkadotContext: ObiPolkadotContext | undefined;
  private evmContext: ObiEvmContext | undefined;
  private vaultConfig: EvmVaultConfig | undefined;

  constructor(options: VaultDepositToolOptions) {
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
        type: 'deposit',
        vaultAddress: parsed.vaultAddress,
        amount: parsed.amount,
        asset: parsed.asset,
        chainId: config.chainId,
      };

      const result = await this.executeDeposit(action, parsed.receiver);
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

  private parseInput(input: string): VaultDepositInput {
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

    // Use configured vault address as default
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

    // Use configured asset address as default
    const asset =
      typeof obj['asset'] === 'string' && obj['asset'].length > 0 ? obj['asset'] : this.vaultConfig?.assetAddress;

    if (!asset) {
      throw new Error('Missing "asset" field and no asset configured');
    }

    return {
      vaultAddress,
      amount: obj['amount'],
      asset,
      receiver: typeof obj['receiver'] === 'string' ? obj['receiver'] : undefined,
    };
  }

  protected async executeDeposit(action: VaultAction, receiver?: string): Promise<ToolResult> {
    // EVM mode: real on-chain deposit via viem
    if (this.evmContext?.walletClient && this.vaultConfig) {
      return this.executeEvmDeposit(action, receiver);
    }

    // Polkadot mode: delegate to PAK (stub for now)
    if (this.polkadotContext) {
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
          message: `Deposit of ${action.amount} ${action.asset} into vault ${action.vaultAddress} prepared for on-chain submission`,
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
        message: `Deposit of ${action.amount} ${action.asset} into vault ${action.vaultAddress} submitted (offline mode)`,
      },
    };
  }

  /**
   * Execute a real ERC-4626 deposit via viem.
   *
   * 1. Check ERC-20 allowance, approve if insufficient.
   * 2. Call `vault.deposit(assets, receiver)`.
   * 3. Return tx hash + shares preview.
   */
  private async executeEvmDeposit(action: VaultAction, receiver?: string): Promise<ToolResult> {
    const ctx = this.evmContext!;
    const wallet = ctx.walletClient!;
    const account = ctx.account!;
    const vaultAddress = action.vaultAddress as `0x${string}`;
    const assetAddress = action.asset as `0x${string}`;
    const amount = BigInt(action.amount);
    const receiverAddress = (receiver ?? account) as `0x${string}`;

    const { OBIDOT_VAULT_ABI } = await import('@obidot-kit/core');

    // ERC-20 ABI subset for allowance + approve
    const ERC20_ABI = [
      {
        type: 'function' as const,
        name: 'allowance',
        inputs: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view' as const,
      },
      {
        type: 'function' as const,
        name: 'approve',
        inputs: [
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'nonpayable' as const,
      },
    ] as const;

    // Step 1: Check allowance
    const allowance = (await ctx.client.readContract({
      address: assetAddress,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [account, vaultAddress],
    })) as bigint;

    // Step 2: Approve if needed
    let approvalTxHash: string | undefined;
    if (allowance < amount) {
      const hash = await wallet.writeContract({
        address: assetAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [vaultAddress, amount],
        chain: ctx.chain,
        account: account as `0x${string}`,
      });
      await ctx.client.waitForTransactionReceipt({ hash });
      approvalTxHash = hash;
    }

    // Step 3: Preview shares
    const sharesPreview = (await ctx.client.readContract({
      address: vaultAddress,
      abi: OBIDOT_VAULT_ABI,
      functionName: 'previewDeposit',
      args: [amount],
    })) as bigint;

    // Step 4: Execute deposit
    const depositHash = await wallet.writeContract({
      address: vaultAddress,
      abi: OBIDOT_VAULT_ABI,
      functionName: 'deposit',
      args: [amount, receiverAddress],
      chain: ctx.chain,
      account: account as `0x${string}`,
    });

    const receipt = await ctx.client.waitForTransactionReceipt({ hash: depositHash });

    return {
      success: true,
      data: {
        action: 'deposit',
        vaultAddress,
        amount: amount.toString(),
        asset: assetAddress,
        receiver: receiverAddress,
        sharesReceived: sharesPreview.toString(),
        approvalTxHash,
        mode: 'evm',
        status: receipt.status === 'success' ? 'confirmed' : 'failed',
        blockNumber: Number(receipt.blockNumber),
        message: `Deposited ${amount.toString()} into vault ${vaultAddress}. Shares: ~${sharesPreview.toString()}.`,
      },
      txHash: depositHash,
      blockNumber: Number(receipt.blockNumber),
    };
  }
}
