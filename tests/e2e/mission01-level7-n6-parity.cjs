const { chromium } = require('playwright');
const { mkdir, writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');

const BASE_URL = process.env.APULAB_BASE_URL || 'http://127.0.0.1:4173';
const OUT = resolve(process.cwd(), 'test-results/level7-n6-parity');
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
  await page.waitForTimeout(250);
}

async function metrics() {
  return page.evaluate(() => {
    const R=(selector)=>{const el=document.querySelector(selector);if(!el)return null;const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
    return {
      header:R('.header'),main:R('.main'),simulator:R('#board-shell'),editor:R('.editor'),editorFooter:R('.editor-footer'),canvas:R('#board-canvas'),palette:R('.palette'),workspace:R('.workspace'),program:R('#program-list'),stage:R('#stage'),
      science:{analyzeSample:R('.command-block[data-command="analyzeSample"]')},
      rows:document.querySelectorAll('#program-list .program-row').length,
      topLabels:document.querySelectorAll('.board-labels-top > *').length,
      leftLabels:document.querySelectorAll('.board-labels-left > *').length,
      canvasWidth:document.querySelector('#board-canvas')?.getAttribute('width'),
      canvasHeight:document.querySelector('#board-canvas')?.getAttribute('height'),
      scroll:!!document.querySelector('#program-scroll'),scrollUp:!!document.querySelector('#program-scroll-up'),scrollDown:!!document.querySelector('#program-scroll-down'),
    };
  });
}
function compareRect(name,a,b,tolerance=2){assert(a&&b,`${name}: missing geometry`);for(const key of ['x','y','width','height']){const delta=Math.abs(a[key]-b[key]);assert(delta<=tolerance,`${name}.${key}: N5=${a[key]} N7=${b[key]} delta=${delta}px > ${tolerance}px`);}}
function assertInside(name,child,parent,tolerance=2){assert(child&&parent,`${name}: missing geometry`);assert(child.x>=parent.x-tolerance,`${name}: left escaped palette`);assert(child.right<=parent.right+tolerance,`${name}: right escaped palette`);assert(child.y>=parent.y-tolerance,`${name}: top escaped palette`);assert(child.bottom<=parent.bottom+tolerance,`${name}: bottom escaped palette`);}
async function shot(name){await mkdir(OUT,{recursive:true});await page.screenshot({path:resolve(OUT,`${name}.png`),fullPage:true});}

(async()=>{
  await mkdir(OUT,{recursive:true});
  browser=await chromium.launch({headless:true});
  context=await browser.newContext({viewport:{width:1672,height:941},reducedMotion:'reduce'});
  await context.addInitScript(()=>{try{localStorage.setItem('apulab.settings.sfx','off')}catch(_){}});

  // N6 now has a deliberate local visual redesign. N7 must stay on the canonical N5 shell.
  await open(5);const n5=await metrics();await shot('n5-reference');
  await open(7);const n7=await metrics();await shot('n7-initial');

  for(const name of ['header','main','simulator','editor','editorFooter','canvas','palette','workspace','program']) compareRect(name,n5[name],n7[name],2);
  assert(n7.stage&&Math.abs(n7.stage.width-1672)<=2&&Math.abs(n7.stage.height-941)<=2,`L7: stage is not 1672×941 (${n7.stage?.width}×${n7.stage?.height})`);
  assert(n7.canvasWidth==='950'&&n7.canvasHeight==='664',`L7: board canvas must be 950×664 (${n7.canvasWidth}×${n7.canvasHeight})`);
  assert(n7.rows===30,`L7: MI PROGRAMA must preserve 30 rows (${n7.rows})`);
  assert(n7.topLabels===8&&n7.leftLabels===8,`L7: board coordinates missing (top=${n7.topLabels}, left=${n7.leftLabels})`);
  assert(n7.scroll&&n7.scrollUp&&n7.scrollDown,'L7: custom canonical scrollbar missing');
  assert(await page.locator('#repeat-palette').isVisible(),'L7: REPETIR must be available from the start');
  assert(await page.locator('.command-block[data-command="analyzeSample"]').isVisible(),'L7: ANALIZAR MUESTRA missing');
  assertInside('science.analyzeSample',n7.science.analyzeSample,n7.palette,2);
  assert(n7.palette.bottom<=n7.editorFooter.y+2,`L7: palette overlaps footer (${n7.palette.bottom} > ${n7.editorFooter.y})`);
  assert(await page.locator('.panel.simulator,.panel.editor,.board-wrap').count()===0,'L7: parallel legacy shell returned');
  assert(await page.locator('#apulab-repeat-arrow,.apulab-repeat-focus').count()===0,'L7: N5 REPETIR tutorial leaked into N7');
  assert(await page.locator('#level6-guide,#level6-zone-checkpoint,#level6-communication-checkpoint').count()===0,'L7: N6 final UX leaked into N7');

  const board=page.locator('#board-canvas');
  assert((await board.getAttribute('role'))==='img','L7: board must expose image semantics');
  assert(((await board.getAttribute('aria-label'))||'').toLowerCase().includes('muestra'),'L7: accessible unknown-sample label missing');
  assert(await page.locator('#sensor-overlay').isHidden(),'L7: instrument selector must not open before ANALIZAR MUESTRA');
  assert(await page.locator('.instrument-option').count()===3,'L7: selector DOM must expose exactly three instruments');
  for(const id of ['temperature','proximity','materials'])assert(await page.locator(`.instrument-option[data-instrument="${id}"]`).count()===1,`L7: missing instrument option ${id}`);
  assert(await page.locator('#equip-sensor-btn,#sensor-slot-label').count()===0,'L7: old equip/slot UI returned');
  assert(await page.getByText('PUNTO DE MISIÓN',{exact:true}).count()===0,'L7: Three.js point label must remain canvas-only');

  await page.locator('#guide-btn').click();await page.locator('#info-panel.visible').waitFor({timeout:5000});
  await page.locator('#journal-btn').click();await page.locator('#journal-overlay.visible').waitFor({timeout:5000});
  assert(await page.locator('#info-panel.visible').count()===0,'L7: GUÍA remained visible behind BITÁCORA');
  await shot('n7-journal');

  assert(errors.length===0,`runtime errors detected:\n${errors.join('\n')}`);
  await writeFile(resolve(OUT,'metrics.json'),JSON.stringify({n5,n7},null,2),'utf8');
  await browser.close();
  console.log('[e2e] N5→N7 CANONICAL SHELL OK · N6 redesign isolated · N7 instrument mission unchanged');
})().catch(async(error)=>{console.error(error);await mkdir(OUT,{recursive:true});await writeFile(resolve(OUT,'runtime.log'),`${String(error?.stack||error)}\n\n${errors.join('\n')}\n`,'utf8');try{if(page)await page.screenshot({path:resolve(OUT,'failure.png'),fullPage:true})}catch(_){}try{await browser?.close()}catch(_){}process.exitCode=1;});
