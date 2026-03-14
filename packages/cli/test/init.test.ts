import { mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runInit } from '../src/commands/init.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `obi-kit-init-test-${Date.now()}`);
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('runInit', () => {
  describe('basic scaffolding', () => {
    it('creates the project directory', async () => {
      const result = await runInit('test-agent', {
        targetDir: join(testDir, 'test-agent'),
        silent: true,
      });
      const { stat } = await import('node:fs/promises');
      const info = await stat(result.projectDir);
      expect(info.isDirectory()).toBe(true);
    });

    it('returns the correct project directory path', async () => {
      const target = join(testDir, 'my-project');
      const result = await runInit('my-project', {
        targetDir: target,
        silent: true,
      });
      expect(result.projectDir).toBe(target);
    });

    it('reports the four created files', async () => {
      const result = await runInit('test-agent', {
        targetDir: join(testDir, 'test-agent'),
        silent: true,
      });
      expect(result.filesCreated).toHaveLength(4);
      expect(result.filesCreated).toContain('package.json');
      expect(result.filesCreated).toContain('tsconfig.json');
      expect(result.filesCreated).toContain('src/index.ts');
      expect(result.filesCreated).toContain('.env.example');
    });
  });

  describe('package.json', () => {
    it('contains the project name', async () => {
      const dir = join(testDir, 'named-project');
      await runInit('named-project', { targetDir: dir, silent: true });
      const raw = await readFile(join(dir, 'package.json'), 'utf8');
      const pkg = JSON.parse(raw) as { name: string };
      expect(pkg.name).toBe('named-project');
    });

    it('includes @obidot-kit/sdk as a dependency', async () => {
      const dir = join(testDir, 'dep-project');
      await runInit('dep-project', { targetDir: dir, silent: true });
      const raw = await readFile(join(dir, 'package.json'), 'utf8');
      const pkg = JSON.parse(raw) as { dependencies: Record<string, string> };
      expect(pkg.dependencies['@obidot-kit/sdk']).toBeDefined();
    });

    it('sets "type": "module"', async () => {
      const dir = join(testDir, 'module-project');
      await runInit('module-project', { targetDir: dir, silent: true });
      const raw = await readFile(join(dir, 'package.json'), 'utf8');
      const pkg = JSON.parse(raw) as { type: string };
      expect(pkg.type).toBe('module');
    });
  });

  describe('tsconfig.json', () => {
    it('is valid JSON', async () => {
      const dir = join(testDir, 'ts-project');
      await runInit('ts-project', { targetDir: dir, silent: true });
      const raw = await readFile(join(dir, 'tsconfig.json'), 'utf8');
      expect(() => JSON.parse(raw)).not.toThrow();
    });

    it('targets ES2022', async () => {
      const dir = join(testDir, 'es2022-project');
      await runInit('es2022-project', { targetDir: dir, silent: true });
      const raw = await readFile(join(dir, 'tsconfig.json'), 'utf8');
      const tsconfig = JSON.parse(raw) as {
        compilerOptions: { target: string };
      };
      expect(tsconfig.compilerOptions.target).toBe('ES2022');
    });
  });

  describe('src/index.ts', () => {
    it('exists and imports from @obidot-kit/sdk', async () => {
      const dir = join(testDir, 'src-project');
      await runInit('src-project', { targetDir: dir, silent: true });
      const raw = await readFile(join(dir, 'src', 'index.ts'), 'utf8');
      expect(raw).toContain('@obidot-kit/sdk');
      expect(raw).toContain('ObiKit');
    });
  });

  describe('.env.example', () => {
    it('contains RPC_URL, PRIVATE_KEY, and VAULT_ADDRESS placeholders', async () => {
      const dir = join(testDir, 'env-project');
      await runInit('env-project', { targetDir: dir, silent: true });
      const raw = await readFile(join(dir, '.env.example'), 'utf8');
      expect(raw).toContain('RPC_URL');
      expect(raw).toContain('PRIVATE_KEY');
      expect(raw).toContain('VAULT_ADDRESS');
    });
  });

  describe('default project name', () => {
    it('uses "my-obi-agent" when no name is provided', async () => {
      const target = join(testDir, 'my-obi-agent');
      const result = await runInit(undefined, {
        targetDir: target,
        silent: true,
      });
      const raw = await readFile(join(result.projectDir, 'package.json'), 'utf8');
      const pkg = JSON.parse(raw) as { name: string };
      expect(pkg.name).toBe('my-obi-agent');
    });
  });
});
