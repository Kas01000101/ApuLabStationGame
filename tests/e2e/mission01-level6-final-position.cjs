const { chromium } = require('playwright');

const BASE_URL = process.env.APULAB_BASE_URL || 'http://127.0.0.1:4173';
const assert = (condition, message) => { if (!condition) throw new Error(message); };

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1672, height: 941 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on('pageerror', (error) => runtimeErrors.push(String(error.stack || error)));
  page.on('console', (msg) => { if (msg.type() === 'error') runtimeErrors.push(msg.text()); });

  await page.goto(`${BASE_URL}/missions/mission01/level6.html`, { waitUntil: 'networkidle' });
  await page.locator('#board-canvas').waitFor({ state: 'visible', timeout: 10_000 });
  await page.waitForFunction(() => !!window.apulabLevel6QA);

  const sequence = ['forward','forward','forward','scan','analyze','left','forward','forward','forward','send','forward'];
  for (const command of sequence) {
    const block = page.locator(`.command-block[data-command="${command}"]`);
    await block.focus();
    await block.press('Enter');
  }
  assert(await page.locator('.program-block').count() === sequence.length, 'L6 final position: program was not built');

  await page.locator('#run-btn').click();
  await page.waitForFunction(() => (document.getElementById('feedback')?.textContent || '').includes('debe finalizar en el punto de comunicación'), null, { timeout: 30_000 });

  const state = await page.evaluate(() => window.apulabLevel6QA.getState());
  assert(state.hasScanned === true, 'L6 final position: scan state was lost');
  assert(state.hasAnalyzed === true, 'L6 final position: analyze state was lost');
  assert(state.hasSentData === true, 'L6 final position: send state was not recorded');
  assert(state.atCommunicationPoint === false, 'L6 final position: AYNI unexpectedly remained at communication point');
  assert(await page.locator('#success-overlay.visible').count() === 0, 'L6 final position: level completed after AYNI moved away');
  assert(runtimeErrors.length === 0, `L6 final position: runtime errors detected\n${runtimeErrors.join('\n')}`);

  await browser.close();
  console.log('[e2e] Level 6 final-position contract OK · sending then leaving communication point does not complete');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
