import { describe, expect, it } from 'vitest';
import {
  BIFROST_STRATEGY_LABELS,
  BifrostCurrencyId,
  type BifrostProtocolConfig,
  BifrostStrategyType,
  type BifrostYieldProduct,
  type ChainConfig,
  CrossChainMessageType,
  type CrossChainVaultState,
  type SatelliteChainState,
  type SatelliteVaultConfig,
} from '../src/types.js';

describe('BifrostStrategyType', () => {
  it('should have all 7 strategy types with correct numeric values', () => {
    expect(BifrostStrategyType.MintVToken).toBe(0);
    expect(BifrostStrategyType.RedeemVToken).toBe(1);
    expect(BifrostStrategyType.DEXSwap).toBe(2);
    expect(BifrostStrategyType.FarmDeposit).toBe(3);
    expect(BifrostStrategyType.FarmWithdraw).toBe(4);
    expect(BifrostStrategyType.FarmClaim).toBe(5);
    expect(BifrostStrategyType.SALPContribute).toBe(6);
  });

  it('should support reverse mapping from number to name', () => {
    expect(BifrostStrategyType[0]).toBe('MintVToken');
    expect(BifrostStrategyType[6]).toBe('SALPContribute');
  });

  it('should have exactly 7 strategy types', () => {
    const numericKeys = Object.keys(BifrostStrategyType).filter((k) => !Number.isNaN(Number(k)));
    expect(numericKeys).toHaveLength(7);
  });
});

describe('BifrostCurrencyId', () => {
  it('should have all 5 currency IDs with correct numeric values', () => {
    expect(BifrostCurrencyId.DOT).toBe(0);
    expect(BifrostCurrencyId.vDOT).toBe(1);
    expect(BifrostCurrencyId.KSM).toBe(2);
    expect(BifrostCurrencyId.vKSM).toBe(3);
    expect(BifrostCurrencyId.BNC).toBe(4);
  });

  it('should support reverse mapping from number to name', () => {
    expect(BifrostCurrencyId[0]).toBe('DOT');
    expect(BifrostCurrencyId[1]).toBe('vDOT');
    expect(BifrostCurrencyId[4]).toBe('BNC');
  });

  it('should have exactly 5 currency IDs', () => {
    const numericKeys = Object.keys(BifrostCurrencyId).filter((k) => !Number.isNaN(Number(k)));
    expect(numericKeys).toHaveLength(5);
  });
});

describe('BIFROST_STRATEGY_LABELS', () => {
  it('should have a label for every strategy type', () => {
    const strategyTypes = Object.values(BifrostStrategyType).filter(
      (v) => typeof v === 'number',
    ) as BifrostStrategyType[];

    for (const st of strategyTypes) {
      expect(BIFROST_STRATEGY_LABELS[st]).toBeDefined();
      expect(typeof BIFROST_STRATEGY_LABELS[st]).toBe('string');
      expect(BIFROST_STRATEGY_LABELS[st].length).toBeGreaterThan(0);
    }
  });

  it('should have human-readable labels', () => {
    expect(BIFROST_STRATEGY_LABELS[BifrostStrategyType.MintVToken]).toBe('Mint vToken (SLP)');
    expect(BIFROST_STRATEGY_LABELS[BifrostStrategyType.RedeemVToken]).toBe('Redeem vToken (SLP)');
    expect(BIFROST_STRATEGY_LABELS[BifrostStrategyType.DEXSwap]).toBe('DEX Swap');
    expect(BIFROST_STRATEGY_LABELS[BifrostStrategyType.FarmDeposit]).toBe('Farm Deposit');
    expect(BIFROST_STRATEGY_LABELS[BifrostStrategyType.FarmWithdraw]).toBe('Farm Withdraw');
    expect(BIFROST_STRATEGY_LABELS[BifrostStrategyType.FarmClaim]).toBe('Farm Claim Rewards');
    expect(BIFROST_STRATEGY_LABELS[BifrostStrategyType.SALPContribute]).toBe('SALP Contribute');
  });

  it('should have exactly 7 entries', () => {
    expect(Object.keys(BIFROST_STRATEGY_LABELS)).toHaveLength(7);
  });
});

describe('CrossChainMessageType', () => {
  it('should have all message types with correct numeric values', () => {
    expect(CrossChainMessageType.DEPOSIT_SYNC).toBe(1);
    expect(CrossChainMessageType.WITHDRAW_REQUEST).toBe(2);
    expect(CrossChainMessageType.ASSET_SYNC).toBe(3);
    expect(CrossChainMessageType.STRATEGY_REPORT).toBe(4);
    expect(CrossChainMessageType.EMERGENCY_SYNC).toBe(5);
    expect(CrossChainMessageType.DEPOSIT_ACK).toBe(6);
    expect(CrossChainMessageType.WITHDRAW_FULFILL).toBe(7);
  });

  it('should have 7 message types', () => {
    const numericKeys = Object.keys(CrossChainMessageType).filter((k) => !Number.isNaN(Number(k)));
    expect(numericKeys).toHaveLength(7);
  });

  it('should start at 1 (not 0)', () => {
    const numericValues = Object.values(CrossChainMessageType).filter((v) => typeof v === 'number') as number[];
    expect(Math.min(...numericValues)).toBe(1);
  });
});

describe('SatelliteVaultConfig', () => {
  it('should extend VaultConfig with cross-chain fields', () => {
    const chainConfig: ChainConfig = {
      endpoint: 'wss://moonbeam-rpc.polkadot.io',
      name: 'Moonbeam',
      chainId: 'moonbeam',
    };

    const satellite: SatelliteVaultConfig = {
      id: 'moonbeam-vault',
      name: 'Moonbeam Satellite Vault',
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chain: chainConfig,
      asset: 'xcDOT',
      decimals: 10,
      hubVaultAddress: '0xaaaa',
      routerAddress: '0xbbbb',
      rpcUrl: 'https://rpc.api.moonbeam.network',
      evmChainId: 1284,
    };

    expect(satellite.id).toBe('moonbeam-vault');
    expect(satellite.name).toBe('Moonbeam Satellite Vault');
    expect(satellite.address).toBe('0x1234567890abcdef1234567890abcdef12345678');
    expect(satellite.chain).toEqual(chainConfig);
    expect(satellite.asset).toBe('xcDOT');
    expect(satellite.decimals).toBe(10);
    expect(satellite.hubVaultAddress).toBe('0xaaaa');
    expect(satellite.routerAddress).toBe('0xbbbb');
    expect(satellite.rpcUrl).toBe('https://rpc.api.moonbeam.network');
    expect(satellite.evmChainId).toBe(1284);
  });
});

describe('SatelliteChainState', () => {
  it('should represent per-satellite state correctly', () => {
    const state: SatelliteChainState = {
      chainName: 'Moonbeam',
      totalAssets: 1000000000000n,
      globalTotalAssets: 5000000000000n,
      emergencyMode: false,
      lastSyncTimestamp: 1700000000,
      paused: false,
    };

    expect(state.chainName).toBe('Moonbeam');
    expect(state.totalAssets).toBe(1000000000000n);
    expect(state.globalTotalAssets).toBe(5000000000000n);
    expect(state.emergencyMode).toBe(false);
    expect(state.lastSyncTimestamp).toBe(1700000000);
    expect(state.paused).toBe(false);
  });

  it('should represent emergency mode state', () => {
    const state: SatelliteChainState = {
      chainName: 'Astar',
      totalAssets: 0n,
      globalTotalAssets: 0n,
      emergencyMode: true,
      lastSyncTimestamp: 1699000000,
      paused: true,
    };

    expect(state.emergencyMode).toBe(true);
    expect(state.paused).toBe(true);
  });
});

describe('CrossChainVaultState', () => {
  it('should aggregate satellite state into a map', () => {
    const moonbeamState: SatelliteChainState = {
      chainName: 'Moonbeam',
      totalAssets: 1000n,
      globalTotalAssets: 3000n,
      emergencyMode: false,
      lastSyncTimestamp: 1700000000,
      paused: false,
    };

    const astarState: SatelliteChainState = {
      chainName: 'Astar',
      totalAssets: 2000n,
      globalTotalAssets: 3000n,
      emergencyMode: false,
      lastSyncTimestamp: 1700000001,
      paused: false,
    };

    const satelliteAssets = new Map<string, SatelliteChainState>();
    satelliteAssets.set('Moonbeam', moonbeamState);
    satelliteAssets.set('Astar', astarState);

    const vaultState: CrossChainVaultState = {
      totalSatelliteAssets: 3000n,
      globalTotalAssets: 3000n,
      globalTotalShares: 1500n,
      satelliteAssets,
    };

    expect(vaultState.totalSatelliteAssets).toBe(3000n);
    expect(vaultState.globalTotalAssets).toBe(3000n);
    expect(vaultState.globalTotalShares).toBe(1500n);
    expect(vaultState.satelliteAssets.size).toBe(2);
    expect(vaultState.satelliteAssets.get('Moonbeam')).toEqual(moonbeamState);
    expect(vaultState.satelliteAssets.get('Astar')).toEqual(astarState);
  });

  it('should handle empty satellite map', () => {
    const vaultState: CrossChainVaultState = {
      totalSatelliteAssets: 0n,
      globalTotalAssets: 0n,
      globalTotalShares: 0n,
      satelliteAssets: new Map(),
    };

    expect(vaultState.satelliteAssets.size).toBe(0);
  });
});

describe('BifrostYieldProduct', () => {
  it('should represent an SLP product', () => {
    const product: BifrostYieldProduct = {
      protocol: 'Bifrost',
      product: 'vDOT Liquid Staking',
      category: 'SLP',
      apy: 14.5,
      currencyIn: BifrostCurrencyId.DOT,
      currencyOut: BifrostCurrencyId.vDOT,
      isActive: true,
    };

    expect(product.protocol).toBe('Bifrost');
    expect(product.category).toBe('SLP');
    expect(product.apy).toBe(14.5);
    expect(product.currencyIn).toBe(BifrostCurrencyId.DOT);
    expect(product.currencyOut).toBe(BifrostCurrencyId.vDOT);
    expect(product.poolId).toBeUndefined();
    expect(product.isActive).toBe(true);
  });

  it('should represent a Farming product with poolId', () => {
    const product: BifrostYieldProduct = {
      protocol: 'Bifrost',
      product: 'vDOT Farming',
      category: 'Farming',
      apy: 22.7,
      currencyIn: BifrostCurrencyId.vDOT,
      poolId: 42,
      isActive: true,
    };

    expect(product.category).toBe('Farming');
    expect(product.poolId).toBe(42);
    expect(product.currencyOut).toBeUndefined();
  });

  it('should represent a DEX product', () => {
    const product: BifrostYieldProduct = {
      protocol: 'Bifrost',
      product: 'DOT/vDOT Pool',
      category: 'DEX',
      apy: 8.3,
      currencyIn: BifrostCurrencyId.DOT,
      currencyOut: BifrostCurrencyId.vDOT,
      poolId: 0,
      isActive: true,
    };

    expect(product.category).toBe('DEX');
    expect(product.poolId).toBe(0);
  });

  it('should represent a SALP product', () => {
    const product: BifrostYieldProduct = {
      protocol: 'Bifrost',
      product: 'Polkadot SALP',
      category: 'SALP',
      apy: 6.8,
      currencyIn: BifrostCurrencyId.DOT,
      isActive: false,
    };

    expect(product.category).toBe('SALP');
    expect(product.isActive).toBe(false);
  });

  it('should only allow valid category values', () => {
    const validCategories: BifrostYieldProduct['category'][] = ['SLP', 'DEX', 'Farming', 'SALP'];
    expect(validCategories).toHaveLength(4);

    for (const cat of validCategories) {
      const product: BifrostYieldProduct = {
        protocol: 'Bifrost',
        product: `Test ${cat}`,
        category: cat,
        apy: 10,
        currencyIn: BifrostCurrencyId.DOT,
        isActive: true,
      };
      expect(product.category).toBe(cat);
    }
  });
});

describe('BifrostProtocolConfig', () => {
  it('should represent a protocol registry entry', () => {
    const config: BifrostProtocolConfig = {
      palletIndex: 100,
      name: 'SLP',
      protocol: 'Bifrost',
    };

    expect(config.palletIndex).toBe(100);
    expect(config.name).toBe('SLP');
    expect(config.protocol).toBe('Bifrost');
  });
});

describe('enum type guards', () => {
  it('should validate BifrostStrategyType values at runtime', () => {
    const isValidStrategy = (value: number): value is BifrostStrategyType => {
      return value >= 0 && value <= 6 && Number.isInteger(value);
    };

    expect(isValidStrategy(0)).toBe(true);
    expect(isValidStrategy(6)).toBe(true);
    expect(isValidStrategy(7)).toBe(false);
    expect(isValidStrategy(-1)).toBe(false);
    expect(isValidStrategy(1.5)).toBe(false);
  });

  it('should validate BifrostCurrencyId values at runtime', () => {
    const isValidCurrency = (value: number): value is BifrostCurrencyId => {
      return value >= 0 && value <= 4 && Number.isInteger(value);
    };

    expect(isValidCurrency(0)).toBe(true);
    expect(isValidCurrency(4)).toBe(true);
    expect(isValidCurrency(5)).toBe(false);
    expect(isValidCurrency(-1)).toBe(false);
  });

  it('should validate CrossChainMessageType values at runtime', () => {
    const isValidMessageType = (value: number): value is CrossChainMessageType => {
      return value >= 1 && value <= 7 && Number.isInteger(value);
    };

    expect(isValidMessageType(1)).toBe(true);
    expect(isValidMessageType(7)).toBe(true);
    expect(isValidMessageType(0)).toBe(false);
    expect(isValidMessageType(8)).toBe(false);
  });
});

describe('bigint fields in cross-chain types', () => {
  it('should handle very large bigint values for totalAssets', () => {
    const state: SatelliteChainState = {
      chainName: 'Test',
      totalAssets: 999_999_999_999_999_999_999n,
      globalTotalAssets: 1_000_000_000_000_000_000_000n,
      emergencyMode: false,
      lastSyncTimestamp: 1700000000,
      paused: false,
    };

    expect(state.totalAssets).toBe(999_999_999_999_999_999_999n);
    expect(state.globalTotalAssets).toBe(1_000_000_000_000_000_000_000n);
    expect(state.totalAssets < state.globalTotalAssets).toBe(true);
  });

  it('should handle zero values', () => {
    const state: CrossChainVaultState = {
      totalSatelliteAssets: 0n,
      globalTotalAssets: 0n,
      globalTotalShares: 0n,
      satelliteAssets: new Map(),
    };

    expect(state.totalSatelliteAssets).toBe(0n);
    expect(state.globalTotalAssets).toBe(0n);
    expect(state.globalTotalShares).toBe(0n);
  });
});
