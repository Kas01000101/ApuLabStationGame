const { chromium } = require('playwright');

const BASE_URL = process.env.APULAB_BASE_URL || 'http://127.0.0.1:4173';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1672, height: 941 } });

  // Este contrato valida exclusivamente el runtime de audio. Las fuentes remotas
  // no deben poder convertirlo en una prueba de red ni dejar el job esperando.
  await context.route(/https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)\//, (route) => route.abort());

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
    page.setDefaultTimeout(5_000);
    page.setDefaultNavigationTimeout(8_000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error.stack || error)));

    await page.goto(`${BASE_URL}/missions/mission01/level${level}.html`, {
      waitUntil: 'domcontentloaded',
      timeout: 8_000,
    });
    await page.locator('canvas').first().waitFor({ state: 'visible', timeout: 8_000 });

    // Dispara por DOM las rutas de feedback históricas sin esperar estados
    // visuales/overlays que no forman parte del contrato de SFX.
    if (level === 1 || level === 2) {
      await page.evaluate(() => {
        document.querySelector('#kawsay-explanation')?.click();
        document.querySelector('#kawsay-guide')?.click();
      });
    }
    if (level >= 3 && level <= 5) {
      await page.evaluate(() => document.querySelector('#run-btn')?.click());
    }

    await page.waitForTimeout(120);
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
