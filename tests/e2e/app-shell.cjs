const { chromium } = require('playwright');
const { mkdir } = require('node:fs/promises');

const BASE_URL = process.env.APULAB_BASE_URL || 'http://127.0.0.1:4173';
const OUT = 'test-results/app-shell';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

(async () => {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];

  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('Failed to load resource')) {
      errors.push(`console: ${message.text()}`);
    }
  });

  // Las fuentes remotas no son parte del contrato funcional de este gate.
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20_000 });

    const start = page.getByRole('button', { name: 'INICIAR MISIÓN' });
    await start.waitFor({ state: 'visible', timeout: 10_000 });
    assert(await page.locator('#three-root canvas').count() === 0,
      'Menu should not create a Three.js canvas before the user starts a mission');

    await start.click();
    const demo = page.getByRole('button', { name: 'MODO DEMO' });
    await demo.waitFor({ state: 'visible', timeout: 5_000 });
    await demo.click();

    const skip = page.getByRole('button', { name: 'OMITIR INTRO' });
    await skip.waitFor({ state: 'visible', timeout: 20_000 });
    await page.locator('#three-root canvas').waitFor({ state: 'visible', timeout: 10_000 });
    assert(await page.locator('#three-root canvas').count() === 1,
      'Intro should create exactly one Three.js canvas after lazy loading');
    assert((await page.locator('.intro-mission-big').textContent())?.trim() === '1 / 7 · MEDIR',
      'Intro Mission 01 card must use the current 1 / 7 level count');

    await skip.click();

    const missionFrame = page.locator('.mission01-screen iframe').first();
    await missionFrame.waitFor({ state: 'visible', timeout: 15_000 });
    await page.waitForFunction(() => {
      const frame = document.querySelector('.mission01-screen iframe');
      return Boolean(frame && (frame.getAttribute('src') || '').includes('/missions/mission01/level1.html'));
    }, { timeout: 15_000 });

    await page.waitForFunction(() => document.querySelectorAll('#three-root canvas').length === 0,
      { timeout: 10_000 });
    assert(await page.locator('.intro-overlay').count() === 0,
      'Intro overlay should be removed after OMITIR INTRO');

    const child = page.frames().find((frame) => frame.url().includes('/missions/mission01/level1.html'));
    assert(child, 'Mission 01 Level 1 iframe did not load after skipping intro');
    await child.locator('body').waitFor({ state: 'visible', timeout: 10_000 });

    assert(errors.length === 0, `App shell emitted runtime errors:\n${errors.join('\n')}`);
    console.log('[e2e] App shell OK · menu 2D → demo → lazy Three intro → skip → Mission 01 Level 1');
  } catch (error) {
    await page.screenshot({ path: `${OUT}/failure.png`, fullPage: true }).catch(() => {});
    throw error;
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
