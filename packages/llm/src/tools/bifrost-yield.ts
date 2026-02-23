import { Tool } from '@langchain/core/tools';
import type { BifrostCurrencyId, BifrostProtocolConfig, BifrostYieldProduct, ToolResult } from '@obidot-kit/core';

/**
 * Configuration for a Bifrost yield data provider.
 *
 * Consumers inject a function that returns the current set of yield
 * products. This keeps the tool decoupled from any concrete data source
 * (on-chain RPC, REST API, static config, etc.).
 */
export interface BifrostYieldProviderConfig {
  /**
   * Async function that returns the current yield products.
   * When not provided, the tool returns the built-in default product
   * catalogue with placeholder APYs.
   */
  readonly fetchYields?: () => Promise<BifrostYieldProduct[]>;

  /**
   * Optional protocol registry for enriching results.
   */
  readonly protocols?: Record<string, BifrostProtocolConfig>;
}

/**
 * Options for constructing a `BifrostYieldTool`.
 */
export interface BifrostYieldToolOptions {
  /**
   * Yield provider configuration.
   * When omitted the tool returns the built-in default product catalogue.
   */
  readonly provider?: BifrostYieldProviderConfig;
}

/**
 * Default Bifrost yield products representing all 7 product types.
 * APYs are placeholders — real values should come from the provider.
 */
function getDefaultBifrostProducts(): BifrostYieldProduct[] {
  return [
    {
      protocol: 'Bifrost',
      product: 'vDOT Liquid Staking',
      category: 'SLP',
      apy: 14.5,
      currencyIn: 0 as BifrostCurrencyId, // DOT
      currencyOut: 1 as BifrostCurrencyId, // vDOT
      isActive: true,
    },
    {
      protocol: 'Bifrost',
      product: 'vKSM Liquid Staking',
      category: 'SLP',
      apy: 18.2,
      currencyIn: 2 as BifrostCurrencyId, // KSM
      currencyOut: 3 as BifrostCurrencyId, // vKSM
      isActive: true,
    },
    {
      protocol: 'Bifrost',
      product: 'DOT/vDOT DEX Pool',
      category: 'DEX',
      apy: 8.3,
      currencyIn: 0 as BifrostCurrencyId, // DOT
      currencyOut: 1 as BifrostCurrencyId, // vDOT
      poolId: 0,
      isActive: true,
    },
    {
      protocol: 'Bifrost',
      product: 'BNC/vDOT DEX Pool',
      category: 'DEX',
      apy: 12.1,
      currencyIn: 4 as BifrostCurrencyId, // BNC
      currencyOut: 1 as BifrostCurrencyId, // vDOT
      poolId: 1,
      isActive: true,
    },
    {
      protocol: 'Bifrost',
      product: 'vDOT Farming',
      category: 'Farming',
      apy: 22.7,
      currencyIn: 1 as BifrostCurrencyId, // vDOT
      poolId: 0,
      isActive: true,
    },
    {
      protocol: 'Bifrost',
      product: 'BNC/vDOT LP Farming',
      category: 'Farming',
      apy: 35.4,
      currencyIn: 4 as BifrostCurrencyId, // BNC
      poolId: 1,
      isActive: true,
    },
    {
      protocol: 'Bifrost',
      product: 'Polkadot SALP',
      category: 'SALP',
      apy: 6.8,
      currencyIn: 0 as BifrostCurrencyId, // DOT
      isActive: true,
    },
  ];
}

/**
 * LangChain tool for fetching Bifrost DeFi yield product information.
 *
 * Returns yield rates for all available Bifrost products including:
 * - SLP (Staking Liquidity Protocol) — vDOT, vKSM minting
 * - DEX — liquidity pool swaps
 * - Farming — LP token staking rewards
 * - SALP (Slot Auction Liquidity Protocol) — crowdloan contributions
 *
 * The tool accepts an optional JSON input for filtering:
 * - `category` — filter by product category ("SLP", "DEX", "Farming", "SALP")
 * - `activeOnly` — when true (default), only return active products
 *
 * @example
 * ```ts
 * import { BifrostYieldTool } from '@obidot-kit/llm';
 *
 * const tool = new BifrostYieldTool();
 * const result = await tool.invoke('{}');
 * // Returns all Bifrost yield products
 *
 * const filtered = await tool.invoke('{"category":"SLP"}');
 * // Returns only SLP products
 * ```
 */
export class BifrostYieldTool extends Tool {
  name = 'fetch_bifrost_yields';

  description =
    'Fetch yield rates for Bifrost DeFi products (SLP liquid staking, DEX pools, farming, SALP crowdloans). ' +
    'Input is an optional JSON string with "category" (one of "SLP", "DEX", "Farming", "SALP") and ' +
    '"activeOnly" (boolean, default true) to filter results.';

  private readonly provider: BifrostYieldProviderConfig;

  constructor(options?: BifrostYieldToolOptions) {
    super();
    this.provider = options?.provider ?? {};
  }

  protected async _call(input: string): Promise<string> {
    try {
      const filter = this.parseInput(input);
      let products: BifrostYieldProduct[];

      if (this.provider.fetchYields) {
        products = await this.provider.fetchYields();
      } else {
        products = getDefaultBifrostProducts();
      }

      // Apply filters
      if (filter.category) {
        products = products.filter((p) => p.category === filter.category);
      }
      if (filter.activeOnly !== false) {
        products = products.filter((p) => p.isActive);
      }

      const result: ToolResult<{ products: BifrostYieldProduct[]; count: number }> = {
        success: true,
        data: {
          products,
          count: products.length,
        },
        message: `Found ${products.length} Bifrost yield product(s)${filter.category ? ` in category "${filter.category}"` : ''}.`,
      };
      return JSON.stringify(result, (_key, value) => (typeof value === 'bigint' ? value.toString() : value));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const result: ToolResult = {
        success: false,
        error: message,
      };
      return JSON.stringify(result);
    }
  }

  private parseInput(input: string): { category?: string; activeOnly?: boolean } {
    if (!input || input.trim() === '' || input.trim() === '{}') {
      return {};
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch {
      throw new Error(`Invalid JSON input: ${input}`);
    }

    if (typeof parsed !== 'object' || parsed === null) {
      return {};
    }

    const obj = parsed as Record<string, unknown>;
    const result: { category?: string; activeOnly?: boolean } = {};

    if (typeof obj['category'] === 'string') {
      const validCategories = ['SLP', 'DEX', 'Farming', 'SALP'];
      if (!validCategories.includes(obj['category'])) {
        throw new Error(`Invalid category "${obj['category']}". Must be one of: ${validCategories.join(', ')}`);
      }
      result.category = obj['category'];
    }

    if (typeof obj['activeOnly'] === 'boolean') {
      result.activeOnly = obj['activeOnly'];
    }

    return result;
  }
}
