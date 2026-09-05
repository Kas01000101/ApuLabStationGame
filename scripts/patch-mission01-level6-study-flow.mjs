import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { LEVEL6_CONFIG as CFG } from './config/mission01-level6.mjs';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const LEVEL5 = resolve(OUT, 'level5.html');
const LEVEL6 = resolve(OUT, 'level6.html');
const LEVEL7 = resolve(OUT, 'level7.html');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
const fail = (code) => { throw new Error(`mission01_level6_study_flow:${code}`); };

function required(source, before, after, code) {
  if (!source.includes(before)) fail(`missing:${code}`);
  return source.replace(before, after);
}

function functionRange(source, marker) {
  const start = source.indexOf(marker);
  if (start < 0) fail(`function_start:${marker}`);
  const open = source.indexOf('{', start + marker.length);
  if (open < 0) fail(`function_open:${marker}`);
  let depth = 0;
  let quote = '';
  let escaped = false;
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

const l5Before = await readFile(LEVEL5, 'utf8');
const l7Before = await readFile(LEVEL7, 'utf8');
const l5Hash = hash(l5Before);
const l7Hash = hash(l7Before);
let html = await readFile(LEVEL6, 'utf8');

if (!html.includes('APULAB_LEVEL6_FROM_LEVEL5_V1')) fail('wrong_level6_source');
if (!html.includes('data-apulab-level="6"')) fail('wrong_level');

html = html
  .replaceAll('MISIÓN CIENTÍFICA', 'INVESTIGAR')
  .replaceAll('PUNTO DE ESTUDIO', 'ZONA DE INTERÉS')
  .replaceAll('punto de estudio cyan', 'zona de interés cyan')
  .replaceAll('punto de estudio', 'zona de interés')
  .replaceAll('MUESTRA OBTENIDA', 'DATO OBTENIDO')
  .replaceAll('ESCANEANDO MUESTRA', 'OBTENIENDO DATOS')
  .replaceAll('ANÁLISIS COMPLETO', 'RESULTADO INTERPRETADO')
  .replaceAll('TRANSMITIENDO A APULAB STATION', 'ENVIANDO A APULAB STATION');

const communicationMarker = `
// APULAB_LEVEL6_TWO_CHECKPOINTS_V1
const communicationPoint=${JSON.stringify(CFG.communicationZone)};
const communicationGroup=new THREE.Group();scene.add(communicationGroup);
const communicationBase=new THREE.Mesh(new THREE.CylinderGeometry(.28,.34,.10,28),new THREE.MeshStandardMaterial({color:0x17133A,roughness:.42,metalness:.22}));communicationBase.position.y=.11;communicationGroup.add(communicationBase);
const communicationPole=new THREE.Mesh(new THREE.CylinderGeometry(.045,.055,.72,18),new THREE.MeshStandardMaterial({color:0x8E7DCE,emissive:0x4D4288,emissiveIntensity:.55,roughness:.34,metalness:.28}));communicationPole.position.y=.46;communicationGroup.add(communicationPole);
const communicationDish=new THREE.Mesh(new THREE.SphereGeometry(.18,24,12,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:0xA8EDF1,emissive:0x49C9D7,emissiveIntensity:.48,roughness:.3,metalness:.15}));communicationDish.rotation.x=Math.PI/2;communicationDish.rotation.z=-.32;communicationDish.position.set(.08,.82,0);communicationGroup.add(communicationDish);
const communicationRingMat=new THREE.MeshBasicMaterial({color:0x8E7DCE,transparent:true,opacity:.34,depthWrite:false});
const communicationRing=new THREE.Mesh(new THREE.RingGeometry(.30,.45,40),communicationRingMat);communicationRing.rotation.x=-Math.PI/2;communicationRing.position.y=.16;communicationGroup.add(communicationRing);
function makeCommunicationLabelTexture(){const c=document.createElement('canvas');c.width=640;c.height=112;const x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);x.fillStyle='rgba(11,14,38,.92)';x.fillRect(16,12,608,88);x.strokeStyle='#8E7DCE';x.lineWidth=6;x.strokeRect(16,12,608,88);x.fillStyle='#F8F9FA';x.font='800 34px Poppins, sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('PUNTO DE COMUNICACIÓN',320,57);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
const communicationLabel=new THREE.Sprite(new THREE.SpriteMaterial({map:makeCommunicationLabelTexture(),transparent:true,depthTest:false}));communicationLabel.position.set(0,1.18,0);communicationLabel.scale.set(2.04,.36,1);communicationGroup.add(communicationLabel);
`;
html = required(html, 'const flag=studyCore;', `const flag=studyCore;${communicationMarker}`, 'communication_marker');

const loadBoardStage = `function loadBoardStage(){stageIndex=0;start={...stages[0].start};goal={...stages[0].goal};const gp=cellPos(goal.c,goal.r);flagGroup.position.set(gp.x,.22,gp.z);const cp=cellPos(communicationPoint.c,communicationPoint.r);communicationGroup.position.set(cp.x,.22,cp.z);startRing.position.copy(cellPos(start.c,start.r));startRing.position.y=.30;setRover(start.c,start.r,start.dir);rebuildObstacles();document.getElementById('objective-tag').textContent=${JSON.stringify(CFG.objective)}}`;
html = replaceFunction(html, 'function loadBoardStage(', loadBoardStage);

const oldState = "let scienceScanned=false,scienceAnalyzed=false,scienceSent=false;const atSciencePoint=()=>roverState.c===goal.c&&roverState.r===goal.r;function resetScienceState(){scienceScanned=false;scienceAnalyzed=false;scienceSent=false}";
const telemetryState = `let scienceScanned=false,scienceAnalyzed=false,scienceSent=false;
let level6Attempt=0,level6HelpCount=0,level6PrematureCount=0,level6ProgramEditCount=0,level6LastProgramSignature='',level6ScienceOrder=[];
const level6StartedAt=performance.now();
const atSciencePoint=()=>roverState.c===goal.c&&roverState.r===goal.r;
const atCommunicationPoint=()=>roverState.c===communicationPoint.c&&roverState.r===communicationPoint.r;
function resetScienceState(){scienceScanned=false;scienceAnalyzed=false;scienceSent=false;level6ScienceOrder=[]}
function level6Context(){let participant_id=null,session_id=null;try{participant_id=localStorage.getItem('participant_id')||localStorage.getItem('apulab.participant_id')||sessionStorage.getItem('participant_id')||sessionStorage.getItem('apulab.participant_id');session_id=localStorage.getItem('session_id')||localStorage.getItem('apulab.session_id')||sessionStorage.getItem('session_id')||sessionStorage.getItem('apulab.session_id')}catch{}return {participant_id,session_id,level:6}}
function emitLevel6Event(event,payload={}){const record={event,payload:{...level6Context(),...payload},timestamp:new Date().toISOString()};try{const key='apulab.level6.telemetry';const current=JSON.parse(sessionStorage.getItem(key)||'[]');current.push(record);sessionStorage.setItem(key,JSON.stringify(current.slice(-200)))}catch{}try{parent.postMessage({type:'apulab-level6-telemetry',...record},location.origin)}catch{}return record}
function level6Elapsed(){return Math.round(performance.now()-level6StartedAt)}
function level6ProgramSignature(){try{return JSON.stringify(serialize(program))}catch{return JSON.stringify(program)}}
window.addEventListener('load',()=>{emitLevel6Event('level_started',{elapsed_ms:0});document.getElementById('guide-btn')?.addEventListener('click',()=>{level6HelpCount+=1;emitLevel6Event('help_requested',{source:'guide',help_count:level6HelpCount,elapsed_ms:level6Elapsed()})});document.getElementById('explore-btn')?.addEventListener('click',()=>{level6HelpCount+=1;emitLevel6Event('help_requested',{source:'explore',help_count:level6HelpCount,elapsed_ms:level6Elapsed()})})},{once:true})`;
html = required(html, oldState, telemetryState, 'science_state');

const executeCommand = `async function executeCommand(cmd){
  if(cmd==='scan'){
    emitLevel6Event('scan_started',{attempt:level6Attempt,rover_cell:{c:roverState.c,r:roverState.r},elapsed_ms:level6Elapsed()});
    await playCmd(cmd);
    if(!atSciencePoint()){
      level6PrematureCount+=1;emitLevel6Event('premature_action',{attempt:level6Attempt,attempted_action:'scan',reason:'not_at_scientific_zone',elapsed_ms:level6Elapsed()});
      throw {code:'SCIENCE_POSITION',message:'AYNI necesita estar en la zona de interés para obtener datos.'};
    }
    emitLevel6Event('science_action',{attempt:level6Attempt,action:'scan',order_index:level6ScienceOrder.length,valid_state:true,rover_cell:{c:roverState.c,r:roverState.r},elapsed_ms:level6Elapsed()});
    if(scienceScanned){feedback.textContent='Los datos de esta zona ya fueron registrados.';showStatus(feedback.textContent,1500);return}
    feedback.textContent='OBTENIENDO DATOS...';showStatus('OBTENIENDO DATOS...',800);await sleep(520);scienceScanned=true;level6ScienceOrder.push('scan');feedback.textContent='DATO OBTENIDO';showStatus('DATO OBTENIDO',1100);emitLevel6Event('scan_completed',{attempt:level6Attempt,elapsed_ms:level6Elapsed()});await sleep(140);return;
  }
  if(cmd==='analyze'){
    emitLevel6Event('analyze_started',{attempt:level6Attempt,rover_cell:{c:roverState.c,r:roverState.r},elapsed_ms:level6Elapsed()});
    await playCmd(cmd);
    if(!scienceScanned){level6PrematureCount+=1;emitLevel6Event('premature_action',{attempt:level6Attempt,attempted_action:'analyze',reason:'no_data',elapsed_ms:level6Elapsed()});throw {code:'SCIENCE_ORDER',message:'AYNI todavía no tiene datos para analizar.'}}
    if(!atSciencePoint()){level6PrematureCount+=1;emitLevel6Event('premature_action',{attempt:level6Attempt,attempted_action:'analyze',reason:'left_scientific_zone',elapsed_ms:level6Elapsed()});throw {code:'SCIENCE_POSITION',message:'Interpreta el dato mientras AYNI está en la zona de interés.'}}
    emitLevel6Event('science_action',{attempt:level6Attempt,action:'analyze',order_index:level6ScienceOrder.length,valid_state:true,rover_cell:{c:roverState.c,r:roverState.r},elapsed_ms:level6Elapsed()});
    if(scienceAnalyzed){feedback.textContent='El resultado ya fue interpretado: zona de interés identificada.';showStatus(feedback.textContent,1700);return}
    feedback.textContent='INTERPRETANDO DATOS...';showStatus('INTERPRETANDO DATOS...',800);await sleep(520);scienceAnalyzed=true;level6ScienceOrder.push('analyze');feedback.textContent='RESULTADO: ZONA DE INTERÉS IDENTIFICADA';showStatus('RESULTADO INTERPRETADO',1200);emitLevel6Event('analyze_completed',{attempt:level6Attempt,elapsed_ms:level6Elapsed()});await sleep(140);return;
  }
  if(cmd==='send'){
    await playCmd(cmd);
    if(!scienceAnalyzed){level6PrematureCount+=1;emitLevel6Event('premature_action',{attempt:level6Attempt,attempted_action:'send',reason:'not_analyzed',elapsed_ms:level6Elapsed()});throw {code:'SCIENCE_ORDER',message:'Primero necesitamos interpretar los datos.'}}
    if(!atCommunicationPoint()){level6PrematureCount+=1;emitLevel6Event('premature_action',{attempt:level6Attempt,attempted_action:'send',reason:'not_at_communication_point',elapsed_ms:level6Elapsed()});throw {code:'COMM_POSITION',message:'Lleva AYNI al punto de comunicación para enviar el resultado.'}}
    emitLevel6Event('science_action',{attempt:level6Attempt,action:'send',order_index:level6ScienceOrder.length,valid_state:true,rover_cell:{c:roverState.c,r:roverState.r},elapsed_ms:level6Elapsed()});
    if(scienceSent){feedback.textContent='El resultado ya fue enviado a ApuLab Station.';showStatus(feedback.textContent,1500);return}
    feedback.textContent='ENVIANDO A APULAB STATION...';showStatus('ENVIANDO A APULAB STATION...',900);await sleep(560);scienceSent=true;level6ScienceOrder.push('send');feedback.textContent='TRANSMISIÓN COMPLETA · APULAB STATION RECIBIÓ EL RESULTADO';showStatus('DATOS ENVIADOS A APULAB STATION',1300);emitLevel6Event('data_sent',{attempt:level6Attempt,scanned_first:level6ScienceOrder[0]==='scan',analyzed_first:level6ScienceOrder[1]==='analyze',science_order:[...level6ScienceOrder],elapsed_ms:level6Elapsed()});await sleep(140);return;
  }
  return executeMovementCommand(cmd);
}`;
html = replaceFunction(html, 'async function executeCommand(', executeCommand);

const runProgram = `async function runProgram(){
  ensureAudio();
  if(executing)return;
  if(!program.length)return showStatus('Arrastra al menos un bloque.');
  if(program.some(x=>isRepeat(x)&&!x.body.length))return showStatus('Cada REPETIR necesita al menos un bloque dentro.');
  const signature=level6ProgramSignature();if(level6LastProgramSignature&&signature!==level6LastProgramSignature){level6ProgramEditCount+=1;emitLevel6Event('program_modified',{edit_count:level6ProgramEditCount,elapsed_ms:level6Elapsed()})}level6LastProgramSignature=signature;
  level6Attempt+=1;emitLevel6Event('program_started',{attempt:level6Attempt,elapsed_ms:level6Elapsed()});
  executing=true;setEditing(false);document.getElementById('run-btn').disabled=true;resetRover();resetScienceState();lastFailure=null;let done=0;
  try{
    for(let i=0;i<program.length;i++){
      const item=program[i];
      if(isCmd(item)){
        renderProgram({top:i,body:null,iter:0},done);feedback.textContent=\`Línea \${String(i+1).padStart(2,'0')} · \${commands[item.cmd].label}\`;
        try{await executeCommand(item.cmd)}catch(err){throw {...err,top:i,body:null,iter:null,count:null}}
      }else{
        for(let iter=0;iter<item.count;iter++)for(let j=0;j<item.body.length;j++){
          renderProgram({top:i,body:j,iter},done);feedback.textContent=\`REPETIR \${iter+1}/\${item.count} · \${commands[item.body[j].cmd].label}\`;
          try{await executeCommand(item.body[j].cmd)}catch(err){throw {...err,top:i,body:j,iter,count:item.count}}
        }
      }
      done=i+1;
    }
    renderProgram(null,program.length);
    if(!scienceScanned||!scienceAnalyzed||!scienceSent){feedback.textContent='Completa el proceso: OBTENER → INTERPRETAR → COMUNICAR.';showStatus('Todavía falta una parte de la investigación.',2200);setEditing(true);return}
    completeLevel();
  }catch(err){
    lastFailure={top:err.top,body:err.body,iter:err.iter,count:err.count};renderProgram({top:err.top,body:err.body,iter:err.iter||0},Math.max(0,err.top));
    if(err.code==='BLOCKED')feedback.textContent=err.count?\`CAMINO BLOQUEADO · La repetición \${err.iter+1}/\${err.count} llevó a AYNI hacia una roca.\`:'CAMINO BLOQUEADO · Hay una roca delante de AYNI.';
    else if(err.code==='SCIENCE_POSITION'||err.code==='SCIENCE_ORDER'||err.code==='COMM_POSITION')feedback.textContent=err.message;
    else feedback.textContent='AYNI llegó al borde del simulador. Revisa el bloque resaltado.';
    setEditing(true);document.getElementById('run-btn').textContent='▶ VOLVER A PROBAR';showStatus(feedback.textContent,2800);
  }finally{executing=false;document.getElementById('run-btn').disabled=false;setEditing(true)}
}`;
html = replaceFunction(html, 'async function runProgram(', runProgram);

const completeLevel = `function completeLevel(){phase='complete';finalProgram=clone(program);successMusic();launchConfetti(190);try{localStorage.setItem('apulab.level6.finalProgram',JSON.stringify(serialize(finalProgram)));localStorage.setItem('apulab.level6.idea','OBTENER → INTERPRETAR → COMUNICAR')}catch{}const scienceOrderCorrect=level6ScienceOrder.join('>')==='scan>analyze>send';emitLevel6Event('level_completed',{attempts:level6Attempt,completion_time_ms:level6Elapsed(),help_count:level6HelpCount,premature_action_count:level6PrematureCount,program_edit_count:level6ProgramEditCount,science_order_correct:scienceOrderCorrect,first_attempt_success:level6Attempt===1,completed_level:true});document.getElementById('success-program-summary').textContent=\`Programa científico: \${topCount(program)} bloques.\`;const data=document.getElementById('success-data');if(data)data.textContent='Dato obtenido · Resultado interpretado · Resultado enviado a ApuLab Station';document.getElementById('success-overlay').classList.add('visible')}`;
html = replaceFunction(html, 'function completeLevel(', completeLevel);

const guideHandlerStart = html.indexOf("document.getElementById('guide-btn').onclick=()=>{");
const guideHandlerEnd = html.indexOf(";document.getElementById('info-close').onclick=", guideHandlerStart);
if (guideHandlerStart < 0 || guideHandlerEnd < 0) fail('guide_handler');
const guideHandler = `document.getElementById('guide-btn').onclick=()=>{guideOpened=true;document.getElementById('guide-btn').classList.remove('is-recommended');guideStage=(guideStage+1)%5;const steps=${JSON.stringify(CFG.guide)};const step=steps[guideStage];const hints=['Observa primero el tablero.','ESCANEAR obtiene información.','ANALIZAR necesita un dato previo.','Busca la baliza de comunicación.','ENVIAR DATOS comunica el resultado a la estación.'];showInfo('GUÍA',step[0],step[1],hints[guideStage],'')}`;
html = html.slice(0, guideHandlerStart) + guideHandler + html.slice(guideHandlerEnd);

const openJournal = `function openJournal(){document.getElementById('journal-meta').textContent='MISIÓN 01 · NIVEL 6';document.getElementById('journal-title').textContent='INVESTIGAR · DATOS CIENTÍFICOS';document.getElementById('journal-text').textContent=\`Zona científica: \${scienceScanned?'dato obtenido':'pendiente'} · Interpretación: \${scienceAnalyzed?'completada':'pendiente'} · Comunicación: \${scienceSent?'resultado enviado':'pendiente'}.\`;const jp=document.getElementById('journal-program');const source=finalProgram||program;jp.innerHTML='';if(source&&source.length){source.slice(0,16).forEach((x,i)=>{const d=document.createElement('div');if(isCmd(x))d.textContent=\`\${String(i+1).padStart(2,'0')} · \${commands[x.cmd]?.label||x.cmd}\`;else if(isRepeat(x))d.textContent=\`\${String(i+1).padStart(2,'0')} · REPETIR × \${x.count} [\${x.body.map(b=>commands[b.cmd]?.label||b.cmd).join(', ')}]\`;jp.appendChild(d)})}else jp.textContent='Todavía no hay un programa registrado.';document.getElementById('journal-overlay').classList.add('visible')}`;
html = replaceFunction(html, 'function openJournal(', openJournal);

html = html
  .replace(/<h2>¡NIVEL 6 COMPLETADO!<\/h2><p>[\s\S]*?<\/p><div class="journal-card">/, `<h2>¡NIVEL 6 COMPLETADO!</h2><p>AYNI obtuvo información, la interpretó y comunicó el resultado a ApuLab Station.</p><div class="journal-card">`)
  .replace(/<small>BITÁCORA ACTUALIZADA<\/small><strong>[\s\S]*?<\/strong>/, `<small>BITÁCORA ACTUALIZADA</small><strong>OBTENER → INTERPRETAR → COMUNICAR</strong>`)
  .replaceAll('Usa REPETIR para llegar a la zona de interés y completa el ciclo científico.', 'Investiga la zona y comunica el resultado a ApuLab Station.')
  .replaceAll('Usa REPETIR para llegar al punto de estudio y completa el ciclo científico.', 'Investiga la zona y comunica el resultado a ApuLab Station.');

for (const token of [
  'APULAB_LEVEL6_TWO_CHECKPOINTS_V1',
  'ZONA DE INTERÉS',
  'PUNTO DE COMUNICACIÓN',
  'DATO OBTENIDO',
  'RESULTADO INTERPRETADO',
  'DATOS ENVIADOS A APULAB STATION',
  "atCommunicationPoint",
  "science_order_correct",
  "premature_action",
  "data_sent",
]) if (!html.includes(token)) fail(`contract:${token}`);

if (html.includes("if(!usesRepeat())")) fail('repeat_still_required');
if (/sensor de temperatura|sensor de proximidad|analizador de materiales/i.test(html)) fail('level7_sensor_content_leaked');

await writeFile(LEVEL6, html, 'utf8');

if (hash(await readFile(LEVEL5, 'utf8')) !== l5Hash) fail('level5_mutated');
if (hash(await readFile(LEVEL7, 'utf8')) !== l7Hash) fail('level7_mutated');

console.info('[mission01] N6 study flow OK · zona científica → interpretar → punto de comunicación → enviar · REPETIR opcional · N5/N7 intactos');
