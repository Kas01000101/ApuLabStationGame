const { chromium } = require('playwright');
const { mkdir, writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');

const BASE_URL = process.env.APULAB_BASE_URL || 'http://127.0.0.1:4173';
const EVIDENCE_DIR = resolve(process.cwd(), 'test-results/electronics');
const LOGICAL_WIDTH = 1672;
const LOGICAL_HEIGHT = 941;

let browser;
let context;
let page;
const runtimeErrors = [];

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

async function persistEvidence(error) {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  const log = [`error: ${String(error?.stack || error)}`, '', ...runtimeErrors].join('\n');
  await writeFile(resolve(EVIDENCE_DIR, 'runtime.log'), `${log}\n`, 'utf8');
  if (page) {
    try { await page.screenshot({ path: resolve(EVIDENCE_DIR, 'failure.png'), fullPage: true }); } catch (_) {}
    try { await writeFile(resolve(EVIDENCE_DIR, 'page.html'), await page.content(), 'utf8'); } catch (_) {}
  }
  if (context) {
    try { await context.tracing.stop({ path: resolve(EVIDENCE_DIR, 'trace.zip') }); } catch (_) {}
  }
}

function watchRuntime(p, label) {
  p.on('pageerror', (error) => runtimeErrors.push(`${label} pageerror: ${String(error.stack || error)}`));
  p.on('console', (msg) => {
    if (msg.type() === 'error') runtimeErrors.push(`${label} console.error: ${msg.text()}`);
  });
}

async function logicalPoint(canvas, x, y) {
  const box = await canvas.boundingBox();
  assert(box, 'Mission canvas has no bounding box');
  return {
    x: box.x + (x / LOGICAL_WIDTH) * box.width,
    y: box.y + (y / LOGICAL_HEIGHT) * box.height,
  };
}

async function clickLogical(canvas, x, y) {
  const p = await logicalPoint(canvas, x, y);
  await page.mouse.click(p.x, p.y);
}

async function dragLogical(canvas, from, to) {
  const a = await logicalPoint(canvas, from.x, from.y);
  const b = await logicalPoint(canvas, to.x, to.y);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 18 });
  await page.mouse.up();
}

const POINTS = {
  batteryPower: { x: 1437, y: 485 },
  meterPower: { x: 456, y: 387 },
  redProbe: { x: 936, y: 744 },
  blackProbe: { x: 1177, y: 781 },
  positiveTerminal: { x: 1003, y: 339 },
  negativeTerminal: { x: 1396, y: 338 },
};

async function openLevel(level) {
  page = await context.newPage();
  watchRuntime(page, `L${level}`);
  await page.goto(`${BASE_URL}/missions/mission01/level${level}.html`, { waitUntil: 'networkidle' });
  const canvas = page.locator('#kawsay-canvas, canvas').first();
  await canvas.waitFor({ state: 'visible', timeout: 15_000 });
  return canvas;
}

async function closeLevel() {
  await page?.close();
  page = null;
}

async function connectConventional(canvas) {
  await dragLogical(canvas, POINTS.redProbe, POINTS.positiveTerminal);
  await page.waitForTimeout(150);
  await dragLogical(canvas, POINTS.blackProbe, POINTS.negativeTerminal);
}

async function level1() {
  const canvas = await openLevel(1);

  const sourceContract = await page.evaluate(() => ({
    has15: document.documentElement.innerHTML.includes('PRACTICE_BATTERY_VOLTAGE = 15.0'),
    leaks28Practice: /Batería de práctica[^<\n]*28\.0|PRACTICE_BATTERY_VOLTAGE\s*=\s*28\.0/.test(document.documentElement.innerHTML),
  }));
  assert(sourceContract.has15, 'L1: practice battery contract is not 15.0 V');
  assert(!sourceContract.leaks28Practice, 'L1: stale 28.0 V practice value remains');

  await clickLogical(canvas, POINTS.batteryPower.x, POINTS.batteryPower.y);
  await page.waitForTimeout(150);
  await clickLogical(canvas, POINTS.meterPower.x, POINTS.meterPower.y);
  await page.waitForTimeout(150);

  await connectConventional(canvas);
  await page.locator('#kawsay-success-overlay.is-visible').waitFor({ timeout: 15_000 });

  const successText = await page.locator('#kawsay-success-overlay').innerText();
  assert(successText.includes('15.0 V'), `L1: expected 15.0 V success, got: ${successText}`);

  const live = await page.locator('#kawsay-live-status').innerText().catch(() => '');
  assert(!live.includes('28.0 V'), 'L1: live status still exposes stale 28.0 V practice value');
  await closeLevel();
}

async function measureCurrentBattery(canvas, expectedSelector, expectedValue) {
  await connectConventional(canvas);
  await page.waitForFunction(
    ({ selector, expected }) => document.querySelector(selector)?.textContent?.includes(expected),
    { selector: expectedSelector, expected: expectedValue },
    { timeout: 12_000 },
  );
  const text = await page.locator(expectedSelector).innerText();
  assert(text.includes(expectedValue), `${expectedSelector}: expected ${expectedValue}, got ${text}`);
}

async function nextBattery() {
  const next = page.locator('#battery-next');
  await next.click();
  await page.waitForTimeout(650);
  await page.waitForFunction(() => {
    const button = document.querySelector('#battery-next');
    return button && !button.disabled;
  }, null, { timeout: 5_000 }).catch(() => {});
}

async function level2() {
  const canvas = await openLevel(2);

  await measureCurrentBattery(canvas, '#measure-pink', '24.0 V');
  await nextBattery();
  await measureCurrentBattery(canvas, '#measure-green', '28.0 V');
  await nextBattery();
  await measureCurrentBattery(canvas, '#measure-coral', '32.0 V');

  const compare = page.locator('#kawsay-compare-overlay');
  await compare.waitFor({ state: 'visible', timeout: 10_000 });
  await page.locator('[data-compare-id="green"]').click();
  await page.locator('#kawsay-success-overlay.is-visible').waitFor({ timeout: 10_000 });

  const successText = await page.locator('#kawsay-success-overlay').innerText();
  assert(/28\.0 V|verde|correct/i.test(successText), 'L2: correct 28.0 V battery was not accepted');
  await closeLevel();
}

(async () => {
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT } });
  await context.addInitScript(() => {
    try { localStorage.setItem('apulab.settings.sfx', 'off'); } catch (_) {}
  });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

  await level1();
  await level2();

  assert(runtimeErrors.length === 0, `runtime errors detected:\n${runtimeErrors.join('\n')}`);
  await context.tracing.stop();
  await browser.close();
  console.log('[e2e] Mission 01 electronics OK · N1 real 15.0 V · N2 real 24/28/32 V + correct selection');
})().catch(async (error) => {
  console.error(error);
  await persistEvidence(error);
  try { await browser?.close(); } catch (_) {}
  process.exitCode = 1;
});
