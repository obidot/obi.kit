/**
 * ABI for the IPoolAdapter universal DEX pool adapter interface.
 *
 * Adapters implement this interface to provide a uniform swap API across
 * different DEX pool types (HydrationOmnipool, AssetHubPair, BifrostDEX,
 * Custom). The SwapRouter dispatches to these adapters.
 *
 * @see IPoolAdapter.sol in obi.router
 */
export const POOL_ADAPTER_ABI = [
  // ── Core Functions ──────────────────────────────────────────────────────
  {
    type: "function",
    name: "swap",
    inputs: [
      { name: "pool", type: "address" },
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "minAmountOut", type: "uint256" },
      { name: "to", type: "address" },
      { name: "data", type: "bytes" },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getAmountOut",
    inputs: [
      { name: "pool", type: "address" },
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "supportsPair",
    inputs: [
      { name: "pool", type: "address" },
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
    ],
    outputs: [{ name: "supported", type: "bool" }],
    stateMutability: "view",
  },
  // ── Errors ──────────────────────────────────────────────────────────────
  { type: "error", name: "SwapFailed", inputs: [] },
  {
    type: "error",
    name: "UnsupportedPair",
    inputs: [
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
    ],
  },
  { type: "error", name: "ZeroAmount", inputs: [] },
] as const;
