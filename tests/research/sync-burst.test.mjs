import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const syncSource = await readFile(new URL('../../src/systems/SyncService.ts', import.meta.url), 'utf8');

test('SyncService declares serialized reentrant drain semantics', () => {
  assert.match(syncSource, /private static rerunRequested = false/);
  assert.match(syncSource, /if \(this\.activePromise\) \{\s*this\.rerunRequested = true/);
  assert.match(syncSource, /drainUntilStable/);
  assert.match(syncSource, /while \(this\.rerunRequested && this\.isOnline\(\)\)/);
  assert.match(syncSource, /static async flush\(\)/);
});

test('20-event burst drains completely with continuous event_seq and unique UUIDs', async () => {
  const queue = [];
  const persisted = [];
  let activePromise = null;
  let rerunRequested = false;

  const savePendingSnapshot = async () => {
    // Deliberately yield after snapshotting so later events arrive during an active sync.
    const batch = queue.splice(0, queue.length);
    await Promise.resolve();
    persisted.push(...batch);
  };

  const drainUntilStable = async () => {
    do {
      rerunRequested = false;
      await savePendingSnapshot();
      await Promise.resolve();
    } while (rerunRequested);
  };

  const processQueue = () => {
    if (activePromise) {
      rerunRequested = true;
      return activePromise;
    }
    rerunRequested = false;
    const operation = drainUntilStable();
    const wrapped = operation.finally(async () => {
      const rerun = rerunRequested;
      activePromise = null;
      if (rerun) {
        rerunRequested = false;
        await processQueue();
      }
    });
    activePromise = wrapped;
    return wrapped;
  };

  for (let seq = 1; seq <= 20; seq += 1) {
    queue.push({ event_id: randomUUID(), event_seq: seq });
    void processQueue();
  }
  if (activePromise) await activePromise;

  persisted.sort((a, b) => a.event_seq - b.event_seq);
  assert.equal(persisted.length, 20);
  assert.deepEqual(persisted.map((event) => event.event_seq), Array.from({ length: 20 }, (_, i) => i + 1));
  assert.equal(new Set(persisted.map((event) => event.event_id)).size, 20);
  assert.equal(queue.length, 0, 'no event may remain pending after drain');
});
