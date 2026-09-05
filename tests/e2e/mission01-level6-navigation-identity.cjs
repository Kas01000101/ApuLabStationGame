const { chromium } = require('playwright');

const BASE_URL = process.env.APULAB_BASE_URL || 'http://127.0.0.1:4173';
const assert = (condition, message) => { if (!condition) throw new Error(message); };

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1672, height: 941 }, reducedMotion: 'reduce' });
  await context.addInitScript(() => {
    window.__level6Messages = [];
    window.addEventListener('message', (event) => {
      if (event.data?.type?.startsWith?.('apulab-')) window.__level6Messages.push(event.data);
    });
    try { localStorage.setItem('apulab.settings.sfx', 'off'); } catch (_) {}
  });

  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error?.stack || error)));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });

  await page.goto(`${BASE_URL}/missions/mission01/level6.html`, { waitUntil: 'networkidle' });
  await page.locator('#board-canvas').waitFor({ state: 'visible', timeout: 12_000 });
  await page.waitForFunction(() => window.__level6Messages?.some((x) => x.type === 'apulab-level-ready'));

  const rootLevel = await page.evaluate(() => document.documentElement.dataset.apulabLevel);
  assert(rootLevel === '6', `L6: root data-apulab-level must be 6, got ${rootLevel}`);

  const ready = await page.evaluate(() => window.__level6Messages.find((x) => x.type === 'apulab-level-ready'));
  assert(ready?.level === 6, `L6: ready message must identify level 6, got ${JSON.stringify(ready)}`);

  await page.evaluate(() => {
    window.__bridgeCalls = [];
    window.apulabCompleteLevel = (level, nextLevel) => window.__bridgeCalls.push({ level, nextLevel });
    document.getElementById('success-overlay')?.classList.add('visible');
  });
  await page.locator('#continue-btn').click();
  const direct = await page.evaluate(() => window.__bridgeCalls);
  assert(direct.length === 1 && direct[0].level === 6 && direct[0].nextLevel === 7,
    `L6: direct bridge must be 6→7, got ${JSON.stringify(direct)}`);

  await page.evaluate(() => {
    delete window.apulabCompleteLevel;
    window.__level6Messages = [];
  });
  await page.locator('#continue-btn').click();
  await page.waitForFunction(() => window.__level6Messages?.some((x) => x.type === 'apulab-level-complete'));
  const fallback = await page.evaluate(() => window.__level6Messages.find((x) => x.type === 'apulab-level-complete'));
  assert(fallback?.level === 6 && fallback?.nextLevel === 7,
    `L6: fallback postMessage must be 6→7, got ${JSON.stringify(fallback)}`);

  assert(errors.length === 0, `L6 runtime errors:\n${errors.join('\n')}`);
  await browser.close();
  console.log('[e2e] Level 6 identity OK · root/ready=6 · direct bridge 6→7 · fallback postMessage 6→7');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
