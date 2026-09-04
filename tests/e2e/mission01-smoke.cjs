const { chromium } = require('playwright');

const BASE_URL = process.env.APULAB_BASE_URL || 'http://127.0.0.1:4173';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1672, height: 941 } });
  const consoleErrors = [];
  const pageErrors = [];
  const forbiddenRequests = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err.stack || err)));
  page.on('request', (req) => {
    const url = req.url();
    if (/esm\.sh\/three|cdn\.jsdelivr\.net\/npm\/three/.test(url)) forbiddenRequests.push(url);
  });

  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'INICIAR MISIÓN' }).click();
  await page.getByRole('button', { name: 'MODO DEMO' }).click();
  await page.getByRole('button', { name: 'OMITIR INTRO' }).click();

  const missionFrame = page.locator('iframe.mission01-frame');
  await missionFrame.waitFor({ state: 'visible' });

  async function waitForLevel(level) {
    await page.waitForFunction((n) => {
      const frame = document.querySelector('iframe.mission01-frame');
      if (!frame?.contentWindow) return false;
      try { return frame.contentWindow.location.pathname.endsWith(`/missions/mission01/level${n}.html`); }
      catch { return false; }
    }, level);
    const frames = page.locator('iframe.mission01-frame');
    assert(await frames.count() === 1, `expected exactly one mission iframe at level ${level}`);
  }

  async function inspectLevel(level) {
    await waitForLevel(level);
    const frame = page.frames().find((f) => f.url().endsWith(`/missions/mission01/level${level}.html`));
    assert(frame, `missing frame for level ${level}`);

    const runtime = await frame.evaluate(() => ({
      hasCanvas: !!document.querySelector('canvas'),
      webgl: !!document.querySelector('canvas')?.getContext('webgl2') || !!document.querySelector('canvas')?.getContext('webgl'),
      poppins: document.fonts?.check?.('16px Poppins') ?? true,
    }));
    assert(runtime.hasCanvas, `level ${level}: canvas missing`);
    assert(runtime.webgl, `level ${level}: WebGL unavailable`);
    assert(runtime.poppins, `level ${level}: Poppins unavailable`);

    const explore = frame.getByRole('button', { name: /EXPLORAR/ }).first();
    if (await explore.count()) {
      await explore.click();
      const close = frame.locator('#info-close, .info-close').first();
      if (await close.count()) await close.click();
    }

    const guide = frame.getByRole('button', { name: /GUÍA/ }).first();
    if (await guide.count()) {
      await guide.click();
      const close = frame.locator('#info-close, .info-close').first();
      if (await close.count()) await close.click();
    }

    if (level === 5) {
      const run = frame.locator('#run-btn');
      assert(await run.count() === 1, 'level 5: INICIAR PRUEBA missing');
      await run.click();
      await page.waitForTimeout(150);
      const stale = await frame.evaluate(() => typeof window.startSequenceStage !== 'undefined' || !!document.querySelector('#sequence-overlay,#sequence-btn,#sequence-close'));
      assert(!stale, 'level 5: stale third phase runtime detected');
    }

    return frame;
  }

  for (let level = 1; level <= 7; level += 1) {
    const frame = await inspectLevel(level);
    if (level < 7) {
      await frame.evaluate((current) => {
        parent.postMessage({ type: 'apulab-level-complete', level: current, nextLevel: current + 1 }, location.origin);
      }, level);
    }
  }

  assert(forbiddenRequests.length === 0, `external Three.js requests detected:\n${forbiddenRequests.join('\n')}`);
  assert(pageErrors.length === 0, `page errors detected:\n${pageErrors.join('\n')}`);
  assert(consoleErrors.length === 0, `console errors detected:\n${consoleErrors.join('\n')}`);

  await browser.close();
  console.log('[e2e] Mission 01 browser smoke OK · menu → demo → intro skip → N1→N7 · WebGL/Poppins/runtime clean');
})().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});
