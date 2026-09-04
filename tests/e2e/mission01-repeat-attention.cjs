const { chromium } = require('playwright');
const { mkdir, writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');

const BASE_URL = process.env.APULAB_BASE_URL || 'http://127.0.0.1:4173';
const EVIDENCE_DIR = resolve(process.cwd(), 'test-results/repeat-attention');
const runtimeErrors = [];
let browser;
let context;
let page;

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

async function saveEvidence(error) {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await writeFile(
    resolve(EVIDENCE_DIR, 'runtime.log'),
    `${String(error?.stack || error)}\n\n${runtimeErrors.join('\n')}\n`,
    'utf8',
  );
  if (page) {
    try { await page.screenshot({ path: resolve(EVIDENCE_DIR, 'failure.png'), fullPage: true }); } catch (_) {}
    try { await writeFile(resolve(EVIDENCE_DIR, 'page.html'), await page.content(), 'utf8'); } catch (_) {}
  }
  if (context) {
    try { await context.tracing.stop({ path: resolve(EVIDENCE_DIR, 'trace.zip') }); } catch (_) {}
  }
}

(async () => {
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: 1672, height: 941 } });
  await context.addInitScript(() => {
    try { localStorage.setItem('apulab.settings.sfx', 'off'); } catch (_) {}
  });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  page = await context.newPage();

  page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.stack || error}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') runtimeErrors.push(`console.error: ${msg.text()}`);
  });

  await page.goto(`${BASE_URL}/missions/mission01/level5.html`, { waitUntil: 'networkidle' });
  await page.locator('canvas').first().waitFor({ state: 'visible', timeout: 10_000 });

  const repeat = page.locator('#repeat-palette');
  assert(await repeat.isHidden(), 'L5: REPETIR must start hidden before the traditional route');

  const firstSolution = [
    'left',
    'forward', 'forward', 'forward', 'forward', 'forward', 'forward',
    'right',
    'forward', 'forward', 'forward', 'forward', 'forward', 'forward',
  ];
  for (const command of firstSolution) {
    await page.locator(`.command-block[data-command="${command}"]`).dblclick();
  }
  assert(await page.locator('.program-block').count() === firstSolution.length, 'L5: traditional long route was not built');

  await page.locator('#run-btn').click();
  await repeat.waitFor({ state: 'visible', timeout: 30_000 });
  await page.locator('#repeat-palette.apulab-repeat-focus').waitFor({ state: 'visible', timeout: 5_000 });
  const arrow = page.locator('#apulab-repeat-arrow');
  await arrow.waitFor({ state: 'visible', timeout: 5_000 });

  const visual = await page.evaluate(() => {
    const palette = document.getElementById('repeat-palette');
    const arrow = document.getElementById('apulab-repeat-arrow');
    const paletteStyle = getComputedStyle(palette);
    const shaft = getComputedStyle(arrow, '::before');
    const head = getComputedStyle(arrow, '::after');
    const p = palette.getBoundingClientRect();
    const a = arrow.getBoundingClientRect();
    return {
      attention: palette.dataset.apulabAttention,
      boxShadow: paletteStyle.boxShadow,
      outlineWidth: parseFloat(paletteStyle.outlineWidth),
      shaftHeight: parseFloat(shaft.height),
      shaftBackground: shaft.backgroundColor,
      headWidth: parseFloat(head.borderRightWidth),
      headColor: head.borderRightColor,
      arrowLeft: a.left,
      paletteRight: p.right,
      verticalDelta: Math.abs((a.top + a.height / 2) - (p.top + p.height / 2)),
    };
  });

  assert(visual.attention === 'repeat-after-discovery', 'L5: REPETIR attention marker missing after first route');
  assert(visual.boxShadow && visual.boxShadow !== 'none', 'L5: REPETIR pink glow is not visible');
  assert(visual.outlineWidth >= 3, `L5: REPETIR halo is too thin (${visual.outlineWidth}px)`);
  assert(visual.shaftHeight >= 10, `L5: pink arrow shaft is too thin (${visual.shaftHeight}px)`);
  assert(visual.headWidth >= 24, `L5: pink arrow head is too thin (${visual.headWidth}px)`);
  assert(/255,\s*99,\s*184/.test(visual.shaftBackground), `L5: arrow shaft is not approved pink (${visual.shaftBackground})`);
  assert(/255,\s*99,\s*184/.test(visual.headColor), `L5: arrow head is not approved pink (${visual.headColor})`);
  assert(visual.arrowLeft >= visual.paletteRight && visual.arrowLeft - visual.paletteRight <= 16, 'L5: arrow is not anchored next to REPETIR');
  assert(visual.verticalDelta <= 3, 'L5: arrow is not vertically centered on REPETIR');

  // La llamada de atención debe desaparecer en la primera interacción real con
  // REPETIR para no competir visualmente con la construcción del programa.
  await repeat.dblclick();
  await page.waitForFunction(() => !document.getElementById('repeat-palette')?.classList.contains('apulab-repeat-focus'));
  assert(await page.locator('#apulab-repeat-arrow').count() === 0, 'L5: pink arrow remained after using REPETIR');
  assert(await page.locator('.repeat-card').count() >= 1, 'L5: REPETIR did not enter the program after interaction');

  assert(runtimeErrors.length === 0, `runtime errors detected:\n${runtimeErrors.join('\n')}`);
  await context.tracing.stop();
  await browser.close();
  console.log('[e2e] Level 5 repeat attention OK · long route → pink glow + thick pink arrow → clears on first REPETIR interaction');
})().catch(async (error) => {
  console.error(error);
  await saveEvidence(error);
  try { await browser?.close(); } catch (_) {}
  process.exitCode = 1;
});
