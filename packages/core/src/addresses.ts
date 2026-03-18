/**
 * Deployed contract addresses for Obidot on Polkadot Hub Paseo TestNet.
 *
 * These addresses are the canonical deployed contracts used for all SDK
 * integrations, examples, and agent tooling. They are wired into the
 * ObiKit SDK and example .env files as default fallbacks.
 *
 * Chain ID: 420420417 (Polkadot Hub TestNet / Paseo)
 * RPC: https://eth-rpc-testnet.polkadot.io/
 * Explorer: https://blockscout-testnet.polkadot.io
 *
 * @see docs/addresses.md in obi.router for full deployment history
 */

// ─────────────────────────────────────────────────────────────────────────────
//  Paseo TestNet Contract Addresses
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All deployed Obidot contract addresses on Polkadot Hub Paseo TestNet.
 * Use these as default fallbacks when no environment variable override is set.
 */
export const POLKADOT_HUB_TESTNET_CONTRACTS = {
  // ── Core Vault ──────────────────────────────────────────────────────────
  /** ObidotVault v3 — ERC-4626 hub vault + IIntentSolver + SwapRouter integration */
  vaultAddress: '0x03473a95971Ba0496786a615e21b1e87bDFf0025',

  // ── Asset Tokens ─────────────────────────────────────────────────────────
  /** TestDOT — ERC-20 wrapped DOT (18 decimals) on Polkadot Hub TestNet */
  assetAddress: '0x2402C804aD8a6217BF73D8483dA7564065c56083',

  // ── DEX Aggregator ───────────────────────────────────────────────────────
  /** SwapRouter v3 — DEX aggregator routing engine */
  swapRouterAddress: '0x60a72d1e20c5dc40Bb5a24394f0583d863201A3c',
  /** SwapQuoter — read-only quoter (getBestQuote, getAllQuotes, quoteMultiHop) */
  swapQuoterAddress: '0x81d7aCFEF474DA6c76eC1b5A05a137cB9f3A5Db1',

  // ── Cross-Chain Executors ─────────────────────────────────────────────────
  /** XCMExecutor — native Polkadot XCM executor (parachains via precompile 0xA0000) */
  xcmExecutorAddress: '0x011b6FAf32370dCF92a452374FfCfCdbfA20278c',
  /** HyperExecutor — Hyperbridge ISMP executor (Ethereum/Arbitrum/Base) */
  hyperExecutorAddress: '0x62919Cb6416Cb919fC4A30c5707a7867Ca874ca6',

  // ── DEX Adapters ──────────────────────────────────────────────────────────
  /** HydrationOmnipoolAdapter — Hydration Omnipool XCM adapter (parachain 2034) */
  hydrationAdapterAddress: '0xF0E1c10f97446C032A86C9643258Bb26d6129933',
  /** BifrostAdapter — Bifrost SLP/SALP/DEX/Farming adapter (parachain 2030) */
  bifrostAdapterAddress: '0x265Cb785De0fF2e5BcebDEb53095aDCAE9175527',

  // ── Oracle ────────────────────────────────────────────────────────────────
  /** OracleRegistry — multi-asset price oracle registry with staleness checks */
  oracleRegistryAddress: '0x8b7C7345d6cF9de45f4aacC61F56F0241d47e88B',

  // ── Cross-Chain Infrastructure ────────────────────────────────────────────
  /** CrossChainRouter — hub ISMP message router (dispatches + receives ISMP messages) */
  crossChainRouterAddress: '0xE2fFfb3B5C72f99811bC20D857035611bFCe5b5d',

  // ── Hyperbridge ───────────────────────────────────────────────────────────
  /** Hyperbridge IsmpHost on Polkadot Hub Paseo (Gargantua V3) */
  ismpHostAddress: '0xbb26e04a71e7c12093e82b83ba310163eac186fa',
  /** Hyperbridge fee token (USD.h) on Polkadot Hub Paseo */
  hyperbridgeFeeTokenAddress: '0x0dc440cf87830f0af564eb8b62b454b7e0c68a4b',
} as const satisfies Record<string, `0x${string}`>;

/**
 * Admin EOA for the Paseo testnet deployment.
 * This address holds DEFAULT_ADMIN_ROLE on all deployed contracts.
 */
export const POLKADOT_HUB_TESTNET_ADMIN = '0x5984A519fFfE5aFc5e8bBA233DCc01AC774f4301' as const;

// ─────────────────────────────────────────────────────────────────────────────
//  Type Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** All Obidot contract address keys (type-safe key union). */
export type ObidotContractKey = keyof typeof POLKADOT_HUB_TESTNET_CONTRACTS;

/** A record of Obidot contract addresses, keyed by contract name. */
export type ObidotContractAddresses = typeof POLKADOT_HUB_TESTNET_CONTRACTS;
