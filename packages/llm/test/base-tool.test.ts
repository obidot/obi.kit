import type { ChainConfig, ObiPolkadotContext, ToolResult } from '@obidot-kit/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ObiBaseTool, type ObiBaseToolOptions } from '../src/tools/base-tool.js';

const mockChainConfig: ChainConfig = {
  endpoint: 'wss://rpc.polkadot.io',
  chainId: 'polkadot',
  name: 'Polkadot',
};

const mockPolkadotContext = {
  address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
} as ObiPolkadotContext;

const testSchema = z.object({
  label: z.string().optional(),
  fail: z.boolean().optional(),
});

class TestBaseTool extends ObiBaseTool<typeof testSchema> {
  name = 'test_base_tool';

  description = 'Test helper around ObiBaseTool.';

  schema = testSchema;

  exposeChainConfig(): ChainConfig {
    return this.getChainConfig();
  }

  exposeHasPolkadotContext(): boolean {
    return this.hasPolkadotContext();
  }

  protected override async execute(input: z.infer<typeof testSchema>): Promise<ToolResult> {
    if (input.fail) {
      throw new Error('synthetic failure');
    }

    return {
      success: true,
      data: {
        label: input.label ?? 'default',
        endpoint: this.getChainConfig().endpoint,
        hasPolkadotContext: this.hasPolkadotContext(),
      },
    };
  }
}

function createTool(options: ObiBaseToolOptions = {}): TestBaseTool {
  return new TestBaseTool(options);
}

describe('ObiBaseTool', () => {
  it('returns the explicit chain config when one is provided', () => {
    const tool = createTool({ chainConfig: mockChainConfig });

    expect(tool.exposeChainConfig()).toEqual(mockChainConfig);
    expect(tool.exposeHasPolkadotContext()).toBe(false);
  });

  it('falls back to a minimal context-managed chain config when none is provided', () => {
    const tool = createTool({ polkadotContext: mockPolkadotContext });

    expect(tool.exposeChainConfig()).toEqual({ endpoint: 'context-managed' });
    expect(tool.exposeHasPolkadotContext()).toBe(true);
  });

  it('updates runtime chain config and polkadot context through the setters', () => {
    const tool = createTool();

    tool.setChainConfig(mockChainConfig);
    tool.setPolkadotContext(mockPolkadotContext);

    expect(tool.exposeChainConfig()).toEqual(mockChainConfig);
    expect(tool.exposeHasPolkadotContext()).toBe(true);
  });

  it('serializes successful execute results as JSON', async () => {
    const tool = createTool({ chainConfig: mockChainConfig });

    const raw = await tool.invoke({ label: 'hello' });
    const result = JSON.parse(raw as string) as {
      success: boolean;
      data: { label: string; endpoint: string; hasPolkadotContext: boolean };
    };

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      label: 'hello',
      endpoint: mockChainConfig.endpoint,
      hasPolkadotContext: false,
    });
  });

  it('catches execute errors and returns a standardized failure result', async () => {
    const tool = createTool({ chainConfig: mockChainConfig });

    const raw = await tool.invoke({ fail: true });
    const result = JSON.parse(raw as string) as { success: boolean; error: string };

    expect(result.success).toBe(false);
    expect(result.error).toBe('synthetic failure');
  });
});
