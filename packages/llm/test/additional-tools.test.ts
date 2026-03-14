import { describe, expect, it, vi } from 'vitest';
import { OracleUpdateTool } from '../src/tools/oracle-update.js';
import { VaultAdminTool } from '../src/tools/vault-admin.js';
import { VaultPolicyTool } from '../src/tools/vault-policy.js';

const MOCK_VAULT = '0x03473a95971Ba0496786a615e21b1e87bDFf0025';
const MOCK_ORACLE = '0x8b7C7345d6cF9de45f4aacC61F56F0241d47e88B';

// ─── VaultPolicyTool ──────────────────────────────────────────────────────────

describe('VaultPolicyTool', () => {
  describe('construction', () => {
    it('creates with vault config', () => {
      const tool = new VaultPolicyTool({
        vaultConfig: {
          vaultAddress: MOCK_VAULT,
          assetAddress: '0x0',
          assetDecimals: 18,
        },
      });
      expect(tool.name).toBe('vault_policy');
      expect(tool.description).toContain('parachain');
    });

    it('creates without config', () => {
      const tool = new VaultPolicyTool({});
      expect(tool.name).toBe('vault_policy');
    });
  });

  describe('offline mode (no EVM context)', () => {
    it('returns stub result when no evmContext is configured', async () => {
      const tool = new VaultPolicyTool({
        vaultConfig: {
          vaultAddress: MOCK_VAULT,
          assetAddress: '0x0',
          assetDecimals: 18,
        },
      });
      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw) as {
        success: boolean;
        data: { mode: string };
      };
      expect(result.success).toBe(true);
      expect(result.data.mode).toBe('stub');
    });

    it('returns error when no vault configured', async () => {
      const tool = new VaultPolicyTool({});
      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw) as { success: boolean; error: string };
      expect(result.success).toBe(false);
      expect(result.error).toContain('vault');
    });

    it('returns stub even when parachainId is provided', async () => {
      const tool = new VaultPolicyTool({
        vaultConfig: {
          vaultAddress: MOCK_VAULT,
          assetAddress: '0x0',
          assetDecimals: 18,
        },
      });
      const raw = await tool.invoke(JSON.stringify({ parachainId: 2034 }));
      const result = JSON.parse(raw) as {
        success: boolean;
        data: { mode: string };
      };
      expect(result.success).toBe(true);
      expect(result.data.mode).toBe('stub');
    });

    it('returns stub even when protocol is provided', async () => {
      const tool = new VaultPolicyTool({
        vaultConfig: {
          vaultAddress: MOCK_VAULT,
          assetAddress: '0x0',
          assetDecimals: 18,
        },
      });
      const raw = await tool.invoke(JSON.stringify({ protocol: '0xdeadbeef' }));
      const result = JSON.parse(raw) as {
        success: boolean;
        data: { mode: string };
      };
      expect(result.success).toBe(true);
      expect(result.data.mode).toBe('stub');
    });
  });

  describe('EVM mode', () => {
    it('reads depositCap, withdrawalTimelock, emergencyMode from vault', async () => {
      const mockReadContract = vi
        .fn()
        .mockResolvedValueOnce(1_000_000n) // depositCap
        .mockResolvedValueOnce(3600n) // withdrawalTimelock
        .mockResolvedValueOnce(false); // emergencyMode

      const tool = new VaultPolicyTool({
        evmContext: {
          client: { readContract: mockReadContract } as never,
          walletClient: undefined,
        },
        vaultConfig: {
          vaultAddress: MOCK_VAULT,
          assetAddress: '0x0',
          assetDecimals: 18,
        },
      });

      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw) as {
        success: boolean;
        data: {
          depositCap: string;
          withdrawalTimelockSecs: string;
          emergencyMode: boolean;
          mode: string;
        };
      };
      expect(result.success).toBe(true);
      expect(result.data.mode).toBe('evm');
      expect(result.data.depositCap).toBe('1000000');
      expect(result.data.withdrawalTimelockSecs).toBe('3600');
      expect(result.data.emergencyMode).toBe(false);
    });

    it('includes parachain data when parachainId is specified', async () => {
      const mockReadContract = vi
        .fn()
        .mockResolvedValueOnce(500_000n) // depositCap
        .mockResolvedValueOnce(7200n) // withdrawalTimelock
        .mockResolvedValueOnce(false) // emergencyMode
        .mockResolvedValueOnce(true); // allowedParachains(2034)

      const tool = new VaultPolicyTool({
        evmContext: {
          client: { readContract: mockReadContract } as never,
          walletClient: undefined,
        },
        vaultConfig: {
          vaultAddress: MOCK_VAULT,
          assetAddress: '0x0',
          assetDecimals: 18,
        },
      });

      const raw = await tool.invoke(JSON.stringify({ parachainId: 2034 }));
      const result = JSON.parse(raw) as {
        success: boolean;
        data: { parachain: { parachainId: number; allowed: boolean } };
      };
      expect(result.success).toBe(true);
      expect(result.data.parachain.parachainId).toBe(2034);
      expect(result.data.parachain.allowed).toBe(true);
    });

    it('sets emergencyMode=ACTIVE in message when true', async () => {
      const mockReadContract = vi.fn().mockResolvedValueOnce(0n).mockResolvedValueOnce(0n).mockResolvedValueOnce(true); // emergencyMode=true

      const tool = new VaultPolicyTool({
        evmContext: {
          client: { readContract: mockReadContract } as never,
          walletClient: undefined,
        },
        vaultConfig: {
          vaultAddress: MOCK_VAULT,
          assetAddress: '0x0',
          assetDecimals: 18,
        },
      });

      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw) as { success: boolean; message: string };
      expect(result.message).toContain('ACTIVE');
    });
  });

  describe('input parsing', () => {
    it('handles empty string input', async () => {
      const tool = new VaultPolicyTool({
        vaultConfig: {
          vaultAddress: MOCK_VAULT,
          assetAddress: '0x0',
          assetDecimals: 18,
        },
      });
      const raw = await tool.invoke('');
      const result = JSON.parse(raw) as { success: boolean };
      expect(result.success).toBe(true);
    });

    it('handles invalid JSON gracefully', async () => {
      const tool = new VaultPolicyTool({
        vaultConfig: {
          vaultAddress: MOCK_VAULT,
          assetAddress: '0x0',
          assetDecimals: 18,
        },
      });
      const raw = await tool.invoke('not-json');
      const result = JSON.parse(raw) as { success: boolean };
      expect(result.success).toBe(true);
    });
  });

  describe('description', () => {
    it('mentions key policy concepts', () => {
      const tool = new VaultPolicyTool({});
      expect(tool.description).toContain('protocol');
      expect(tool.description).toContain('timelock');
    });
  });
});

// ─── OracleUpdateTool ─────────────────────────────────────────────────────────

describe('OracleUpdateTool', () => {
  describe('construction', () => {
    it('creates with default oracle address', () => {
      const tool = new OracleUpdateTool({ defaultOracleAddress: MOCK_ORACLE });
      expect(tool.name).toBe('oracle_update');
      expect(tool.description).toContain('price');
    });

    it('creates without config', () => {
      const tool = new OracleUpdateTool({});
      expect(tool.name).toBe('oracle_update');
    });
  });

  describe('offline mode (no EVM context)', () => {
    it('returns stub result when no evmContext is configured', async () => {
      const tool = new OracleUpdateTool({ defaultOracleAddress: MOCK_ORACLE });
      const raw = await tool.invoke(JSON.stringify({ price: '1500000000' }));
      const result = JSON.parse(raw) as {
        success: boolean;
        data: { mode: string };
      };
      expect(result.success).toBe(true);
      expect(result.data.mode).toBe('stub');
    });

    it('uses defaultOracleAddress when oracleAddress not in input', async () => {
      const tool = new OracleUpdateTool({ defaultOracleAddress: MOCK_ORACLE });
      const raw = await tool.invoke(JSON.stringify({ price: '1234' }));
      const result = JSON.parse(raw) as {
        success: boolean;
        data: { oracleAddress: string };
      };
      expect(result.data.oracleAddress).toBe(MOCK_ORACLE);
    });

    it('returns error when no oracle address is available', async () => {
      const tool = new OracleUpdateTool({});
      const raw = await tool.invoke(JSON.stringify({ price: '1234' }));
      const result = JSON.parse(raw) as { success: boolean; error: string };
      expect(result.success).toBe(false);
      expect(result.error).toContain('oracleAddress');
    });

    it('returns error when price is missing', async () => {
      const tool = new OracleUpdateTool({ defaultOracleAddress: MOCK_ORACLE });
      const raw = await tool.invoke(JSON.stringify({ oracleAddress: MOCK_ORACLE }));
      const result = JSON.parse(raw) as { success: boolean; error: string };
      expect(result.success).toBe(false);
      expect(result.error).toContain('price');
    });
  });

  describe('EVM mode', () => {
    it('calls writeContract with setPrice and returns tx hash', async () => {
      const mockWriteContract = vi.fn().mockResolvedValue('0xdeadbeef');
      const mockWaitForReceipt = vi.fn().mockResolvedValue({ status: 'success', blockNumber: 100n });
      const mockReadContract = vi.fn().mockResolvedValue([0n, 1500000000n, 0n, 1700000000n, 0n]);

      const tool = new OracleUpdateTool({
        defaultOracleAddress: MOCK_ORACLE,
        evmContext: {
          client: {
            readContract: mockReadContract,
            waitForTransactionReceipt: mockWaitForReceipt,
          } as never,
          walletClient: {
            writeContract: mockWriteContract,
          } as never,
        },
      });

      const raw = await tool.invoke(JSON.stringify({ price: '1500000000' }));
      const result = JSON.parse(raw) as {
        success: boolean;
        data: { txHash: string; priceSet: string; mode: string };
      };
      expect(result.success).toBe(true);
      expect(result.data.txHash).toBe('0xdeadbeef');
      expect(result.data.priceSet).toBe('1500000000');
      expect(result.data.mode).toBe('evm');
      expect(mockWriteContract).toHaveBeenCalledOnce();
    });

    it('returns success=false when tx status is reverted', async () => {
      const mockWriteContract = vi.fn().mockResolvedValue('0xfailed');
      const mockWaitForReceipt = vi.fn().mockResolvedValue({ status: 'reverted', blockNumber: 101n });
      const mockReadContract = vi.fn().mockRejectedValue(new Error('revert'));

      const tool = new OracleUpdateTool({
        defaultOracleAddress: MOCK_ORACLE,
        evmContext: {
          client: {
            readContract: mockReadContract,
            waitForTransactionReceipt: mockWaitForReceipt,
          } as never,
          walletClient: { writeContract: mockWriteContract } as never,
        },
      });

      const raw = await tool.invoke(JSON.stringify({ price: '999' }));
      const result = JSON.parse(raw) as { success: boolean };
      expect(result.success).toBe(false);
    });

    it('throws when walletClient is missing in EVM context', async () => {
      const tool = new OracleUpdateTool({
        defaultOracleAddress: MOCK_ORACLE,
        evmContext: {
          client: {} as never,
          walletClient: undefined,
        },
      });

      const raw = await tool.invoke(JSON.stringify({ price: '1234' }));
      const result = JSON.parse(raw) as { success: boolean; error: string };
      expect(result.success).toBe(false);
      expect(result.error).toContain('Wallet client');
    });
  });

  describe('input parsing', () => {
    it('accepts oracleAddress from input overriding default', async () => {
      const customOracle = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      const tool = new OracleUpdateTool({ defaultOracleAddress: MOCK_ORACLE });
      const raw = await tool.invoke(JSON.stringify({ oracleAddress: customOracle, price: '42' }));
      const result = JSON.parse(raw) as { data: { oracleAddress: string } };
      expect(result.data.oracleAddress).toBe(customOracle);
    });

    it('returns error on invalid JSON', async () => {
      const tool = new OracleUpdateTool({ defaultOracleAddress: MOCK_ORACLE });
      const raw = await tool.invoke('not-json');
      const result = JSON.parse(raw) as { success: boolean; error: string };
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON');
    });
  });

  describe('description', () => {
    it('mentions KEEPER_ROLE requirement', () => {
      const tool = new OracleUpdateTool({});
      expect(tool.description).toContain('KEEPER_ROLE');
    });
  });
});

// ─── VaultAdminTool ───────────────────────────────────────────────────────────

describe('VaultAdminTool', () => {
  describe('construction', () => {
    it('creates with vault config', () => {
      const tool = new VaultAdminTool({
        vaultConfig: {
          vaultAddress: MOCK_VAULT,
          assetAddress: '0x0',
          assetDecimals: 18,
        },
      });
      expect(tool.name).toBe('vault_admin');
      expect(tool.description).toContain('strategyCounter');
    });

    it('creates without config', () => {
      const tool = new VaultAdminTool({});
      expect(tool.name).toBe('vault_admin');
    });
  });

  describe('offline mode (no EVM context)', () => {
    it('returns stub result when no evmContext configured', async () => {
      const tool = new VaultAdminTool({
        vaultConfig: {
          vaultAddress: MOCK_VAULT,
          assetAddress: '0x0',
          assetDecimals: 18,
        },
      });
      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw) as {
        success: boolean;
        data: { mode: string };
      };
      expect(result.success).toBe(true);
      expect(result.data.mode).toBe('stub');
    });

    it('returns error when no vault configured', async () => {
      const tool = new VaultAdminTool({});
      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw) as { success: boolean; error: string };
      expect(result.success).toBe(false);
      expect(result.error).toContain('vault');
    });
  });

  describe('EVM mode', () => {
    function buildMockContext(overrides?: Partial<Record<string, unknown>>) {
      const defaults: Record<string, unknown> = {
        totalAssets: 5_000_000n,
        totalSupply: 4_900_000n,
        paused: false,
        emergencyMode: false,
        strategyCounter: 7n,
        feeTreasury: '0xFEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE',
        DEFAULT_ADMIN_ROLE: '0x0000000000000000000000000000000000000000000000000000000000000000',
        KEEPER_ROLE: '0x1111111111111111111111111111111111111111111111111111111111111111',
        STRATEGIST_ROLE: '0x2222222222222222222222222222222222222222222222222222222222222222',
        SOLVER_ROLE: '0x3333333333333333333333333333333333333333333333333333333333333333',
        ...overrides,
      };

      const callOrder = [
        'totalAssets',
        'totalSupply',
        'paused',
        'emergencyMode',
        'strategyCounter',
        'feeTreasury',
        'DEFAULT_ADMIN_ROLE',
        'KEEPER_ROLE',
        'STRATEGIST_ROLE',
        'SOLVER_ROLE',
      ];

      let callIndex = 0;
      const mockReadContract = vi.fn().mockImplementation(() => {
        const key = callOrder[callIndex++];
        return Promise.resolve(defaults[key]);
      });

      return {
        client: { readContract: mockReadContract } as never,
        walletClient: undefined,
      };
    }

    it('reads all admin fields in EVM mode', async () => {
      const tool = new VaultAdminTool({
        evmContext: buildMockContext(),
        vaultConfig: {
          vaultAddress: MOCK_VAULT,
          assetAddress: '0x0',
          assetDecimals: 18,
        },
      });

      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw) as {
        success: boolean;
        data: {
          totalAssets: string;
          totalSupply: string;
          strategyCounter: string;
          feeTreasury: string;
          paused: boolean;
          emergencyMode: boolean;
          mode: string;
        };
      };

      expect(result.success).toBe(true);
      expect(result.data.mode).toBe('evm');
      expect(result.data.totalAssets).toBe('5000000');
      expect(result.data.totalSupply).toBe('4900000');
      expect(result.data.strategyCounter).toBe('7');
      expect(result.data.paused).toBe(false);
      expect(result.data.emergencyMode).toBe(false);
    });

    it('includes sharePrice as totalAssets/totalSupply * 1e18', async () => {
      const tool = new VaultAdminTool({
        evmContext: buildMockContext({
          totalAssets: 2_000_000n,
          totalSupply: 1_000_000n,
        }),
        vaultConfig: {
          vaultAddress: MOCK_VAULT,
          assetAddress: '0x0',
          assetDecimals: 18,
        },
      });

      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw) as { data: { sharePrice: string } };
      // 2_000_000 / 1_000_000 * 1e18 = 2e18
      expect(BigInt(result.data.sharePrice)).toBe(2n * 10n ** 18n);
    });

    it('includes roles map with 4 roles', async () => {
      const tool = new VaultAdminTool({
        evmContext: buildMockContext(),
        vaultConfig: {
          vaultAddress: MOCK_VAULT,
          assetAddress: '0x0',
          assetDecimals: 18,
        },
      });

      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw) as {
        data: { roles: Record<string, string> };
      };
      expect(Object.keys(result.data.roles)).toHaveLength(4);
      expect(result.data.roles).toHaveProperty('DEFAULT_ADMIN_ROLE');
      expect(result.data.roles).toHaveProperty('KEEPER_ROLE');
      expect(result.data.roles).toHaveProperty('STRATEGIST_ROLE');
      expect(result.data.roles).toHaveProperty('SOLVER_ROLE');
    });

    it('returns PAUSED in message when vault is paused', async () => {
      const tool = new VaultAdminTool({
        evmContext: buildMockContext({ paused: true }),
        vaultConfig: {
          vaultAddress: MOCK_VAULT,
          assetAddress: '0x0',
          assetDecimals: 18,
        },
      });

      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw) as { message: string };
      expect(result.message).toContain('PAUSED');
    });

    it('returns EMERGENCY MODE in message when emergencyMode is true', async () => {
      const tool = new VaultAdminTool({
        evmContext: buildMockContext({ emergencyMode: true }),
        vaultConfig: {
          vaultAddress: MOCK_VAULT,
          assetAddress: '0x0',
          assetDecimals: 18,
        },
      });

      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw) as { message: string };
      expect(result.message).toContain('EMERGENCY');
    });
  });

  describe('input parsing', () => {
    it('handles empty string gracefully', async () => {
      const tool = new VaultAdminTool({
        vaultConfig: {
          vaultAddress: MOCK_VAULT,
          assetAddress: '0x0',
          assetDecimals: 18,
        },
      });
      const raw = await tool.invoke('');
      const result = JSON.parse(raw) as { success: boolean };
      expect(result.success).toBe(true);
    });

    it('handles invalid JSON gracefully', async () => {
      const tool = new VaultAdminTool({
        vaultConfig: {
          vaultAddress: MOCK_VAULT,
          assetAddress: '0x0',
          assetDecimals: 18,
        },
      });
      const raw = await tool.invoke('{bad json}');
      const result = JSON.parse(raw) as { success: boolean };
      expect(result.success).toBe(true);
    });
  });

  describe('description', () => {
    it('mentions key admin concepts', () => {
      const tool = new VaultAdminTool({});
      expect(tool.description).toContain('strategyCounter');
      expect(tool.description).toContain('fee');
      expect(tool.description).toContain('role');
    });
  });
});
