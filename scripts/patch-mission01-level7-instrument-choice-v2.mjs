import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { LEVEL7_CONFIG as CFG } from './config/mission01-level7.mjs';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const LEVEL7 = resolve(OUT, 'level7.html');
const MANIFEST = resolve(OUT, 'manifest.json');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
const fail = (code) => { throw new Error(`mission01_level7_instrument_choice_v2:${code}`); };

function functionRange(source, marker) {
  const start = source.indexOf(marker);
  if (start < 0) fail(`function_start:${marker}`);
  const open = source.indexOf('{', start + marker.length);
  if (open < 0) fail(`function_open:${marker}`);
  let depth = 0, quote = '', escaped = false;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}' && --depth === 0) return { start, end: i + 1 };
  }
  fail(`function_end:${marker}`);
}
function replaceFunction(source, marker, replacement) {
  const { start, end } = functionRange(source, marker);
  return source.slice(0, start) + replacement + source.slice(end);
}

let html = await readFile(LEVEL7, 'utf8');
if (!html.includes('APULAB_LEVEL7_FROM_LEVEL5_V1')) fail('canonical_shell_missing');
if (!html.includes('APULAB_LEVEL7_SENSOR_UI_BRIDGE_V2')) fail('legacy_sensor_bridge_missing');
if (!html.includes('data-command="analyzeSample"')) fail('analyze_sample_missing');

// Keep the only new programmable action explicit and testable.
html = html.replace(
  'class="command-block block-analyze-sample" data-kind="cmd" data-command="analyzeSample"',
  'class="command-block block-analyze-sample" data-kind="cmd" data-command="analyzeSample" data-testid="block-analyze-sample"',
);

// Replace the old pre-equipment modal with an instrument decision that appears
// only when ANALIZAR MUESTRA is executed next to the sample.
const cards = CFG.sensorOptions.map((instrument) => `
<button class="sensor-option instrument-option" type="button" data-instrument="${instrument.id}" onclick="window.apulabLevel7UseInstrument?.(this.dataset.instrument)">
  <span class="sensor-icon">${instrument.icon}</span>
  <strong>${instrument.name}</strong>
  <p>${instrument.description}</p>
  <span class="instrument-use">USAR</span>
</button>`).join('');
const overlays = `<div id="sensor-overlay" role="dialog" aria-modal="true" aria-labelledby="sensor-title">
  <div class="sensor-modal">
    <h2 id="sensor-title">ANALIZAR MUESTRA</h2>
    <p class="sensor-question">Necesitamos saber de qué material está hecha esta piedra. ¿Qué instrumento es el más indicado?</p>
    <div class="sensor-grid">${cards}</div>
  </div>
</div>
<div id="analysis-overlay" role="dialog" aria-modal="true" aria-labelledby="analysis-title">
  <div class="analysis-modal">
    <h2 id="analysis-title">RESULTADO</h2>
    <div id="analysis-result" class="analysis-result"></div>
    <div class="analysis-actions">
      <button id="change-instrument-btn" class="secondary-science" type="button" onclick="window.apulabLevel7ChangeInstrument?.()">CAMBIAR INSTRUMENTO</button>
      <button id="continue-analysis-btn" class="primary-science" type="button" onclick="window.apulabLevel7ContinueAnalysis?.()">CONTINUAR</button>
    </div>
  </div>
</div>`;
const overlayStart = html.indexOf('<div id="sensor-overlay"');
const bodyEnd = html.indexOf('</body>', overlayStart);
if (overlayStart < 0 || bodyEnd < 0) fail('overlay_range');
html = html.slice(0, overlayStart) + overlays + '\n' + html.slice(bodyEnd);

const extraStyle = `<style id="apulab-level7-instrument-choice-v2-style">
.instrument-option{position:relative;padding-bottom:52px!important}.instrument-use{position:absolute;left:18px;right:18px;bottom:15px;text-align:center;background:#F4C75E;color:#17133A;border-radius:10px;padding:8px 10px;font-weight:900;letter-spacing:.02em}.instrument-option:focus-visible,#change-instrument-btn:focus-visible,#continue-analysis-btn:focus-visible,#continue-btn:focus-visible{outline:4px solid #F4C75E;outline-offset:4px}.final-point-label{pointer-events:none}
</style>`;
html = html.replace('</head>', `${extraStyle}\n</head>`);

// Add a physically separate mission endpoint. It stays hidden until the useful
// composition datum has been obtained.
const finalJson = JSON.stringify(CFG.goal);
const finalSceneMarker = 'const sensorVisuals=[];';
if (!html.includes(finalSceneMarker)) fail('scene_marker_missing');
const finalScene = `const finalCell=${finalJson};const finalPointGroup=new THREE.Group();scene.add(finalPointGroup);finalPointGroup.visible=false;const finalBase=new THREE.Mesh(new THREE.CylinderGeometry(.28,.34,.12,28),new THREE.MeshStandardMaterial({color:0x171A3D,roughness:.46,metalness:.18}));finalBase.position.y=.10;finalPointGroup.add(finalBase);const finalPole=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.68,12),new THREE.MeshStandardMaterial({color:0xC9F6F7,emissive:0x49C9D7,emissiveIntensity:.55,roughness:.34}));finalPole.position.y=.46;finalPointGroup.add(finalPole);const finalBeaconMat=new THREE.MeshStandardMaterial({color:0xF4C75E,emissive:0xF4C75E,emissiveIntensity:.7,roughness:.28});const finalBeacon=new THREE.Mesh(new THREE.SphereGeometry(.11,18,14),finalBeaconMat);finalBeacon.position.y=.84;finalPointGroup.add(finalBeacon);const finalRing=new THREE.Mesh(new THREE.RingGeometry(.38,.52,48),new THREE.MeshBasicMaterial({color:0xF4C75E,transparent:true,opacity:.42,side:THREE.DoubleSide}));finalRing.rotation.x=-Math.PI/2;finalRing.position.y=.035;finalPointGroup.add(finalRing);const finalCanvas=document.createElement('canvas');finalCanvas.width=512;finalCanvas.height=96;const fctx=finalCanvas.getContext('2d');fctx.fillStyle='rgba(11,14,38,.92)';fctx.fillRect(16,12,480,72);fctx.strokeStyle='#F4C75E';fctx.lineWidth=5;fctx.strokeRect(16,12,480,72);fctx.fillStyle='#FFF7E8';fctx.font='800 30px Poppins,sans-serif';fctx.textAlign='center';fctx.textBaseline='middle';fctx.fillText('PUNTO DE MISIÓN',256,48);const finalTexture=new THREE.CanvasTexture(finalCanvas);finalTexture.colorSpace=THREE.SRGBColorSpace;const finalLabel=new THREE.Sprite(new THREE.SpriteMaterial({map:finalTexture,transparent:true,depthTest:false}));finalLabel.position.set(0,1.18,0);finalLabel.scale.set(1.55,.29,1);finalPointGroup.add(finalLabel);const fp=cellPos(finalCell.c,finalCell.r);finalPointGroup.position.set(fp.x,.12,fp.z);const sensorVisuals=[];`;
html = html.replace(finalSceneMarker, finalScene);

// Replace the old equip-first state with explicit task state and study telemetry.
const commandsStart = html.indexOf('const commands=');
const commandsEnd = html.indexOf(';const MAX=', commandsStart);
if (commandsStart < 0 || commandsEnd < 0) fail('commands_range');
const runtimeState = `const commands={forward:{label:'AVANZAR',icon:'↑',cls:'block-forward',tone:'DO',freq:523.25},left:{label:'GIRAR IZQ.',icon:'↶',cls:'block-left',tone:'RE',freq:587.33},right:{label:'GIRAR DER.',icon:'↷',cls:'block-right',tone:'MI',freq:659.25},analyzeSample:{label:'ANALIZAR MUESTRA',icon:'🔬',cls:'block-analyze-sample',tone:'SCAN',freq:783.99,sensor:true}};const instrumentOptions=${JSON.stringify(CFG.sensorOptions)};const sampleCell=${JSON.stringify(CFG.sample)};let selectedInstrument=null,firstInstrument=null,finalInstrument=null,sampleAnalyzed=false,relevantInstrumentUsed=false,instrumentSelectionCount=0,instrumentChangeCount=0,sampleCheckpointReached=false,finalCheckpointReached=false,helpCount=0,attemptCount=0,programEditCount=0,lastProgramSignature='',lastReading=null,readingHistory=[],pendingAnalysisResolve=null,firstChoiceElapsedMs=null,relevantChoiceElapsedMs=null,hadIrrelevantFeedback=false,changedAfterIrrelevantFeedback=false,helpBeforeRelevantChoice=false;const level7StartedAt=performance.now();const elapsed7=()=>Math.max(0,Math.round(performance.now()-level7StartedAt));const isAdjacentToSample=()=>Math.abs(roverState.c-sampleCell.c)+Math.abs(roverState.r-sampleCell.r)===1;const atFinalCheckpoint=()=>roverState.c===finalCell.c&&roverState.r===finalCell.r;const instrumentById=(id)=>instrumentOptions.find(x=>x.id===id)||null;function recordLevel7Event(event,payload={}){const record={event,payload:{...payload,level:7,elapsed_ms:elapsed7(),attempt:attemptCount}};try{const key='apulab.level7.telemetry';const list=JSON.parse(sessionStorage.getItem(key)||'[]');list.push(record);sessionStorage.setItem(key,JSON.stringify(list.slice(-240)))}catch{}try{parent.postMessage({type:'apulab-level7-telemetry',event,payload:record.payload},location.origin)}catch{}}function repeatMetrics(){const repeats=program.filter(x=>isRepeat(x));return{used_repeat_n7:repeats.length>0,repeat_instances_n7:repeats.length}}function recordProgramMutation(kind='edit'){let signature='';try{signature=JSON.stringify(serialize(program))}catch{return}if(signature===lastProgramSignature)return;lastProgramSignature=signature;programEditCount+=1;recordLevel7Event('program_modified',{edit_kind:kind,program_edit_count:programEditCount,blocks_final:topCount(program),...repeatMetrics()})}function resetLevel7ScienceState(){selectedInstrument=null;sampleAnalyzed=false;relevantInstrumentUsed=false;sampleCheckpointReached=false;finalCheckpointReached=false;lastReading=null;readingHistory=[];pendingAnalysisResolve=null;finalPointGroup.visible=false;document.getElementById('sensor-overlay')?.classList.remove('visible');document.getElementById('analysis-overlay')?.classList.remove('visible')}function currentGuide(){if(relevantInstrumentUsed)return['CIERRA LA MISIÓN','Lleva AYNI al punto final.'];if(hadIrrelevantFeedback)return['PIENSA EN EL DATO','Piensa qué dato necesitamos para responder la pregunta.'];if(isAdjacentToSample())return['ANALIZA','Usa ANALIZAR MUESTRA.'];return['LLEGA A LA MUESTRA','Lleva AYNI hasta la muestra.']}`;
html = html.slice(0, commandsStart) + runtimeState + html.slice(commandsEnd);

const resultHtml = {
  temperature: '<strong>DATO OBTENIDO<br>−58 °C</strong><br><br>Ahora sabemos qué tan fría está la muestra.<br><br>Pero todavía no sabemos de qué material está hecha.',
  proximity: '<strong>DATO OBTENIDO<br>0.4 m</strong><br><br>Ahora sabemos qué tan cerca está la muestra.<br><br>Pero este dato no nos dice qué materiales contiene.',
  materials: '<strong>ANÁLISIS DE LA MUESTRA</strong><br><br>HIERRO<br>SILICATOS<br><br>Este dato sí nos ayuda a responder la pregunta.<br><br>La muestra contiene hierro y silicatos.',
};
const instrumentLogic = `function openInstrumentSelector(){document.getElementById('analysis-overlay')?.classList.remove('visible');const overlay=document.getElementById('sensor-overlay');overlay?.classList.add('visible');recordLevel7Event('instrument_modal_opened',{selection_order:instrumentSelectionCount+1});requestAnimationFrame(()=>overlay?.querySelector('.instrument-option')?.focus())}function showInstrumentResult(instrument){const relevant=instrument.id==='materials';const result=document.getElementById('analysis-result');if(result)result.innerHTML=${JSON.stringify(resultHtml)}[instrument.id]||'';document.getElementById('sensor-overlay')?.classList.remove('visible');const change=document.getElementById('change-instrument-btn'),cont=document.getElementById('continue-analysis-btn');if(change)change.style.display=relevant?'none':'';if(cont)cont.style.display=relevant?'':'none';document.getElementById('analysis-overlay')?.classList.add('visible');requestAnimationFrame(()=>document.getElementById(relevant?'continue-analysis-btn':'change-instrument-btn')?.focus())}function useInstrument(id){const instrument=instrumentById(id);if(!instrument)return;selectedInstrument=id;finalInstrument=id;instrumentSelectionCount+=1;if(!firstInstrument){firstInstrument=id;firstChoiceElapsedMs=elapsed7()}const relevant=id==='materials';sampleAnalyzed=true;lastReading=id;readingHistory.push({instrument:id,relevant});recordLevel7Event('instrument_selected',{instrument_type:id,selection_order:instrumentSelectionCount,relevant_to_question:relevant});recordLevel7Event('sample_analyzed',{instrument_type:id,reading_type:id==='temperature'?'temperature':id==='proximity'?'distance':'composition',relevant_to_question:relevant});if(relevant){relevantInstrumentUsed=true;relevantChoiceElapsedMs??=elapsed7();finalPointGroup.visible=true;recordLevel7Event('relevant_instrument_selected',{instrument_type:id,selection_order:instrumentSelectionCount,time_to_relevant_choice:relevantChoiceElapsedMs});feedback.textContent='Ya tenemos la información que necesitábamos. Lleva AYNI al punto final.'}else{hadIrrelevantFeedback=true;feedback.textContent=id==='temperature'?'Dato válido: conocemos la temperatura, pero no la composición.':'Dato válido: conocemos la distancia, pero no la composición.'}showInstrumentResult(instrument)}function changeInstrument(){if(!selectedInstrument)return;instrumentChangeCount+=1;if(hadIrrelevantFeedback)changedAfterIrrelevantFeedback=true;recordLevel7Event('instrument_changed',{from_instrument:selectedInstrument,instrument_change_count:instrumentChangeCount,changed_after_irrelevant_feedback:changedAfterIrrelevantFeedback});document.getElementById('analysis-overlay')?.classList.remove('visible');openInstrumentSelector()}function continueRelevantAnalysis(){if(!relevantInstrumentUsed)return;document.getElementById('analysis-overlay')?.classList.remove('visible');const resolve=pendingAnalysisResolve;pendingAnalysisResolve=null;resolve?.(true);showStatus('Ya tenemos la información que necesitábamos. Lleva AYNI al punto final.',2400)}function waitForRelevantInstrument(){return new Promise(resolve=>{pendingAnalysisResolve=resolve;openInstrumentSelector()})}`;
const executeStart = html.indexOf('async function executeCommand(');
if (executeStart < 0) fail('execute_command_missing');
html = html.slice(0, executeStart) + instrumentLogic + '\n' + html.slice(executeStart);

html = replaceFunction(html, 'async function executeCommand(', `async function executeCommand(cmd){if(cmd==='analyzeSample'){await playCmd(cmd);recordLevel7Event('sample_analyze_requested',{at_sample:isAdjacentToSample()});if(!isAdjacentToSample())throw {code:'SAMPLE_POSITION',message:'AYNI necesita estar junto a la muestra para analizarla.'};if(!sampleCheckpointReached){sampleCheckpointReached=true;recordLevel7Event('sample_checkpoint_reached',{c:roverState.c,r:roverState.r})}if(relevantInstrumentUsed){feedback.textContent='La composición ya fue obtenida. Continúa hacia el punto final.';await sleep(220);return}await waitForRelevantInstrument();return}await executeMovementCommand(cmd);if(relevantInstrumentUsed&&atFinalCheckpoint()&&!finalCheckpointReached){finalCheckpointReached=true;recordLevel7Event('final_checkpoint_reached',{c:roverState.c,r:roverState.r})}}`);

html = replaceFunction(html, 'async function runProgram(', `async function runProgram(){ensureAudio();if(executing)return;if(needsAdjustment){needsAdjustment=false;resetRover();finalPointGroup.visible=relevantInstrumentUsed;setEditing(true);document.getElementById('run-btn').textContent='▶ INICIAR PRUEBA';feedback.textContent='Programa conservado. Ajusta solo lo necesario y vuelve a probar.';return}if(!program.length)return showStatus('Arrastra al menos un bloque.');if(program.some(x=>isRepeat(x)&&!x.body.length))return showStatus('Cada REPETIR necesita al menos un bloque dentro.');attemptCount+=1;recordLevel7Event('program_started',{program_blocks:topCount(program),program_edit_count:programEditCount,...repeatMetrics()});executing=true;setEditing(false);document.getElementById('run-btn').disabled=true;resetRover();finalPointGroup.visible=relevantInstrumentUsed;lastFailure=null;let done=0;try{for(let i=0;i<program.length;i++){const item=program[i];if(isCmd(item)){renderProgram({top:i,body:null,iter:0},done);feedback.textContent='Línea '+String(i+1).padStart(2,'0')+' · '+commands[item.cmd].label;try{await executeCommand(item.cmd)}catch(err){throw {...err,top:i,body:null,iter:null,count:null}}}else{for(let iter=0;iter<item.count;iter++)for(let j=0;j<item.body.length;j++){renderProgram({top:i,body:j,iter},done);feedback.textContent='REPETIR '+(iter+1)+'/'+item.count+' · '+commands[item.body[j].cmd].label;try{await executeCommand(item.body[j].cmd)}catch(err){throw {...err,top:i,body:j,iter,count:item.count}}}}done=i+1}renderProgram(null,program.length);if(!relevantInstrumentUsed){feedback.textContent='Todavía falta obtener un dato que responda de qué material está hecha la muestra.';showStatus('Piensa qué información necesitamos para responder la pregunta.',2600);return}if(!atFinalCheckpoint()){feedback.textContent='Ya tenemos la información que necesitábamos. Lleva AYNI al punto final.';showStatus('Lleva AYNI al PUNTO DE MISIÓN.',2300);return}if(!finalCheckpointReached){finalCheckpointReached=true;recordLevel7Event('final_checkpoint_reached',{c:roverState.c,r:roverState.r})}completeLevel()}catch(err){lastFailure={top:err.top,body:err.body,iter:err.iter,count:err.count};renderProgram({top:err.top,body:err.body,iter:err.iter||0},Math.max(0,err.top));if(err.code==='BLOCKED')feedback.textContent='CAMINO BLOQUEADO · Hay una roca delante de AYNI.';else if(err.code==='SAMPLE_POSITION')feedback.textContent=err.message;else feedback.textContent='AYNI llegó al borde del simulador. Revisa el bloque resaltado.';needsAdjustment=true;setEditing(false);document.getElementById('run-btn').textContent='🔧 AJUSTAR PROGRAMA';showStatus(feedback.textContent,2900)}finally{executing=false;document.getElementById('run-btn').disabled=false;if(!needsAdjustment)setEditing(true)}}`);

html = replaceFunction(html, 'function completeLevel(', `function completeLevel(){document.getElementById('sensor-overlay')?.classList.remove('visible');document.getElementById('analysis-overlay')?.classList.remove('visible');document.getElementById('info-panel')?.classList.remove('visible');document.getElementById('journal-overlay')?.classList.remove('visible');if(!relevantInstrumentUsed||!atFinalCheckpoint())return;phase='complete';finalCheckpointReached=true;finalProgram=clone(program);successMusic();launchConfetti(220);const metrics={first_instrument:firstInstrument,final_instrument:finalInstrument,first_choice_relevant:firstInstrument==='materials',instrument_selection_count:instrumentSelectionCount,instrument_change_count:instrumentChangeCount,changed_after_irrelevant_feedback:changedAfterIrrelevantFeedback,time_to_first_choice:firstChoiceElapsedMs,time_to_relevant_choice:relevantChoiceElapsedMs,help_before_relevant_choice:helpBeforeRelevantChoice,program_edit_count:programEditCount,completion_time:elapsed7(),completed_level:true,...repeatMetrics()};recordLevel7Event('mission_completed',metrics);try{localStorage.setItem('apulab.level7.finalProgram',JSON.stringify(serialize(finalProgram)));localStorage.setItem('apulab.level7.instrumentMetrics',JSON.stringify(metrics));localStorage.setItem('apulab.mission01.completed','1')}catch{}document.getElementById('success-program-summary').textContent='Programa final: '+topCount(program)+' bloques.';const data=document.getElementById('success-data');if(data)data.textContent='MATERIALES · Hierro · Silicatos';const title=document.querySelector('#success-overlay h2');if(title)title.textContent='MISIÓN COMPLETADA';const body=document.querySelector('#success-overlay p');if(body)body.textContent='AYNI investigó la muestra y ApuLab obtuvo la información necesaria. Estos datos ayudarán al equipo a comprender mejor el entorno que Yachay está explorando.';const button=document.getElementById('continue-btn');if(button)button.textContent='FINALIZAR MISIÓN';document.getElementById('success-overlay').classList.add('visible')}`);

html = replaceFunction(html, 'function openJournal(', `function openJournal(){document.getElementById('info-panel')?.classList.remove('visible');document.getElementById('success-overlay')?.classList.remove('visible');document.getElementById('journal-meta').textContent='MISIÓN 01 · NIVEL 7';document.getElementById('journal-title').textContent='LA MUESTRA DESCONOCIDA';const lines=['PREGUNTA · ¿De qué material está hecha la muestra?'];for(const row of readingHistory){if(row.instrument==='temperature')lines.push('TEMPERATURA · −58 °C');else if(row.instrument==='proximity')lines.push('DISTANCIA · 0.4 m');else if(row.instrument==='materials')lines.push('MATERIALES · Hierro · Silicatos')}document.getElementById('journal-text').textContent=lines.join(' | ');const jp=document.getElementById('journal-program');const source=finalProgram||program;jp.innerHTML='';if(source&&source.length){source.slice(0,16).forEach((x,i)=>{const d=document.createElement('div');if(isCmd(x))d.textContent=String(i+1).padStart(2,'0')+' · '+(commands[x.cmd]?.label||x.cmd);else if(isRepeat(x))d.textContent=String(i+1).padStart(2,'0')+' · REPETIR × '+x.count+' ['+x.body.map(b=>commands[b.cmd]?.label||b.cmd).join(', ')+']';jp.appendChild(d)})}else jp.textContent='Construye el recorrido de AYNI hasta la muestra.';document.getElementById('journal-overlay').classList.add('visible')}`);

// Dynamic guide: state-based scaffolding without revealing the useful instrument.
const guideStart = html.indexOf("document.getElementById('guide-btn').onclick=()=>{");
const guideEndMarker = ";document.getElementById('info-close').onclick=";
const guideEnd = html.indexOf(guideEndMarker, guideStart);
if (guideStart < 0 || guideEnd < 0) fail('guide_handler_range');
const guideHandler = `document.getElementById('guide-btn').onclick=()=>{guideOpened=true;helpCount+=1;if(!relevantInstrumentUsed)helpBeforeRelevantChoice=true;recordLevel7Event('help_requested',{help_type:'guide',help_count:helpCount});const step=currentGuide();showInfo('GUÍA',step[0],step[1],'','')}`;
html = html.slice(0, guideStart) + guideHandler + html.slice(guideEnd);

// Observe EXPLORAR without changing its existing two-state presentation.
const bridgeStart = html.indexOf('// APULAB_LEVEL7_SENSOR_UI_BRIDGE_V2');
const bridgeEnd = html.indexOf('</script>', bridgeStart);
if (bridgeStart < 0 || bridgeEnd < 0) fail('ui_bridge_range');
const uiBridge = `// APULAB_LEVEL7_INSTRUMENT_UI_V2\nwindow.apulabLevel7UseInstrument=(id)=>useInstrument(id);\nwindow.apulabLevel7ChangeInstrument=()=>changeInstrument();\nwindow.apulabLevel7ContinueAnalysis=()=>continueRelevantAnalysis();\nconst __l7RenderProgram=renderProgram;renderProgram=function(...args){const result=__l7RenderProgram(...args);if(!executing)queueMicrotask(()=>recordProgramMutation('editor'));return result};\ndocument.getElementById('clear-btn')?.addEventListener('click',()=>{resetLevel7ScienceState();queueMicrotask(()=>recordProgramMutation('clear'))},true);\ndocument.getElementById('explore-btn')?.addEventListener('click',()=>{helpCount+=1;if(!relevantInstrumentUsed)helpBeforeRelevantChoice=true;recordLevel7Event('help_requested',{help_type:'explore',help_count:helpCount})});\nlastProgramSignature=JSON.stringify(serialize(program));recordLevel7Event('level_started',{question:'¿De qué material está hecha la muestra?'});\nwindow.apulabLevel7QA={getState:()=>({sampleCheckpointReached,selectedInstrument,firstInstrument,finalInstrument,sampleAnalyzed,relevantInstrumentUsed,instrumentSelectionCount,instrumentChangeCount,helpCount,attemptCount,finalCheckpointReached,programEditCount,hadIrrelevantFeedback,changedAfterIrrelevantFeedback,atSample:isAdjacentToSample(),atFinal:atFinalCheckpoint(),...repeatMetrics()}),useInstrument,changeInstrument,continueRelevantAnalysis};\n`;
html = html.slice(0, bridgeStart) + uiBridge + html.slice(bridgeEnd);

// Keep the endpoint visually alive without adding another render loop.
const renderToken = 'sampleRingMat.opacity=.14+.14*p;sampleRing.rotation.z=t*.18;questionSprite.position.y=.92+.045*Math.sin(t*1.8);';
if (html.includes(renderToken)) html = html.replace(renderToken, `${renderToken}if(finalPointGroup.visible){finalBeaconMat.emissiveIntensity=.55+.35*p;finalRing.material.opacity=.30+.18*p;}`);

// Two Explore states, no repeat hint and no answer leak.
html = html.replaceAll('${exploreIndex+1} / 4', '${exploreIndex+1} / 2');
html = html.replaceAll('MUESTRA DE INTERÉS', 'MUESTRA DESCONOCIDA');
html = html.replaceAll('CAMBIAR SENSOR', 'CAMBIAR INSTRUMENTO');
html = html.replaceAll('ANALIZADOR DE MINERALES', 'ANALIZADOR DE MATERIALES');
html = html.replaceAll('SENSOR DE TEMPERATURA', 'TEMPERATURA');
html = html.replaceAll('SENSOR DE PROXIMIDAD', 'PROXIMIDAD');

for (const forbidden of [
  'EQUIPA UN SENSOR', 'EQUIPAR SENSOR', 'RANURA DE SENSOR', 'Sensor equipado:',
  'Usa REPETIR', 'DESBLOQUEAR REPETIR', 'if(!usesRepeat())', 'nextLevel:8',
  'CONTINUAR AL NIVEL 8', 'ESPECTRÓMETRO', 'CORRECTO', 'INCORRECTO',
]) if (html.includes(forbidden)) fail(`forbidden:${forbidden}`);
for (const required of [
  'APULAB_LEVEL7_INSTRUMENT_UI_V2', 'data-testid="block-analyze-sample"',
  'MUESTRA DESCONOCIDA', 'PUNTO DE MISIÓN', 'ANALIZAR MUESTRA',
  'TEMPERATURA', 'PROXIMIDAD', 'ANALIZADOR DE MATERIALES',
  'CAMBIAR INSTRUMENTO', '−58 °C', '0.4 m', 'HIERRO', 'SILICATOS',
  'instrument_selected', 'instrument_changed', 'relevant_instrument_selected',
  'final_checkpoint_reached', 'mission_completed', 'used_repeat_n7',
]) if (!html.includes(required)) fail(`missing:${required}`);

await writeFile(LEVEL7, html, 'utf8');
const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
const entry = (manifest.levels || []).find((x) => Number(x.level) === 7);
if (!entry) fail('manifest_entry');
entry.bytes = Buffer.byteLength(html, 'utf8');
entry.sha256 = hash(html);
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.info('[mission01] Nivel 7 V2 · pregunta→dato→instrumento→resultado · selector al analizar · punto final · REPETIR opcional · telemetría conductual');
