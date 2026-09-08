import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { build } from 'esbuild';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = resolve(new URL('../..', import.meta.url).pathname);

test('export pagination returns all 2500 rows without truncation', async () => {
  const rows = Array.from({ length: 2500 }, (_, i) => ({
    event_id: `event-${String(i + 1).padStart(4, '0')}`,
    session_id: `session-${Math.floor(i / 50) + 1}`,
    event_seq: (i % 50) + 1,
    received_at: new Date(2026, 8, 6, 12, 0, i % 60).toISOString(),
    event_type: 'level_started',
  }));

  const server = http.createServer((req, res) => {
    const range = String(req.headers.range || '0-499').match(/(\d+)-(\d+)/);
    const start = range ? Number(range[1]) : 0;
    const end = range ? Number(range[2]) : 499;
    const page = rows.slice(start, Math.min(end + 1, rows.length));
    res.statusCode = 206;
    res.setHeader('content-type', 'application/json');
    res.setHeader('content-range', `${start}-${start + Math.max(0, page.length - 1)}/${rows.length}`);
    res.end(JSON.stringify(page));
  });
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  const address = server.address();
  assert(address && typeof address === 'object');

  const temp = await mkdtemp(join(tmpdir(), 'apulab-export-'));
  const bundle = join(temp, 'export-telemetry.mjs');
  await build({
    entryPoints: [join(ROOT, 'scripts/research/export-telemetry.ts')],
    outfile: bundle,
    platform: 'node',
    format: 'esm',
    bundle: true,
    target: 'node22',
  });

  const child = spawn(process.execPath, [bundle, '--study=APULAB-QA-2026', '--page-size=500'], {
    cwd: temp,
    env: {
      ...process.env,
      SUPABASE_URL: `http://127.0.0.1:${address.port}`,
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-only',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '', stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const exitCode = await new Promise((resolveExit) => child.on('close', resolveExit));
  server.close();

  assert.equal(exitCode, 0, `export script failed:\n${stdout}\n${stderr}`);
  assert.match(stdout, /expected_count=2500 · exported_count=2500/);
  const csv = await readFile(join(temp, '.private', 'telemetry-qa.csv'), 'utf8');
  const lines = csv.trimEnd().split('\n');
  assert.equal(lines.length, 2501, 'CSV must contain one header plus 2500 event rows');
  assert.ok(lines[1].includes('event-0001'));
  assert.ok(lines.at(-1).includes('event-2500'));

  await rm(temp, { recursive: true, force: true });
});
