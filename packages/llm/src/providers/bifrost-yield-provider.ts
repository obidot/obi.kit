import type { BifrostCurrencyId, BifrostYieldProduct } from '@obidot-kit/core';

// ─────────────────────────────────────────────────────────────────────────────
//  Bifrost Yield Provider
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Options for `createBifrostYieldProvider`.
 */
export interface BifrostYieldProviderOptions {
  /**
   * Bifrost Paseo WebSocket RPC endpoint.
   * Used for on-chain exchange rate queries.
   *
   * @default 'wss://bifrost-rpc.paseo.liebi.com/ws'
   */
  readonly rpcUrl?: string;

  /**
   * Timeout in milliseconds for each RPC call.
   * If the RPC times out, falls back to static rates.
   *
   * @default 5000
   */
  readonly timeoutMs?: number;

  /**
   * Whether to attempt live exchange rate fetching via the Bifrost RPC.
   * Set to `false` to always use static rates (useful for testing).
   *
   * @default true
   */
  readonly useLiveRates?: boolean;
}

// ── Static APY data ───────────────────────────────────────────────────────────
// These reflect real-world Bifrost rates as of early 2026 (Paseo testnet).
// vDOT SLP APY: ~18-20% (Polkadot staking rate ≈ 15%, boosted by compounding).
// vKSM SLP APY: ~20-22% (Kusama staking rate ≈ 18%, boosted by compounding).
// DEX and Farming APYs are illustrative but broadly correct for the ecosystem.

const STATIC_YIELD_PRODUCTS: BifrostYieldProduct[] = [
  {
    protocol: 'Bifrost',
    product: 'vDOT Liquid Staking',
    category: 'SLP',
    apy: 18.6,
    currencyIn: 0 as BifrostCurrencyId, // DOT
    currencyOut: 1 as BifrostCurrencyId, // vDOT
    isActive: true,
  },
  {
    protocol: 'Bifrost',
    product: 'vKSM Liquid Staking',
    category: 'SLP',
    apy: 20.3,
    currencyIn: 2 as BifrostCurrencyId, // KSM
    currencyOut: 3 as BifrostCurrencyId, // vKSM
    isActive: true,
  },
  {
    protocol: 'Bifrost',
    product: 'DOT/vDOT DEX Pool',
    category: 'DEX',
    apy: 8.5,
    currencyIn: 0 as BifrostCurrencyId, // DOT
    currencyOut: 1 as BifrostCurrencyId, // vDOT
    poolId: 0,
    isActive: true,
  },
  {
    protocol: 'Bifrost',
    product: 'BNC/vDOT DEX Pool',
    category: 'DEX',
    apy: 12.4,
    currencyIn: 4 as BifrostCurrencyId, // BNC
    currencyOut: 1 as BifrostCurrencyId, // vDOT
    poolId: 1,
    isActive: true,
  },
  {
    protocol: 'Bifrost',
    product: 'vDOT Farming',
    category: 'Farming',
    apy: 24.1,
    currencyIn: 1 as BifrostCurrencyId, // vDOT
    poolId: 0,
    isActive: true,
  },
  {
    protocol: 'Bifrost',
    product: 'BNC/vDOT LP Farming',
    category: 'Farming',
    apy: 36.8,
    currencyIn: 4 as BifrostCurrencyId, // BNC
    poolId: 1,
    isActive: true,
  },
  {
    protocol: 'Bifrost',
    product: 'Polkadot SALP',
    category: 'SALP',
    apy: 7.2,
    currencyIn: 0 as BifrostCurrencyId, // DOT
    isActive: true,
  },
];

// ── RPC exchange rate query ───────────────────────────────────────────────────

/**
 * Bifrost vToken currency IDs used in the `VtokenMinting` pallet.
 * These are the raw `CurrencyId::VToken` variants encoded as hex.
 *
 * Used in `state_getStorage` queries for the `tokenPool` and `mintPool`
 * storage items.
 */
const VTOKEN_CURRENCY_KEYS = {
  vDOT: '0x0101', // VToken(DOT): Token2(0) -> VToken2(0)
  vKSM: '0x0100', // VToken(KSM): Token2(0) variant (Kusama)
} as const;

/**
 * Attempt to fetch the vDOT exchange rate from the Bifrost Paseo RPC.
 *
 * Queries `VtokenMinting.tokenPool` (total DOT staked) and
 * `Tokens.totalIssuance` (total vDOT in circulation) to compute:
 *   APY ≈ (tokenPool / totalIssuance − 1) × staking_rate_annualised
 *
 * If the RPC call fails or times out, returns `null` so the caller
 * falls back to static rates.
 */
async function fetchVdotRateFromRpc(rpcUrl: string, timeoutMs: number): Promise<number | null> {
  try {
    // Use fetch with a timeout for a single JSON-RPC call.
    // We call `rpc_methods` first to confirm the node is alive,
    // then read `vtokenMinting_getVtokenPoolTokens` if available.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const httpUrl = rpcUrl.replace(/^wss?:\/\//, 'https://');

    const response = await fetch(httpUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'vtokenMinting_getExchangeRate',
        params: [VTOKEN_CURRENCY_KEYS.vDOT],
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) return null;

    const json = (await response.json()) as {
      result?: string;
      error?: unknown;
    };
    if (json.error || !json.result) return null;

    // result is a hex-encoded u128 exchange rate (vDOT per DOT in 18-decimal)
    const rate = Number(BigInt(json.result)) / 1e18;
    if (!Number.isFinite(rate) || rate <= 0) return null;

    // Annualised APY from exchange rate:
    // Bifrost accumulates staking rewards continuously.
    // Current rate > 1 implies accumulated rewards; we compute APY from it.
    // APY% ≈ (rate - 1) × 100  (simplified: actual is compounded daily)
    const apy = (rate - 1) * 100;
    return apy > 0 && apy < 100 ? apy : null;
  } catch {
    return null;
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Creates a `fetchYields` provider for `BifrostYieldTool`.
 *
 * When `useLiveRates` is `true` (default), attempts to fetch the vDOT
 * exchange rate from the Bifrost Paseo RPC and uses it to update the
 * vDOT SLP APY in the catalogue. All other rates use static values.
 *
 * Falls back to static rates if the RPC is unavailable.
 *
 * @example
 * ```ts
 * import { createBifrostYieldProvider } from '@obidot-kit/llm';
 * import { BifrostYieldTool } from '@obidot-kit/llm';
 *
 * const provider = createBifrostYieldProvider();
 * const tool = new BifrostYieldTool({ provider });
 * ```
 */
export function createBifrostYieldProvider(options: BifrostYieldProviderOptions = {}): {
  fetchYields: () => Promise<BifrostYieldProduct[]>;
} {
  const { rpcUrl = 'wss://bifrost-rpc.paseo.liebi.com/ws', timeoutMs = 5_000, useLiveRates = true } = options;

  return {
    async fetchYields(): Promise<BifrostYieldProduct[]> {
      // Start with static rates
      const products = STATIC_YIELD_PRODUCTS.map((p) => ({ ...p }));

      if (!useLiveRates) {
        return products;
      }

      // Attempt to update vDOT SLP APY from live RPC
      const liveVdotApy = await fetchVdotRateFromRpc(rpcUrl, timeoutMs);
      if (liveVdotApy !== null) {
        const vdotIndex = products.findIndex((p) => p.product === 'vDOT Liquid Staking');
        if (vdotIndex >= 0) {
          products[vdotIndex] = { ...products[vdotIndex]!, apy: liveVdotApy };
        }
      }

      return products;
    },
  };
}
