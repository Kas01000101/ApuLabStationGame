const { chromium } = require('playwright');
const { mkdir, writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');

const BASE_URL = process.env.APULAB_BASE_URL || 'http://127.0.0.1:4173';
const EVIDENCE_DIR = resolve(process.cwd(), 'test-results/gameplay');

let browser;
let context;
let currentPage;
const runtimeErrors = [];

const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function saveEvidence(error) {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await writeFile(resolve(EVIDENCE_DIR, 'runtime.log'), `${String(error?.stack || error)}\n\n${runtimeErrors.join('\n')}\n`, 'utf8');
  if (currentPage) {
    try { await currentPage.screenshot({ path: resolve(EVIDENCE_DIR, 'failure.png'), fullPage: true }); } catch (_) {}
    try { await writeFile(resolve(EVIDENCE_DIR, 'page.html'), await currentPage.content(), 'utf8'); } catch (_) {}
  }
  if (context) { try { await context.tracing.stop({ path: resolve(EVIDENCE_DIR, 'trace.zip') }); } catch (_) {} }
}

async function openLevel(level) {
  currentPage = await context.newPage();
  currentPage.on('pageerror', (error) => runtimeErrors.push(`L${level} pageerror: ${error.stack || error}`));
  currentPage.on('console', (msg) => { if (msg.type() === 'error') runtimeErrors.push(`L${level} console.error: ${msg.text()}`); });
  await currentPage.goto(`${BASE_URL}/missions/mission01/level${level}.html`, { waitUntil: 'networkidle' });
  await currentPage.locator('canvas').first().waitFor({ state: 'visible', timeout: 10_000 });
  return currentPage;
}

async function closeLevel() { if (!currentPage) return; await currentPage.close(); currentPage = null; }
async function addAccessibleCommands(page, sequence) { for (const command of sequence) { const block = page.locator(`.command-block[data-command="${command}"]`); await block.focus(); await block.press('Enter'); } }
async function addLegacyCommandsByDoubleClick(page, sequence) { for (const command of sequence) await page.locator(`.command-block[data-command="${command}"]`).dblclick(); }
async function pointerDrag(page, source, target) {
  await source.scrollIntoViewIfNeeded(); await target.scrollIntoViewIfNeeded();
  const a = await source.boundingBox(); const b = await target.boundingBox(); assert(a && b, 'pointer drag target/source not visible');
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 }); await page.mouse.up();
}

async function level3() {
  const page = await openLevel(3);
  for (let i = 0; i < 5; i += 1) await page.locator('#explore-btn').click();
  await addAccessibleCommands(page, ['forward', 'forward', 'forward', 'right', 'forward', 'forward']);
  assert(await page.locator('.program-block').count() === 6, 'L3: program did not receive six real commands');
  await page.locator('#run-btn').click(); await page.locator('#success-overlay.visible').waitFor({ timeout: 20_000 });
  assert((await page.locator('#feedback').textContent() || '').includes('meta'), 'L3: AYNI did not report goal completion');
  await closeLevel();
}

async function level4() {
  const page = await openLevel(4);
  const solution = ['forward', 'right', 'forward', 'forward', 'left', 'forward', 'forward', 'forward'];
  await addAccessibleCommands(page, solution);
  assert(await page.locator('.program-block').count() === solution.length, 'L4: program command count mismatch');
  await page.locator('#run-btn').click(); await page.locator('#success-overlay.visible').waitFor({ timeout: 25_000 });
  assert((await page.locator('#success-program-summary').textContent() || '').includes('8 instrucciones'), 'L4: final program was not recorded');
  await closeLevel();
}

async function level5() {
  const page = await openLevel(5);
  assert(await page.locator('#repeat-palette').isHidden(), 'L5: REPETIR must start locked');
  const firstSolution = ['left','forward','forward','forward','forward','forward','forward','right','forward','forward','forward','forward','forward','forward'];
  await addLegacyCommandsByDoubleClick(page, firstSolution);
  assert(await page.locator('.program-block').count() === firstSolution.length, 'L5: discovery program not built');
  await page.locator('#run-btn').click();
  await page.locator('#repeat-palette').waitFor({ state: 'visible', timeout: 30_000 });
  await page.locator('#repeat-palette.apulab-repeat-focus').waitFor({ state: 'visible', timeout: 5_000 });
  assert(await page.locator('#apulab-repeat-arrow').isVisible(), 'L5: REPETIR thick pink arrow missing after the traditional route');
  await page.locator('#clear-btn').click();
  await page.locator('.command-block[data-command="left"]').dblclick();
  await page.locator('#repeat-palette').dblclick();
  await page.waitForFunction(() => !document.getElementById('repeat-palette')?.classList.contains('apulab-repeat-focus'));
  assert(await page.locator('#apulab-repeat-arrow').count() === 0, 'L5: REPETIR attention did not clear on first interaction');
  await pointerDrag(page, page.locator('.command-block[data-command="forward"]'), page.locator('.repeat-body[data-repeat-body="1"]'));
  for (let i = 0; i < 4; i += 1) await page.locator('[data-count="1:1"]').click();
  await page.locator('.command-block[data-command="right"]').dblclick();
  await page.locator('#repeat-palette').dblclick();
  await pointerDrag(page, page.locator('.command-block[data-command="forward"]'), page.locator('.repeat-body[data-repeat-body="3"]'));
  for (let i = 0; i < 4; i += 1) await page.locator('[data-count="3:1"]').click();
  assert(await page.locator('.repeat-card').count() === 2, 'L5: compressed program needs two REPETIR blocks');
  assert(await page.locator('.nested-chip').count() === 2, 'L5: REPETIR bodies were not populated through pointer drag');
  await page.locator('#run-btn').click(); await page.locator('#success-overlay.visible').waitFor({ timeout: 30_000 });
  const stale = await page.evaluate(() => typeof window.startSequenceStage !== 'undefined' || !!document.querySelector('#sequence-overlay,#sequence-btn,#sequence-close'));
  assert(!stale, 'L5: stale third-phase runtime returned');
  await page.evaluate(() => { window.__e2eTransitions = []; window.addEventListener('message', (event) => { if (event.data?.type === 'apulab-level-complete') window.__e2eTransitions.push(event.data); }); });
  await page.locator('#continue-btn').click(); await page.waitForFunction(() => window.__e2eTransitions?.some((x) => x.level === 5 && x.nextLevel === 6));
  await closeLevel();
}

async function level6() {
  const page = await openLevel(6);
  assert(await page.locator('#repeat-palette').isVisible(), 'L6: REPETIR must be available from the start');
  assert(await page.locator('#program-list .program-row').count() === 30, 'L6: N5 30-row program editor was not preserved');
  assert(await page.locator('.board-labels-top > *').count() === 8, 'L6: A-H board coordinates missing');
  assert(await page.locator('.board-labels-left > *').count() === 8, 'L6: 1-8 board coordinates missing');
  await page.locator('#repeat-palette').dblclick();
  await pointerDrag(page, page.locator('.command-block[data-command="forward"]'), page.locator('.repeat-body[data-repeat-body="0"]'));
  await page.locator('[data-count="0:1"]').click(); await page.locator('[data-count="0:1"]').click();
  await page.locator('.command-block[data-command="scan"]').dblclick();
  await page.locator('.command-block[data-command="analyze"]').dblclick();
  await page.locator('.command-block[data-command="send"]').dblclick();
  assert(await page.locator('.repeat-card').count() === 1, 'L6: REPETIR was not created in N5 editor');
  assert(await page.locator('.nested-chip').count() === 1, 'L6: AVANZAR was not nested in REPETIR');
  assert((await page.locator('.repeat-card .repeat-count').textContent() || '').includes('4'), 'L6: REPETIR should be ×4');
  assert(await page.locator('.program-block.block-scan').count() === 1, 'L6: ESCANEAR was not added to program');
  assert(await page.locator('.program-block.block-analyze').count() === 1, 'L6: ANALIZAR was not added to program');
  assert(await page.locator('.program-block.block-send').count() === 1, 'L6: ENVIAR DATOS was not added to program');
  await page.locator('#run-btn').click(); await page.locator('#success-overlay.visible').waitFor({ timeout: 30_000 });
  const science = await page.locator('#success-data').textContent() || '';
  assert(science.includes('Escaneo completado'), 'L6: scientific result missing scan');
  assert(science.includes('Análisis completado'), 'L6: scientific result missing analysis');
  assert(science.includes('Datos enviados'), 'L6: scientific result missing transmission');
  await page.evaluate(() => { window.__e2eTransitions = []; window.addEventListener('message', (event) => { if (event.data?.type === 'apulab-level-complete') window.__e2eTransitions.push(event.data); }); });
  await page.locator('#continue-btn').click(); await page.waitForFunction(() => window.__e2eTransitions?.some((x) => x.level === 6 && x.nextLevel === 7));
  await closeLevel();
}

async function equipSensor(page, id) {
  await page.locator(`.sensor-option[data-sensor="${id}"]`).click();
  await page.locator('#equip-sensor-btn').click();
  await page.locator('#sensor-overlay').waitFor({ state: 'hidden' });
}

async function level7() {
  const page = await openLevel(7);
  assert(await page.locator('#sensor-overlay.visible').isVisible(), 'L7: sensor selection must appear before programming');
  assert(await page.locator('.sensor-option').count() === 3, 'L7: exactly three sensor options are required');
  assert(await page.locator('#repeat-palette').isVisible(), 'L7: REPETIR must remain available from the start');
  assert(await page.locator('#program-list .program-row').count() === 30, 'L7: canonical 30-row program editor missing');
  assert(await page.locator('.board-labels-top > *').count() === 8, 'L7: A-H board coordinates missing');
  assert(await page.locator('.board-labels-left > *').count() === 8, 'L7: 1-8 board coordinates missing');
  assert(await page.locator('.command-block[data-command="analyzeSample"]').isVisible(), 'L7: ANALIZAR MUESTRA missing');
  assert(await page.locator('.command-block[data-command="read"]').count() === 0, 'L7: legacy LEER SENSOR returned');
  assert(await page.locator('.command-block[data-command="record"]').count() === 0, 'L7: legacy REGISTRAR DATO returned');
  assert(await page.locator('.command-block[data-command="send"]').count() === 0, 'L7: legacy ENVIAR DATOS returned');

  await equipSensor(page, 'temperature');
  const route = ['forward','forward','forward','forward','right','forward','forward','forward','forward','analyzeSample'];
  await addAccessibleCommands(page, route);
  const programCount = await page.locator('.program-block').count();
  assert(programCount === route.length, 'L7: route to the unknown sample was not built');
  await page.locator('#run-btn').click();
  await page.locator('#analysis-overlay.visible').waitFor({ timeout: 30_000 });
  assert((await page.locator('#analysis-result').textContent() || '').includes('-58 °C'), 'L7: temperature sensor did not return a real reading');
  await page.locator('#change-sensor-btn').click();
  assert(await page.locator('.program-block').count() === programCount, 'L7: changing sensor erased the program');

  await equipSensor(page, 'proximity');
  await page.locator('#run-btn').click();
  await page.locator('#analysis-overlay.visible').waitFor({ timeout: 30_000 });
  assert((await page.locator('#analysis-result').textContent() || '').includes('DISTANCIA: 0.4 m'), 'L7: proximity sensor did not return a real reading');
  await page.locator('#change-sensor-btn').click();
  assert(await page.locator('.program-block').count() === programCount, 'L7: second sensor change erased the program');

  await equipSensor(page, 'mineral');
  await page.locator('#run-btn').click();
  await page.locator('#analysis-overlay.visible').waitFor({ timeout: 30_000 });
  const mineral = await page.locator('#analysis-result').textContent() || '';
  assert(mineral.includes('Hierro') && mineral.includes('DETECTADO'), 'L7: mineral analysis missing iron result');
  assert(mineral.includes('Silicatos') && mineral.includes('DETECTADOS'), 'L7: mineral analysis missing silicate result');
  assert(mineral.includes('Firma mineral') && mineral.includes('COMPATIBLE'), 'L7: mineral signature missing');
  await page.locator('#close-analysis-btn').click();
  await page.locator('#success-overlay.visible').waitFor({ timeout: 10_000 });
  assert((await page.locator('#continue-btn').textContent() || '').includes('FINALIZAR'), 'L7: terminal action must not point to a fake level 8');
  await page.locator('#continue-btn').click();
  assert((await page.locator('#continue-btn').textContent() || '').includes('MISIÓN COMPLETADA'), 'L7: terminal mission state was not confirmed');
  await closeLevel();
}

(async () => {
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: 1672, height: 941 }, reducedMotion: 'reduce' });
  await context.addInitScript(() => { try { localStorage.setItem('apulab.settings.sfx', 'off'); } catch (_) {} });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  await level3(); await level4(); await level5(); await level6(); await level7();
  assert(runtimeErrors.length === 0, `runtime errors detected:\n${runtimeErrors.join('\n')}`);
  await context.tracing.stop(); await browser.close();
  console.log('[e2e] Mission 01 gameplay OK · N3 real · N4 real · N5 route→REPETIR · N6 science · N7 unknown sample + 3 functional sensors');
})().catch(async (error) => { console.error(error); await saveEvidence(error); try { await browser?.close(); } catch (_) {} process.exitCode = 1; });
