const { chromium } = require('playwright');
const { mkdir, writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');

const BASE_URL = process.env.APULAB_BASE_URL || 'http://127.0.0.1:4173';
const OUT = resolve(process.cwd(), 'test-results/level67-shell');
const errors = [];
let browser;
let context;
let page;

const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function evidence(name) {
  await mkdir(OUT, { recursive: true });
  await page.screenshot({ path: resolve(OUT, `${name}.png`), fullPage: true });
}

async function open(level) {
  if (page) await page.close();
  page = await context.newPage();
  page.on('pageerror', (error) => errors.push(`L${level} pageerror: ${error.stack || error}`));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`L${level} console.error: ${msg.text()}`); });
  await page.goto(`${BASE_URL}/missions/mission01/level${level}.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('#board-canvas').waitFor({ state: 'attached', timeout: 10_000 });
  await page.waitForFunction(() => document.documentElement.dataset.apulabSceneReady === 'true', null, { timeout: 10_000 });
  await page.locator('.board-wrap.scene-ready').waitFor({ state: 'visible', timeout: 10_000 });
}

async function assertShell(level) {
  const metrics = await page.evaluate(() => {
    const main = document.querySelector('.main');
    const title = document.querySelector('.title');
    const command = document.querySelector('.command');
    const sim = document.querySelector('.simulator');
    const editor = document.querySelector('.editor');
    const canvas = document.querySelector('#board-canvas');
    const loading = document.querySelector('.board-loading');
    return {
      grid: getComputedStyle(main).gridTemplateColumns,
      titleSize: parseFloat(getComputedStyle(title).fontSize),
      commandHeight: command.getBoundingClientRect().height,
      commandDraggable: command.draggable,
      simWidth: sim.getBoundingClientRect().width,
      editorWidth: editor.getBoundingClientRect().width,
      canvasCount: document.querySelectorAll('canvas#board-canvas').length,
      canvasOpacity: parseFloat(getComputedStyle(canvas).opacity),
      loadingDisplay: getComputedStyle(loading).display,
      sceneReady: document.documentElement.dataset.apulabSceneReady,
    };
  });
  assert(metrics.grid.includes('990px') && metrics.grid.includes('614px'), `L${level}: shell is not the approved 2-column grid (${metrics.grid})`);
  assert(metrics.titleSize >= 26, `L${level}: level title is too small (${metrics.titleSize}px)`);
  assert(metrics.commandHeight >= 40, `L${level}: command targets are too small (${metrics.commandHeight}px)`);
  assert(metrics.commandDraggable, `L${level}: command palette lost drag-and-drop support`);
  assert(metrics.simWidth > metrics.editorWidth, `L${level}: simulator/editor hierarchy is reversed`);
  assert(metrics.canvasCount === 1, `L${level}: expected one board canvas`);
  assert(metrics.sceneReady === 'true', `L${level}: Three.js first-frame readiness marker missing`);
  assert(metrics.canvasOpacity >= 0.99, `L${level}: board canvas is not fully visible after scene-ready (${metrics.canvasOpacity})`);
  assert(metrics.loadingDisplay === 'none', `L${level}: loading cover remained after first Three.js frame`);
  assert(await page.locator('.sim-title').textContent() === 'SIMULADOR 8 × 8', `L${level}: simulator title mismatch`);
  assert(await page.locator('.editor-head h2').textContent() === 'EDITOR DE MOVIMIENTO', `L${level}: editor title mismatch`);
}

async function assertOverlayOwnership(level) {
  await page.locator('#guide-btn').click();
  await page.locator('#info-panel.visible').waitFor();
  assert(await page.locator('#journal-overlay.visible').count() === 0, `L${level}: journal leaked under guide`);
  await evidence(`level${level}-guide`);

  await page.locator('#journal-btn').click();
  await page.locator('#journal-overlay.visible').waitFor();
  assert(await page.locator('#info-panel.visible').count() === 0, `L${level}: guide remained behind journal`);
  assert(await page.locator('.overlay.visible').count() === 1, `L${level}: multiple overlays are visible`);
  await evidence(`level${level}-journal`);
  await page.locator('#journal-close').click();
}

(async () => {
  await mkdir(OUT, { recursive: true });
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: 1672, height: 941 }, reducedMotion: 'reduce' });

  // N6 now has its own stricter N5-parity gate. This test keeps N7's existing shell stable.
  await open(7);
  await assertShell(7);
  assert(await page.locator('.command[data-command="read"]').isVisible(), 'L7: LEER SENSOR missing');
  assert(await page.locator('.command[data-command="record"]').isVisible(), 'L7: REGISTRAR DATO missing');
  await evidence('level7-initial');
  await assertOverlayOwnership(7);

  assert(errors.length === 0, `runtime errors detected:\n${errors.join('\n')}`);
  await writeFile(resolve(OUT, 'runtime.log'), 'Level 7 shell browser audit OK\n', 'utf8');
  await browser.close();
  console.log('[e2e] Level 7 shell OK · current sensor shell preserved; N6 validated separately against N5');
})().catch(async (error) => {
  console.error(error);
  await mkdir(OUT, { recursive: true });
  await writeFile(resolve(OUT, 'runtime.log'), `${String(error?.stack || error)}\n\n${errors.join('\n')}\n`, 'utf8');
  try { if (page) await page.screenshot({ path: resolve(OUT, 'failure.png'), fullPage: true }); } catch (_) {}
  try { await browser?.close(); } catch (_) {}
  process.exitCode = 1;
});
