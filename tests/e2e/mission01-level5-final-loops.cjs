const { chromium } = require('playwright');
const { mkdir, writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');

const BASE_URL = process.env.APULAB_BASE_URL || 'http://127.0.0.1:4173';
const OUT = resolve(process.cwd(), 'test-results/level5-final-loops');
const runtimeErrors = [];
let browser, context, page;
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function openLevel() {
  if (page) await page.close();
  page = await context.newPage();
  page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.stack || error}`));
  page.on('console', (msg) => { if (msg.type() === 'error') runtimeErrors.push(`console.error: ${msg.text()}`); });
  await page.goto(`${BASE_URL}/missions/mission01/level5.html`, { waitUntil: 'networkidle' });
  await page.locator('canvas').first().waitFor({ state: 'visible', timeout: 12_000 });
  await page.waitForFunction(() => !!window.apulabLevel5QA?.getState, null, { timeout: 10_000 });
}
async function add(sequence) { for (const command of sequence) await page.locator(`.command-block[data-command="${command}"]`).dblclick(); }
async function state() { return page.evaluate(() => window.apulabLevel5QA.getState()); }
async function telemetry() { return page.evaluate(() => window.apulabLevel5QA.telemetry()); }
async function shot(name) { await mkdir(OUT, { recursive: true }); await page.screenshot({ path: resolve(OUT, `${name}.png`), fullPage: true }); }
async function pointerDrag(source, target) {
  await source.scrollIntoViewIfNeeded(); await target.scrollIntoViewIfNeeded();
  const a = await source.boundingBox(), b = await target.boundingBox(); assert(a && b, 'drag source/target missing');
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 }); await page.mouse.up();
}

const LONG = ['left','forward','forward','forward','forward','forward','forward','right','forward','forward','forward','forward','forward','forward'];

(async () => {
  await mkdir(OUT, { recursive: true });
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: 1672, height: 941 }, reducedMotion: 'reduce' });
  await context.addInitScript(() => { try { localStorage.setItem('apulab.settings.sfx', 'off'); } catch (_) {} });
  await openLevel();

  assert((await page.locator('.title').textContent() || '').trim() === 'SIMPLIFICAR', 'L5: title must be SIMPLIFICAR');
  assert((await page.locator('.subtitle').textContent() || '').includes('RECONOCE UN PATRÓN'), 'L5: subtitle contract missing');
  assert((await page.locator('.btn-progress').textContent() || '').includes('5 / 7'), 'L5: progress must be 5 / 7');
  assert(await page.locator('#guide-btn').count() === 0, 'L5: top GUÍA must not exist');
  assert(await page.locator('#level5-guide').isVisible(), 'L5: fixed lower guide missing');
  assert(await page.locator('.level5-guide-step').count() === 4, 'L5: guide must have 4 steps');
  assert(await page.locator('.level5-guide-step[data-step="1"].is-active').isVisible(), 'L5: step 1 must start active');
  assert(await page.locator('#repeat-palette').isHidden(), 'L5: REPETIR must start locked/hidden');
  assert(await page.locator('#explore-btn').isVisible(), 'L5: EXPLORAR missing');
  assert(await page.locator('#journal-btn').isVisible(), 'L5: BITÁCORA missing');
  let s = await state();
  assert(s.longSolutionCompleted === false && s.repeatUnlocked === false, 'L5: initial pedagogical state incorrect');
  assert(s.goalCell && Number.isInteger(s.goalCell.c) && Number.isInteger(s.goalCell.r), 'L5: goal cell not exposed');
  await shot('01-initial');

  await add(LONG);
  assert(await page.locator('.program-block').count() === LONG.length, 'L5: long solution was not built');
  await page.locator('#run-btn').click();
  await page.locator('#repeat-palette').waitFor({ state: 'visible', timeout: 35_000 });
  await page.waitForFunction(() => window.apulabLevel5QA.getState().longSolutionCompleted === true);
  s = await state();
  assert(s.initialBlockCount === LONG.length, `L5: initial count expected ${LONG.length}, got ${s.initialBlockCount}`);
  assert(s.repeatUnlocked === true, 'L5: REPETIR did not unlock after first solution');
  assert(s.completed === false, 'L5: first solution incorrectly completed the level');
  assert(!await page.locator('#success-overlay').isVisible(), 'L5: success overlay appeared after first long solution');
  assert(await page.locator('.program-row.apulab-pattern-repeat').count() >= 2, 'L5: repeated pattern not highlighted');
  assert(await page.locator('#repeat-palette.level5-repeat-ready').isVisible(), 'L5: restrained REPETIR attention missing');
  assert(await page.locator('#apulab-repeat-arrow').count() === 0, 'L5: legacy arrow must not exist');
  assert(await page.locator('.level5-guide-step[data-step="3"].is-active').isVisible(), 'L5: guide did not advance to REPETIR');
  await shot('02-pattern-and-unlock');

  await page.locator('#clear-btn').click();
  await page.waitForTimeout(250);
  s = await state();
  assert(s.repeatUnlocked === true, 'L5: LIMPIAR unexpectedly relocked learned REPETIR');
  assert(await page.locator('.program-block').count() === 0 && await page.locator('.repeat-card').count() === 0, 'L5: LIMPIAR did not clear program');

  const repeat = page.locator('#repeat-palette');
  await repeat.focus(); await repeat.press('Enter');
  assert(await page.locator('.repeat-card').count() === 1, 'L5: Enter did not insert REPETIR');
  await page.locator('[data-del="0"]').click();
  await repeat.focus(); await repeat.press('Space');
  assert(await page.locator('.repeat-card').count() === 1, 'L5: Space did not insert REPETIR');
  await page.locator('[data-del="0"]').click();

  await add(['left']);
  await repeat.dblclick();
  await pointerDrag(page.locator('.command-block[data-command="forward"]'), page.locator('.repeat-body[data-repeat-body="1"]'));
  for (let i = 0; i < 4; i += 1) await page.locator('[data-count="1:1"]').click();
  await add(['right']);
  await repeat.dblclick();
  await pointerDrag(page.locator('.command-block[data-command="forward"]'), page.locator('.repeat-body[data-repeat-body="3"]'));
  for (let i = 0; i < 4; i += 1) await page.locator('[data-count="3:1"]').click();
  for (let i = 0; i < 8; i += 1) await add(['left']);
  const badProgramCount = (await state()).currentBlockCount;
  assert(badProgramCount >= LONG.length, 'L5: negative program did not reach non-reduced count');
  await page.locator('#run-btn').click();
  await page.waitForTimeout(12_000);
  assert(!await page.locator('#success-overlay').isVisible(), 'L5: non-reduced repeat program incorrectly completed');
  assert(await page.locator('.repeat-card').count() === 2, 'L5: failed attempt erased REPETIR structure');

  await page.locator('#clear-btn').click(); await page.waitForTimeout(250);
  await add(['left']);
  await repeat.dblclick();
  await pointerDrag(page.locator('.command-block[data-command="forward"]'), page.locator('.repeat-body[data-repeat-body="1"]'));
  for (let i = 0; i < 4; i += 1) await page.locator('[data-count="1:1"]').click();
  await add(['right']);
  await repeat.dblclick();
  await pointerDrag(page.locator('.command-block[data-command="forward"]'), page.locator('.repeat-body[data-repeat-body="3"]'));
  for (let i = 0; i < 4; i += 1) await page.locator('[data-count="3:1"]').click();
  s = await state();
  assert(s.currentBlockCount < s.initialBlockCount, `L5: final program is not shorter (${s.currentBlockCount} >= ${s.initialBlockCount})`);
  await shot('03-refactored-program');
  await page.locator('#run-btn').click();
  await page.locator('#success-overlay.visible').waitFor({ timeout: 35_000 });
  s = await state();
  assert(s.completed === true, 'L5: final state not completed');
  assert(s.usedRepeat === true, 'L5: final solution did not register REPETIR');
  assert(s.finalBlockCount < s.initialBlockCount, 'L5: final count must be lower than initial count');

  // updateLevel5Journal synchronizes the underlying journal text even while the success modal owns pointer input.
  const journal = await page.locator('#journal-text').textContent() || '';
  assert(journal.includes('PROGRAMA INICIAL') && journal.includes('PROGRAMA CON REPETIR'), 'L5: journal before/after summary missing');
  const events = await telemetry(); const names = events.map((x) => x.event);
  for (const event of ['level_started','program_started','program_modified','initial_program_completed','pattern_highlighted','repeat_unlocked','repeat_added','repeat_count_changed','block_moved_into_repeat','program_refactored','goal_reached','level_completed']) assert(names.includes(event), `L5: telemetry missing ${event}`);
  await shot('04-completed');

  assert(runtimeErrors.length === 0, `runtime errors detected:\n${runtimeErrors.join('\n')}`);
  await writeFile(resolve(OUT, 'state.json'), JSON.stringify(s, null, 2), 'utf8');
  await writeFile(resolve(OUT, 'telemetry.json'), JSON.stringify(events, null, 2), 'utf8');
  await browser.close();
  console.log(`[e2e] LEVEL 5 FINAL LOOPS OK · goal=(${s.goalCell.c},${s.goalCell.r}) · ${s.initialBlockCount} → ${s.finalBlockCount} executable blocks · REPETIR learned → N6`);
})().catch(async (error) => {
  console.error(error); await mkdir(OUT, { recursive: true });
  await writeFile(resolve(OUT, 'runtime.log'), `${String(error?.stack || error)}\n\n${runtimeErrors.join('\n')}\n`, 'utf8');
  try { if (page) await page.screenshot({ path: resolve(OUT, 'failure.png'), fullPage: true }); } catch (_) {}
  try { await browser?.close(); } catch (_) {}
  process.exitCode = 1;
});
