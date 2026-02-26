/**
 * Polkadot Hub EVM chain definition for viem.
 *
 * This is the EVM-compatible environment on Polkadot Hub (using REVM)
 * where the ObidotVault contract is deployed.
 */
import { defineChain } from 'viem';

/** Polkadot Hub Testnet (Paseo) chain definition. */
export const polkadotHubTestnet = defineChain({
  id: 420_420_417,
  name: 'Polkadot Hub Testnet (Paseo)',
  nativeCurrency: {
    name: 'Paseo DOT',
    symbol: 'PAS',
    decimals: 10,
  },
  rpcUrls: {
    default: {
      http: ['https://services.polkadothub-rpc.com/testnet'],
    },
  },
  testnet: true,
});

/** XCM precompile address on Polkadot Hub EVM. */
export const XCM_PRECOMPILE_ADDRESS = '0x00000000000000000000000000000000000a0000' as const;

/** Default RPC URL for Polkadot Hub Testnet. */
export const POLKADOT_HUB_TESTNET_RPC = 'https://services.polkadothub-rpc.com/testnet' as const;
