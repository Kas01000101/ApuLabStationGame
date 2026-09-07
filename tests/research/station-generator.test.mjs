import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = resolve(new URL('../..', import.meta.url).pathname);
const generator = join(repoRoot, 'scripts/research/create-study-participants.ts');
const pepper = 'station-generator-test-pepper-not-for-production';

async function runWithCsv(body) {
  const cwd = await mkdtemp(join(tmpdir(), 'apulab-station-generator-'));
  await mkdir(join(cwd, '.private'), { recursive:true });
  const csv = join(cwd, '.private', 'station-game-codes.csv');
  await writeFile(csv, body, 'utf8');
  const result = spawnSync(process.execPath, ['--experimental-strip-types', generator, '--codes-file=.private/station-game-codes.csv'], {
    cwd,
    env: { ...process.env, APULAB_AUTH_PEPPER: pepper },
    encoding: 'utf8',
  });
  return { cwd, result };
}

test('official Station generator creates only explicitly listed AP game assignments', async () => {
  const { cwd, result } = await runWithCsv('study_code\nAP-002\nAP-007\n');
  try {
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const access = await readFile(join(cwd, '.private', 'station-game-access.csv'), 'utf8');
    const sql = await readFile(join(cwd, '.private', 'station-game-seed.sql'), 'utf8');
    assert.match(access, /^study_code,temporary_credential\nAP-002,[^\n]+\nAP-007,[^\n]+\n$/);
    assert.equal((sql.match(/INSERT INTO apulab_participants/g) || []).length, 2);
    assert.equal((sql.match(/INSERT INTO apulab_study_assignments/g) || []).length, 2);
    assert.equal((sql.match(/'game'/g) || []).length, 2);
    assert.doesNotMatch(sql, /static_control/);
    assert.doesNotMatch(access, /AP-001|AP-003|QT-/);
  } finally { await rm(cwd, { recursive:true, force:true }); }
});

test('official Station generator rejects empty, duplicate, QT and out-of-range AP lists', async () => {
  for (const body of [
    'study_code\n',
    'study_code\nAP-002\nAP-002\n',
    'study_code\nQT-001\n',
    'study_code\nAP-051\n',
    'wrong_header\nAP-002\n',
  ]) {
    const { cwd, result } = await runWithCsv(body);
    try { assert.notEqual(result.status, 0, `expected rejection for ${JSON.stringify(body)}`); }
    finally { await rm(cwd, { recursive:true, force:true }); }
  }
});
