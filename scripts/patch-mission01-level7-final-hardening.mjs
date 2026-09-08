import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const LEVEL7 = resolve(OUT, 'level7.html');
const MANIFEST = resolve(OUT, 'manifest.json');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
const fail = (code) => { throw new Error(`mission01_level7_final_hardening:${code}`); };

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
if (!html.includes('APULAB_LEVEL7_FINAL_GDD_V1')) fail('final_gdd_missing');
if (!html.includes('APULAB_LEVEL7_EXACT_SAMPLE_RESEARCH_V1')) fail('exact_sample_patch_missing');
if (html.includes('APULAB_LEVEL7_FINAL_HARDENING_V1')) fail('already_applied');

html = html
  .replaceAll('PUNTO FINAL', 'PUNTO DE COMUNICACIÓN')
  .replaceAll('punto final', 'punto de comunicación')
  .replaceAll('PUNTO DE MISIÓN', 'PUNTO DE COMUNICACIÓN')
  .replaceAll('punto de misión', 'punto de comunicación')
  .replaceAll('final_point_reached', 'communication_point_reached')
  .replaceAll('final_checkpoint_reached', 'communication_point_reached');

html = html
  .replace(/const isAdjacentToSample=\(\)=>Math\.abs\(roverState\.c-sampleCell\.c\)\+Math\.abs\(roverState\.r-sampleCell\.r\)===1;/g,
    'const isAtSample=()=>roverState.c===sampleCell.c&&roverState.r===sampleCell.r;')
  .replaceAll('isAdjacentToSample()', 'isAtSample()')
  .replaceAll('junto a la muestra', 'sobre la muestra')
  .replaceAll('Junto a la muestra', 'Sobre la muestra')
  .replaceAll('AYNI necesita estar sobre la muestra para analizarla.', 'Lleva AYNI hasta la muestra para analizarla.');
if (!html.includes('const isAtSample=()=>roverState.c===sampleCell.c&&roverState.r===sampleCell.r;')) fail('exact_sample_runtime_missing');
if (html.includes('isAdjacentToSample')) fail('adjacency_runtime_remaining');

if (!html.includes('data-command="send"')) {
  const analyzePalette = /(<div class="palette-group apulab-sample-palette">[\s\S]*?<div class="command-block block-analyze-sample"[^>]*data-command="analyzeSample"[\s\S]*?<\/div>)(<\/div>)/;
  if (!analyzePalette.test(html)) fail('science_palette_missing');
  html = html.replace(analyzePalette, `$1<div class="command-block block-send" data-kind="cmd" data-command="send" tabindex="0" role="button" aria-label="Añadir ENVIAR DATOS al programa"><span class="ico">⇧</span>ENVIAR DATOS<span class="tone">TX</span></div>$2`);
}
const commandAnchor = "analyzeSample:{label:'ANALIZAR MUESTRA',icon:'🔬',cls:'block-analyze-sample',tone:'',freq:783.99,sensor:true}};const instrumentOptions=";
if (html.includes(commandAnchor)) {
  html = html.replace(commandAnchor, "analyzeSample:{label:'ANALIZAR MUESTRA',icon:'🔬',cls:'block-analyze-sample',tone:'',freq:783.99,sensor:true},send:{label:'ENVIAR DATOS',icon:'⇧',cls:'block-send',tone:'TX',freq:880,sensor:true}};const instrumentOptions=");
} else if (!html.includes("send:{label:'ENVIAR DATOS'")) fail('commands_send_anchor_missing');

if (html.includes('sampleCheckpointReached=false,finalCheckpointReached=false')) {
  html = html.replace('sampleCheckpointReached=false,finalCheckpointReached=false', 'sampleCheckpointReached=false,communicationPointReached=false,dataSent=false,finalCheckpointReached=false');
}
if (!html.includes('communicationPointReached=false') || !html.includes('dataSent=false')) fail('communication_state_missing');

html = replaceFunction(html, 'function bindPalette()', `function bindPalette(){
  const bindCmd=(el)=>{
    el.tabIndex=0;el.setAttribute('role','button');
    if(!el.getAttribute('aria-label'))el.setAttribute('aria-label',\`Añadir \${String(el.textContent||el.dataset.command||'comando').replace(/\\s+/g,' ').trim()} al programa\`);
    let singleClickTimer=0,suppressClick=false;
    el.onpointerdown=(e)=>{
      if(executing||e.button!==0)return;
      const sx=e.clientX,sy=e.clientY,id=e.pointerId;let moved=false;
      const move=(ev)=>{if(ev.pointerId===id&&Math.hypot(ev.clientX-sx,ev.clientY-sy)>7)moved=true};
      const up=(ev)=>{if(ev.pointerId!==id)return;document.removeEventListener('pointermove',move);if(moved)suppressClick=true};
      document.addEventListener('pointermove',move,{passive:true});document.addEventListener('pointerup',up,{once:true});
      startDrag(e,{source:'palette',item:{type:'cmd',cmd:el.dataset.command}},el);
    };
    el.onclick=(e)=>{if(executing)return;if(suppressClick){suppressClick=false;e.preventDefault();return}clearTimeout(singleClickTimer);singleClickTimer=setTimeout(()=>appendItem({type:'cmd',cmd:el.dataset.command}),160)};
    el.ondblclick=(e)=>{e.preventDefault();clearTimeout(singleClickTimer);appendItem({type:'cmd',cmd:el.dataset.command})};
    el.onkeydown=(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();appendItem({type:'cmd',cmd:el.dataset.command})}};
  };
  document.querySelectorAll('.command-block[data-command]').forEach(bindCmd);
  const rp=document.getElementById('repeat-palette');rp.tabIndex=0;rp.setAttribute('role','button');rp.setAttribute('aria-label','Añadir REPETIR al programa');
  let repeatClickTimer=0,repeatSuppressClick=false;
  rp.onpointerdown=(e)=>{if(!repeatUnlocked||executing||e.button!==0)return;const sx=e.clientX,sy=e.clientY,id=e.pointerId;let moved=false;const move=(ev)=>{if(ev.pointerId===id&&Math.hypot(ev.clientX-sx,ev.clientY-sy)>7)moved=true};const up=(ev)=>{if(ev.pointerId!==id)return;document.removeEventListener('pointermove',move);if(moved)repeatSuppressClick=true};document.addEventListener('pointermove',move,{passive:true});document.addEventListener('pointerup',up,{once:true});startDrag(e,{source:'palette',item:{type:'repeat',count:2,body:[]}},rp)};
  rp.onclick=(e)=>{if(!repeatUnlocked||executing)return;if(repeatSuppressClick){repeatSuppressClick=false;e.preventDefault();return}clearTimeout(repeatClickTimer);repeatClickTimer=setTimeout(()=>appendItem({type:'repeat',count:2,body:[]}),160)};
  rp.ondblclick=(e)=>{e.preventDefault();clearTimeout(repeatClickTimer);if(repeatUnlocked)appendItem({type:'repeat',count:2,body:[]})};
  rp.onkeydown=(e)=>{if((e.key==='Enter'||e.key===' ')&&repeatUnlocked){e.preventDefault();appendItem({type:'repeat',count:2,body:[]})}};
}`);

html = replaceFunction(html, 'async function executeCommand(', `async function executeCommand(cmd){
  if(cmd==='analyzeSample'){
    await playCmd(cmd);recordLevel7Event('sample_analyze_requested',{at_sample:isAtSample()});
    if(!isAtSample()){feedback.textContent='Lleva AYNI hasta la muestra para analizarla.';showStatus(feedback.textContent,2200);await sleep(180);return}
    level7AnalyzeRequested=true;syncLevel7FinalUX();
    if(relevantInstrumentUsed){feedback.textContent='La composición ya fue obtenida. Continúa hacia el punto de comunicación.';await sleep(180);return}
    await waitForRelevantInstrument();syncLevel7FinalUX();return;
  }
  if(cmd==='send'){
    await playCmd(cmd);
    if(!relevantInstrumentUsed){recordLevel7Event('premature_action',{action:'send',reason:'relevant_data_missing'});feedback.textContent='Aún necesitas el dato que responde la pregunta.';showStatus(feedback.textContent,2200);await sleep(180);return}
    if(!atFinalCheckpoint()){recordLevel7Event('premature_action',{action:'send',reason:'communication_point_missing'});feedback.textContent='Lleva AYNI al punto de comunicación para enviar los datos.';showStatus(feedback.textContent,2200);await sleep(180);return}
    if(!communicationPointReached){communicationPointReached=true;finalCheckpointReached=true;recordLevel7Event('communication_point_reached',{rover_x:roverState.c,rover_y:roverState.r})}
    if(!dataSent){dataSent=true;recordLevel7Event('data_sent',{communication_x:roverState.c,communication_y:roverState.r,...repeatMetrics()})}
    feedback.textContent='DATOS ENVIADOS A APULAB STATION';showStatus(feedback.textContent,1400);syncLevel7FinalUX();await sleep(180);return;
  }
  await executeMovementCommand(cmd);
  if(relevantInstrumentUsed&&atFinalCheckpoint()&&!communicationPointReached){communicationPointReached=true;finalCheckpointReached=true;recordLevel7Event('communication_point_reached',{rover_x:roverState.c,rover_y:roverState.r})}
  syncLevel7FinalUX();
}`);

html = replaceFunction(html, 'async function runProgram(', `async function runProgram(){
  ensureAudio();if(executing)return;
  if(needsAdjustment){needsAdjustment=false;resetRover();setEditing(true);document.getElementById('run-btn').textContent='▶ INICIAR PRUEBA';feedback.textContent='Programa conservado. Ajusta solo lo necesario y vuelve a probar.';return}
  if(!program.length)return showStatus('Arrastra al menos un bloque.');
  if(program.some(x=>isRepeat(x)&&!x.body.length))return showStatus('Cada REPETIR necesita al menos un bloque dentro.');
  attemptCount+=1;recordLevel7Event('program_started',{program_blocks:topCount(program),program_edit_count:programEditCount,...repeatMetrics()});
  executing=true;setEditing(false);document.getElementById('run-btn').disabled=true;resetRover();lastFailure=null;let done=0;
  try{
    for(let i=0;i<program.length;i++){
      const item=program[i];
      if(isCmd(item)){renderProgram({top:i,body:null,iter:0},done);feedback.textContent='Línea '+String(i+1).padStart(2,'0')+' · '+commands[item.cmd].label;await executeCommand(item.cmd)}
      else{for(let iter=0;iter<item.count;iter++)for(let j=0;j<item.body.length;j++){renderProgram({top:i,body:j,iter},done);feedback.textContent='REPETIR '+(iter+1)+'/'+item.count+' · '+commands[item.body[j].cmd].label;await executeCommand(item.body[j].cmd)}}
      done=i+1;
    }
    renderProgram(null,program.length);
    if(!relevantInstrumentUsed){feedback.textContent='Todavía falta obtener un dato que responda de qué material está hecha la muestra.';showStatus('Piensa qué información necesitamos para responder la pregunta.',2600);return}
    if(!communicationPointReached||!atFinalCheckpoint()){feedback.textContent='Ya tenemos el dato. Lleva AYNI al punto de comunicación.';showStatus(feedback.textContent,2300);return}
    if(!dataSent){feedback.textContent='AYNI está en el punto de comunicación. Ejecuta ENVIAR DATOS.';showStatus(feedback.textContent,2300);return}
    completeLevel();
  }catch(err){lastFailure={top:err.top,body:err.body,iter:err.iter,count:err.count};renderProgram({top:err.top,body:err.body,iter:err.iter||0},Math.max(0,err.top));if(err.code==='BLOCKED')feedback.textContent='CAMINO BLOQUEADO · Hay una roca delante de AYNI.';else feedback.textContent='AYNI llegó al borde del simulador. Revisa el bloque resaltado.';needsAdjustment=true;setEditing(false);document.getElementById('run-btn').textContent='🔧 AJUSTAR PROGRAMA';showStatus(feedback.textContent,2900)}
  finally{executing=false;document.getElementById('run-btn').disabled=false;if(!needsAdjustment)setEditing(true)}
}`);

html = replaceFunction(html, 'function completeLevel(', `function completeLevel(){
  document.getElementById('sensor-overlay')?.classList.remove('visible');document.getElementById('analysis-overlay')?.classList.remove('visible');document.getElementById('info-panel')?.classList.remove('visible');document.getElementById('journal-overlay')?.classList.remove('visible');
  if(!relevantInstrumentUsed||!communicationPointReached||!dataSent||!atFinalCheckpoint())return;
  phase='complete';finalCheckpointReached=true;finalProgram=clone(program);successMusic();launchConfetti(220);
  const metrics={first_instrument:firstInstrument,final_instrument:finalInstrument,first_choice_relevant:firstInstrument==='materials',instrument_selection_count:instrumentSelectionCount,instrument_change_count:instrumentChangeCount,changed_after_irrelevant_feedback:changedAfterIrrelevantFeedback,time_to_first_choice:firstChoiceElapsedMs,time_to_relevant_choice:relevantChoiceElapsedMs,help_before_relevant_choice:helpBeforeRelevantChoice,program_edit_count:programEditCount,completion_time:elapsed7(),completed_level:true,...repeatMetrics()};recordLevel7Event('level_completed',metrics);
  try{localStorage.setItem('apulab.level7.finalProgram',JSON.stringify(serialize(finalProgram)));localStorage.setItem('apulab.level7.instrumentMetrics',JSON.stringify(metrics));localStorage.setItem('apulab.mission01.completed','1')}catch{}
  document.getElementById('success-program-summary').textContent='Programa final: '+topCount(program)+' bloques.';const data=document.getElementById('success-data');if(data)data.textContent='MATERIALES · Hierro · Silicatos';const title=document.querySelector('#success-overlay h2');if(title)title.textContent='MISIÓN COMPLETADA';const body=document.querySelector('#success-overlay p');if(body)body.textContent='AYNI investigó la muestra y envió la información a ApuLab Station.';const button=document.getElementById('continue-btn');if(button)button.textContent='FINALIZAR MISIÓN';document.getElementById('success-overlay').classList.add('visible');syncLevel7FinalUX();
}`);

html = replaceFunction(html, 'function syncLevel7FinalUX()', `function syncLevel7FinalUX(){
  const guide=document.getElementById('level7-guide');if(!guide)return;const objective=document.getElementById('objective-tag');const sample=document.getElementById('level7-sample-checkpoint');const final=document.getElementById('level7-final-checkpoint');
  let phaseStep=1;if(sampleCheckpointReached)phaseStep=2;if(level7AnalyzeRequested)phaseStep=3;if(selectedInstrument)phaseStep=4;if(relevantInstrumentUsed)phaseStep=5;if(dataSent)phaseStep=6;
  let text='PASO 1 · LLEVA AYNI A LA MUESTRA';if(phaseStep===2)text='PASO 2 · ANALIZA LA MUESTRA';else if(phaseStep===3)text='PASO 3 · ELIGE UN INSTRUMENTO';else if(phaseStep===4)text='PASO 4 · ENCUENTRA EL DATO QUE RESPONDE LA PREGUNTA';else if(phaseStep===5)text=communicationPointReached?'PASO 5 · ENVÍA LOS DATOS':'PASO 5 · LLEVA AYNI AL PUNTO DE COMUNICACIÓN';else if(phaseStep===6)text='MISIÓN COMPLETADA';if(objective)objective.textContent=text;
  const completed=phaseStep===6?5:phaseStep-1;const fill=document.getElementById('level7-guide-fill');if(fill)fill.style.width=String(Math.min(4,completed)*20)+'%';guide.querySelectorAll('.level7-guide-step').forEach((el,i)=>{const n=i+1;el.classList.toggle('is-done',n<=completed);el.classList.toggle('is-active',phaseStep<6&&n===phaseStep)});
  sample?.classList.toggle('is-active',!sampleCheckpointReached);sample?.classList.toggle('is-done',sampleCheckpointReached);final?.classList.toggle('is-active',relevantInstrumentUsed&&!communicationPointReached);final?.classList.toggle('is-done',communicationPointReached);
  try{sampleRing.material.opacity=sampleCheckpointReached?.52:.22;sampleRing.material.color.set(sampleCheckpointReached?0x49C9D7:0x8E7DCE);finalBeaconMat.emissiveIntensity=relevantInstrumentUsed?.82:.18;finalRing.material.opacity=relevantInstrumentUsed?.46:.10}catch{}
  document.querySelector('.command-block[data-command="analyzeSample"]')?.classList.toggle('is-research-ready',sampleCheckpointReached&&!level7AnalyzeRequested);
}`);

html = html.replace('selectedInstrument=null;sampleAnalyzed=false;relevantInstrumentUsed=false;sampleCheckpointReached=false;finalCheckpointReached=false;', 'selectedInstrument=null;sampleAnalyzed=false;relevantInstrumentUsed=false;sampleCheckpointReached=false;communicationPointReached=false;dataSent=false;finalCheckpointReached=false;');
html = html.replace('atSample:isAtSample(),atFinal:atFinalCheckpoint(),...repeatMetrics()', 'atSample:isAtSample(),atCommunication:atFinalCheckpoint(),communicationPointReached,dataSent,...repeatMetrics()');
html = html.replace('</head>', `<style id="apulab-level7-final-hardening-style">/* APULAB_LEVEL7_FINAL_HARDENING_V1 */.command-block[data-command="analyzeSample"].is-research-ready{box-shadow:0 0 0 3px rgba(73,201,215,.30),0 0 20px rgba(73,201,215,.72)!important}.block-send{background:linear-gradient(180deg,#FFD18E,#F4C75E)!important;color:#17133A!important}</style>\n</head>`);

const required = ['APULAB_LEVEL7_FINAL_HARDENING_V1','data-command="send"','ENVIAR DATOS','const isAtSample=()=>roverState.c===sampleCell.c&&roverState.r===sampleCell.r',"recordLevel7Event('communication_point_reached'","recordLevel7Event('data_sent'",'communicationPointReached=false','dataSent=false','PASO 5 · LLEVA AYNI AL PUNTO DE COMUNICACIÓN','PASO 5 · ENVÍA LOS DATOS','Lleva AYNI hasta la muestra para analizarla.'];
for (const token of required) if (!html.includes(token)) fail(`missing:${token}`);
for (const forbidden of ['PUNTO FINAL','final_point_reached','isAdjacentToSample','junto a la muestra']) if (html.includes(forbidden)) fail(`forbidden:${forbidden}`);

await writeFile(LEVEL7, html, 'utf8');
const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
const entry = (manifest.levels || []).find((x) => Number(x.level) === 7);
if (entry) { entry.bytes = Buffer.byteLength(html, 'utf8'); entry.sha256 = hash(html); }
await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.info('[mission01] LEVEL 7 FINAL HARDENING OK · exact sample · deterministic inputs · communication arrival != explicit send');
