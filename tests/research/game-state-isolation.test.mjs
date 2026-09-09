import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
async function walk(dir) {
  const out = [];
  for (const entry of await readdir(new URL(dir, root), { withFileTypes: true })) {
    const rel = join(dir, entry.name).replaceAll('\\', '/');
    if (entry.isDirectory()) out.push(...await walk(`${rel}/`)); else out.push(rel);
  }
  return out;
}

test('GameState Research metadata is lifecycle/session metadata only', async () => {
  const source = await read('src/systems/GameState.ts');
  for (const field of ['studyId','studyCondition','sessionProof','sessionSyncToken','eventSeqLast']) assert.match(source, new RegExp(field));
  assert.match(source, /startNewSession\(/);
  assert.match(source, /getSessionData\(/);
  assert.equal(/AYNI|repeatUnlocked|instrumentSelected|goalReached|programBlocks/.test(source), false);
});

test('Research identity fields are absent from gameplay build/config patches', async () => {
  const scriptFiles = await walk('scripts/');
  const files = scriptFiles.filter((path) => path.startsWith('scripts/config/') || /patch-mission01-level|build-mission01-level|generate-mission01/.test(path));
  const pattern = /studyId|studyCondition|sessionProof|sessionSyncToken|eventSeqLast|study_condition|session_sync_token/;
  for (const file of new Set(files)) assert.equal(pattern.test(await read(file)), false, `Research metadata leaked into gameplay source: ${file}`);
});
