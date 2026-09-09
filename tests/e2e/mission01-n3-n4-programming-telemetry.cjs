const { chromium } = require('playwright');
const { mkdir, writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');

const BASE_URL = process.env.APULAB_BASE_URL || 'http://127.0.0.1:4173';
const EVIDENCE_DIR = resolve(process.cwd(), 'test-results/n3-n4-programming-telemetry');
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

async function waitForQueuedEvent(type, level) {
  await page.waitForFunction(
    ({ key, eventType, levelNumber }) => {
      try {
        const events = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(events) && events.some((event) =>
          event?.event_type === eventType && event?.level_number === levelNumber);
      } catch (_) {
        return false;
      }
    },
    { key: QUEUE_KEY, eventType: type, levelNumber: level },
    { timeout: 10_000 },
  );
}

function ofType(events, type, level) {
  return events.filter((event) => event.event_type === type && event.level_number === level);
}

async function addAccessibleCommands(frame, sequence) {
  for (const command of sequence) {
    const block = frame.locator(`.command-block[data-command="${command}"]`);
    await block.focus();
    await block.press('Enter');
  }
}

async function transition(frame, level, nextLevel) {
  await frame.evaluate(({ current, next }) => {
    parent.postMessage({ type: 'apulab-level-complete', level: current, nextLevel: next }, location.origin);
  }, { current: level, next: nextLevel });
}

(async () => {
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: 1672, height: 941 }, reducedMotion: 'reduce' });

  // Keep telemetry local so the regression isolates parent↔iframe behavior.
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
  await transition(level1, 1, 2);
  const level2 = await waitForLevel(2);
  await waitForQueuedEvent('level_started', 2);
  await transition(level2, 2, 3);

  const level3 = await waitForLevel(3);
  await waitForQueuedEvent('level_started', 3);
  await level3.locator('#run-btn').waitFor({ state: 'visible', timeout: 10_000 });

  // N3 must not synthesize programming events simply by loading.
  await page.waitForTimeout(750);
  let events = await readQueue();
  assert(ofType(events, 'program_started', 3).length === 0,
    'N3 emitted program_started without an explicit run');
  assert(ofType(events, 'command_executed', 3).length === 0,
    'N3 emitted command_executed without an explicit run');

  // Empty program is a valid attempt, but it is not success.
  const emptyCount = await level3.locator('.program-block').count();
  assert(emptyCount === 0, `N3 should begin empty, got ${emptyCount} blocks`);
  await level3.locator('#run-btn').click();
  await page.waitForTimeout(250);

  events = await readQueue();
  let n3Starts = ofType(events, 'program_started', 3);
  let n3Execs = ofType(events, 'command_executed', 3);
  assert(n3Starts.length === 1, `expected one N3 empty program_started, got ${n3Starts.length}`);
  assert(n3Execs.length === 1, `expected one N3 empty command_executed, got ${n3Execs.length}`);
  assert(n3Starts[0]?.payload?.command_count === 0, 'N3 empty program_started must report command_count=0');
  assert(n3Execs[0]?.payload?.command_count === 0, 'N3 empty command_executed must report command_count=0');
  assert(ofType(events, 'goal_reached', 3).length === 0, 'N3 empty program must not reach the goal');
  assert(ofType(events, 'level_completed', 3).length === 0, 'N3 empty program must not complete the level');

  // Use a deterministic known-valid route, but derive the telemetry contract
  // from the live DOM count. The number of blocks is observed data, not a
  // pedagogical or completion requirement.
  const validRoute = ['forward', 'forward', 'forward', 'right', 'forward', 'forward'];
  await addAccessibleCommands(level3, validRoute);
  await page.waitForTimeout(250);
  const actualN3Count = await level3.locator('.program-block').count();
  assert(actualN3Count > 0, 'N3 valid route did not create program blocks');

  events = await readQueue();
  const n3Added = ofType(events, 'command_added', 3);
  assert(n3Added.length === actualN3Count,
    `N3 command_added count ${n3Added.length} does not match live DOM count ${actualN3Count}`);
  assert(n3Added.at(-1)?.payload?.command_count === actualN3Count,
    'N3 final command_added must report the live DOM count');

  await level3.locator('#run-btn').click();
  await level3.locator('#success-overlay.visible,#success-overlay.is-visible').waitFor({ state: 'visible', timeout: 20_000 });
  await waitForQueuedEvent('goal_reached', 3);

  events = await readQueue();
  n3Starts = ofType(events, 'program_started', 3);
  n3Execs = ofType(events, 'command_executed', 3);
  const n3Goal = ofType(events, 'goal_reached', 3);
  assert(n3Starts.length === 2, `expected two N3 runs total, got ${n3Starts.length}`);
  assert(n3Execs.length === 2, `expected two N3 executions total, got ${n3Execs.length}`);
  assert(n3Starts.at(-1)?.payload?.command_count === actualN3Count,
    `N3 program_started reported ${n3Starts.at(-1)?.payload?.command_count}, DOM has ${actualN3Count}`);
  assert(n3Execs.at(-1)?.payload?.command_count === actualN3Count,
    `N3 command_executed reported ${n3Execs.at(-1)?.payload?.command_count}, DOM has ${actualN3Count}`);
  assert(n3Goal.length === 1, `N3 success must emit one goal_reached, got ${n3Goal.length}`);

  // Completion remains lifecycle-owned and follows the independent goal event.
  await level3.locator('#continue-btn').click();
  const level4 = await waitForLevel(4);
  await waitForQueuedEvent('level_started', 4);
  await page.waitForTimeout(1000);

  events = await readQueue();
  const n3Complete = ofType(events, 'level_completed', 3);
  const n4Start = ofType(events, 'level_started', 4);
  assert(n3Complete.length === 1, `expected one N3 level_completed, got ${n3Complete.length}`);
  assert(n4Start.length === 1, `expected one N4 level_started, got ${n4Start.length}`);
  assert(n3Goal[0].event_seq < n3Complete[0].event_seq && n3Complete[0].event_seq < n4Start[0].event_seq,
    'N3 goal/completion/N4 start ordering is invalid');

  // N4 must stay silent until the participant explicitly interacts.
  assert(ofType(events, 'program_started', 4).length === 0,
    'N4 emitted program_started on load without user interaction');
  assert(ofType(events, 'command_executed', 4).length === 0,
    'N4 emitted command_executed on load without user interaction');

  // Verify the shared programming instrumentation against a non-empty N4
  // program using the actual DOM count rather than a fixed solution length.
  const n4ProbeProgram = ['forward', 'right', 'forward'];
  await addAccessibleCommands(level4, n4ProbeProgram);
  await page.waitForTimeout(250);
  const actualN4Count = await level4.locator('.program-block').count();
  assert(actualN4Count > 0, 'N4 probe program did not create program blocks');

  events = await readQueue();
  const n4Added = ofType(events, 'command_added', 4);
  assert(n4Added.length === actualN4Count,
    `N4 command_added count ${n4Added.length} does not match live DOM count ${actualN4Count}`);

  await level4.locator('#run-btn').click();
  await page.waitForTimeout(300);
  events = await readQueue();
  const n4Starts = ofType(events, 'program_started', 4);
  const n4Execs = ofType(events, 'command_executed', 4);
  assert(n4Starts.length === 1, `expected one explicit N4 program_started, got ${n4Starts.length}`);
  assert(n4Execs.length === 1, `expected one explicit N4 command_executed, got ${n4Execs.length}`);
  assert(n4Starts[0]?.payload?.command_count === actualN4Count,
    `N4 program_started reported ${n4Starts[0]?.payload?.command_count}, DOM has ${actualN4Count}`);
  assert(n4Execs[0]?.payload?.command_count === actualN4Count,
    `N4 command_executed reported ${n4Execs[0]?.payload?.command_count}, DOM has ${actualN4Count}`);

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
  console.log('[e2e] N3/N4 programming telemetry OK · dynamic count · goal-owned success · no load-time run');
})().catch(async (error) => {
  console.error(error);
  await persistEvidence(error);
  try { await browser?.close(); } catch (_) {}
  process.exitCode = 1;
});
