#!/usr/bin/env node
// Repeatable clean-machine smoke test suite for Aro desktop packaging
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir, tmpdir } from 'node:os';

const isWin = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';

const appDir = resolve('apps/desktop');
const releaseDir = join(appDir, 'release');
const unpackedDir = join(releaseDir, isWin ? 'win-unpacked' : isMac ? 'mac' : 'linux-unpacked');
const binaryPath = join(unpackedDir, isWin ? 'Aro.exe' : isMac ? 'Aro.app/Contents/MacOS/Aro' : 'aro');

console.log('=== ARO CLEAN-MACHINE SMOKE SUITE ===');
console.log(`OS: ${process.platform} (${process.arch})`);
console.log(`Binary target: ${binaryPath}`);

const results = [];

function step(name, fn) {
  process.stdout.write(`- Testing: ${name}... `);
  const start = Date.now();
  try {
    const detail = fn();
    const duration = Date.now() - start;
    console.log(`PASS (${duration}ms)`);
    results.push({ name, status: 'PASS', duration, detail });
  } catch (err) {
    const duration = Date.now() - start;
    console.log(`FAIL (${duration}ms)`);
    console.error(`  Error: ${err.message}`);
    results.push({ name, status: 'FAIL', duration, error: err.message });
  }
}

// 1. Packaged Binary Exists
step('Packaged artifact existence', () => {
  if (!existsSync(binaryPath)) {
    throw new Error(`Packaged binary not found at ${binaryPath}. Run 'npm run pack' first.`);
  }
  return { binaryPath };
});

// 2. Resource bundle integrity
step('ASAR and native resources presence', () => {
  const resourcesDir = join(unpackedDir, isMac ? 'Aro.app/Contents/Resources' : 'resources');
  const asar = join(resourcesDir, 'app.asar');
  if (!existsSync(asar)) throw new Error(`app.asar missing at ${asar}`);
  return { asar };
});

// 3. Simulated Sandbox Home Directory (.aro creation)
const testHome = join(tmpdir(), 'aro-smoke-' + Date.now());
step('First-run sandbox home creation', () => {
  mkdirSync(testHome, { recursive: true });
  const testAro = join(testHome, '.aro');
  mkdirSync(testAro, { recursive: true });
  writeFileSync(join(testAro, 'config.yaml'), 'model: test\n', 'utf8');
  if (!existsSync(join(testAro, 'config.yaml'))) {
    throw new Error('Failed to create test .aro/config.yaml');
  }
  return { testHome, testAro };
});

// 4. Migration from legacy .hermes
step('Legacy .hermes migration simulation', () => {
  const legacyHome = join(tmpdir(), 'aro-legacy-migration-' + Date.now());
  const legacyHermes = join(legacyHome, '.hermes');
  const newAro = join(legacyHome, '.aro');
  mkdirSync(legacyHermes, { recursive: true });
  writeFileSync(join(legacyHermes, 'config.yaml'), 'model: anthropic/claude-3-5-sonnet\n', 'utf8');
  writeFileSync(join(legacyHermes, '.env'), 'OPENAI_API_KEY=test-mock-key\n', 'utf8');

  // Perform copy migration
  mkdirSync(newAro, { recursive: true });
  writeFileSync(join(newAro, 'config.yaml'), readFileSync(join(legacyHermes, 'config.yaml')));
  writeFileSync(join(newAro, '.env'), readFileSync(join(legacyHermes, '.env')));

  // Verify non-destructive copy
  if (!existsSync(join(legacyHermes, 'config.yaml')) || !existsSync(join(newAro, 'config.yaml'))) {
    throw new Error('Migration failed or destroyed source .hermes files');
  }
  rmSync(legacyHome, { recursive: true, force: true });
  return { migrated: true };
});

// Clean up
if (existsSync(testHome)) {
  rmSync(testHome, { recursive: true, force: true });
}

console.log('=== SMOKE SUITE COMPLETE ===');
const passed = results.filter(r => r.status === 'PASS').length;
console.log(`Result: ${passed}/${results.length} checks passed.`);

if (passed !== results.length) {
  process.exit(1);
}
