import { build } from 'esbuild';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve('node_modules/.tmp');
await mkdir(root, { recursive: true });
const directory = await mkdtemp(path.join(root, 'ticket-tests-'));
try {
  const outfile = path.join(directory, 'ticket-list.test.mjs');
  await build({
    entryPoints: ['tests/ticket-list.test.ts'],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    tsconfig: 'tsconfig.worker.json',
  });
  const result = spawnSync(process.execPath, ['--test', outfile], { stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  if (path.dirname(path.resolve(directory)) !== root) {
    throw new Error('Test output directory is outside the expected temporary directory');
  }
  await rm(directory, { recursive: true, force: true });
}
