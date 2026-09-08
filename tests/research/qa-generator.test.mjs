import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = resolve(new URL('../..', import.meta.url).pathname);
const generator = join(repoRoot, 'scripts/research/create-qa-testers.ts');
const pepper = 'qa-generator-test-pepper-not-for-production';

function runGenerator(args, cwd) {
  return spawnSync(process.execPath, ['--experimental-strip-types', generator, ...args], {
    cwd,
    env: { ...process.env, APULAB_AUTH_PEPPER: pepper },
    encoding: 'utf8',
  });
}

async function withTempDir(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'apulab-qa-generator-'));
  try { return await fn(dir); }
  finally { await rm(dir, { recursive:true, force:true }); }
}

test('QT-001-only generation creates exactly one QA participant and one assignment in private output', async () => {
  await withTempDir(async (cwd) => {
    const result = runGenerator(['--from','1','--to','1'], cwd);
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const privateDir = join(cwd, '.private');
    const files = (await readdir(privateDir)).sort();
    assert.deepEqual(files, [
      'qa-access-QT-001-to-QT-001.csv',
      'qa-seed-QT-001-to-QT-001.sql',
    ]);

    const csv = await readFile(join(privateDir, 'qa-access-QT-001-to-QT-001.csv'), 'utf8');
    const sql = await readFile(join(privateDir, 'qa-seed-QT-001-to-QT-001.sql'), 'utf8');

    assert.match(csv, /^study_code,temporary_credential\nQT-001,[^\n]+\n$/);
    assert.doesNotMatch(csv, /QT-002/);
    assert.equal((sql.match(/INSERT INTO apulab_participants/g) || []).length, 1);
    assert.equal((sql.match(/INSERT INTO apulab_study_assignments/g) || []).length, 1);
    assert.match(sql, /'APULAB-QA-2026'/);
    assert.match(sql, /'game'/);
    assert.match(sql, /'qa'/);
    assert.doesNotMatch(sql, /QT-001/);
    assert.doesNotMatch(sql, /QT-002/);

    const credential = csv.trim().split('\n')[1].split(',')[1];
    assert.ok(credential.length >= 16, 'temporary credential unexpectedly short');
    assert.doesNotMatch(sql, new RegExp(credential.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
});

test('range parser rejects invalid QA ranges', async () => {
  const invalidCases = [
    ['--from','0'],
    ['--to','11'],
    ['--from','2','--to','1'],
    ['--from','abc'],
    ['--to','1abc'],
    ['--from','1.5'],
  ];

  for (const args of invalidCases) {
    await withTempDir(async (cwd) => {
      const result = runGenerator(args, cwd);
      assert.notEqual(result.status, 0, `expected failure for ${args.join(' ')}`);
    });
  }
});

test('future QA-02 range remains supported without touching Supabase', async () => {
  await withTempDir(async (cwd) => {
    const result = runGenerator(['--from','2','--to','10'], cwd);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const privateDir = join(cwd, '.private');
    const sql = await readFile(join(privateDir, 'qa-seed-QT-002-to-QT-010.sql'), 'utf8');
    assert.equal((sql.match(/INSERT INTO apulab_participants/g) || []).length, 9);
    assert.equal((sql.match(/INSERT INTO apulab_study_assignments/g) || []).length, 9);
  });
});
