import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(new URL('../..', import.meta.url).pathname);

test('stdlib CSV bridge preserves quoted commas, escaped quotes, CRLF, UTF-8 and empties', async () => {
  const dir = await mkdtemp(resolve(tmpdir(), 'apulab-csv-'));
  try {
    const input = resolve(dir, 'sample.csv');
    await writeFile(input, '\ufeffstudy_code,name,note,empty\r\nQT-001,"Apellido, Nombre","Dijo ""hola, mundo""",\r\n', 'utf8');
    const run = spawnSync(process.env.PYTHON ?? 'python3', [resolve(ROOT, 'scripts/research/csv-bridge.py'), input], { encoding:'utf8' });
    assert.equal(run.status, 0, run.stderr);
    const parsed = JSON.parse(run.stdout);
    assert.equal(parsed.rows[0].study_code, 'QT-001');
    assert.equal(parsed.rows[0].name, 'Apellido, Nombre');
    assert.equal(parsed.rows[0].note, 'Dijo "hola, mundo"');
    assert.equal(parsed.rows[0].empty, '');
  } finally { await rm(dir, { recursive:true, force:true }); }
});

test('linkage whitelists questionnaire fields and never exports direct PII', async () => {
  const dir = await mkdtemp(resolve(tmpdir(), 'apulab-link-'));
  const privateDir = resolve(ROOT, '.private');
  const pepper = 'test-only-pepper';
  try {
    await mkdir(privateDir, { recursive:true });
    const participantId = '00000000-0000-4000-8000-000000000501';
    const hash = createHmac('sha256', pepper).update('QT-001', 'utf8').digest('base64url');
    const telemetry = resolve(dir, 'telemetry.csv');
    const mapping = resolve(dir, 'mapping.csv');
    const pre = resolve(dir, 'pre.csv');
    await writeFile(telemetry, `participant_id,event_type,payload\r\n${participantId},level_completed,"{}"\r\n`, 'utf8');
    await writeFile(mapping, `participant_id,participant_code_hash\r\n${participantId},${hash}\r\n`, 'utf8');
    await writeFile(pre, 'study_code,name,email,school,Q9,Q10\r\nQT-001,"Apellido, Nombre",child@example.com,"Colegio, Lima","Respuesta, con coma","Texto ""citado"""\r\n', 'utf8');
    const run = spawnSync(process.execPath, [resolve(ROOT, 'scripts/research/link-external-forms.ts'), `--telemetry=${telemetry}`, `--mapping=${mapping}`, `--pre=${pre}`], {
      cwd: ROOT,
      env: { ...process.env, APULAB_AUTH_PEPPER: pepper },
      encoding:'utf8',
    });
    assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
    const output = JSON.parse(await readFile(resolve(privateDir, 'analysis_dataset.json'), 'utf8'));
    assert.equal(output.length, 1);
    assert.equal(output[0].pre.Q9, 'Respuesta, con coma');
    assert.equal(output[0].pre.Q10, 'Texto "citado"');
    const serialized = JSON.stringify(output);
    for (const forbidden of ['Apellido, Nombre','child@example.com','Colegio, Lima','study_code']) assert.equal(serialized.includes(forbidden), false, `PII leaked: ${forbidden}`);
  } finally {
    await rm(dir, { recursive:true, force:true });
    await rm(resolve(privateDir, 'analysis_dataset.json'), { force:true });
  }
});
