const { chromium } = require('playwright');
const { mkdir, writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');

const BASE_URL = process.env.APULAB_BASE_URL || 'http://127.0.0.1:4173';
const OUT = resolve(process.cwd(), 'test-results/level6-contract');
let browser;
let context;
let page;
const runtimeErrors = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function evidence(error) {
  await mkdir(OUT, { recursive: true });
  await writeFile(resolve(OUT, 'runtime.log'), `${String(error?.stack || error)}\n\n${runtimeErrors.join('\n')}\n`, 'utf8');
  if (page) {
    try { await page.screenshot({ path: resolve(OUT, 'failure.png'), fullPage: true }); } catch (_) {}
    try { await writeFile(resolve(OUT, 'page.html'), await page.content(), 'utf8'); } catch (_) {}
  }
}

async function openLevel6() {
  if (page) await page.close();
  page = await context.newPage();
  page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.stack || error}`));
  page.on('console', (msg) => { if (msg.type() === 'error') runtimeErrors.push(`console.error: ${msg.text()}`); });
  await page.goto(`${BASE_URL}/missions/mission01/level6.html`, { waitUntil: 'networkidle' });
  await page.locator('canvas').first().waitFor({ state: 'visible', timeout: 10_000 });
  await page.waitForFunction(() => !!window.apulabLevel6QA);
  return page;
}

async function clearLevel() {
  await page.locator('#clear-btn').click();
  await page.waitForFunction(() => window.apulabLevel6QA?.getState().programLength === 0);
}

async function addKey(command, key = 'Enter') {
  const block = page.locator(`.command-block[data-command="${command}"]`);
  await block.focus();
  await block.press(key);
}

async function addSequence(sequence) {
  for (const command of sequence) await addKey(command);
}

async function pointerDrag(source, target) {
  await source.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();
  const a = await source.boundingBox();
  const b = await target.boundingBox();
  assert(a && b, 'L6 contract: drag source/target not visible');
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 14 });
  await page.mouse.up();
}

async function runAndWaitFeedback(text, timeout = 12_000) {
  await page.locator('#run-btn').click();
  await page.waitForFunction((needle) => (document.getElementById('feedback')?.textContent || '').includes(needle), text, { timeout });
}

(async () => {
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: 1672, height: 941 }, reducedMotion: 'reduce' });
  await openLevel6();

  assert(await page.locator('#repeat-palette').isVisible(), 'L6 contract: REPETIR must be available from start');
  assert(await page.locator('#unlock-overlay').count() === 0, 'L6 contract: N5 repeat unlock overlay leaked into N6');
  assert((await page.locator('body').innerText()).includes('Usa REPETIR para') === false, 'L6 contract: N6 still suggests REPETIR');
  assert(await page.evaluate(() => window.apulabLevel6QA.hasScienceZone()), 'L6 contract: science checkpoint runtime missing');
  assert(await page.evaluate(() => window.apulabLevel6QA.hasCommunicationPoint()), 'L6 contract: communication checkpoint runtime missing');

  // Mouse click, Enter and Space must all insert commands.
  await page.locator('[data-testid="block-scan"]').click();
  await page.waitForFunction(() => window.apulabLevel6QA.getState().programLength === 1);
  await clearLevel();
  await addKey('analyze', 'Enter');
  assert(await page.locator('.program-block').count() === 1, 'L6 contract: ANALIZAR + Enter did not insert');
  await clearLevel();
  await addKey('send', ' ');
  assert(await page.locator('.program-block').count() === 1, 'L6 contract: ENVIAR + Space did not insert');
  await clearLevel();
  await page.locator('#repeat-palette').focus();
  await page.locator('#repeat-palette').press('Enter');
  assert(await page.locator('.repeat-card').count() === 1, 'L6 contract: REPETIR + Enter did not insert');
  await clearLevel();

  // A. ANALIZAR before ESCANEAR.
  await addKey('analyze');
  await runAndWaitFeedback('todavía no tiene datos');
  assert(await page.locator('.program-block').count() === 1, 'L6 contract: premature ANALIZAR erased program');
  let state = await page.evaluate(() => window.apulabLevel6QA.getState());
  assert(!state.hasScanned && !state.hasAnalyzed && !state.hasSentData, 'L6 contract: premature ANALIZAR mutated science state');
  await clearLevel();

  // B. ESCANEAR outside science zone.
  await addKey('scan');
  await runAndWaitFeedback('necesita estar en la zona de interés');
  assert(await page.locator('.program-block').count() === 1, 'L6 contract: premature ESCANEAR erased program');
  await clearLevel();

  // C. ENVIAR before ANALIZAR.
  await addKey('send');
  await runAndWaitFeedback('Primero necesitamos interpretar los datos');
  assert(await page.locator('.program-block').count() === 1, 'L6 contract: premature ENVIAR erased program');
  await clearLevel();

  // D. Valid scan+analyze, then ENVIAR while still at science checkpoint.
  await addSequence(['forward','forward','forward','scan','analyze']);
  await page.locator('#run-btn').click();
  await page.waitForFunction(() => {
    const s = window.apulabLevel6QA?.getState();
    return !!s?.hasScanned && !!s?.hasAnalyzed;
  }, null, { timeout: 20_000 });
  state = await page.evaluate(() => window.apulabLevel6QA.getState());
  assert(state.hasScanned && state.hasAnalyzed && !state.hasSentData, 'L6 contract: valid scientific progress not retained');
  await addKey('send');
  await runAndWaitFeedback('punto de comunicación');
  state = await page.evaluate(() => window.apulabLevel6QA.getState());
  assert(state.hasScanned && state.hasAnalyzed && !state.hasSentData, 'L6 contract: invalid send destroyed valid progress');
  assert(await page.locator('.program-block').count() === 6, 'L6 contract: invalid send erased/changed program');

  // G. Explicit LIMPIAR resets program and science state.
  await clearLevel();
  state = await page.evaluate(() => window.apulabLevel6QA.getState());
  assert(state.programLength === 0, 'L6 contract: LIMPIAR did not clear program');
  assert(!state.hasScanned && !state.hasAnalyzed && !state.hasSentData, 'L6 contract: LIMPIAR did not reset science flags');
  assert(!state.scienceZoneReached && !state.communicationPointReached, 'L6 contract: LIMPIAR left checkpoint flags');

  // E. Correct solution without REPETIR must complete.
  const noRepeat = ['forward','forward','forward','scan','analyze','left','forward','forward','forward','send'];
  await addSequence(noRepeat);
  assert(await page.locator('.repeat-card').count() === 0, 'L6 contract: no-repeat solution unexpectedly contains REPETIR');
  await page.locator('#run-btn').click();
  await page.locator('#success-overlay.visible').waitFor({ timeout: 30_000 });
  let telemetry = await page.evaluate(() => JSON.parse(sessionStorage.getItem('apulab.level6.telemetry') || '[]'));
  let completed = telemetry.findLast((x) => x.event === 'level_completed');
  assert(completed?.payload?.used_repeat_n6 === false, 'L6 contract: no-repeat completion telemetry is wrong');
  assert(completed?.payload?.science_order_correct === true, 'L6 contract: valid no-repeat science order not recorded');

  // F. Correct solution with REPETIR must also complete.
  await openLevel6();
  await page.locator('#repeat-palette').focus();
  await page.locator('#repeat-palette').press('Enter');
  await pointerDrag(page.locator('.command-block[data-command="forward"]'), page.locator('.repeat-body[data-repeat-body="0"]'));
  await page.locator('[data-count="0:1"]').click(); // 2 -> 3
  await addSequence(['scan','analyze','left']);
  await page.locator('#repeat-palette').focus();
  await page.locator('#repeat-palette').press('Enter');
  await pointerDrag(page.locator('.command-block[data-command="forward"]'), page.locator('.repeat-body[data-repeat-body="4"]'));
  await page.locator('[data-count="4:1"]').click(); // 2 -> 3
  await addKey('send');
  assert(await page.locator('.repeat-card').count() === 2, 'L6 contract: repeat solution did not build two REPETIR blocks');
  await page.locator('#run-btn').click();
  await page.locator('#success-overlay.visible').waitFor({ timeout: 30_000 });
  telemetry = await page.evaluate(() => JSON.parse(sessionStorage.getItem('apulab.level6.telemetry') || '[]'));
  completed = telemetry.findLast((x) => x.event === 'level_completed');
  assert(completed?.payload?.used_repeat_n6 === true, 'L6 contract: repeat reuse was not recorded');
  assert(completed?.payload?.repeat_instances_n6 === 2, 'L6 contract: repeat instance count is wrong');
  assert(completed?.payload?.completed_level === true, 'L6 contract: repeat solution did not complete');

  assert(runtimeErrors.length === 0, `L6 contract: runtime errors detected\n${runtimeErrors.join('\n')}`);
  await browser.close();
  console.log('[e2e] Level 6 contract OK · click/Enter/Space/drag · graceful failures · LIMPIAR reset · no-REPETIR + optional-REPETIR solutions');
})().catch(async (error) => {
  console.error(error);
  await evidence(error);
  try { await browser?.close(); } catch (_) {}
  process.exitCode = 1;
});
