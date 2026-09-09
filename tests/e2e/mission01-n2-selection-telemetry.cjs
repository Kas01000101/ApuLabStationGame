const { chromium } = require('playwright');
const { mkdir, writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');

const BASE_URL = process.env.APULAB_BASE_URL || 'http://127.0.0.1:4173';
const EVIDENCE_DIR = resolve(process.cwd(), 'test-results/n2-selection-telemetry');
const QUEUE_KEY = 'apulab_telemetry_events_v2';

let browser;
let context;
let page;
const runtimeErrors = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function persistEvidence(error) {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await writeFile(
    resolve(EVIDENCE_DIR, 'runtime.log'),
    [`error: ${String(error?.stack || error)}`, '', ...runtimeErrors].join('\n') + '\n',
    'utf8',
  );
  if (page) {
    try { await page.screenshot({ path: resolve(EVIDENCE_DIR, 'failure.png'), fullPage: true }); } catch (_) {}
    try { await writeFile(resolve(EVIDENCE_DIR, 'page.html'), await page.content(), 'utf8'); } catch (_) {}
  }
  if (context) {
    try { await context.tracing.stop({ path: resolve(EVIDENCE_DIR, 'trace.zip') }); } catch (_) {}
  }
}

async function waitForLevel(level) {
  await page.waitForFunction((n) => {
    const frame = document.querySelector('iframe.mission01-frame');
    if (!frame?.contentWindow) return false;
    try { return frame.contentWindow.location.pathname.endsWith(`/missions/mission01/level${n}.html`); }
    catch { return false; }
  }, level, { timeout: 15_000 });

  const frame = page.frames().find((item) => item.url().endsWith(`/missions/mission01/level${level}.html`));
  assert(frame, `Level ${level} iframe did not load`);
  return frame;
}

async function readQueue() {
  return page.evaluate((key) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  }, QUEUE_KEY);
}

function ofType(events, type, level) {
  return events.filter((event) => event.event_type === type && event.level_number === level);
}

async function dispatchCompareChoice(frame, batteryId) {
  await frame.evaluate((id) => {
    const target = document.querySelector(`[data-compare-id="${id}"]`);
    if (!(target instanceof HTMLElement)) throw new Error(`missing compare target: ${id}`);
    target.click();
  }, batteryId);
  await page.waitForTimeout(100);
}

(async () => {
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: 1672, height: 941 } });

  // Keep telemetry in the browser queue. This test isolates the parent↔iframe
  // instrumentation contract; backend delivery is covered by research QA.
  await context.addInitScript(() => {
    try { localStorage.setItem('apulab.settings.sfx', 'off'); } catch (_) {}
    try {
      Object.defineProperty(Navigator.prototype, 'onLine', {
        configurable: true,
        get: () => false,
      });
    } catch (_) {}
  });

  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  page = await context.newPage();
  page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${String(error.stack || error)}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') runtimeErrors.push(`console.error: ${msg.text()}`);
  });

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20_000 });
  await page.getByRole('button', { name: 'INICIAR MISIÓN' }).click();
  await page.getByRole('button', { name: 'MODO DEMO' }).click();
  await page.getByRole('button', { name: 'OMITIR INTRO' }).click();

  const level1 = await waitForLevel(1);
  await level1.evaluate(() => {
    parent.postMessage({ type: 'apulab-level-complete', level: 1, nextLevel: 2 }, location.origin);
  });

  const level2 = await waitForLevel(2);
  await level2.locator('[data-compare-id="pink"]').waitFor({ state: 'attached', timeout: 10_000 });

  // Entering/viewing N2 must not synthesize a selection.
  const beforeSelection = await readQueue();
  assert(ofType(beforeSelection, 'battery_selected', 2).length === 0,
    'battery_selected must not exist before an explicit compare choice');
  assert(ofType(beforeSelection, 'battery_selection_changed', 2).length === 0,
    'battery_selection_changed must not exist before an explicit compare choice');

  // Use the real N2 compare controls, but dispatch their clicks directly so the
  // regression remains focused on the cross-realm event target. Real physical
  // N2 measurement + visible selection is covered by mission01-electronics.cjs.
  await dispatchCompareChoice(level2, 'pink');

  let events = await readQueue();
  let selected = ofType(events, 'battery_selected', 2);
  let changed = ofType(events, 'battery_selection_changed', 2);
  assert(selected.length === 1, `expected one battery_selected, got ${selected.length}`);
  assert(changed.length === 0, `unexpected battery_selection_changed before correction: ${changed.length}`);
  assert(selected[0]?.payload?.battery_id === 'pink', 'battery_selected must identify pink');
  assert(selected[0]?.payload?.selection_order === 1, 'battery_selected must use selection_order=1');

  await dispatchCompareChoice(level2, 'green');

  events = await readQueue();
  selected = ofType(events, 'battery_selected', 2);
  changed = ofType(events, 'battery_selection_changed', 2);
  assert(selected.length === 1, `battery_selected must remain exactly once, got ${selected.length}`);
  assert(changed.length === 1, `expected one battery_selection_changed, got ${changed.length}`);
  assert(changed[0]?.payload?.battery_id === 'green', 'battery_selection_changed must identify green');
  assert(changed[0]?.payload?.selection_order === 2, 'battery_selection_changed must use selection_order=2');

  // Parent lifecycle ordering remains authoritative. We deliberately use the
  // same completion bridge exercised by Mission01Screen instead of inferring
  // level completion from the behavioral selection event.
  await level2.evaluate(() => {
    parent.postMessage({ type: 'apulab-level-complete', level: 2, nextLevel: 3 }, location.origin);
  });
  await waitForLevel(3);
  await page.waitForTimeout(100);

  events = await readQueue();
  const n2Complete = ofType(events, 'level_completed', 2);
  const n3Started = ofType(events, 'level_started', 3);
  assert(n2Complete.length === 1, `expected one N2 level_completed, got ${n2Complete.length}`);
  assert(n3Started.length === 1, `expected one N3 level_started, got ${n3Started.length}`);

  const selectedSeq = selected[0].event_seq;
  const changedSeq = changed[0].event_seq;
  const completeSeq = n2Complete[0].event_seq;
  const n3StartSeq = n3Started[0].event_seq;
  assert(selectedSeq < changedSeq && changedSeq < completeSeq && completeSeq < n3StartSeq,
    `unexpected event order: selected=${selectedSeq}, changed=${changedSeq}, complete=${completeSeq}, n3=${n3StartSeq}`);

  const eventIds = events.map((event) => event.event_id);
  assert(new Set(eventIds).size === eventIds.length, 'duplicate event_id detected');
  const seqs = events.map((event) => event.event_seq).sort((a, b) => a - b);
  assert(new Set(seqs).size === seqs.length, 'duplicate event_seq detected');
  for (let index = 1; index < seqs.length; index += 1) {
    assert(seqs[index] === seqs[index - 1] + 1,
      `event_seq gap detected between ${seqs[index - 1]} and ${seqs[index]}`);
  }

  assert(runtimeErrors.length === 0, `runtime errors detected:\n${runtimeErrors.join('\n')}`);

  await context.tracing.stop();
  await browser.close();
  console.log('[e2e] N2 iframe telemetry OK · select → change → level_completed → N3 level_started');
})().catch(async (error) => {
  console.error(error);
  await persistEvidence(error);
  try { await browser?.close(); } catch (_) {}
  process.exitCode = 1;
});
