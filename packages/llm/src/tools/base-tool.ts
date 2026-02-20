import { StructuredTool } from '@langchain/core/tools';
import type { ChainConfig, ToolResult } from '@obidot-kit/core';
import type { z } from 'zod';

/**
 * Abstract base class for all Obidot Kit LangChain tools.
 *
 * Extends LangChain's `StructuredTool` with Obidot-specific context such as
 * chain configuration and a standardised result envelope.
 *
 * Subclasses must implement `execute()` instead of `_call()`.
 */
export abstract class ObiBaseTool<
  TInput extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
> extends StructuredTool<TInput> {
  protected chainConfig: ChainConfig;

  constructor(chainConfig: ChainConfig) {
    super();
    this.chainConfig = chainConfig;
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
}
