const { chromium } = require('playwright');
const { mkdir, writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');

const BASE_URL = process.env.APULAB_BASE_URL || 'http://127.0.0.1:4173';
const OUT = resolve(process.cwd(), 'test-results/level6-n5-parity');
const errors = [];
let browser, context, page;
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function open(level) {
  if (page) await page.close();
  page = await context.newPage();
  page.on('pageerror', (error) => errors.push(`L${level} pageerror: ${error.stack || error}`));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`L${level} console.error: ${msg.text()}`); });
  await page.goto(`${BASE_URL}/missions/mission01/level${level}.html`, { waitUntil: 'networkidle' });
  await page.locator('#board-canvas').waitFor({ state: 'visible', timeout: 12_000 });
  await page.locator('#program-list').waitFor({ state: 'visible', timeout: 12_000 });
  await page.waitForTimeout(300);
}

const R = async (selector) => page.locator(selector).evaluate((el) => { const r=el.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}; });
function assertInside(name, child, parent, tolerance=2) {
  assert(child.x>=parent.x-tolerance,`${name}: left escaped parent`);
  assert(child.right<=parent.right+tolerance,`${name}: right escaped parent`);
  assert(child.y>=parent.y-tolerance,`${name}: top escaped parent`);
  assert(child.bottom<=parent.bottom+tolerance,`${name}: bottom escaped parent`);
}
async function shot(name){await mkdir(OUT,{recursive:true});await page.screenshot({path:resolve(OUT,`${name}.png`),fullPage:true});}

(async()=>{
  await mkdir(OUT,{recursive:true});
  browser=await chromium.launch({headless:true});
  context=await browser.newContext({viewport:{width:1672,height:941},reducedMotion:'reduce'});
  await context.addInitScript(()=>{try{localStorage.setItem('apulab.settings.sfx','off')}catch(_){}});

  // N5 is only a regression reference. N6 is intentionally allowed a local visual redesign.
  await open(5);
  assert(await page.locator('#program-list .program-row').count()===30,'N5 reference lost 30 program rows');
  assert(await page.locator('#board-canvas').getAttribute('width')==='950','N5 reference canvas width changed');
  await shot('n5-reference');

  await open(6);
  const stage=await R('#stage'),shell=await R('#board-shell'),canvas=await R('#board-canvas'),guide=await R('#level6-guide'),palette=await R('.palette'),editorFooter=await R('.editor-footer');
  assert(Math.abs(stage.width-1672)<=2&&Math.abs(stage.height-941)<=2,`L6: stage is not 1672×941 (${stage.width}×${stage.height})`);
  assert(await page.locator('#board-canvas').getAttribute('width')==='950'&&await page.locator('#board-canvas').getAttribute('height')==='664','L6: WebGL backing canvas contract changed');
  assert(await page.locator('#program-list .program-row').count()===30,'L6: MI PROGRAMA must preserve 30 rows');
  assert(await page.locator('.board-labels-top > *').count()===8&&await page.locator('.board-labels-left > *').count()===8,'L6: 8×8 coordinates missing');
  assert(await page.locator('#program-scroll,#program-scroll-up,#program-scroll-down').count()===3,'L6: custom program scrollbar missing');
  assert(await page.locator('#guide-btn').count()===0,'L6: top GUÍA button must be removed');
  assert(await page.locator('#level6-guide').isVisible(),'L6: fixed bottom guide missing');
  assert(await page.locator('.level6-guide-step').count()===5,'L6: fixed guide must expose five steps');
  assert(await page.locator('.level6-guide-step.is-active[data-step="1"]').count()===1,'L6: guide step 1 must be active initially');
  assertInside('fixed guide',guide,shell,2);
  assert(canvas.bottom<=guide.y+2,`L6: fixed guide overlaps the simulator canvas (${canvas.bottom} > ${guide.y})`);

  assert(await page.locator('#level6-zone-checkpoint .level6-checkpoint-badge').textContent()==='1','L6: science-zone badge 1 missing');
  assert(await page.locator('#level6-communication-checkpoint .level6-checkpoint-badge').textContent()==='2','L6: communication badge 2 missing');
  assert(await page.locator('#level6-zone-checkpoint.is-active').count()===1,'L6: checkpoint 1 must be the initial visual focus');
  assert(await page.locator('#level6-communication-checkpoint.is-ready').count()===0,'L6: checkpoint 2 must start subdued');

  const investigate=await R('#level6-investigate-block'),send=await R('.command-block[data-command="send"]');
  assertInside('INVESTIGAR',investigate,palette,2);assertInside('ENVIAR DATOS',send,palette,2);
  assert(send.y>=investigate.bottom-2,'L6: ENVIAR DATOS must remain separate below INVESTIGAR');
  assert(await page.locator('#level6-investigate-block .command-block[data-command="scan"]').count()===1,'L6: ESCANEAR missing inside INVESTIGAR');
  assert(await page.locator('#level6-investigate-block .command-block[data-command="analyze"]').count()===1,'L6: ANALIZAR missing inside INVESTIGAR');
  assert(await page.locator('.apulab-science-palette .tone:visible').count()===0,'L6: duplicate science tone labels returned');
  assert(await page.locator('#repeat-palette').isVisible(),'L6: REPETIR must remain available');
  assert(await page.locator('#apulab-repeat-arrow,.apulab-repeat-focus').count()===0,'L6: N5 repeat tutorial leaked into N6');
  assert(palette.bottom<=editorFooter.y+2,'L6: command palette overlaps editor footer');

  await page.locator('#journal-btn').click();
  await page.locator('#journal-overlay.visible').waitFor({timeout:5000});
  assert(await page.locator('#info-panel.visible').count()===0,'L6: transient info panel stacked behind BITÁCORA');
  await shot('n6-journal');
  await page.locator('#journal-close').click();
  await shot('n6-initial');

  assert(errors.length===0,`runtime errors detected:\n${errors.join('\n')}`);
  await writeFile(resolve(OUT,'metrics.json'),JSON.stringify({stage,shell,canvas,guide,palette,investigate,send},null,2),'utf8');
  await browser.close();
  console.log('[e2e] N6 FINAL UX OK · fixed 1→5 guide · checkpoints 1/2 · INVESTIGAR grouping · canonical editor preserved');
})().catch(async(error)=>{console.error(error);await mkdir(OUT,{recursive:true});await writeFile(resolve(OUT,'runtime.log'),`${String(error?.stack||error)}\n\n${errors.join('\n')}\n`,'utf8');try{if(page)await page.screenshot({path:resolve(OUT,'failure.png'),fullPage:true})}catch(_){}try{await browser?.close()}catch(_){}process.exitCode=1;});
