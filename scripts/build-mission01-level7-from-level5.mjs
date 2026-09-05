import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { LEVEL7_CONFIG as CFG } from './config/mission01-level7.mjs';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const LEVEL5 = resolve(OUT, 'level5.html');
const LEVEL7 = resolve(OUT, 'level7.html');
const MANIFEST = resolve(OUT, 'manifest.json');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
const fail = (label) => { throw new Error(`mission01_level7_from_level5:${label}`); };

function required(source, before, after, label) {
  if (!source.includes(before)) fail(`missing:${label}`);
  return source.replace(before, after);
}
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
function replaceBetween(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  if (start < 0) fail(`range_start:${label}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) fail(`range_end:${label}`);
  return source.slice(0, start) + replacement + source.slice(end);
}
function replaceArray(source, marker, replacement, label) {
  const start = source.indexOf(marker);
  if (start < 0) fail(`array_start:${label}`);
  const bracket = source.indexOf('[', start);
  if (bracket < 0) fail(`array_bracket:${label}`);
  let depth = 0, quote = '', escaped = false;
  for (let i = bracket; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '[') depth += 1;
    else if (ch === ']' && --depth === 0) return source.slice(0, start) + replacement + source.slice(i + 1);
  }
  fail(`array_end:${label}`);
}

const level5Source = await readFile(LEVEL5, 'utf8');
const level5HashBefore = hash(level5Source);
let html = level5Source;

// APULAB_LEVEL7_FROM_LEVEL5_V1
// El último nivel nace del mismo HTML final aprobado de N5/N6; solo añade sensores.
html = html
  .replace(/<html([^>]*)>/, (_m, attrs) => {
    const clean = attrs.replace(/\sdata-apulab-level="[^"]*"/g, '').replace(/\sdata-apulab-shell-source="[^"]*"/g, '');
    return `<html${clean} data-apulab-level="7" data-apulab-shell-source="level5">`;
  })
  .replace(/<title>[\s\S]*?<\/title>/, `<title>AYNI · Nivel 7 · ${CFG.title}</title>`)
  .replace(/<div class="level-badge">NIVEL 5<\/div>/, '<div class="level-badge">NIVEL 7</div>')
  .replace(/<div class="title">[\s\S]*?<\/div><div class="subtitle">[\s\S]*?<\/div>/,
    `<div class="title">${CFG.title}</div><div class="subtitle">${CFG.subtitle}</div>`)
  .replace(/>5\s*\/\s*7</g, '>7 / 7<')
  .replace(/OBJETIVO · [^<]*<\/div><div class="board-actions">/, `${CFG.objective}</div><div class="board-actions">`)
  .replace(/La ruta ya funciona\. Reorganízala usando REPETIR\./g, 'Repite una misma secuencia para leer y registrar los dos sensores.')
  .replace(/La bandera está lejos\.[^<]*/g, 'Lee y registra ambos sensores; después llega a la estación y envía los datos.')
  .replace(/<strong id="info-title">Nivel 5<\/strong>/g, '<strong id="info-title">Nivel 7</strong>')
  .replace(/MISIÓN 01 · NIVEL 5/g, 'MISIÓN 01 · NIVEL 7')
  .replace(/¡NIVEL 5 COMPLETADO!/g, '¡MISIÓN 01 COMPLETADA!')
  .replace(/CONTINUAR AL NIVEL 6/g, 'FINALIZAR MISIÓN')
  .replace(/apulab\.level5/g, 'apulab.level7')
  .replace(/apulab-l5-/g, 'apulab-l7-');

html = html
  .replace(/<style id="apulab-repeat-focus-style">[\s\S]*?<\/style>\s*/g, '')
  .replace(/<script id="apulab-repeat-focus-runtime">[\s\S]*?<\/script>\s*/g, '')
  .replace(/window\.apulabRepeatFocus\?\.\w+\?\.\(\);?/g, '')
  .replace(/<style id="apulab-level5-repeat-visibility">[\s\S]*?<\/style>\s*/g, '')
  .replace(/repeatUnlocked\s*=\s*false/g, 'repeatUnlocked=true')
  .replace(/phase\s*=\s*['"]discover['"]/g, "phase='sensors'")
  .replace(/id="repeat-palette"([^>]*?)\shidden([^>]*)>/g, 'id="repeat-palette"$1$2>')
  .replace(/id="control-state">BLOQUEADO/g, 'id="control-state">DISPONIBLE')
  .replace(/id="control-locked" class="control-locked"/g, 'id="control-locked" class="control-locked hidden"');

const sensorPalette = `<div class="palette-group apulab-sensor-palette"><div class="palette-group-title"><span>SENSORES</span><span>DATOS</span></div><div class="command-block block-read" data-kind="cmd" data-command="read"><span class="ico">⌁</span>LEER SENSOR<span class="tone">READ</span></div><div class="command-block block-record" data-kind="cmd" data-command="record"><span class="ico">▣</span>REGISTRAR DATO<span class="tone">LOG</span></div><div class="command-block block-send" data-kind="cmd" data-command="send"><span class="ico">⇧</span>ENVIAR DATOS<span class="tone">TX</span></div></div>`;
const paletteMatch = html.match(/(<div id="repeat-palette"[^>]*>[\s\S]*?<\/div>)<\/div><\/aside>/);
if (!paletteMatch) fail('repeat_palette_parent');
html = html.replace(paletteMatch[0], `${paletteMatch[1]}</div>${sensorPalette}</aside>`);

const sensorStyle = `<style id="apulab-level7-sensor-style">
.block-read{background:linear-gradient(180deg,#B9E7FF,#7CCFEF)!important;color:#17133A!important}
.block-record{background:linear-gradient(180deg,#E3D6FF,#B8A3F0)!important;color:#17133A!important}
.block-send{background:linear-gradient(180deg,#FFD18E,#F4C75E)!important;color:#17133A!important}
.apulab-sensor-palette{margin-top:0!important;padding-top:6px!important}
.apulab-sensor-palette .palette-group-title{margin-top:0!important;margin-bottom:5px!important}
.apulab-sensor-palette .command-block{height:54px!important;margin-bottom:6px!important}
.apulab-sensor-palette .command-block:last-child{margin-bottom:0!important}
</style>`;
html = required(html, '</head>', `${sensorStyle}\n</head>`, 'sensor_style_head');

const stageCfg = `const stages=[{name:'SENSORES Y BUCLES',start:${JSON.stringify(CFG.start)},goal:${JSON.stringify(CFG.goal)},obstacles:${JSON.stringify(CFG.obstacles)}}`;
html = replaceBetween(html, 'const stages=[', '];let stageIndex=0', stageCfg, 'stages');

const sensorsJson = JSON.stringify(CFG.sensors);
const sensorScene = `const flagGroup=new THREE.Group();scene.add(flagGroup);
const stationBase=new THREE.Mesh(new THREE.CylinderGeometry(.25,.30,.10,28),new THREE.MeshStandardMaterial({color:0x17133A,roughness:.45,metalness:.18}));stationBase.position.y=.12;flagGroup.add(stationBase);
const stationPole=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.72,12),new THREE.MeshStandardMaterial({color:0xFFF7E8,roughness:.42}));stationPole.position.y=.48;flagGroup.add(stationPole);
const stationFlag=new THREE.Mesh(new THREE.PlaneGeometry(.42,.24),new THREE.MeshBasicMaterial({color:0xF4C75E,side:THREE.DoubleSide}));stationFlag.position.set(.20,.76,0);stationFlag.rotation.y=-Math.PI/2;flagGroup.add(stationFlag);
const sensorCells=${sensorsJson};const sensorVisuals=[];
function makeSensorLabelTexture(text){const c=document.createElement('canvas');c.width=320;c.height=72;const x=c.getContext('2d');x.clearRect(0,0,320,72);x.fillStyle='rgba(11,14,38,.90)';x.fillRect(20,10,280,52);x.strokeStyle='#49C9D7';x.lineWidth=4;x.strokeRect(20,10,280,52);x.fillStyle='#F8F9FA';x.font='800 24px Poppins, sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(text,160,36);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
for(const cell of sensorCells){const g=new THREE.Group();const core=new THREE.Mesh(new THREE.DodecahedronGeometry(.17,1),new THREE.MeshStandardMaterial({color:0x465467,emissive:0x173B42,emissiveIntensity:.7,roughness:.45}));core.position.y=.26;g.add(core);const ring=new THREE.Mesh(new THREE.TorusGeometry(.28,.045,12,34),new THREE.MeshStandardMaterial({color:0x49C9D7,emissive:0x49C9D7,emissiveIntensity:1.05,roughness:.35}));ring.rotation.x=-Math.PI/2;ring.position.y=.20;g.add(ring);const label=new THREE.Sprite(new THREE.SpriteMaterial({map:makeSensorLabelTexture(cell.label),transparent:true,depthTest:false}));label.position.set(0,.74,0);label.scale.set(.92,.21,1);g.add(label);const p=cellPos(cell.c,cell.r);g.position.set(p.x,.20,p.z);scene.add(g);sensorVisuals.push({group:g,ring})}
const flag=stationFlag;
`;
html = replaceBetween(html, 'const flagGroup=new THREE.Group();', 'function clearObstacles()', sensorScene, 'sensor_scene');

const loadBoardStage = `function loadBoardStage(){stageIndex=0;start={...stages[0].start};goal={...stages[0].goal};const gp=cellPos(goal.c,goal.r);flagGroup.position.set(gp.x,.22,gp.z);startRing.position.copy(cellPos(start.c,start.r));startRing.position.y=.30;setRover(start.c,start.r,start.dir);rebuildObstacles();document.getElementById('objective-tag').textContent=${JSON.stringify(CFG.objective)}}`;
html = replaceFunction(html, 'function loadBoardStage(', loadBoardStage);

const commandsStart = html.indexOf('const commands=');
const commandsEnd = html.indexOf(';const MAX=', commandsStart);
if (commandsStart < 0 || commandsEnd < 0) fail('commands_range');
const commands = `const commands={forward:{label:'AVANZAR',icon:'↑',cls:'block-forward',tone:'DO',freq:523.25},left:{label:'GIRAR IZQ.',icon:'↶',cls:'block-left',tone:'RE',freq:587.33},right:{label:'GIRAR DER.',icon:'↷',cls:'block-right',tone:'MI',freq:659.25},read:{label:'LEER SENSOR',icon:'⌁',cls:'block-read',tone:'READ',freq:783.99,sensor:true},record:{label:'REGISTRAR DATO',icon:'▣',cls:'block-record',tone:'LOG',freq:659.25,sensor:true},send:{label:'ENVIAR DATOS',icon:'⇧',cls:'block-send',tone:'TX',freq:880,sensor:true}};let sensorRecords=[],lastReading=null,sensorSent=false;const sensorAtRover=()=>sensorCells.find(x=>x.c===roverState.c&&x.r===roverState.r);const atFinalStation=()=>roverState.c===goal.c&&roverState.r===goal.r;function resetSensorState(){sensorRecords=[];lastReading=null;sensorSent=false}`;
html = html.slice(0, commandsStart) + commands + html.slice(commandsEnd);
html = html.replaceAll('${c.tone} ♪', "${c.sensor?c.tone:c.tone+' ♪'}");

html = required(html, 'async function executeCommand(cmd){', 'async function executeMovementCommand(cmd){', 'rename_execute_command');
const movementRange = functionRange(html, 'async function executeMovementCommand(');
const sensorExecute = `\nasync function executeCommand(cmd){
  if(cmd==='read'){
    await playCmd(cmd);const sensor=sensorAtRover();if(!sensor)throw {code:'SENSOR_POSITION'};lastReading=sensor;feedback.textContent=\`\${sensor.label} · \${sensor.value}\`;showStatus(\`\${sensor.label} · \${sensor.value}\`,1200);await sleep(420);return;
  }
  if(cmd==='record'){
    await playCmd(cmd);if(!lastReading)throw {code:'SENSOR_ORDER',message:'Primero debes LEER SENSOR.'};if(!sensorRecords.some(x=>x.label===lastReading.label))sensorRecords.push(lastReading);feedback.textContent=\`\${lastReading.label} REGISTRADO\`;showStatus(\`\${lastReading.label} REGISTRADO\`,1100);lastReading=null;await sleep(320);return;
  }
  if(cmd==='send'){
    await playCmd(cmd);if(sensorRecords.length<2)throw {code:'SENSOR_ORDER',message:'Registra los dos sensores antes de ENVIAR DATOS.'};feedback.textContent='TRANSMITIENDO A APULAB STATION...';showStatus('TRANSMITIENDO A APULAB STATION...',1050);await sleep(680);sensorSent=true;feedback.textContent='DATOS ENVIADOS';showStatus('DATOS ENVIADOS',1200);await sleep(180);return;
  }
  return executeMovementCommand(cmd);
}`;
html = html.slice(0, movementRange.end) + sensorExecute + html.slice(movementRange.end);

const runProgram = `async function runProgram(){
  ensureAudio();if(executing)return;
  if(needsAdjustment){needsAdjustment=false;resetRover();resetSensorState();setEditing(true);document.getElementById('run-btn').textContent='▶ INICIAR PRUEBA';feedback.textContent='Programa conservado. Ajusta solo lo que necesites y vuelve a probar.';return}
  if(!program.length)return showStatus('Arrastra al menos un bloque.');
  if(program.some(x=>isRepeat(x)&&!x.body.length))return showStatus('Cada REPETIR necesita al menos un bloque dentro.');
  executing=true;setEditing(false);document.getElementById('run-btn').disabled=true;resetRover();resetSensorState();lastFailure=null;let done=0;
  try{
    for(let i=0;i<program.length;i++){const item=program[i];if(isCmd(item)){renderProgram({top:i,body:null,iter:0},done);feedback.textContent=\`Línea \${String(i+1).padStart(2,'0')} · \${commands[item.cmd].label}\`;try{await executeCommand(item.cmd)}catch(err){throw {...err,top:i,body:null,iter:null,count:null}}}else{for(let iter=0;iter<item.count;iter++)for(let j=0;j<item.body.length;j++){renderProgram({top:i,body:j,iter},done);feedback.textContent=\`REPETIR \${iter+1}/\${item.count} · \${commands[item.body[j].cmd].label}\`;try{await executeCommand(item.body[j].cmd)}catch(err){throw {...err,top:i,body:j,iter,count:item.count}}}}done=i+1}
    renderProgram(null,program.length);
    if(!atFinalStation()){feedback.textContent='AYNI debe terminar en la ESTACIÓN FINAL.';showStatus('Llega a la estación final antes de enviar.',2300);return}
    if(!usesRepeat()){feedback.textContent='Este nivel requiere usar REPETIR para reutilizar la secuencia de sensores.';showStatus('Agrupa la secuencia repetida dentro de REPETIR.',2300);return}
    if(sensorRecords.length<2||!sensorSent){feedback.textContent='Registra SENSOR 1 y SENSOR 2 y después ENVÍA DATOS.';showStatus('Falta completar el registro de sensores.',2300);return}
    completeLevel();
  }catch(err){lastFailure={top:err.top,body:err.body,iter:err.iter,count:err.count};renderProgram({top:err.top,body:err.body,iter:err.iter||0},Math.max(0,err.top));if(err.code==='BLOCKED')feedback.textContent=err.count?\`CAMINO BLOQUEADO · La repetición \${err.iter+1}/\${err.count} llevó a AYNI hacia una roca.\`:'CAMINO BLOQUEADO · Hay una roca delante de AYNI.';else if(err.code==='SENSOR_POSITION')feedback.textContent='LEER SENSOR solo funciona cuando AYNI está sobre un punto cyan.';else if(err.code==='SENSOR_ORDER')feedback.textContent=err.message||'Respeta el orden LEER SENSOR → REGISTRAR DATO.';else feedback.textContent='AYNI llegó al borde del simulador. Revisa el bloque resaltado.';needsAdjustment=true;setEditing(false);document.getElementById('run-btn').textContent='🔧 AJUSTAR PROGRAMA';showStatus(feedback.textContent,2900)}finally{executing=false;document.getElementById('run-btn').disabled=false;if(!needsAdjustment)setEditing(true)}
}`;
html = replaceFunction(html, 'async function runProgram(', runProgram);

const completeLevel = `function completeLevel(){document.getElementById('info-panel')?.classList.remove('visible');document.getElementById('journal-overlay')?.classList.remove('visible');phase='complete';finalProgram=clone(program);successMusic();launchConfetti(220);try{localStorage.setItem('apulab.level7.finalProgram',JSON.stringify(serialize(finalProgram)));localStorage.setItem('apulab.level7.records',JSON.stringify(sensorRecords));localStorage.setItem('apulab.mission01.completed','1')}catch{}document.getElementById('success-program-summary').textContent=\`Programa final: \${topCount(program)} bloques.\`;const data=document.getElementById('success-data');if(data)data.textContent=sensorRecords.map(x=>\`\${x.label}: \${x.value}\`).join(' · ')+' · Datos enviados';document.getElementById('success-overlay').classList.add('visible')}`;
html = replaceFunction(html, 'function completeLevel(', completeLevel);

const exploreSteps = `const exploreSteps=${JSON.stringify(CFG.explore)}`;
html = replaceArray(html, 'const exploreSteps=', exploreSteps, 'explore_steps');
html = html.replaceAll('${exploreIndex+1} / 5', '${exploreIndex+1} / 4');

const guideStart = html.indexOf("document.getElementById('guide-btn').onclick=()=>{");
const guideEndMarker = ";document.getElementById('info-close').onclick=";
const guideEnd = html.indexOf(guideEndMarker, guideStart);
if (guideStart < 0 || guideEnd < 0) fail('guide_handler_range');
const guideHandler = `document.getElementById('guide-btn').onclick=()=>{guideOpened=true;document.getElementById('guide-btn').classList.remove('is-recommended');guideStage=(guideStage+1)%3;const steps=${JSON.stringify(CFG.guide)};const step=steps[guideStage];showInfo('GUÍA',step[0],step[1],guideStage===0?'La secuencia de movimiento + lectura + registro se repite.':guideStage===1?'LEER SENSOR siempre va antes de REGISTRAR DATO.':'ENVÍA DATOS solo después de registrar ambos sensores.','')}`;
html = html.slice(0, guideStart) + guideHandler + html.slice(guideEnd);

const openJournal = `function openJournal(){document.getElementById('info-panel')?.classList.remove('visible');document.getElementById('success-overlay')?.classList.remove('visible');document.getElementById('journal-meta').textContent='MISIÓN 01 · NIVEL 7';document.getElementById('journal-title').textContent='SENSORES Y BUCLES';document.getElementById('journal-text').textContent=\`SENSOR 1: \${sensorRecords.some(x=>x.label==='SENSOR 1')?'registrado':'pendiente'} · SENSOR 2: \${sensorRecords.some(x=>x.label==='SENSOR 2')?'registrado':'pendiente'} · Envío: \${sensorSent?'completado':'pendiente'}.\`;const jp=document.getElementById('journal-program');const source=finalProgram||program;jp.innerHTML='';if(source&&source.length){source.slice(0,16).forEach((x,i)=>{const d=document.createElement('div');if(isCmd(x))d.textContent=\`\${String(i+1).padStart(2,'0')} · \${commands[x.cmd]?.label||x.cmd}\`;else if(isRepeat(x))d.textContent=\`\${String(i+1).padStart(2,'0')} · REPETIR × \${x.count} [\${x.body.map(b=>commands[b.cmd]?.label||b.cmd).join(', ')}]\`;jp.appendChild(d)})}else jp.textContent='Construye el programa que registrará ambos sensores.';document.getElementById('journal-overlay').classList.add('visible')}`;
html = replaceFunction(html, 'function openJournal(', openJournal);

if (!html.includes('id="success-program-summary"')) fail('success_summary');
html = html.replace(/<p id="success-program-summary">[\s\S]*?<\/p>/, `<p id="success-data">SENSOR 1 pendiente · SENSOR 2 pendiente · Envío pendiente</p><p id="success-program-summary">Guardaremos tu programa final.</p>`);
html = html
  .replace(/<h2>¡MISIÓN 01 COMPLETADA!<\/h2><p>[\s\S]*?<\/p><div class="journal-card">/, `<h2>¡MISIÓN 01 COMPLETADA!</h2><p>AYNI registró los dos sensores y envió correctamente los datos a ApuLab Station.</p><div class="journal-card">`)
  .replace(/<small>BITÁCORA ACTUALIZADA<\/small><strong>[\s\S]*?<\/strong>/, `<small>BITÁCORA ACTUALIZADA</small><strong>2 SENSORES REGISTRADOS · DATOS ENVIADOS</strong>`);

// Identidad terminal: N7 no navega a un nivel inexistente.
html = html
  .replace(/parent\.apulabCompleteLevel\(5\s*,\s*6\)/g, 'parent.apulabCompleteLevel(7)')
  .replace(/type:'apulab-runtime-error',level:5/g, "type:'apulab-runtime-error',level:7")
  .replace(/type:'apulab-level-ready',\s*level:5/g, "type:'apulab-level-ready', level:7")
  .replace(/parent\.postMessage\(\{type:'apulab-level-complete',level:5,nextLevel:6\},location\.origin\)/g, "parent.postMessage({type:'apulab-level-complete',level:7},location.origin)");

const terminalRuntime = `<script id="apulab-level7-terminal-runtime">document.getElementById('continue-btn').onclick=()=>{try{localStorage.setItem('apulab.mission01.completed','1')}catch{};document.getElementById('success-program-summary').textContent='MISIÓN 01 COMPLETADA';document.getElementById('continue-btn').disabled=true;document.getElementById('continue-btn').textContent='✓ MISIÓN COMPLETADA'};</script>`;
html = required(html, '</body>', `${terminalRuntime}\n</body>`, 'terminal_runtime');

html = html.replace('<script type="module">', '<script type="module">\n// APULAB_LEVEL7_FROM_LEVEL5_V1');
const requiredTokens = [
  'APULAB_LEVEL7_FROM_LEVEL5_V1','data-apulab-level="7"','data-apulab-shell-source="level5"','width:1672px;height:941px','id="board-canvas" width="950" height="664"','class="board-labels-top"','class="board-labels-left"','id="program-list"','id="program-scroll"','id="repeat-palette"','data-command="read"','data-command="record"','data-command="send"','SENSOR 1','SENSOR 2','LEER SENSOR','REGISTRAR DATO','ENVIAR DATOS','MISIÓN 01 COMPLETADA',"type:'apulab-level-ready', level:7","type:'apulab-runtime-error',level:7"
];
for (const token of requiredTokens) if (!html.includes(token)) fail(`contract:${token}`);
if (html.includes('class="panel simulator"') || html.includes('class="panel editor"')) fail('old_level67_shell_returned');
if (html.includes('apulab-repeat-focus')) fail('level5_repeat_attention_leaked');
if (/nextLevel\s*:\s*8|CONTINUAR AL NIVEL 8/.test(html)) fail('fake_level8');

await writeFile(LEVEL7, html, 'utf8');
const level5After = await readFile(LEVEL5, 'utf8');
if (hash(level5After) !== level5HashBefore) fail('level5_mutated');

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
let entry = (manifest.levels || []).find((x) => Number(x.level) === 7);
if (!entry) { entry = { level: 7, file: 'level7.html' }; manifest.levels = [...(manifest.levels || []), entry].sort((a,b)=>Number(a.level)-Number(b.level)); }
entry.file = 'level7.html';entry.bytes = Buffer.byteLength(html, 'utf8');entry.sha256 = hash(html);manifest.totalLevels=7;manifest.availableLevels=[1,2,3,4,5,6,7];manifest.unavailableLevels=[];
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.info('[mission01] Nivel 7 reconstruido desde el shell N5/N6 · 1672×941 · tablero/editor/AYNI preservados · sensores añadidos');
