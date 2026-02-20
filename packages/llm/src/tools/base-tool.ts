import { StructuredTool } from '@langchain/core/tools';
import type { ChainConfig, ObiPolkadotContext, ToolResult } from '@obidot-kit/core';
import type { z } from 'zod';

/**
 * Configuration accepted by `ObiBaseTool`. Supports both a lightweight
 * `ChainConfig`-only mode (for offline / stub usage) and a full
 * `ObiPolkadotContext` mode (for real on-chain interactions).
 */
export interface ObiBaseToolOptions {
  /**
   * Minimal chain metadata used for display and routing.
   * Required when `polkadotContext` is not provided.
   */
  chainConfig?: ChainConfig;

  /**
   * Fully initialised Polkadot context (API client + signer + address).
   * When provided, `chainConfig` is optional — the tool can derive
   * chain information from the context's connected APIs.
   */
  polkadotContext?: ObiPolkadotContext;
}

/**
 * Abstract base class for all Obidot Kit LangChain tools.
 *
 * Extends LangChain's `StructuredTool` with Obidot-specific context such as
 * chain configuration, an optional `ObiPolkadotContext` for real on-chain
 * interactions, and a standardised result envelope.
 *
 * Subclasses must implement `execute()` instead of `_call()`.
 */
export abstract class ObiBaseTool<
  TInput extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
> extends StructuredTool<TInput> {
  protected chainConfig: ChainConfig | undefined;
  protected polkadotContext: ObiPolkadotContext | undefined;

  constructor(options: ObiBaseToolOptions) {
    super();
    this.chainConfig = options.chainConfig;
    this.polkadotContext = options.polkadotContext;
  }

  /**
   * Returns the chain config, falling back to a minimal object derived
   * from the polkadot context if an explicit config was not supplied.
   */
  protected getChainConfig(): ChainConfig {
    if (this.chainConfig) {
      return this.chainConfig;
    }
    // Fallback: return a minimal placeholder so callers always get something.
    return { endpoint: 'context-managed' };
  }

  /**
   * Returns `true` when the tool has a live Polkadot context available.
   */
  protected hasPolkadotContext(): boolean {
    return this.polkadotContext !== undefined;
  }

  /**
   * Implement this in your tool subclass.
   * Return a `ToolResult` with `success`, `data`, and optional `error`.
   */
  protected abstract execute(input: z.infer<TInput>): Promise<ToolResult>;

  /**
   * LangChain entry-point – delegates to `execute()` and serialises the
   * result as JSON so the LLM can consume it.
   */
  protected override async _call(input: z.infer<TInput>): Promise<string> {
    try {
      const result = await this.execute(input);
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

  /**
   * Update the chain configuration at runtime (e.g. switch networks).
   */
  setChainConfig(config: ChainConfig): void {
    this.chainConfig = config;
  }

  /**
   * Replace the Polkadot context at runtime.
   */
  setPolkadotContext(ctx: ObiPolkadotContext): void {
    this.polkadotContext = ctx;
  }
}
