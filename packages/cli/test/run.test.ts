import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Setup ────────────────────────────────────────────────────────────────────

let testDir: string;
let originalEnv: NodeJS.ProcessEnv;

beforeEach(async () => {
  testDir = join(tmpdir(), `obi-kit-run-test-${Date.now()}`);
  await mkdir(testDir, { recursive: true });
  originalEnv = { ...process.env };
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
  // Restore cwd and env
  vi.restoreAllMocks();
  // Remove any keys added during the test
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

describe('runAgent', () => {
  describe('.env loading', () => {
    it('loads variables from .env file into process.env', async () => {
      await writeFile(join(testDir, '.env'), 'RPC_URL=https://test.rpc/\nPRIVATE_KEY=abc123\n');
      delete process.env['RPC_URL'];
      delete process.env['PRIVATE_KEY'];

      vi.spyOn(process, 'cwd').mockReturnValue(testDir);

      // Import dynamically so we get a fresh module with mocked cwd
      const { runAgent } = await import('../src/commands/run.js');
      await runAgent({ silent: true });

      expect(process.env['RPC_URL']).toBe('https://test.rpc/');
      expect(process.env['PRIVATE_KEY']).toBe('abc123');
    });

    it('does not override already-set env vars from .env', async () => {
      await writeFile(join(testDir, '.env'), 'RPC_URL=https://from-file.rpc/\n');
      process.env['RPC_URL'] = 'https://from-env.rpc/';

      vi.spyOn(process, 'cwd').mockReturnValue(testDir);

      const { runAgent } = await import('../src/commands/run.js');
      await runAgent({ silent: true });

      expect(process.env['RPC_URL']).toBe('https://from-env.rpc/');
    });

    it('proceeds without error if .env file is missing', async () => {
      vi.spyOn(process, 'cwd').mockReturnValue(testDir);
      const { runAgent } = await import('../src/commands/run.js');
      await expect(runAgent({ silent: true })).resolves.not.toThrow();
    });
  });

  describe('JSON config loading', () => {
    it('loads chainId and endpoint from obi-kit.config.json', async () => {
      await writeFile(
        join(testDir, 'obi-kit.config.json'),
        JSON.stringify({
          chainId: 42,
          endpoint: 'https://custom.rpc/',
          vaultAddress: '0xABCD',
        }),
      );
      vi.spyOn(process, 'cwd').mockReturnValue(testDir);
      delete process.env['RPC_URL'];
      delete process.env['VAULT_ADDRESS'];

      const { runAgent } = await import('../src/commands/run.js');
      // Should not throw — just logs
      await expect(
        runAgent({
          silent: true,
          configPath: join(testDir, 'obi-kit.config.json'),
        }),
      ).resolves.not.toThrow();
    });

    it('proceeds with defaults if config file is missing', async () => {
      vi.spyOn(process, 'cwd').mockReturnValue(testDir);
      const { runAgent } = await import('../src/commands/run.js');
      await expect(
        runAgent({
          silent: true,
          configPath: join(testDir, 'nonexistent.json'),
        }),
      ).resolves.not.toThrow();
    });

    it('throws on invalid JSON in config file', async () => {
      await writeFile(join(testDir, 'obi-kit.config.json'), 'not-valid-json{{{');
      vi.spyOn(process, 'cwd').mockReturnValue(testDir);
      const { runAgent } = await import('../src/commands/run.js');
      await expect(
        runAgent({
          silent: true,
          configPath: join(testDir, 'obi-kit.config.json'),
        }),
      ).rejects.toThrow();
    });

    it('throws an error for .ts config files with a helpful message', async () => {
      await writeFile(join(testDir, 'obi-kit.config.ts'), 'export default {};');
      vi.spyOn(process, 'cwd').mockReturnValue(testDir);
      const { runAgent } = await import('../src/commands/run.js');
      await expect(
        runAgent({
          silent: true,
          configPath: join(testDir, 'obi-kit.config.ts'),
        }),
      ).rejects.toThrow('TypeScript config files are not yet supported');
    });
  });

  describe('verbose mode', () => {
    it('does not throw with verbose=true', async () => {
      vi.spyOn(process, 'cwd').mockReturnValue(testDir);
      const { runAgent } = await import('../src/commands/run.js');
      await expect(runAgent({ silent: true, verbose: true })).resolves.not.toThrow();
    });
  });
});
