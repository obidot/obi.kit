import { describe, expect, it } from 'vitest';
import { VaultStateTool } from '../src/tools/vault-state.js';

const MOCK_VAULT = '0x03473a95971Ba0496786a615e21b1e87bDFf0025';

describe('VaultStateTool', () => {
  describe('construction', () => {
    it('creates with vault address in offline mode', () => {
      const tool = new VaultStateTool({
        vaultConfig: { vaultAddress: MOCK_VAULT, assetAddress: '0x0', assetDecimals: 18 },
      });
      expect(tool.name).toBe('vault_state');
      expect(tool.description).toContain('totalAssets');
    });

    it('creates without any config', () => {
      const tool = new VaultStateTool({});
      expect(tool.name).toBe('vault_state');
    });
  });

  describe('offline mode (no EVM context)', () => {
    it('returns stub result when no evmContext is configured', async () => {
      const tool = new VaultStateTool({
        vaultConfig: { vaultAddress: MOCK_VAULT, assetAddress: '0x0', assetDecimals: 18 },
      });
      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw) as { success: boolean; data: { mode: string } };
      expect(result.success).toBe(true);
      expect(result.data.mode).toBe('stub');
    });

    it('returns error when no vault address is configured', async () => {
      const tool = new VaultStateTool({});
      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw) as { success: boolean; error: string };
      expect(result.success).toBe(false);
      expect(result.error).toContain('vault address');
    });

    it('parses vault address from input JSON', async () => {
      const tool = new VaultStateTool({});
      const raw = await tool.invoke(JSON.stringify({ vaultAddress: MOCK_VAULT }));
      const result = JSON.parse(raw) as { success: boolean; data: { vaultAddress: string } };
      // No evmContext → stub, but should not fail on address parsing
      expect(result.success).toBe(true);
      expect(result.data.vaultAddress).toBe(MOCK_VAULT);
    });
  });

  describe('description', () => {
    it('includes key vault metrics in description', () => {
      const tool = new VaultStateTool({});
      expect(tool.description).toContain('totalAssets');
      expect(tool.description).toContain('totalSupply');
      expect(tool.description).toContain('paused');
    });
  });
});
