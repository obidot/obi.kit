import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const repoRoot = path.resolve(import.meta.dirname, '..');

const packageConfigs = [
  {
    name: '@obidot-kit/core',
    dir: path.join(repoRoot, 'packages/core'),
    requiredFiles: ['dist/index.js', 'dist/index.d.ts', 'package.json', 'README.md', 'LICENSE'],
  },
  {
    name: '@obidot-kit/llm',
    dir: path.join(repoRoot, 'packages/llm'),
    requiredFiles: ['dist/index.js', 'dist/index.d.ts', 'package.json', 'README.md', 'LICENSE'],
  },
  {
    name: '@obidot-kit/sdk',
    dir: path.join(repoRoot, 'packages/sdk'),
    requiredFiles: ['dist/index.js', 'dist/index.d.ts', 'package.json', 'README.md', 'LICENSE'],
  },
  {
    name: '@obidot-kit/cli',
    dir: path.join(repoRoot, 'packages/cli'),
    requiredFiles: ['dist/cli.js', 'dist/index.js', 'dist/index.d.ts', 'package.json', 'README.md', 'LICENSE'],
  },
];

const allowedTopLevelFiles = new Set([
  'package.json',
  'README.md',
  'LICENSE',
  'LICENSE.md',
  'LICENSE.txt',
]);

function parseArgs(argv) {
  const args = { outputDir: null };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--output-dir') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('Missing value for --output-dir');
      }

      args.outputDir = path.resolve(process.cwd(), value);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return args;
}

function normalizePackResult(rawOutput) {
  const parsed = JSON.parse(rawOutput);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function verifyPackResult(packageConfig, packResult) {
  const filePaths = new Set(packResult.files.map((entry) => entry.path));
  const invalidPaths = [...filePaths].filter((entry) => {
    if (entry.startsWith('dist/')) {
      return false;
    }

    return !allowedTopLevelFiles.has(entry);
  });

  if (invalidPaths.length > 0) {
    throw new Error(
      `${packageConfig.name} packed unexpected files: ${invalidPaths.join(', ')}`,
    );
  }

  for (const requiredFile of packageConfig.requiredFiles) {
    if (!filePaths.has(requiredFile)) {
      throw new Error(`${packageConfig.name} is missing required packed file: ${requiredFile}`);
    }
  }

  const hasSourceFile = [...filePaths].some((entry) => entry.startsWith('src/'));
  const hasTestFile = [...filePaths].some((entry) => entry.startsWith('test/'));

  if (hasSourceFile || hasTestFile) {
    throw new Error(`${packageConfig.name} packed source or test files unexpectedly`);
  }
}

function packAndVerify(packageConfig, outputDir) {
  const rawOutput = execFileSync(
    'pnpm',
    ['-C', packageConfig.dir, 'pack', '--json', '--pack-destination', outputDir],
    {
      cwd: repoRoot,
      encoding: 'utf8',
    },
  );

  const [packResult] = normalizePackResult(rawOutput);
  verifyPackResult(packageConfig, packResult);

  return {
    name: packageConfig.name,
    filename: path.basename(packResult.filename),
    fileCount: packResult.files.length,
  };
}

function main() {
  const { outputDir } = parseArgs(process.argv.slice(2));
  const keepArtifacts = outputDir !== null;
  const packDir = keepArtifacts
    ? outputDir
    : mkdtempSync(path.join(tmpdir(), 'obi-kit-pack-'));

  mkdirSync(packDir, { recursive: true });

  try {
    const results = packageConfigs.map((packageConfig) => packAndVerify(packageConfig, packDir));

    for (const result of results) {
      console.log(
        `[pack:verify] ${result.name} -> ${result.filename} (${result.fileCount} files)`,
      );
    }
  } finally {
    if (!keepArtifacts) {
      rmSync(packDir, { recursive: true, force: true });
    }
  }
}

main();
