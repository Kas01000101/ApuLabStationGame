const { chromium } = require('playwright');
const { mkdir, writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');

const BASE_URL = process.env.APULAB_BASE_URL || 'http://127.0.0.1:4173';
const OUT = resolve(process.cwd(), 'test-results/level7-contract');
const errors = [];
let browser, context, page;
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function openLevel() {
  if (page) await page.close();
  page = await context.newPage();
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.stack || error}`));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`); });
  await page.goto(`${BASE_URL}/missions/mission01/level7.html`, { waitUntil: 'networkidle' });
  await page.locator('#board-canvas').waitFor({ state: 'visible', timeout: 12_000 });
  await page.locator('#program-list').waitFor({ state: 'visible', timeout: 12_000 });
  await page.waitForTimeout(250);
}
async function addCommands(sequence) {
  for (const command of sequence) { const block=page.locator(`.command-block[data-command="${command}"]`); await block.focus(); await block.press('Enter'); }
}
async function pointerDrag(source,target){await source.scrollIntoViewIfNeeded();await target.scrollIntoViewIfNeeded();const a=await source.boundingBox(),b=await target.boundingBox();assert(a&&b,'drag source/target not visible');await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:12});await page.mouse.up();}
async function choose(id, mode='enter'){const card=page.locator(`.instrument-option[data-instrument="${id}"]`);if(mode==='click')await card.click();else{await card.focus();await card.press(mode==='space'?'Space':'Enter')}await page.locator('#analysis-overlay.visible').waitFor({timeout:5000});}
async function changeInstrument(mode='enter'){const b=page.locator('#change-instrument-btn');if(mode==='click')await b.click();else{await b.focus();await b.press(mode==='space'?'Space':'Enter')}await page.locator('#sensor-overlay.visible').waitFor({timeout:5000});}
async function continueAnalysis(){const b=page.locator('#continue-analysis-btn');await b.focus();await b.press('Enter');await page.locator('#analysis-overlay').waitFor({state:'hidden',timeout:5000});}
async function state(){return page.evaluate(()=>window.apulabLevel7QA?.getState?.());}
async function telemetry(){return page.evaluate(()=>JSON.parse(sessionStorage.getItem('apulab.level7.telemetry')||'[]'));}
async function shot(name){await mkdir(OUT,{recursive:true});await page.screenshot({path:resolve(OUT,`${name}.png`),fullPage:true});}
async function waitRunIdle(){await page.waitForFunction(()=>{const b=document.getElementById('run-btn');return b&&!b.disabled;},null,{timeout:30000});await page.waitForTimeout(180);}

const ADJACENT_ROUTE=['forward','forward','forward','forward','right','forward','forward','forward','forward'];
const EXACT_SAMPLE_ROUTE=['forward','forward','forward','forward','forward','right','forward','forward','forward','forward'];
const TO_COMMUNICATION=['forward','right','forward','forward','forward','forward'];

(async()=>{
  await mkdir(OUT,{recursive:true});browser=await chromium.launch({headless:true});context=await browser.newContext({viewport:{width:1672,height:941},reducedMotion:'reduce'});await context.addInitScript(()=>{try{localStorage.setItem('apulab.settings.sfx','off')}catch(_){}});
  await openLevel();

  assert((await page.locator('.level-badge').textContent()||'').includes('NIVEL 7'),'L7: level badge incorrect');
  assert((await page.locator('.btn-progress').textContent()||'').includes('7 / 7'),'L7: progress must be 7 / 7');
  assert(await page.locator('#guide-btn').count()===0,'L7: top GUÍA must not exist');
  assert(await page.locator('#level7-guide').isVisible(),'L7: fixed lower guide missing');
  assert(await page.locator('.level7-guide-step').count()===5,'L7: fixed guide must have five steps');
  assert(await page.locator('#level7-sample-checkpoint').count()===1,'L7: checkpoint 1 must exist exactly once');
  assert(await page.locator('#level7-final-checkpoint').count()===1,'L7: checkpoint 2 must exist exactly once');
  assert((await page.locator('#level7-final-checkpoint').textContent()||'').includes('PUNTO DE COMUNICACIÓN'),'L7: checkpoint 2 label incorrect');
  assert(await page.locator('#level7-sample-checkpoint.is-active').isVisible(),'L7: sample checkpoint 1 must be active at start');
  assert(!await page.locator('#level7-final-checkpoint').evaluate(el=>el.classList.contains('is-active')),'L7: communication checkpoint must be attenuated at start');
  assert(await page.locator('#repeat-palette').isVisible(),'L7: REPETIR must be available from start');
  assert(await page.locator('.command-block[data-command="analyzeSample"]').count()===1,'L7: ANALIZAR MUESTRA missing');
  assert(await page.locator('.command-block[data-command="transmitData"]').count()===1,'L7: ENVIAR DATOS missing');
  for(const old of ['read','record','send']) assert(await page.locator(`.command-block[data-command="${old}"]`).count()===0,`L7: removed command leaked: ${old}`);
  assert(await page.locator('.instrument-option').count()===3,'L7: exactly three instrument cards required');
  await shot('01-initial-communication-gdd');

  const analyze=page.locator('.command-block[data-command="analyzeSample"]');
  await analyze.click();await page.waitForTimeout(220);assert(await page.locator('.program-block').count()===1,'L7: click did not insert analyze');await page.locator('#clear-btn').click();
  await analyze.focus();await analyze.press('Space');assert(await page.locator('.program-block').count()===1,'L7: Space did not insert analyze');await page.locator('#clear-btn').click();
  await pointerDrag(analyze,page.locator('.slot[data-index="0"]'));assert(await page.locator('.program-block').count()===1,'L7: drag did not insert analyze');await page.locator('#clear-btn').click();

  await addCommands([...ADJACENT_ROUTE,'analyzeSample']);await page.locator('#run-btn').click();
  await page.waitForFunction(()=>(document.getElementById('feedback')?.textContent||'').includes('Lleva AYNI hasta la muestra'));
  let s=await state();assert(s.atSample===false,'L7: adjacency incorrectly counted as sample cell');assert(s.sampleReached===false,'L7: adjacency incorrectly set sampleReached');assert(!await page.getByTestId('block-analyze-sample').evaluate(el=>el.classList.contains('is-ready')),'L7: analyze glows while AYNI is beside sample');assert(!await page.locator('#success-overlay').isVisible(),'L7: adjacent analyze completed mission');
  await shot('02-adjacent-rejected');

  await openLevel();await addCommands(EXACT_SAMPLE_ROUTE);await page.locator('#run-btn').click();await waitRunIdle();
  s=await state();assert(s.atSample===true,'L7: AYNI did not finish exactly on sample');assert(s.sampleReached===true,'L7: exact sample occupancy did not set sampleReached');assert(await page.getByTestId('block-analyze-sample').evaluate(el=>el.classList.contains('is-ready')),'L7: ANALIZAR MUESTRA not highlighted while AYNI is on sample');assert((await page.locator('#objective-tag').textContent()||'').includes('ANALIZA LA MUESTRA'),'L7: guide/objective did not advance to analysis');await shot('03-ayni-on-sample');

  await addCommands(['analyzeSample']);await page.locator('#run-btn').click();await page.locator('#sensor-overlay.visible').waitFor({timeout:25000});assert(await page.locator('.instrument-option').count()===3,'L7: selector changed card count');await shot('04-selector-equal-options');
  await choose('temperature','click');assert((await page.locator('#analysis-result').textContent()||'').includes('−58 °C'),'L7: temperature reading missing');assert(!await page.locator('#level7-final-checkpoint').evaluate(el=>el.classList.contains('is-active')),'L7: temperature activated checkpoint 2');await changeInstrument('click');
  await choose('proximity','space');assert((await page.locator('#analysis-result').textContent()||'').includes('0.4 m'),'L7: proximity reading missing');assert(!await page.locator('#level7-final-checkpoint').evaluate(el=>el.classList.contains('is-active')),'L7: proximity activated checkpoint 2');await changeInstrument('space');
  await choose('materials','enter');const mt=await page.locator('#analysis-result').textContent()||'';assert(mt.includes('HIERRO')&&mt.includes('SILICATOS'),'L7: material reading missing');await continueAnalysis();
  assert(await page.locator('#level7-final-checkpoint').evaluate(el=>el.classList.contains('is-active')),'L7: materials did not activate communication checkpoint');s=await state();assert(s.instrumentSelectionCount===3&&s.instrumentChangeCount===2,'L7: instrument metrics incorrect');assert(s.changedAfterIrrelevantFeedback===true,'L7: strategy-change metric missing');
  await page.locator('#journal-btn').click();await page.locator('#journal-overlay.visible').waitFor({timeout:5000});const journal=await page.locator('#journal-text').textContent()||'';assert(journal.includes('−58 °C')&&journal.includes('0.4 m')&&journal.includes('Hierro')&&journal.includes('Silicatos'),'L7: BITÁCORA did not preserve readings');await page.locator('#journal-close').click().catch(()=>{});

  await openLevel();const withoutSend=[...EXACT_SAMPLE_ROUTE,'analyzeSample',...TO_COMMUNICATION];await addCommands(withoutSend);await page.locator('#run-btn').click();await page.locator('#sensor-overlay.visible').waitFor({timeout:25000});await choose('materials');await continueAnalysis();await waitRunIdle();s=await state();assert(s.communicationPointReached===true,'L7: communication point not reached');assert(s.dataSent===false,'L7: dataSent became true without ENVIAR DATOS');assert(!await page.locator('#success-overlay').isVisible(),'L7: reaching checkpoint 2 completed mission without send');assert(await page.locator('.block-send').first().evaluate(el=>el.classList.contains('is-ready')),'L7: ENVIAR DATOS not highlighted at checkpoint 2');await shot('05-communication-waits-for-send');

  await openLevel();const noRepeat=[...EXACT_SAMPLE_ROUTE,'analyzeSample',...TO_COMMUNICATION,'transmitData'];await addCommands(noRepeat);assert(await page.locator('.repeat-card').count()===0,'L7: no-repeat solution contains REPETIR');await page.locator('#run-btn').click();await page.locator('#sensor-overlay.visible').waitFor({timeout:25000});await choose('materials');await continueAnalysis();await page.locator('#success-overlay.visible').waitFor({timeout:25000});s=await state();assert(s.firstInstrument==='materials','L7: materials-first solution not preserved');assert(s.used_repeat_n7===false,'L7: no-repeat telemetry wrong');assert(s.communicationPointReached===true&&s.dataSent===true,'L7: final communication state incomplete');assert((await page.locator('#continue-btn').textContent()||'').includes('FINALIZAR MISIÓN'),'L7: final CTA incorrect');
  const events=await telemetry();const names=events.map(x=>x.event);for(const e of ['level_started','sample_reached','sample_analyze_requested','instrument_modal_opened','instrument_selected','sample_analyzed','relevant_instrument_selected','communication_point_reached','data_sent','program_modified','level_completed'])assert(names.includes(e),`L7: telemetry missing ${e}`);assert(!page.url().includes('level8'),'L7: navigated to level8');await shot('06-completed-without-repeat');

  await openLevel();const prefix=[...EXACT_SAMPLE_ROUTE,'analyzeSample','forward','right'];await addCommands(prefix);await page.locator('#repeat-palette').focus();await page.locator('#repeat-palette').press('Enter');const ri=prefix.length;await pointerDrag(page.locator('.command-block[data-command="forward"]'),page.locator(`[data-repeat-body="${ri}"]`));await page.locator(`[data-count="${ri}:1"]`).click();await page.locator(`[data-count="${ri}:1"]`).click();await addCommands(['transmitData']);await page.locator('#run-btn').click();await page.locator('#sensor-overlay.visible').waitFor({timeout:25000});await choose('materials');await continueAnalysis();await page.locator('#success-overlay.visible').waitFor({timeout:25000});s=await state();assert(s.used_repeat_n7===true&&s.repeat_instances_n7===1,'L7: repeat solution telemetry incorrect');assert(s.dataSent===true,'L7: repeat path did not send data');await shot('07-completed-with-repeat');

  assert(errors.length===0,`runtime errors detected:\n${errors.join('\n')}`);await writeFile(resolve(OUT,'state.json'),JSON.stringify(s,null,2),'utf8');await browser.close();console.log('[e2e] LEVEL 7 COMMUNICATION FINAL OK · adjacency rejected · exact sample occupancy · 3 instruments · explicit ENVIAR DATOS · with/without REPETIR · no N8');
})().catch(async(error)=>{console.error(error);await mkdir(OUT,{recursive:true});await writeFile(resolve(OUT,'runtime.log'),`${String(error?.stack||error)}\n\n${errors.join('\n')}\n`,'utf8');try{if(page)await page.screenshot({path:resolve(OUT,'failure.png'),fullPage:true})}catch(_){}try{await browser?.close()}catch(_){}process.exitCode=1;});
