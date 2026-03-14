/**
 * Polkadot Hub EVM chain definitions for viem.
 *
 * All three Polkadot Hub networks (TestNet, Mainnet, Kusama Hub) are exported
 * here so consumers don't have to manually define chain configs.
 * Use these anywhere a viem `Chain` object is required.
 */
import { defineChain } from 'viem';

// ─────────────────────────────────────────────────────────────────────────────
//  Chain Definitions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Polkadot Hub TestNet (Paseo / PAS) — chain ID 420420417.
 * Use for development and testnet deployments.
 */
export const polkadotHubTestnet = defineChain({
  id: 420_420_417,
  name: 'Polkadot Hub TestNet',
  nativeCurrency: { name: 'Paseo DOT', symbol: 'PAS', decimals: 10 },
  rpcUrls: {
    default: { http: ['https://eth-rpc-testnet.polkadot.io/'] },
    public: { http: ['https://eth-rpc-testnet.polkadot.io/'] },
  },
  blockExplorers: {
    default: {
      name: 'Blockscout',
      url: 'https://blockscout-testnet.polkadot.io',
    },
  },
  testnet: true,
});

/**
 * Polkadot Hub Mainnet (DOT) — chain ID 420420419.
 * Use for production deployments on the live Polkadot network.
 */
export const polkadotHubMainnet = defineChain({
  id: 420_420_419,
  name: 'Polkadot Hub',
  nativeCurrency: { name: 'Polkadot', symbol: 'DOT', decimals: 10 },
  rpcUrls: {
    default: { http: ['https://eth-rpc.polkadot.io/'] },
    public: { http: ['https://eth-rpc.polkadot.io/'] },
  },
  blockExplorers: {
    default: {
      name: 'Blockscout',
      url: 'https://blockscout.polkadot.io',
    },
  },
});

/**
 * Kusama Hub (KSM) — chain ID 420420418.
 * Use for Kusama-side deployments.
 */
export const kusamaHub = defineChain({
  id: 420_420_418,
  name: 'Kusama Hub',
  nativeCurrency: { name: 'Kusama', symbol: 'KSM', decimals: 12 },
  rpcUrls: {
    default: { http: ['https://eth-rpc-kusama.polkadot.io/'] },
    public: { http: ['https://eth-rpc-kusama.polkadot.io/'] },
  },
  blockExplorers: {
    default: {
      name: 'Blockscout',
      url: 'https://blockscout-kusama.polkadot.io',
    },
  },
});

// ─────────────────────────────────────────────────────────────────────────────
//  Convenience Aliases
// ─────────────────────────────────────────────────────────────────────────────

/** Alias: POLKADOT_HUB_TESTNET — same as polkadotHubTestnet, preferred for imports. */
export const POLKADOT_HUB_TESTNET = polkadotHubTestnet;

/** Alias: POLKADOT_HUB_MAINNET — same as polkadotHubMainnet. */
export const POLKADOT_HUB_MAINNET = polkadotHubMainnet;

/** Alias: KUSAMA_HUB — same as kusamaHub. */
export const KUSAMA_HUB = kusamaHub;

// ─────────────────────────────────────────────────────────────────────────────
//  Network Constants
// ─────────────────────────────────────────────────────────────────────────────

/** XCM precompile address on Polkadot Hub EVM (all networks). */
export const XCM_PRECOMPILE_ADDRESS = '0x00000000000000000000000000000000000a0000' as const;

/** RPC URLs — use directly or via the chain definitions above. */
export const RPC_URLS = {
  testnet: 'https://eth-rpc-testnet.polkadot.io/',
  mainnet: 'https://eth-rpc.polkadot.io/',
  kusama: 'https://eth-rpc-kusama.polkadot.io/',
} as const;

/** Blockscout explorer base URLs. */
export const EXPLORER_URLS = {
  testnet: 'https://blockscout-testnet.polkadot.io',
  mainnet: 'https://blockscout.polkadot.io',
  kusama: 'https://blockscout-kusama.polkadot.io',
} as const;

/**
 * @deprecated Use `RPC_URLS.testnet` instead.
 * Kept for backwards compatibility with consumers that import this directly.
 */
export const POLKADOT_HUB_TESTNET_RPC = RPC_URLS.testnet;
