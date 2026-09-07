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
  await page.waitForFunction(() => !!window.apulabLevel7QA?.getState, null, { timeout: 8_000 });
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
async function clearProgram(){await page.locator('#clear-btn').click();await page.waitForFunction(()=>document.querySelectorAll('.program-block,.repeat-card').length===0);}

const TO_ADJACENT=['forward','forward','forward','forward','right','forward','forward','forward','forward'];
const TO_SAMPLE=[...TO_ADJACENT,'left','forward'];
const SAMPLE_TO_COMM=['right','forward','right','forward','forward','forward','forward'];

(async()=>{
  await mkdir(OUT,{recursive:true});browser=await chromium.launch({headless:true});context=await browser.newContext({viewport:{width:1672,height:941},reducedMotion:'reduce'});await context.addInitScript(()=>{try{localStorage.setItem('apulab.settings.sfx','off')}catch(_){}});
  await openLevel();

  assert((await page.locator('.level-badge').textContent()||'').includes('NIVEL 7'),'L7: level badge incorrect');
  assert((await page.locator('.btn-progress').textContent()||'').includes('7 / 7'),'L7: progress must be 7 / 7');
  assert(await page.locator('#guide-btn').count()===0,'L7: top GUÍA must not exist');
  assert(await page.locator('#level7-guide').isVisible(),'L7: fixed lower guide missing');
  assert(await page.locator('.level7-guide-step').count()===5,'L7: fixed guide must have five steps');
  assert(await page.locator('#level7-sample-checkpoint.is-active').isVisible(),'L7: sample checkpoint must be active at start');
  assert(!await page.locator('#level7-final-checkpoint').evaluate(el=>el.classList.contains('is-active')),'L7: communication checkpoint must be attenuated at start');
  assert((await page.locator('#level7-final-checkpoint').textContent()||'').includes('PUNTO DE COMUNICACIÓN'),'L7: checkpoint 2 must be PUNTO DE COMUNICACIÓN');
  assert(await page.locator('#repeat-palette').isVisible(),'L7: REPETIR must be available from start');
  assert(await page.locator('.command-block[data-command="analyzeSample"]').count()===1,'L7: ANALIZAR MUESTRA missing');
  assert(await page.locator('.command-block[data-command="send"]').count()===1,'L7: ENVIAR DATOS must be reused from N6');
  assert(await page.locator('.instrument-option').count()===3,'L7: exactly three instrument cards required');
  await shot('01-initial-final-gdd');

  const analyze=page.locator('.command-block[data-command="analyzeSample"]');
  await analyze.click();await page.waitForTimeout(220);assert(await page.locator('.program-block').count()===1,'L7: click did not insert exactly one analyze');await clearProgram();
  await analyze.focus();await analyze.press('Space');assert(await page.locator('.program-block').count()===1,'L7: Space did not insert exactly one analyze');await clearProgram();
  await pointerDrag(analyze,page.locator('.slot[data-index="0"]'));assert(await page.locator('.program-block').count()===1,'L7: drag did not insert exactly one analyze');await clearProgram();
  await analyze.focus();await analyze.press('Enter');assert(await page.locator('.program-block').count()===1,'L7: Enter did not insert exactly one analyze');await clearProgram();

  // Premature SEND: assert durable telemetry/state, not a transient feedback window.
  await addCommands(['send']);await page.locator('#run-btn').click();
  await page.waitForFunction(()=>{
    const events=JSON.parse(sessionStorage.getItem('apulab.level7.telemetry')||'[]');
    return events.some(e=>e.event==='premature_action'&&e.payload?.action==='send'&&e.payload?.reason==='relevant_data_missing');
  },null,{timeout:12000});
  await page.waitForFunction(()=>(document.getElementById('feedback')?.textContent||'').includes('Todavía falta obtener un dato'),null,{timeout:12000});
  let s=await state();
  assert(s.dataSent===false,'L7: premature send changed dataSent');
  assert(s.communicationPointReached===false,'L7: premature send changed communicationPointReached');
  assert(!await page.locator('#success-overlay').isVisible(),'L7: premature send completed mission');
  assert(await page.locator('.program-block').count()===1,'L7: premature send erased program');
  let events=await telemetry();
  assert(events.some(e=>e.event==='premature_action'&&e.payload?.action==='send'&&e.payload?.reason==='relevant_data_missing'),'L7: durable premature_action telemetry missing');
  await clearProgram();

  await addCommands([...TO_ADJACENT,'analyzeSample']);await page.locator('#run-btn').click();await page.waitForFunction(()=>(document.getElementById('feedback')?.textContent||'').includes('hasta la muestra'));
  s=await state();assert(s.sampleCheckpointReached===false,'L7: adjacent rover incorrectly triggered sample_reached');assert(!await page.locator('#sensor-overlay').isVisible(),'L7: adjacent analyze opened selector');assert(await page.locator('.program-block').count()===TO_ADJACENT.length+1,'L7: adjacent failure erased program');

  await openLevel();await addCommands([...TO_SAMPLE,'analyzeSample']);await page.locator('#run-btn').click();await page.locator('#sensor-overlay.visible').waitFor({timeout:30000});
  s=await state();assert(s.sampleCheckpointReached===true&&s.atSample===true,'L7: exact sample was not registered');assert((await page.locator('#objective-tag').textContent()||'').includes('ELIGE UN INSTRUMENTO'),'L7: objective did not advance to instrument choice');
  await shot('02-exact-sample-selector');

  await choose('temperature','click');assert((await page.locator('#analysis-result').textContent()||'').includes('−58 °C'),'L7: temperature reading missing');await changeInstrument('click');
  await choose('proximity','space');assert((await page.locator('#analysis-result').textContent()||'').includes('0.4 m'),'L7: proximity reading missing');await changeInstrument('space');
  await choose('materials','enter');const mt=await page.locator('#analysis-result').textContent()||'';assert(mt.includes('HIERRO')&&mt.includes('SILICATOS'),'L7: materials reading missing');await continueAnalysis();
  assert(await page.locator('#level7-final-checkpoint').evaluate(el=>el.classList.contains('is-active')),'L7: materials must activate communication checkpoint');
  s=await state();assert(s.firstInstrument==='temperature','L7: first instrument incorrect');assert(s.finalInstrument==='materials','L7: final instrument incorrect');assert(s.instrumentSelectionCount===3,'L7: selection count incorrect');assert(s.instrumentChangeCount===2,'L7: change count incorrect');assert(s.changedAfterIrrelevantFeedback===true,'L7: strategy-change metric missing');

  await openLevel();
  const arriveOnly=[...TO_SAMPLE,'analyzeSample',...SAMPLE_TO_COMM];
  await addCommands(arriveOnly);await page.locator('#run-btn').click();await page.locator('#sensor-overlay.visible').waitFor({timeout:30000});await choose('materials');await continueAnalysis();
  await page.waitForFunction(()=>window.apulabLevel7QA?.getState?.().communicationPointReached===true,{timeout:30000});
  s=await state();assert(s.atCommunication===true&&s.communicationPointReached===true,'L7: communication arrival missing');assert(s.dataSent===false,'L7: arrival auto-sent data');assert(!await page.locator('#success-overlay').isVisible(),'L7: arrival without send completed mission');assert((await page.locator('#objective-tag').textContent()||'').includes('ENVÍA LOS DATOS'),'L7: arrival must ask for explicit send');
  events=await telemetry();let names=events.map(x=>x.event);assert(names.includes('communication_point_reached'),'L7: canonical communication event missing');assert(!names.includes('data_sent'),'L7: data_sent emitted automatically on arrival');assert(!names.includes('final_point_reached'),'L7: legacy final_point_reached emitted');

  // Relevant data but SEND away from communication: assert durable telemetry and preserved state/program.
  await openLevel();await addCommands([...TO_SAMPLE,'analyzeSample','send']);await page.locator('#run-btn').click();await page.locator('#sensor-overlay.visible').waitFor({timeout:30000});await choose('materials');await continueAnalysis();
  await page.waitForFunction(()=>{
    const events=JSON.parse(sessionStorage.getItem('apulab.level7.telemetry')||'[]');
    return events.some(e=>e.event==='premature_action'&&e.payload?.action==='send'&&e.payload?.reason==='communication_point_missing');
  },null,{timeout:12000});
  await page.waitForFunction(()=>(document.getElementById('feedback')?.textContent||'').includes('punto de comunicación'),null,{timeout:12000});
  s=await state();
  assert(s.dataSent===false,'L7: off-checkpoint send changed dataSent');
  assert(s.communicationPointReached===false,'L7: off-checkpoint send changed communicationPointReached');
  assert(!await page.locator('#success-overlay').isVisible(),'L7: off-checkpoint send completed mission');assert(await page.locator('.program-block').count()===TO_SAMPLE.length+2,'L7: off-checkpoint send erased program');

  await openLevel();
  const fullNoRepeat=[...TO_SAMPLE,'analyzeSample',...SAMPLE_TO_COMM,'send'];
  await addCommands(fullNoRepeat);assert(await page.locator('.repeat-card').count()===0,'L7: no-repeat solution contains REPETIR');await page.locator('#run-btn').click();await page.locator('#sensor-overlay.visible').waitFor({timeout:30000});await choose('materials');await continueAnalysis();await page.locator('#success-overlay.visible').waitFor({timeout:30000});
  s=await state();assert(s.firstInstrument==='materials','L7: materials-first direct path invalid');assert(s.used_repeat_n7===false,'L7: no-repeat metric wrong');assert(s.communicationPointReached===true&&s.dataSent===true,'L7: final communication/send state wrong');
  events=await telemetry();names=events.map(x=>x.event);for(const e of ['level_started','sample_reached','sample_analyze_requested','instrument_modal_opened','instrument_selected','sample_analyzed','relevant_instrument_selected','communication_point_reached','data_sent','program_modified','level_completed'])assert(names.includes(e),`L7: telemetry missing ${e}`);assert(!names.includes('final_point_reached'),'L7: legacy final_point_reached must not be canonical');
  const communicationIndex=names.indexOf('communication_point_reached'),sendIndex=names.indexOf('data_sent');assert(communicationIndex>=0&&sendIndex>communicationIndex,'L7: arrival must precede explicit send');
  await page.locator('#continue-btn').focus();await page.locator('#continue-btn').press('Enter');assert((await page.locator('#continue-btn').textContent()||'').includes('MISIÓN COMPLETADA'),'L7: terminal finalize failed');assert(await page.locator('#continue-btn').isDisabled(),'L7: terminal CTA must disable');assert(!page.url().includes('level8'),'L7: navigated to level8');await shot('03-completed-explicit-send');

  assert(errors.length===0,`runtime errors detected:\n${errors.join('\n')}`);await writeFile(resolve(OUT,'state.json'),JSON.stringify(s,null,2),'utf8');await writeFile(resolve(OUT,'telemetry.json'),JSON.stringify(events,null,2),'utf8');await browser.close();console.log('[e2e] LEVEL 7 FINAL HARDENING OK · durable premature send · click/Space/drag/Enter · exact sample · 3 instruments · communication arrival != explicit send · no REPETIR required · no N8');
})().catch(async(error)=>{console.error(error);await mkdir(OUT,{recursive:true});await writeFile(resolve(OUT,'runtime.log'),`${String(error?.stack||error)}\n\n${errors.join('\n')}\n`,'utf8');try{if(page)await page.screenshot({path:resolve(OUT,'failure.png'),fullPage:true})}catch(_){}try{await browser?.close()}catch(_){}process.exitCode=1;});
