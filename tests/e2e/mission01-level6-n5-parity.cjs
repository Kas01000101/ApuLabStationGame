const { chromium } = require('playwright');
const { mkdir, writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');

const BASE_URL = process.env.APULAB_BASE_URL || 'http://127.0.0.1:4173';
const OUT = resolve(process.cwd(), 'test-results/level6-n5-parity');
const errors = [];
let browser;
let context;
let page;

const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function open(level) {
  if (page) await page.close();
  page = await context.newPage();
  page.on('pageerror', (error) => errors.push(`L${level} pageerror: ${error.stack || error}`));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`L${level} console.error: ${msg.text()}`); });
  await page.goto(`${BASE_URL}/missions/mission01/level${level}.html`, { waitUntil: 'networkidle' });
  await page.locator('#board-canvas').waitFor({ state: 'visible', timeout: 12_000 });
  await page.locator('#program-list').waitFor({ state: 'visible', timeout: 12_000 });
  await page.waitForTimeout(250);
}

async function metrics() {
  return page.evaluate(() => {
    const R = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom };
    };
    const stage = document.querySelector('#stage');
    return {
      header: R('.header'),
      main: R('.main'),
      simulator: R('#board-shell'),
      editor: R('.editor'),
      editorFooter: R('.editor-footer'),
      canvas: R('#board-canvas'),
      palette: R('.palette'),
      workspace: R('.workspace'),
      program: R('#program-list'),
      science: {
        scan: R('.command-block[data-command="scan"]'),
        analyze: R('.command-block[data-command="analyze"]'),
        send: R('.command-block[data-command="send"]'),
      },
      stage: R('#stage'),
      stageLogicalWidth: stage?.style.width || getComputedStyle(stage).width,
      stageLogicalHeight: stage?.style.height || getComputedStyle(stage).height,
      columns: getComputedStyle(document.querySelector('.main')).gridTemplateColumns,
      rows: document.querySelectorAll('#program-list .program-row').length,
      topLabels: document.querySelectorAll('.board-labels-top > *').length,
      leftLabels: document.querySelectorAll('.board-labels-left > *').length,
      canvasWidth: document.querySelector('#board-canvas')?.getAttribute('width'),
      canvasHeight: document.querySelector('#board-canvas')?.getAttribute('height'),
      scroll: !!document.querySelector('#program-scroll'),
      scrollUp: !!document.querySelector('#program-scroll-up'),
      scrollDown: !!document.querySelector('#program-scroll-down'),
    };
  });
}

function compareRect(name, a, b, tolerance = 2) {
  assert(a && b, `${name}: missing geometry`);
  for (const key of ['x','y','width','height']) {
    const delta = Math.abs(a[key] - b[key]);
    assert(delta <= tolerance, `${name}.${key}: N5=${a[key]} N6=${b[key]} delta=${delta}px > ${tolerance}px`);
  }
}

function assertInside(name, child, parent, tolerance = 2) {
  assert(child && parent, `${name}: missing geometry`);
  assert(child.x >= parent.x - tolerance, `${name}: left edge escaped palette (${child.x} < ${parent.x})`);
  assert(child.right <= parent.right + tolerance, `${name}: right edge escaped palette (${child.right} > ${parent.right})`);
  assert(child.y >= parent.y - tolerance, `${name}: top edge escaped palette (${child.y} < ${parent.y})`);
  assert(child.bottom <= parent.bottom + tolerance, `${name}: bottom edge escaped palette (${child.bottom} > ${parent.bottom})`);
}

async function screenshot(name) {
  await mkdir(OUT, { recursive: true });
  await page.screenshot({ path: resolve(OUT, `${name}.png`), fullPage: true });
}

(async () => {
  await mkdir(OUT, { recursive: true });
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: 1672, height: 941 }, reducedMotion: 'reduce' });
  await context.addInitScript(() => { try { localStorage.setItem('apulab.settings.sfx', 'off'); } catch (_) {} });

  await open(5);
  const n5 = await metrics();
  await screenshot('n5-reference');
  assert(n5.rows === 30, `N5 reference lost 30 program rows (${n5.rows})`);
  assert(n5.canvasWidth === '950' && n5.canvasHeight === '664', `N5 reference canvas changed (${n5.canvasWidth}×${n5.canvasHeight})`);

  await open(6);
  const n6 = await metrics();
  await screenshot('n6-initial');

  for (const name of ['header','main','simulator','editor','editorFooter','canvas','palette','workspace','program']) {
    compareRect(name, n5[name], n6[name], 2);
  }
  assert(n6.stage && Math.abs(n6.stage.width - 1672) <= 2 && Math.abs(n6.stage.height - 941) <= 2,
    `L6: rendered stage is not 1672×941 (${n6.stage?.width}×${n6.stage?.height})`);
  assert(n6.rows === 30, `L6: MI PROGRAMA must preserve 30 rows (${n6.rows})`);
  assert(n6.topLabels === 8, `L6: A–H coordinate labels missing (${n6.topLabels})`);
  assert(n6.leftLabels === 8, `L6: 1–8 coordinate labels missing (${n6.leftLabels})`);
  assert(n6.canvasWidth === '950' && n6.canvasHeight === '664', `L6: board canvas must remain 950×664 (${n6.canvasWidth}×${n6.canvasHeight})`);
  assert(n6.scroll && n6.scrollUp && n6.scrollDown, 'L6: custom N5 program scrollbar was not preserved');
  assert(await page.locator('#repeat-palette').isVisible(), 'L6: REPETIR must be available from the start');
  assert(await page.locator('.command-block[data-command="scan"]').isVisible(), 'L6: ESCANEAR missing from N5 palette');
  assert(await page.locator('.command-block[data-command="analyze"]').isVisible(), 'L6: ANALIZAR missing from N5 palette');
  assert(await page.locator('.command-block[data-command="send"]').isVisible(), 'L6: ENVIAR DATOS missing from N5 palette');
  for (const [name, scienceRect] of Object.entries(n6.science)) assertInside(`science.${name}`, scienceRect, n6.palette, 2);
  assert(n6.palette.bottom <= n6.editorFooter.y + 2,
    `L6: command palette overlaps editor footer (${n6.palette.bottom} > ${n6.editorFooter.y})`);
  assert(n6.science.send.bottom <= n6.editorFooter.y + 2,
    `L6: ENVIAR DATOS overlaps editor footer (${n6.science.send.bottom} > ${n6.editorFooter.y})`);
  assert(await page.locator('.panel.simulator,.panel.editor,.board-wrap').count() === 0, 'L6: parallel N6/N7 shell returned');
  assert(await page.locator('#apulab-repeat-arrow,.apulab-repeat-focus').count() === 0, 'L6: N5 REPETIR tutorial attention leaked into N6');

  // Overlay ownership: Bitácora must replace GUÍA rather than stack over it.
  await page.locator('#guide-btn').click();
  await page.locator('#info-panel.visible').waitFor({ timeout: 5_000 });
  await page.locator('#journal-btn').click();
  await page.locator('#journal-overlay.visible').waitFor({ timeout: 5_000 });
  assert(await page.locator('#info-panel.visible').count() === 0, 'L6: GUÍA remained visible behind BITÁCORA');
  await screenshot('n6-journal');

  assert(errors.length === 0, `runtime errors detected:\n${errors.join('\n')}`);
  await writeFile(resolve(OUT, 'metrics.json'), JSON.stringify({ n5, n6 }, null, 2), 'utf8');
  await browser.close();
  console.log('[e2e] N5→N6 PARITY OK · 1672×941 · same geometry/footer · science contained · 950×664 board · 30 rows');
})().catch(async (error) => {
  console.error(error);
  await mkdir(OUT, { recursive: true });
  await writeFile(resolve(OUT, 'runtime.log'), `${String(error?.stack || error)}\n\n${errors.join('\n')}\n`, 'utf8');
  try { if (page) await page.screenshot({ path: resolve(OUT, 'failure.png'), fullPage: true }); } catch (_) {}
  try { await browser?.close(); } catch (_) {}
  process.exitCode = 1;
});
