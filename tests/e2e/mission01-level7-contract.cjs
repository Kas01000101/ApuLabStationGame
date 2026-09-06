const { chromium } = require('playwright');
const { mkdir, writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');

const BASE_URL = process.env.APULAB_BASE_URL || 'http://127.0.0.1:4173';
const OUT = resolve(process.cwd(), 'test-results/level7-contract');
const errors = [];
let browser, context, page;
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function openLevel() {
  if (page) await page.close();
  page = await context.newPage();
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.stack || error}`));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`); });
  await page.goto(`${BASE_URL}/missions/mission01/level7.html`, { waitUntil: 'networkidle' });
  await page.locator('#board-canvas').waitFor({ state: 'visible', timeout: 12_000 });
  await page.locator('#program-list').waitFor({ state: 'visible', timeout: 12_000 });
}

async function addCommands(sequence) {
  for (const command of sequence) {
    const block = page.locator(`.command-block[data-command="${command}"]`);
    await block.focus();
    await block.press('Enter');
  }
}

async function pointerDrag(source, target) {
  await source.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();
  const a = await source.boundingBox(), b = await target.boundingBox();
  assert(a && b, 'drag source/target not visible');
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
  await page.mouse.up();
}

async function choose(id) {
  const card = page.locator(`.instrument-option[data-instrument="${id}"]`);
  await card.focus();
  await card.press('Enter');
  await page.locator('#analysis-overlay.visible').waitFor({ timeout: 5_000 });
}

async function changeInstrument() {
  const button = page.locator('#change-instrument-btn');
  await button.focus();
  await button.press('Enter');
  await page.locator('#sensor-overlay.visible').waitFor({ timeout: 5_000 });
}

async function continueAnalysis() {
  const button = page.locator('#continue-analysis-btn');
  await button.focus();
  await button.press('Enter');
  await page.locator('#analysis-overlay').waitFor({ state: 'hidden', timeout: 5_000 });
}

async function state() {
  return page.evaluate(() => window.apulabLevel7QA?.getState?.());
}

async function shot(name) {
  await mkdir(OUT, { recursive: true });
  await page.screenshot({ path: resolve(OUT, `${name}.png`), fullPage: true });
}

(async () => {
  await mkdir(OUT, { recursive: true });
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: 1672, height: 941 }, reducedMotion: 'reduce' });
  await context.addInitScript(() => { try { localStorage.setItem('apulab.settings.sfx', 'off'); } catch (_) {} });

  // A. ANALIZAR MUESTRA away from the sample: graceful failure, program preserved.
  await openLevel();
  assert(await page.locator('#sensor-overlay').isHidden(), 'L7: selector opened before ANALIZAR MUESTRA');
  assert(await page.locator('#repeat-palette').isVisible(), 'L7: REPETIR must be available from start');
  await addCommands(['analyzeSample']);
  assert(await page.locator('.program-block').count() === 1, 'L7: keyboard did not add ANALIZAR MUESTRA');
  await page.locator('#run-btn').click();
  await page.waitForFunction(() => (document.getElementById('feedback')?.textContent || '').includes('junto a la muestra'));
  assert(await page.locator('.program-block').count() === 1, 'L7: premature analysis erased program');
  assert(!await page.locator('#success-overlay').isVisible(), 'L7: premature analysis completed level');
  await page.locator('#run-btn').click();
  await page.locator('#clear-btn').click();
  assert((await state()).relevantInstrumentUsed === false, 'L7: clear did not reset relevant instrument state');

  // B-G. Reach sample, observe two valid-but-irrelevant readings, then change strategy.
  const toSample = ['forward','forward','forward','forward','right','forward','forward','forward','forward','analyzeSample'];
  await addCommands(toSample);
  await page.locator('#run-btn').click();
  await page.locator('#sensor-overlay.visible').waitFor({ timeout: 25_000 });
  await shot('selector-after-analyze');
  await choose('temperature');
  assert((await page.locator('#analysis-result').textContent() || '').includes('−58 °C'), 'L7: temperature reading missing');
  assert(!await page.locator('#continue-analysis-btn').isVisible(), 'L7: irrelevant temperature should not continue mission');
  await changeInstrument();
  await choose('proximity');
  assert((await page.locator('#analysis-result').textContent() || '').includes('0.4 m'), 'L7: proximity reading missing');
  await changeInstrument();
  await choose('materials');
  const materialText = await page.locator('#analysis-result').textContent() || '';
  assert(materialText.includes('HIERRO') && materialText.includes('SILICATOS'), 'L7: materials reading missing');
  assert(await page.locator('#continue-analysis-btn').isVisible(), 'L7: relevant composition should allow continuation');
  await continueAnalysis();
  await page.waitForFunction(() => (document.getElementById('feedback')?.textContent || '').includes('punto final'));
  let s = await state();
  assert(s.firstInstrument === 'temperature', 'L7: first instrument telemetry state incorrect');
  assert(s.finalInstrument === 'materials', 'L7: final instrument telemetry state incorrect');
  assert(s.instrumentSelectionCount === 3, `L7: expected 3 selections, got ${s.instrumentSelectionCount}`);
  assert(s.instrumentChangeCount === 2, `L7: expected 2 changes, got ${s.instrumentChangeCount}`);
  assert(s.changedAfterIrrelevantFeedback === true, 'L7: strategy-change state missing');
  assert(s.relevantInstrumentUsed === true, 'L7: relevant instrument state missing');
  assert(!await page.locator('#success-overlay').isVisible(), 'L7: composition alone must not complete mission');
  await shot('materials-result-complete');

  // Reset must remove current scientific progress and visible result state.
  await page.locator('#clear-btn').click();
  s = await state();
  assert(s.relevantInstrumentUsed === false && s.sampleCheckpointReached === false && s.finalCheckpointReached === false, 'L7: LIMPIAR left scientific flags active');
  assert(await page.locator('#sensor-overlay,#analysis-overlay').filter({ visible: true }).count().catch(() => 0) === 0, 'L7: LIMPIAR left modal visible');

  // H. Complete with a normal route, no REPETIR.
  const fullNoRepeat = ['forward','forward','forward','forward','right','forward','forward','forward','forward','analyzeSample','right','right','forward','forward','forward','forward'];
  await addCommands(fullNoRepeat);
  assert(await page.locator('.repeat-card').count() === 0, 'L7: no-repeat solution unexpectedly contains REPETIR');
  await page.locator('#run-btn').click();
  await page.locator('#sensor-overlay.visible').waitFor({ timeout: 25_000 });
  await choose('materials');
  await continueAnalysis();
  await page.locator('#success-overlay.visible').waitFor({ timeout: 25_000 });
  assert((await page.locator('#continue-btn').textContent() || '').includes('FINALIZAR MISIÓN'), 'L7: final CTA incorrect');
  s = await state();
  assert(s.finalCheckpointReached === true && s.relevantInstrumentUsed === true, 'L7: no-repeat completion state incorrect');
  assert(s.used_repeat_n7 === false, 'L7: no-repeat solution telemetry incorrectly reports repeat');

  const telemetry = await page.evaluate(() => JSON.parse(sessionStorage.getItem('apulab.level7.telemetry') || '[]'));
  const names = telemetry.map((x) => x.event);
  for (const event of ['level_started','sample_checkpoint_reached','sample_analyze_requested','instrument_modal_opened','instrument_selected','sample_analyzed','relevant_instrument_selected','final_checkpoint_reached','mission_completed']) {
    assert(names.includes(event), `L7: telemetry missing ${event}`);
  }
  const completed = telemetry.findLast((x) => x.event === 'mission_completed');
  assert(completed?.payload?.completed_level === true, 'L7: completion telemetry missing completed_level');
  assert(completed?.payload?.first_choice_relevant === false, 'L7: first_choice_relevant should reflect earlier temperature choice');
  assert(completed?.payload?.changed_after_irrelevant_feedback === true, 'L7: strategy-change metric not preserved across reset');
  await shot('completed-without-repeat');

  // I. Fresh session: complete with REPETIR used voluntarily for the return route.
  await openLevel();
  const prefix = ['forward','forward','forward','forward','right','forward','forward','forward','forward','analyzeSample','right','right'];
  await addCommands(prefix);
  await page.locator('#repeat-palette').focus();
  await page.locator('#repeat-palette').press('Enter');
  const repeatIndex = prefix.length;
  assert(await page.locator('.repeat-card').count() === 1, 'L7: REPETIR was not inserted by keyboard');
  await pointerDrag(page.locator('.command-block[data-command="forward"]'), page.locator(`[data-repeat-body="${repeatIndex}"]`));
  await page.locator(`[data-count="${repeatIndex}:1"]`).click();
  await page.locator(`[data-count="${repeatIndex}:1"]`).click();
  await page.locator('#run-btn').click();
  await page.locator('#sensor-overlay.visible').waitFor({ timeout: 25_000 });
  await choose('materials');
  await continueAnalysis();
  await page.locator('#success-overlay.visible').waitFor({ timeout: 25_000 });
  s = await state();
  assert(s.used_repeat_n7 === true && s.repeat_instances_n7 === 1, 'L7: optional REPETIR completion telemetry incorrect');
  await shot('completed-with-repeat');

  assert(errors.length === 0, `runtime errors detected:\n${errors.join('\n')}`);
  await writeFile(resolve(OUT, 'state.json'), JSON.stringify(s, null, 2), 'utf8');
  await browser.close();
  console.log('[e2e] LEVEL 7 CONTRACT OK · selector on ANALIZAR · irrelevant data → strategy change · final checkpoint · no-repeat + optional-repeat completions');
})().catch(async (error) => {
  console.error(error);
  await mkdir(OUT, { recursive: true });
  await writeFile(resolve(OUT, 'runtime.log'), `${String(error?.stack || error)}\n\n${errors.join('\n')}\n`, 'utf8');
  try { if (page) await page.screenshot({ path: resolve(OUT, 'failure.png'), fullPage: true }); } catch (_) {}
  try { await browser?.close(); } catch (_) {}
  process.exitCode = 1;
});
