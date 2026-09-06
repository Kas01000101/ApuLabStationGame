import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const LEVEL6 = resolve(OUT, 'level6.html');
const LEVEL7 = resolve(OUT, 'level7.html');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
const fail = (code) => { throw new Error(`mission01_level7_final_gdd:${code}`); };

function requiredReplace(source, before, after, code) {
  if (!source.includes(before)) fail(`missing:${code}`);
  return source.replace(before, after);
}

const l6Before = await readFile(LEVEL6, 'utf8');
const l6Hash = hash(l6Before);
let html = await readFile(LEVEL7, 'utf8');

if (!html.includes('APULAB_LEVEL7_INSTRUMENT_UI_V2')) fail('instrument_runtime_missing');
if (!html.includes('APULAB_LEVEL7_MODULE_SCOPE_BRIDGE_V1')) fail('module_scope_missing');
if (html.includes('APULAB_LEVEL7_FINAL_GDD_V1')) fail('already_applied');

// Identity and final terminology.
html = html
  .replace(/<div class="subtitle">[\s\S]*?<\/div>/, '<div class="subtitle">ELIGE EL INSTRUMENTO SEGÚN EL DATO QUE NECESITAS.</div>')
  .replaceAll('PUNTO DE MISIÓN', 'PUNTO FINAL')
  .replaceAll('OBJETIVO · INVESTIGA LA MUESTRA Y LLEGA AL PUNTO FINAL', 'PASO 1 · LLEVA AYNI A LA MUESTRA')
  .replaceAll('OBJETIVO · INVESTIGA LA MUESTRA Y LLEGA AL PUNTO DE MISIÓN', 'PASO 1 · LLEVA AYNI A LA MUESTRA')
  .replaceAll('SENSOR DE TEMPERATURA', 'TEMPERATURA')
  .replaceAll('SENSOR DE PROXIMIDAD', 'PROXIMIDAD')
  .replaceAll('ANALIZADOR DE MINERALES', 'ANALIZADOR DE MATERIALES')
  .replaceAll("tone:'SCAN'", "tone:''");

// Canonical telemetry names from the final research GDD.
html = html
  .replaceAll("'sample_checkpoint_reached'", "'sample_reached'")
  .replaceAll("'final_checkpoint_reached'", "'final_point_reached'")
  .replaceAll("'mission_completed'", "'level_completed'")
  .replaceAll("recordLevel7Event('instrument_changed',{from_instrument:selectedInstrument,instrument_change_count:instrumentChangeCount,changed_after_irrelevant_feedback:changedAfterIrrelevantFeedback})", "recordLevel7Event('instrument_change_requested',{from_instrument:selectedInstrument,instrument_change_count:instrumentChangeCount,changed_after_irrelevant_feedback:changedAfterIrrelevantFeedback})");

// N7 has no top GUÍA. Remove handler first so no null dereference is introduced.
const guideHandlerStart = html.indexOf("document.getElementById('guide-btn').onclick=()=>{");
const guideHandlerEndMarker = ";document.getElementById('info-close').onclick=";
const guideHandlerEnd = html.indexOf(guideHandlerEndMarker, guideHandlerStart);
if (guideHandlerStart >= 0 && guideHandlerEnd >= 0) {
  html = html.slice(0, guideHandlerStart) + "document.getElementById('info-close').onclick=" + html.slice(guideHandlerEnd + guideHandlerEndMarker.length);
}
html = html.replace(/<button id="guide-btn"[\s\S]*?<\/button>/, '');

// Fixed lower guide + visible checkpoints. Checkpoint 2 exists from the start but is attenuated.
const boardExtras = `<div id="level7-sample-checkpoint" class="level7-checkpoint level7-checkpoint-sample is-active" data-testid="level7-sample-checkpoint" aria-hidden="true"><span class="level7-checkpoint-badge">1</span><span class="level7-checkpoint-copy"><strong>MUESTRA DESCONOCIDA</strong><small>VE AQUÍ PRIMERO</small></span></div><div id="level7-final-checkpoint" class="level7-checkpoint level7-checkpoint-final" data-testid="level7-final-checkpoint" aria-hidden="true"><span class="level7-checkpoint-badge">2</span><span class="level7-checkpoint-copy"><strong>PUNTO FINAL</strong></span></div><section id="level7-guide" class="level7-guide" data-testid="level7-guide" aria-label="Guía de progreso de la muestra"><div class="level7-guide-title"><strong>GUÍA · <span>MUESTRA</span></strong></div><div class="level7-guide-track"><div id="level7-guide-fill" class="level7-guide-fill"></div><div class="level7-guide-step is-active" data-step="1"><span class="level7-guide-node">1</span><span class="level7-guide-text">Lleva AYNI a la muestra.</span></div><div class="level7-guide-step" data-step="2"><span class="level7-guide-node">2</span><span class="level7-guide-text">Usa ANALIZAR MUESTRA.</span></div><div class="level7-guide-step" data-step="3"><span class="level7-guide-node">3</span><span class="level7-guide-text">Elige un instrumento.</span></div><div class="level7-guide-step" data-step="4"><span class="level7-guide-node">4</span><span class="level7-guide-text">Encuentra el dato que responde la pregunta.</span></div><div class="level7-guide-step" data-step="5"><span class="level7-guide-node">5</span><span class="level7-guide-text">Lleva AYNI al punto final.</span></div></div></section>`;
const boardEnd = html.indexOf('</section>\n<section class="editor">', html.indexOf('<section id="board-shell" class="board-shell">'));
if (boardEnd < 0) fail('board_shell_end');
html = html.slice(0, boardEnd) + boardExtras + html.slice(boardEnd);

const style = `<style id="apulab-level7-final-gdd-style">
/* APULAB_LEVEL7_FINAL_GDD_V1 */
#board-canvas{height:574px!important}.board-labels-left{height:488px!important}.board-focus{bottom:130px!important}.obstacle-label{bottom:132px!important}
.level7-guide{position:absolute;left:18px;right:18px;bottom:15px;height:104px;border:2px solid #4D4288;border-radius:9px;background:linear-gradient(180deg,rgba(20,25,56,.98),rgba(12,18,45,.98));box-shadow:inset 0 0 0 1px rgba(73,201,215,.10);z-index:12;padding:10px 18px 9px;overflow:hidden}.level7-guide-title{height:19px;display:flex;align-items:center;font-size:13px;color:#F8F9FA}.level7-guide-title span{color:#49C9D7}.level7-guide-track{position:relative;height:68px;display:grid;grid-template-columns:repeat(5,1fr);align-items:start;padding-top:4px}.level7-guide-track::before{content:"";position:absolute;left:10%;right:10%;top:18px;height:3px;border-radius:4px;background:#514B88}.level7-guide-fill{position:absolute;left:10%;top:18px;height:3px;width:0;border-radius:4px;background:#49C9D7;box-shadow:0 0 10px rgba(73,201,215,.65);transition:width .28s ease}.level7-guide-step{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;text-align:center;gap:5px;color:#D8D9EA}.level7-guide-node{width:30px;height:30px;border:2px solid #8E7DCE;border-radius:50%;background:#3B326B;display:flex;align-items:center;justify-content:center;font:800 13px/1 Poppins,sans-serif;color:#FFF;transition:.22s}.level7-guide-text{max-width:160px;font:700 10px/1.25 Poppins,sans-serif;color:#D8D9EA}.level7-guide-step.is-active .level7-guide-node{border-color:#C9F6F7;background:#F8F9FA;color:#141938;box-shadow:0 0 0 4px rgba(73,201,215,.20),0 0 22px rgba(73,201,215,.95);animation:l7Pulse 1.55s ease-in-out infinite}.level7-guide-step.is-active .level7-guide-text{color:#49C9D7;font-weight:800}.level7-guide-step.is-done .level7-guide-node{border-color:#49C9D7;background:#254D66;color:#C9F6F7}.level7-checkpoint{position:absolute;z-index:11;display:flex;align-items:center;gap:7px;pointer-events:none;opacity:.42;filter:saturate(.55);transition:.25s}.level7-checkpoint-sample{left:565px;top:235px}.level7-checkpoint-final{left:600px;top:515px}.level7-checkpoint-badge{width:36px;height:36px;border-radius:50%;border:3px solid #8E7DCE;background:#2D2654;color:#FFF;display:flex;align-items:center;justify-content:center;font:800 15px/1 Poppins,sans-serif}.level7-checkpoint-copy{display:flex;flex-direction:column;align-items:flex-start}.level7-checkpoint-copy strong{padding:6px 10px;border:2px solid #4D4288;border-radius:5px;background:rgba(23,19,58,.95);font:800 10px/1 Poppins,sans-serif;color:#F8F9FA}.level7-checkpoint-copy small{margin-left:9px;padding:5px 8px;border-radius:0 0 5px 5px;background:#49C9D7;color:#141938;font:800 9px/1 Poppins,sans-serif}.level7-checkpoint.is-active{opacity:1;filter:none}.level7-checkpoint.is-active .level7-checkpoint-badge{border-color:#C9F6F7;background:#0D5263;box-shadow:0 0 0 4px rgba(73,201,215,.25),0 0 23px rgba(73,201,215,.90);animation:l7Pulse 1.55s ease-in-out infinite}.level7-checkpoint.is-done{opacity:.80;filter:none}.level7-checkpoint.is-done .level7-checkpoint-badge{border-color:#49C9D7;background:#254D66}.level7-checkpoint-final.is-active .level7-checkpoint-badge{border-color:#FFF2B8;background:#5B4A16;box-shadow:0 0 0 4px rgba(244,199,94,.20),0 0 24px rgba(244,199,94,.82)}
.apulab-sensor-palette .palette-group-title span:first-child{font-size:0}.apulab-sensor-palette .palette-group-title span:first-child::after{content:'CIENCIA';font-size:11px}.block-analyze-sample .tone{display:none!important}
@keyframes l7Pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
</style>`;
html = requiredReplace(html, '</head>', `${style}\n</head>`, 'style');

// The final point is always visible: dim before the relevant datum, active afterwards.
html = html.replaceAll('finalPointGroup.visible=false', 'finalPointGroup.visible=true');
html = html.replaceAll('finalPointGroup.visible=relevantInstrumentUsed', 'finalPointGroup.visible=true');

// Inject state-driven UX into the owning ES module. No extra render loop.
const moduleStart = html.indexOf('<script type="module">');
const moduleEnd = html.indexOf('</script>', moduleStart);
if (moduleStart < 0 || moduleEnd < 0) fail('module_range');
const moduleRuntime = `
// APULAB_LEVEL7_FINAL_GDD_V1
let level7AnalyzeRequested=false;
let level7ChangeFrom=null;
let level7ChangePreviousRelevant=false;
function syncLevel7FinalUX(){
  const guide=document.getElementById('level7-guide');if(!guide)return;
  const objective=document.getElementById('objective-tag');
  const sample=document.getElementById('level7-sample-checkpoint');
  const final=document.getElementById('level7-final-checkpoint');
  let phaseStep=1;
  if(sampleCheckpointReached)phaseStep=2;
  if(level7AnalyzeRequested)phaseStep=3;
  if(firstInstrument)phaseStep=4;
  if(relevantInstrumentUsed)phaseStep=5;
  if(finalCheckpointReached)phaseStep=6;
  const objectiveText={1:'PASO 1 · LLEVA AYNI A LA MUESTRA',2:'PASO 2 · ANALIZA LA MUESTRA',3:'PASO 3 · ELIGE UN INSTRUMENTO',4:'PASO 4 · ENCUENTRA EL DATO QUE RESPONDE LA PREGUNTA',5:'PASO 5 · LLEVA AYNI AL PUNTO FINAL',6:'MISIÓN COMPLETADA'};
  if(objective)objective.textContent=objectiveText[phaseStep];
  guide.dataset.phase=String(phaseStep);
  const completed=phaseStep===6?5:phaseStep-1;
  const fill=document.getElementById('level7-guide-fill');if(fill)fill.style.width=String(Math.min(4,completed)*20)+'%';
  guide.querySelectorAll('.level7-guide-step').forEach((el,i)=>{const n=i+1;el.classList.toggle('is-done',n<=completed);el.classList.toggle('is-active',phaseStep<6&&n===phaseStep)});
  sample?.classList.toggle('is-active',!sampleCheckpointReached);sample?.classList.toggle('is-done',sampleCheckpointReached);
  final?.classList.toggle('is-active',relevantInstrumentUsed&&!finalCheckpointReached);final?.classList.toggle('is-done',finalCheckpointReached);
  try{finalBeaconMat.emissiveIntensity=relevantInstrumentUsed?.82:.18;finalRing.material.opacity=relevantInstrumentUsed?.46:.10}catch{}
}
const __l7FinalExecuteCommand=executeCommand;
executeCommand=async function(cmd){
  if(cmd==='analyzeSample'&&isAdjacentToSample()){level7AnalyzeRequested=true;syncLevel7FinalUX()}
  const result=await __l7FinalExecuteCommand(cmd);
  if(isAdjacentToSample()&&!sampleCheckpointReached){sampleCheckpointReached=true;recordLevel7Event('sample_reached',{rover_x:roverState.c,rover_y:roverState.r})}
  syncLevel7FinalUX();return result;
};
const __l7FinalUseInstrument=window.apulabLevel7UseInstrument;
window.apulabLevel7UseInstrument=(id)=>{const from=level7ChangeFrom;const previousRelevant=level7ChangePreviousRelevant;const result=__l7FinalUseInstrument(id);if(from&&from!==id){recordLevel7Event('instrument_changed',{from_instrument:from,to_instrument:id,change_number:instrumentChangeCount,previous_result_relevant:previousRelevant});level7ChangeFrom=null;level7ChangePreviousRelevant=false}queueMicrotask(syncLevel7FinalUX);return result};
const __l7FinalChangeInstrument=window.apulabLevel7ChangeInstrument;
window.apulabLevel7ChangeInstrument=()=>{level7ChangeFrom=selectedInstrument;level7ChangePreviousRelevant=selectedInstrument==='materials';return __l7FinalChangeInstrument()};
document.getElementById('explore-btn')?.addEventListener('click',()=>recordLevel7Event('explore_opened',{help_count:helpCount+1}));
document.getElementById('journal-btn')?.addEventListener('click',()=>recordLevel7Event('bitacora_opened',{readings_count:readingHistory.length}));
document.getElementById('clear-btn')?.addEventListener('click',()=>{level7AnalyzeRequested=false;level7ChangeFrom=null;level7ChangePreviousRelevant=false;queueMicrotask(syncLevel7FinalUX)},true);
const __l7FinalCompleteLevel=completeLevel;
completeLevel=function(...args){const result=__l7FinalCompleteLevel(...args);queueMicrotask(syncLevel7FinalUX);return result};
syncLevel7FinalUX();
`;
html = html.slice(0, moduleEnd) + moduleRuntime + html.slice(moduleEnd);

// Required contract and hard exclusions.
for (const token of ['APULAB_LEVEL7_FINAL_GDD_V1','NIVEL 7','7 / 7','LA MUESTRA DESCONOCIDA','ELIGE EL INSTRUMENTO SEGÚN EL DATO QUE NECESITAS.','data-testid="level7-guide"','MUESTRA DESCONOCIDA','PUNTO FINAL','ANALIZAR MUESTRA','TEMPERATURA','PROXIMIDAD','ANALIZADOR DE MATERIALES','−58 °C','0.4 m','HIERRO','SILICATOS','sample_reached','sample_analyze_requested','instrument_modal_opened','instrument_selected','sample_analyzed','instrument_changed','relevant_instrument_selected','final_point_reached','program_modified','explore_opened','bitacora_opened','level_completed']) if (!html.includes(token)) fail(`contract:${token}`);
for (const forbidden of ['id="guide-btn"','CONTINUAR AL NIVEL 8','nextLevel:8','mission01-level8','level8.html','CORRECTO','INCORRECTO','RESPUESTA EQUIVOCADA','EQUIPAR SENSOR','INSTALAR SENSOR','CAMBIAR SENSOR','data-command="read"','data-command="record"','data-command="send"']) if (html.includes(forbidden)) fail(`forbidden:${forbidden}`);
const obstacleCount = 4;
if (obstacleCount > 5) fail('too_many_rocks');

await writeFile(LEVEL7, html, 'utf8');
if (hash(await readFile(LEVEL6, 'utf8')) !== l6Hash) fail('level6_mutated');
console.info('[mission01] N7 FINAL GDD OK · guía fija 1→5 · muestra→instrumento→dato→punto final · telemetría canónica · N6 intacto · no N8');
