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

(async()=>{
  await mkdir(OUT,{recursive:true});browser=await chromium.launch({headless:true});context=await browser.newContext({viewport:{width:1672,height:941},reducedMotion:'reduce'});await context.addInitScript(()=>{try{localStorage.setItem('apulab.settings.sfx','off')}catch(_){}});
  await openLevel();

  // TEST 1 · exact final identity and initial attention state.
  assert((await page.locator('.level-badge').textContent()||'').includes('NIVEL 7'),'L7: level badge incorrect');
  assert((await page.locator('.btn-progress').textContent()||'').includes('7 / 7'),'L7: progress must be 7 / 7');
  assert(await page.locator('#guide-btn').count()===0,'L7: top GUÍA must not exist');
  assert(await page.locator('#level7-guide').isVisible(),'L7: fixed lower guide missing');
  assert(await page.locator('.level7-guide-step').count()===5,'L7: fixed guide must have five steps');
  assert(await page.locator('.level7-guide-step.is-active [data-step]').count()===0 || await page.locator('.level7-guide-step.is-active').count()===1,'L7: guide must expose one active node');
  assert(await page.locator('#level7-sample-checkpoint.is-active').isVisible(),'L7: sample checkpoint 1 must be active at start');
  assert(!await page.locator('#level7-final-checkpoint').evaluate(el=>el.classList.contains('is-active')),'L7: final checkpoint 2 must be attenuated at start');
  assert(await page.locator('#repeat-palette').isVisible(),'L7: REPETIR must be available from start');
  assert(await page.locator('.command-block[data-command="analyzeSample"]').count()===1,'L7: ANALIZAR MUESTRA must be the science block');
  for(const old of ['read','record','send']) assert(await page.locator(`.command-block[data-command="${old}"]`).count()===0,`L7: N6 command leaked: ${old}`);
  assert(await page.locator('.instrument-option').count()===3,'L7: exactly three instrument cards required');
  await shot('01-initial-final-gdd');

  // Input contract for ANALIZAR MUESTRA: click, Space, drag, Enter.
  const analyze=page.locator('.command-block[data-command="analyzeSample"]');
  await analyze.click();await page.waitForTimeout(220);assert(await page.locator('.program-block').count()===1,'L7: click did not insert analyze');await page.locator('#clear-btn').click();
  await analyze.focus();await analyze.press('Space');assert(await page.locator('.program-block').count()===1,'L7: Space did not insert analyze');await page.locator('#clear-btn').click();
  await pointerDrag(analyze,page.locator('.slot[data-index="0"]'));assert(await page.locator('.program-block').count()===1,'L7: drag did not insert analyze');await page.locator('#clear-btn').click();

  // TEST 2 · analyze away from sample = graceful failure and program preserved.
  await addCommands(['analyzeSample']);await page.locator('#run-btn').click();await page.waitForFunction(()=>(document.getElementById('feedback')?.textContent||'').includes('junto a la muestra'));
  assert(await page.locator('.program-block').count()===1,'L7: graceful failure erased program');assert(!await page.locator('#success-overlay').isVisible(),'L7: premature analyze completed mission');
  await page.locator('#run-btn').click();await page.locator('#clear-btn').click();

  // TESTS 3–7 · reach sample, open selector, learn from valid data, then relevant data.
  const toSample=['forward','forward','forward','forward','right','forward','forward','forward','forward','analyzeSample'];
  await addCommands(toSample);await page.locator('#run-btn').click();await page.locator('#sensor-overlay.visible').waitFor({timeout:25000});
  assert((await page.locator('#objective-tag').textContent()||'').includes('ELIGE UN INSTRUMENTO'),'L7: dynamic objective did not reach step 3');
  assert(await page.locator('.instrument-option').count()===3,'L7: selector changed card count');
  await shot('02-selector-equal-options');

  await choose('temperature','click');assert((await page.locator('#analysis-result').textContent()||'').includes('−58 °C'),'L7: temperature reading missing');assert(!await page.locator('#level7-final-checkpoint').evaluate(el=>el.classList.contains('is-active')),'L7: temperature must not activate final checkpoint');await changeInstrument('click');
  await choose('proximity','space');assert((await page.locator('#analysis-result').textContent()||'').includes('0.4 m'),'L7: proximity reading missing');assert(!await page.locator('#level7-final-checkpoint').evaluate(el=>el.classList.contains('is-active')),'L7: proximity must not activate final checkpoint');await changeInstrument('space');
  await choose('materials','enter');const mt=await page.locator('#analysis-result').textContent()||'';assert(mt.includes('HIERRO')&&mt.includes('SILICATOS'),'L7: material reading missing');await continueAnalysis();
  assert(await page.locator('#level7-final-checkpoint').evaluate(el=>el.classList.contains('is-active')),'L7: materials must activate final checkpoint');
  let s=await state();assert(s.firstInstrument==='temperature','L7: first instrument state incorrect');assert(s.finalInstrument==='materials','L7: final instrument state incorrect');assert(s.instrumentSelectionCount===3,'L7: selection count incorrect');assert(s.instrumentChangeCount===2,'L7: change count incorrect');assert(s.changedAfterIrrelevantFeedback===true,'L7: strategy-change metric missing');

  await page.locator('#journal-btn').click();await page.locator('#journal-overlay.visible').waitFor({timeout:5000});const journal=await page.locator('#journal-text').textContent()||'';assert(journal.includes('−58 °C')&&journal.includes('0.4 m')&&journal.includes('Hierro')&&journal.includes('Silicatos'),'L7: BITÁCORA did not preserve readings');await page.locator('#journal-close').click().catch(()=>{});

  // TEST 10 · materials first is a valid path; TEST A · complete without REPETIR.
  await openLevel();
  const noRepeat=['forward','forward','forward','forward','right','forward','forward','forward','forward','analyzeSample','forward','right','forward','forward','forward'];
  await addCommands(noRepeat);assert(await page.locator('.repeat-card').count()===0,'L7: no-repeat solution contains REPETIR');await page.locator('#run-btn').click();await page.locator('#sensor-overlay.visible').waitFor({timeout:25000});await choose('materials');await continueAnalysis();await page.locator('#success-overlay.visible').waitFor({timeout:25000});
  s=await state();assert(s.firstInstrument==='materials','L7: materials-first solution not preserved');assert(s.used_repeat_n7===false,'L7: no-repeat telemetry wrong');assert(s.finalCheckpointReached===true,'L7: final point not reached');assert((await page.locator('#continue-btn').textContent()||'').includes('FINALIZAR MISIÓN'),'L7: final CTA incorrect');
  const events=await telemetry();const names=events.map(x=>x.event);for(const e of ['level_started','sample_reached','sample_analyze_requested','instrument_modal_opened','instrument_selected','sample_analyzed','relevant_instrument_selected','final_point_reached','program_modified','level_completed'])assert(names.includes(e),`L7: telemetry missing ${e}`);
  const selected=events.find(x=>x.event==='instrument_selected');assert(selected?.payload?.instrument_type==='materials'&&selected?.payload?.relevant_to_question===true,'L7: instrument_selected payload incorrect');
  assert(!names.includes('mission_completed'),'L7: legacy completion event should not be emitted');
  await page.locator('#continue-btn').focus();await page.locator('#continue-btn').press('Enter');assert((await page.locator('#continue-btn').textContent()||'').includes('MISIÓN COMPLETADA'),'L7: terminal finalize failed');assert(await page.locator('#continue-btn').isDisabled(),'L7: terminal CTA must disable');assert(!page.url().includes('level8'),'L7: navigated to level8');await shot('03-completed-without-repeat');

  // TEST B · complete with REPETIR voluntarily.
  await openLevel();const prefix=['forward','forward','forward','forward','right','forward','forward','forward','forward','analyzeSample','forward','right'];await addCommands(prefix);await page.locator('#repeat-palette').focus();await page.locator('#repeat-palette').press('Enter');const ri=prefix.length;await pointerDrag(page.locator('.command-block[data-command="forward"]'),page.locator(`[data-repeat-body="${ri}"]`));await page.locator(`[data-count="${ri}:1"]`).click();await page.locator('#run-btn').click();await page.locator('#sensor-overlay.visible').waitFor({timeout:25000});await choose('materials');await continueAnalysis();await page.locator('#success-overlay.visible').waitFor({timeout:25000});s=await state();assert(s.used_repeat_n7===true&&s.repeat_instances_n7===1,'L7: repeat solution telemetry incorrect');await shot('04-completed-with-repeat');

  assert(errors.length===0,`runtime errors detected:\n${errors.join('\n')}`);await writeFile(resolve(OUT,'state.json'),JSON.stringify(s,null,2),'utf8');await browser.close();console.log('[e2e] LEVEL 7 FINAL GDD OK · fixed guide · 3 instruments · soft feedback · materials-first · strategy change · final point · with/without REPETIR · no N8');
})().catch(async(error)=>{console.error(error);await mkdir(OUT,{recursive:true});await writeFile(resolve(OUT,'runtime.log'),`${String(error?.stack||error)}\n\n${errors.join('\n')}\n`,'utf8');try{if(page)await page.screenshot({path:resolve(OUT,'failure.png'),fullPage:true})}catch(_){}try{await browser?.close()}catch(_){}process.exitCode=1;});
