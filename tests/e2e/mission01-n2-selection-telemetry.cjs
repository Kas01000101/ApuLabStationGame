const { chromium } = require('playwright');
const { mkdir, writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');

const BASE_URL = process.env.APULAB_BASE_URL || 'http://127.0.0.1:4173';
const EVIDENCE_DIR = resolve(process.cwd(), 'test-results/n2-selection-telemetry');
const LOGICAL_WIDTH = 1672;
const LOGICAL_HEIGHT = 941;
const QUEUE_KEY = 'apulab_telemetry_events_v2';

const POINTS = {
  redProbe: { x: 913, y: 681 },
  blackProbe: { x: 1098, y: 708 },
  positiveTerminal: { x: 964, y: 369 },
  negativeTerminal: { x: 1266, y: 369 },
};

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

function watchRuntime(p) {
  p.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${String(error.stack || error)}`));
  p.on('console', (msg) => {
    if (msg.type() === 'error') runtimeErrors.push(`console.error: ${msg.text()}`);
  });
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

async function logicalPoint(canvas, point) {
  const box = await canvas.boundingBox();
  assert(box, 'Mission canvas has no bounding box');
  return {
    x: box.x + (point.x / LOGICAL_WIDTH) * box.width,
    y: box.y + (point.y / LOGICAL_HEIGHT) * box.height,
  };
}

async function dragLogical(canvas, from, to) {
  const a = await logicalPoint(canvas, from);
  const b = await logicalPoint(canvas, to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 18 });
  await page.mouse.up();
}

async function connectConventional(canvas) {
  await dragLogical(canvas, POINTS.redProbe, POINTS.positiveTerminal);
  await page.waitForTimeout(180);
  await dragLogical(canvas, POINTS.blackProbe, POINTS.negativeTerminal);
}

async function measureCurrentBattery(frame, canvas, selector, expected) {
  await connectConventional(canvas);
  await frame.waitForFunction(
    ({ selector: target, expected: value }) => document.querySelector(target)?.textContent?.includes(value),
    { selector, expected },
    { timeout: 12_000 },
  );
}

async function nextBattery(frame) {
  const next = frame.locator('#battery-next');
  await next.click();
  await page.waitForTimeout(650);
  await frame.waitForFunction(() => {
    const button = document.querySelector('#battery-next');
    return button && !button.disabled;
  }, null, { timeout: 5_000 }).catch(() => {});
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

(async () => {
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT } });

  // Keep research events in the local queue so the test can inspect the exact
  // parent-owned telemetry contract without depending on a backend endpoint.
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
  watchRuntime(page);

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20_000 });
  await page.getByRole('button', { name: 'INICIAR MISIÓN' }).click();
  await page.getByRole('button', { name: 'MODO DEMO' }).click();
  await page.getByRole('button', { name: 'OMITIR INTRO' }).click();

  const level1 = await waitForLevel(1);
  await level1.evaluate(() => {
    parent.postMessage({ type: 'apulab-level-complete', level: 1, nextLevel: 2 }, location.origin);
  });

  const level2 = await waitForLevel(2);
  const canvas = level2.locator('#kawsay-canvas, canvas').first();
  await canvas.waitFor({ state: 'visible', timeout: 15_000 });

  await measureCurrentBattery(level2, canvas, '#measure-pink', '24.0 V');
  await nextBattery(level2);
  await measureCurrentBattery(level2, canvas, '#measure-green', '28.0 V');
  await nextBattery(level2);
  await measureCurrentBattery(level2, canvas, '#measure-coral', '32.0 V');

  const compare = level2.locator('#kawsay-compare-overlay');
  await compare.waitFor({ state: 'visible', timeout: 10_000 });

  const beforeSelection = await readQueue();
  assert(ofType(beforeSelection, 'all_batteries_measured', 2).length === 1,
    'N2 must record all_batteries_measured exactly once before selection');
  assert(ofType(beforeSelection, 'battery_selected', 2).length === 0,
    'N2 must not record battery_selected before an explicit choice');
  assert(ofType(beforeSelection, 'battery_selection_changed', 2).length === 0,
    'N2 must not record battery_selection_changed before an explicit choice');

  // First explicit choice: wrong battery. This must be a battery_selected event.
  await level2.locator('[data-compare-id="pink"]').click();
  await page.waitForTimeout(100);

  const afterFirstChoice = await readQueue();
  const firstChoices = ofType(afterFirstChoice, 'battery_selected', 2);
  assert(firstChoices.length === 1, `expected one battery_selected event, got ${firstChoices.length}`);
  assert(firstChoices[0]?.payload?.battery_id === 'pink', 'first battery_selected must identify pink');
  assert(firstChoices[0]?.payload?.selection_order === 1, 'first battery_selected must have selection_order=1');

  // Second explicit choice: correct battery. If the UI permits correction, this
  // must become battery_selection_changed rather than a duplicate selection.
  const green = level2.locator('[data-compare-id="green"]');
  await green.click();
  await level2.locator('#kawsay-success-overlay.is-visible').waitFor({ timeout: 10_000 });
  await page.waitForTimeout(100);

  const afterCorrection = await readQueue();
  const selections = ofType(afterCorrection, 'battery_selected', 2);
  const changes = ofType(afterCorrection, 'battery_selection_changed', 2);
  assert(selections.length === 1, `battery_selected must remain exactly once, got ${selections.length}`);
  assert(changes.length === 1, `expected one battery_selection_changed event, got ${changes.length}`);
  assert(changes[0]?.payload?.battery_id === 'green', 'battery_selection_changed must identify green');
  assert(changes[0]?.payload?.selection_order === 2, 'battery_selection_changed must have selection_order=2');

  const successOverlay = level2.locator('#kawsay-success-overlay.is-visible');
  const continueButton = successOverlay.locator('button').filter({ hasText: /CONTINUAR/i }).first();
  await continueButton.waitFor({ state: 'visible', timeout: 5_000 });
  await continueButton.click();

  await waitForLevel(3);
  await page.waitForTimeout(100);

  const events = await readQueue();
  const n2Complete = ofType(events, 'level_completed', 2);
  const n3Started = ofType(events, 'level_started', 3);
  assert(n2Complete.length === 1, `expected one N2 level_completed, got ${n2Complete.length}`);
  assert(n3Started.length === 1, `expected one N3 level_started, got ${n3Started.length}`);

  const selectedSeq = selections[0].event_seq;
  const changedSeq = changes[0].event_seq;
  const completeSeq = n2Complete[0].event_seq;
  const n3StartSeq = n3Started[0].event_seq;
  assert(selectedSeq < changedSeq && changedSeq < completeSeq && completeSeq < n3StartSeq,
    `unexpected event order: selected=${selectedSeq}, changed=${changedSeq}, complete=${completeSeq}, n3=${n3StartSeq}`);

  const ids = events.map((event) => event.event_id);
  assert(new Set(ids).size === ids.length, 'duplicate event_id detected in local telemetry queue');
  const seqs = events.map((event) => event.event_seq).sort((a, b) => a - b);
  assert(new Set(seqs).size === seqs.length, 'duplicate event_seq detected in local telemetry queue');
  for (let i = 1; i < seqs.length; i += 1) {
    assert(seqs[i] === seqs[i - 1] + 1, `event_seq gap detected between ${seqs[i - 1]} and ${seqs[i]}`);
  }

  assert(runtimeErrors.length === 0, `runtime errors detected:\n${runtimeErrors.join('\n')}`);

  await context.tracing.stop();
  await browser.close();
  console.log('[e2e] N2 selection telemetry OK · explicit select/change → level_completed → N3 level_started');
})().catch(async (error) => {
  console.error(error);
  await persistEvidence(error);
  try { await browser?.close(); } catch (_) {}
  process.exitCode = 1;
});
