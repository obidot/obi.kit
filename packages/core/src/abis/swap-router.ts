/**
 * ABI for the SwapRouter DEX aggregator contract on Polkadot Hub.
 *
 * Supports single-hop, multi-hop, and split-weight swap routing through
 * pluggable pool adapters (HydrationOmnipool, AssetHubPair, BifrostDEX, Custom).
 * Uses transient storage (EIP-1153) for multi-hop intermediate balance tracking.
 *
 * @see SwapRouter.sol in obi.router
 */
export const SWAP_ROUTER_ABI = [
  // ── Swap Functions ──────────────────────────────────────────────────────
  {
    type: "function",
    name: "swap",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          {
            name: "route",
            type: "tuple",
            components: [
              { name: "poolType", type: "uint8" },
              { name: "pool", type: "address" },
              { name: "tokenIn", type: "address" },
              { name: "tokenOut", type: "address" },
              { name: "feeBps", type: "uint256" },
              { name: "data", type: "bytes" },
            ],
          },
          { name: "amountIn", type: "uint256" },
          { name: "minAmountOut", type: "uint256" },
          { name: "to", type: "address" },
          { name: "deadline", type: "uint256" },
        ],
      },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "swapMultiHop",
    inputs: [
      {
        name: "routes",
        type: "tuple[]",
        components: [
          { name: "poolType", type: "uint8" },
          { name: "pool", type: "address" },
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "feeBps", type: "uint256" },
          { name: "data", type: "bytes" },
        ],
      },
      { name: "amountIn", type: "uint256" },
      { name: "minAmountOut", type: "uint256" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "swapSplit",
    inputs: [
      {
        name: "legs",
        type: "tuple[]",
        components: [
          {
            name: "route",
            type: "tuple",
            components: [
              { name: "poolType", type: "uint8" },
              { name: "pool", type: "address" },
              { name: "tokenIn", type: "address" },
              { name: "tokenOut", type: "address" },
              { name: "feeBps", type: "uint256" },
              { name: "data", type: "bytes" },
            ],
          },
          { name: "weight", type: "uint256" },
        ],
      },
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "minAmountOut", type: "uint256" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "multicall",
    inputs: [{ name: "data", type: "bytes[]" }],
    outputs: [{ name: "results", type: "bytes[]" }],
    stateMutability: "nonpayable",
  },
  // ── Quote Functions ─────────────────────────────────────────────────────
  {
    type: "function",
    name: "quote",
    inputs: [
      {
        name: "route",
        type: "tuple",
        components: [
          { name: "poolType", type: "uint8" },
          { name: "pool", type: "address" },
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "feeBps", type: "uint256" },
          { name: "data", type: "bytes" },
        ],
      },
      { name: "amountIn", type: "uint256" },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "quoteMultiHop",
    inputs: [
      {
        name: "routes",
        type: "tuple[]",
        components: [
          { name: "poolType", type: "uint8" },
          { name: "pool", type: "address" },
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "feeBps", type: "uint256" },
          { name: "data", type: "bytes" },
        ],
      },
      { name: "amountIn", type: "uint256" },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
    stateMutability: "view",
  },
  // ── Admin Functions ─────────────────────────────────────────────────────
  {
    type: "function",
    name: "setAdapter",
    inputs: [
      { name: "poolType", type: "uint8" },
      { name: "adapter", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "grantVaultRole",
    inputs: [{ name: "vault", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "pause",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "unpause",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // ── View Functions ──────────────────────────────────────────────────────
  {
    type: "function",
    name: "adapters",
    inputs: [{ name: "poolType", type: "uint8" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "swapCounter",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "paused",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "VAULT_ROLE",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "DEFAULT_ADMIN_ROLE",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasRole",
    inputs: [
      { name: "role", type: "bytes32" },
      { name: "account", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  // ── Events ──────────────────────────────────────────────────────────────
  {
    type: "event",
    name: "Swapped",
    inputs: [
      { name: "sender", type: "address", indexed: true },
      { name: "tokenIn", type: "address", indexed: true },
      { name: "tokenOut", type: "address", indexed: true },
      { name: "amountIn", type: "uint256", indexed: false },
      { name: "amountOut", type: "uint256", indexed: false },
      { name: "poolType", type: "uint8", indexed: false },
    ],
  },
  {
    type: "event",
    name: "AdapterSet",
    inputs: [
      { name: "poolType", type: "uint8", indexed: true },
      { name: "adapter", type: "address", indexed: true },
    ],
  },
  // ── Errors ──────────────────────────────────────────────────────────────
  { type: "error", name: "Expired", inputs: [] },
  {
    type: "error",
    name: "SlippageExceeded",
    inputs: [
      { name: "amountOut", type: "uint256" },
      { name: "minAmountOut", type: "uint256" },
    ],
  },
  { type: "error", name: "ZeroSwapAmount", inputs: [] },
  {
    type: "error",
    name: "UnsupportedPoolType",
    inputs: [{ name: "poolType", type: "uint8" }],
  },
  {
    type: "error",
    name: "NoAdapterRegistered",
    inputs: [{ name: "poolType", type: "uint8" }],
  },
  {
    type: "error",
    name: "InvalidSplitWeights",
    inputs: [{ name: "totalWeight", type: "uint256" }],
  },
  { type: "error", name: "IdenticalTokens", inputs: [] },
  { type: "error", name: "ZeroAddress", inputs: [] },
  { type: "error", name: "Unauthorized", inputs: [] },
] as const;
