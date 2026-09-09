const { chromium } = require('playwright');
const { mkdir, writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');

const BASE_URL = process.env.APULAB_BASE_URL || 'http://127.0.0.1:4173';
const OUT = resolve(process.cwd(), 'test-results/level7-completion-handoff');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function addCommands(page, sequence) {
  for (const command of sequence) {
    const block = page.locator(`.command-block[data-command="${command}"]`);
    await block.focus();
    await block.press('Enter');
  }
}

async function openLevel(context) {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/missions/mission01/level7.html`, { waitUntil: 'networkidle' });
  await page.locator('#board-canvas').waitFor({ state: 'visible', timeout: 12_000 });
  await page.locator('#program-list').waitFor({ state: 'visible', timeout: 12_000 });
  return page;
}

async function handoffMessages(page) {
  return page.evaluate(() => Array.isArray(window.__apulabLevelCompleteMessages)
    ? window.__apulabLevelCompleteMessages
    : []);
}

(async () => {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1672, height: 941 }, reducedMotion: 'reduce' });

  await context.addInitScript(() => {
    window.__apulabLevelCompleteMessages = [];
    window.addEventListener('message', (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'apulab-level-complete') return;
      window.__apulabLevelCompleteMessages.push(event.data);
    });
    try { localStorage.setItem('apulab.settings.sfx', 'off'); } catch (_) {}
  });

  try {
    // Negative contract: physically reaching the final cell without the relevant
    // scientific datum must not complete N7 or emit a parent lifecycle handoff.
    let page = await openLevel(context);
    const finalRouteWithoutScience = [
      'forward','forward','forward','forward','right',
      'forward','forward','forward','forward',
      'forward','right','forward','forward','forward',
    ];
    await addCommands(page, finalRouteWithoutScience);
    await page.locator('#run-btn').click();
    await page.waitForFunction(() => !document.getElementById('run-btn')?.disabled, null, { timeout: 30_000 });
    const negativeState = await page.evaluate(() => window.apulabLevel7QA?.getState?.());
    assert(negativeState?.atFinal === true, 'N7 negative test did not physically reach final point');
    assert(negativeState?.relevantInstrumentUsed === false, 'N7 negative test unexpectedly obtained relevant science datum');
    assert(!await page.locator('#success-overlay').isVisible(), 'N7 completed without relevant scientific datum');
    assert((await handoffMessages(page)).length === 0, 'N7 emitted completion handoff before scientific requirement was met');
    await page.close();

    // Positive contract: complete the scientific decision and finish physically
    // at the final point. The iframe must emit exactly one level-7 completion
    // message and must never route to an eighth level.
    page = await openLevel(context);
    const validRoute = [
      'forward','forward','forward','forward','right',
      'forward','forward','forward','forward','analyzeSample',
      'forward','right','forward','forward','forward',
    ];
    await addCommands(page, validRoute);
    await page.locator('#run-btn').click();
    await page.locator('#sensor-overlay.visible').waitFor({ timeout: 25_000 });

    const materials = page.locator('.instrument-option[data-instrument="materials"]');
    await materials.focus();
    await materials.press('Enter');
    await page.locator('#analysis-overlay.visible').waitFor({ timeout: 5_000 });
    const continueButton = page.locator('#continue-analysis-btn');
    await continueButton.focus();
    await continueButton.press('Enter');

    await page.locator('#success-overlay.visible').waitFor({ timeout: 30_000 });
    await page.waitForFunction(() => (window.__apulabLevelCompleteMessages || []).length === 1, null, { timeout: 5_000 });

    const positiveState = await page.evaluate(() => window.apulabLevel7QA?.getState?.());
    assert(positiveState?.relevantInstrumentUsed === true, 'N7 positive test did not preserve relevant instrument state');
    assert(positiveState?.atFinal === true, 'N7 positive test did not finish at final point');
    assert(positiveState?.finalCheckpointReached === true, 'N7 positive test did not mark final checkpoint reached');

    let messages = await handoffMessages(page);
    assert(messages.length === 1, `expected exactly one completion handoff, got ${messages.length}`);
    assert(messages[0]?.level === 7, `completion handoff level mismatch: ${JSON.stringify(messages[0])}`);
    assert(messages[0]?.nextLevel === undefined, 'N7 completion handoff attempted to route to N8');

    const telemetry = await page.evaluate(() => JSON.parse(sessionStorage.getItem('apulab.level7.telemetry') || '[]'));
    const finalPointIndex = telemetry.findIndex((event) => event.event === 'final_point_reached');
    const localCompletionIndex = telemetry.findIndex((event) => event.event === 'level_completed');
    assert(finalPointIndex >= 0, 'N7 telemetry missing final_point_reached');
    assert(localCompletionIndex > finalPointIndex, 'N7 local completion diagnostic did not follow final_point_reached');

    // The visual terminal CTA is not the lifecycle owner. Clicking it after the
    // handoff must not emit another completion event.
    await page.locator('#continue-btn').click();
    await page.waitForTimeout(250);
    messages = await handoffMessages(page);
    assert(messages.length === 1, `terminal CTA duplicated completion handoff: ${messages.length}`);
    assert(!page.url().includes('level8'), 'N7 navigated to level8');

    await page.screenshot({ path: resolve(OUT, 'n7-completed.png'), fullPage: true });
    await writeFile(resolve(OUT, 'handoff.json'), JSON.stringify({ messages, positiveState }, null, 2), 'utf8');
    await browser.close();
    console.log('[e2e] N7 COMPLETION HANDOFF OK · science gate · final point · one parent handoff · no N8');
  } catch (error) {
    await writeFile(resolve(OUT, 'runtime.log'), `${String(error?.stack || error)}\n`, 'utf8');
    try { await browser.close(); } catch (_) {}
    throw error;
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
