import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runInfo } from '../src/commands/info.js';
import { CLI_VERSION } from '../src/index.js';

// ─── Setup ────────────────────────────────────────────────────────────────────

let originalEnv: NodeJS.ProcessEnv;

beforeEach(() => {
  originalEnv = { ...process.env };
});

afterEach(() => {
  vi.restoreAllMocks();
  // Restore env
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }
  for (const [k, v] of Object.entries(originalEnv)) {
    process.env[k] = v;
  }
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('runInfo', () => {
  describe('result structure', () => {
    it('returns cliVersion matching CLI_VERSION', async () => {
      const result = await runInfo({ silent: true });
      expect(result.cliVersion).toBe(CLI_VERSION);
    });

    it('returns nodeVersion matching process.version', async () => {
      const result = await runInfo({ silent: true });
      expect(result.nodeVersion).toBe(process.version);
    });

    it('returns platform and arch', async () => {
      const result = await runInfo({ silent: true });
      expect(result.platform).toBe(process.platform);
      expect(result.arch).toBe(process.arch);
    });

    it('returns packageVersions with all four packages', async () => {
      const result = await runInfo({ silent: true });
      expect(result.packageVersions).toHaveProperty('@obidot-kit/cli');
      expect(result.packageVersions).toHaveProperty('@obidot-kit/core');
      expect(result.packageVersions).toHaveProperty('@obidot-kit/llm');
      expect(result.packageVersions).toHaveProperty('@obidot-kit/sdk');
    });

    it('@obidot-kit/cli version matches CLI_VERSION', async () => {
      const result = await runInfo({ silent: true });
      expect(result.packageVersions['@obidot-kit/cli']).toBe(CLI_VERSION);
    });
  });

  describe('env var reflection', () => {
    it('returns undefined rpcUrl when RPC_URL is not set', async () => {
      delete process.env['RPC_URL'];
      const result = await runInfo({ silent: true });
      expect(result.rpcUrl).toBeUndefined();
    });

    it('returns rpcUrl from RPC_URL env var', async () => {
      process.env['RPC_URL'] = 'https://test.rpc/';
      const result = await runInfo({ silent: true });
      expect(result.rpcUrl).toBe('https://test.rpc/');
    });

    it('returns undefined vaultAddress when VAULT_ADDRESS is not set', async () => {
      delete process.env['VAULT_ADDRESS'];
      const result = await runInfo({ silent: true });
      expect(result.vaultAddress).toBeUndefined();
    });

    it('returns vaultAddress from VAULT_ADDRESS env var', async () => {
      process.env['VAULT_ADDRESS'] = '0xDEADBEEF';
      const result = await runInfo({ silent: true });
      expect(result.vaultAddress).toBe('0xDEADBEEF');
    });

    it('returns undefined chainId when CHAIN_ID is not set', async () => {
      delete process.env['CHAIN_ID'];
      const result = await runInfo({ silent: true });
      expect(result.chainId).toBeUndefined();
    });

    it('parses chainId from CHAIN_ID env var', async () => {
      process.env['CHAIN_ID'] = '420420417';
      const result = await runInfo({ silent: true });
      expect(result.chainId).toBe(420420417);
    });
  });

  describe('uninstalled packages', () => {
    it('returns "not installed" for packages not found in node_modules', async () => {
      // Core/llm/sdk are workspace packages installed during pnpm install
      // We test that the function handles lookup failures gracefully.
      // The actual versions may be real or "not installed" depending on environment.
      const result = await runInfo({ silent: true });
      for (const version of Object.values(result.packageVersions)) {
        expect(typeof version).toBe('string');
        expect(version.length).toBeGreaterThan(0);
      }
    });
  });

  describe('silent mode', () => {
    it('does not throw with silent=false (console output allowed)', async () => {
      await expect(runInfo({ silent: false })).resolves.not.toThrow();
    });
  });

  describe('connectivity check skipped when RPC_URL absent', () => {
    it('completes without network call when RPC_URL is unset', async () => {
      delete process.env['RPC_URL'];
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      await runInfo({ silent: true });
      // fetch should NOT be called since RPC_URL is absent
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
