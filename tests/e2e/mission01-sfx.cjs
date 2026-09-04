const { chromium } = require('playwright');

const BASE_URL = process.env.APULAB_BASE_URL || 'http://127.0.0.1:4173';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1672, height: 941 } });

  await context.addInitScript(() => {
    try { localStorage.setItem('apulab.settings.sfx', 'off'); } catch (_) {}
    window.__APULAB_E2E_AUDIO_CONTEXTS__ = 0;
    const TrapAudioContext = class {
      constructor() {
        window.__APULAB_E2E_AUDIO_CONTEXTS__ += 1;
        throw new Error('AudioContext constructed while apulab.settings.sfx=off');
      }
    };
    try { Object.defineProperty(window, 'AudioContext', { configurable: true, value: TrapAudioContext }); } catch (_) {}
    try { Object.defineProperty(window, 'webkitAudioContext', { configurable: true, value: TrapAudioContext }); } catch (_) {}
  });

  for (let level = 1; level <= 7; level += 1) {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error.stack || error)));

    // Este contrato valida Web Audio del runtime local. No depende de que
    // Google Fonts u otros recursos visuales externos queden en network-idle.
    await page.goto(`${BASE_URL}/missions/mission01/level${level}.html`, { waitUntil: 'domcontentloaded' });
    await page.locator('canvas').first().waitFor({ state: 'visible', timeout: 10_000 });

    // Dispara rutas de feedback que históricamente crean Web Audio.
    if (level === 1 || level === 2) {
      const explore = page.locator('#kawsay-explanation');
      if (await explore.count()) await explore.click();
      const guide = page.locator('#kawsay-guide');
      if (await guide.count()) await guide.click();
    }
    if (level >= 3 && level <= 5) {
      await page.locator('#run-btn').click();
    }

    await page.waitForTimeout(100);
    const created = await page.evaluate(() => window.__APULAB_E2E_AUDIO_CONTEXTS__ || 0);
    if (created !== 0) throw new Error(`level ${level}: created ${created} AudioContext(s) with SFX off`);
    if (errors.some((x) => x.includes('AudioContext constructed while'))) {
      throw new Error(`level ${level}: SFX off contract reached AudioContext constructor`);
    }
    await page.close();
  }

  await browser.close();
  console.log('[e2e] SFX OFF contract OK · N1–N7 do not construct Web Audio contexts from feedback paths');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
