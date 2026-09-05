import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { LEVEL6_CONFIG as CFG } from './config/mission01-level6.mjs';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const LEVEL5 = resolve(OUT, 'level5.html');
const LEVEL6 = resolve(OUT, 'level6.html');
const MANIFEST = resolve(OUT, 'manifest.json');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

function fail(label) { throw new Error(`mission01_level6_from_level5:${label}`); }
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

// APULAB_LEVEL6_FROM_LEVEL5_V1
// N6 nace del HTML FINAL aprobado de N5. No se crea un segundo shell.
html = html
  .replace(/<html([^>]*)>/, (m, attrs) => `<html${attrs} data-apulab-level="6" data-apulab-shell-source="level5">`)
  .replace(/<title>[\s\S]*?<\/title>/, `<title>AYNI · Nivel 6 · ${CFG.title}</title>`)
  .replace(/<div class="level-badge">NIVEL 5<\/div>/, '<div class="level-badge">NIVEL 6</div>')
  .replace(/<div class="title">[\s\S]*?<\/div><div class="subtitle">[\s\S]*?<\/div>/,
    `<div class="title">${CFG.title}</div><div class="subtitle">${CFG.subtitle}</div>`)
  .replace(/>5\s*\/\s*7</g, '>6 / 7<')
  .replace(/OBJETIVO · [^<]*<\/div><div class="board-actions">/,
    `${CFG.objective}</div><div class="board-actions">`)
  .replace(/La ruta ya funciona\. Reorganízala usando REPETIR\./g, 'Usa REPETIR para llegar al punto de estudio y completa el ciclo científico.')
  .replace(/La bandera está lejos\.[^<]*/g, 'Usa REPETIR para llegar al punto de estudio y completa el ciclo científico.')
  .replace(/<strong id="info-title">Nivel 5<\/strong>/g, '<strong id="info-title">Nivel 6</strong>')
  .replace(/MISIÓN 01 · NIVEL 5/g, 'MISIÓN 01 · NIVEL 6')
  .replace(/¡NIVEL 5 COMPLETADO!/g, '¡NIVEL 6 COMPLETADO!')
  .replace(/CONTINUAR AL NIVEL 6/g, 'CONTINUAR AL NIVEL 7')
  .replace(/level:5,nextLevel:6/g, 'level:6,nextLevel:7')
  .replace(/apulab\.level5/g, 'apulab.level6')
  .replace(/apulab-l5-/g, 'apulab-l6-');

// N5 tiene atención contextual especial para enseñar REPETIR. N6 ya parte de ese conocimiento.
html = html
  .replace(/<style id="apulab-repeat-focus-style">[\s\S]*?<\/style>\s*/g, '')
  .replace(/<script id="apulab-repeat-focus-runtime">[\s\S]*?<\/script>\s*/g, '')
  .replace(/window\.apulabRepeatFocus\?\.\w+\?\.\(\);?/g, '')
  .replace(/<style id="apulab-level5-repeat-visibility">[\s\S]*?<\/style>\s*/g, '');

// REPETIR disponible desde el inicio.
html = html
  .replace(/repeatUnlocked\s*=\s*false/g, 'repeatUnlocked=true')
  .replace(/phase\s*=\s*['"]discover['"]/g, "phase='science'")
  .replace(/id="repeat-palette"([^>]*?)\shidden([^>]*)>/g, 'id="repeat-palette"$1$2>')
  .replace(/id="control-state">BLOQUEADO/g, 'id="control-state">DISPONIBLE')
  .replace(/id="control-locked" class="control-locked"/g, 'id="control-locked" class="control-locked hidden"');

// Conserva el sistema visual de N5 y añade ciencia como una categoría nueva.
const sciencePalette = `<div class="palette-group apulab-science-palette"><div class="palette-group-title"><span>CIENCIA</span><span>CICLO</span></div><div class="command-block block-scan" data-kind="cmd" data-command="scan"><span class="ico">⌁</span>ESCANEAR<span class="tone">SCAN</span></div><div class="command-block block-analyze" data-kind="cmd" data-command="analyze"><span class="ico">◇</span>ANALIZAR<span class="tone">ANÁLISIS</span></div><div class="command-block block-send" data-kind="cmd" data-command="send"><span class="ico">⇧</span>ENVIAR DATOS<span class="tone">TX</span></div></div>`;
const paletteMatch = html.match(/(<div id="repeat-palette"[^>]*>[\s\S]*?<\/div>)<\/div><\/aside>/);
if (!paletteMatch) fail('repeat_palette_parent');
html = html.replace(paletteMatch[0], `${paletteMatch[1]}</div>${sciencePalette}</aside>`);

const scienceStyle = `<style id="apulab-level6-science-style">
.block-scan{background:linear-gradient(180deg,#B9E7FF,#7CCFEF)!important;color:#17133A!important}
.block-analyze{background:linear-gradient(180deg,#E3D6FF,#B8A3F0)!important;color:#17133A!important}
.block-send{background:linear-gradient(180deg,#FFD18E,#F4C75E)!important;color:#17133A!important}
.apulab-science-palette .palette-group-title{margin-top:13px}
#study-point-label{pointer-events:none}
</style>`;
html = required(html, '</head>', `${scienceStyle}\n</head>`, 'science_style_head');

// Ruta científica: misma cámara, tablero, casillas y AYNI del N5.
const stageCfg = `const stages=[{name:'MISIÓN CIENTÍFICA',start:${JSON.stringify(CFG.start)},goal:${JSON.stringify(CFG.goal)},obstacles:${JSON.stringify(CFG.obstacles)}}`;
html = replaceBetween(html, 'const stages=[', '];let stageIndex=0', stageCfg, 'stages');

const studyMarker = `const flagGroup=new THREE.Group();scene.add(flagGroup);
const studyMat=new THREE.MeshStandardMaterial({color:0x5FD3DF,emissive:0x49C9D7,emissiveIntensity:1.2,roughness:.38,metalness:.12});
const studyCore=new THREE.Mesh(new THREE.DodecahedronGeometry(.20,1),studyMat);studyCore.position.y=.27;studyCore.castShadow=true;flagGroup.add(studyCore);
const studyBase=new THREE.Mesh(new THREE.CylinderGeometry(.24,.29,.08,28),new THREE.MeshStandardMaterial({color:0x17133A,roughness:.46,metalness:.16}));studyBase.position.y=.10;flagGroup.add(studyBase);
const goalGlowMat=new THREE.MeshBasicMaterial({color:0x49C9D7,transparent:true,opacity:.28,depthWrite:false}),goalGlow=new THREE.Mesh(new THREE.RingGeometry(.30,.45,40),goalGlowMat);goalGlow.rotation.x=-Math.PI/2;goalGlow.position.y=.15;flagGroup.add(goalGlow);
const beaconMat=new THREE.MeshBasicMaterial({color:0xA8EDF1,transparent:true,opacity:.32,depthWrite:false}),beacon=new THREE.Mesh(new THREE.CylinderGeometry(.055,.14,.78,20,1,true),beaconMat);beacon.position.y=.54;flagGroup.add(beacon);
function makeStudyLabelTexture(){const c=document.createElement('canvas');c.width=512;c.height=112;const x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);x.fillStyle='rgba(11,14,38,.92)';x.fillRect(16,12,480,88);x.strokeStyle='#49C9D7';x.lineWidth=6;x.strokeRect(16,12,480,88);x.fillStyle='#F8F9FA';x.font='800 36px Poppins, sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('PUNTO DE ESTUDIO',256,57);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
const studyLabel=new THREE.Sprite(new THREE.SpriteMaterial({map:makeStudyLabelTexture(),transparent:true,depthTest:false}));studyLabel.position.set(0,1.05,0);studyLabel.scale.set(1.72,.38,1);flagGroup.add(studyLabel);
const flag=studyCore;
`;
html = replaceBetween(html, 'const flagGroup=new THREE.Group();', 'function clearObstacles()', studyMarker, 'study_marker');

const loadBoardStage = `function loadBoardStage(){stageIndex=0;start={...stages[0].start};goal={...stages[0].goal};const gp=cellPos(goal.c,goal.r);flagGroup.position.set(gp.x,.22,gp.z);startRing.position.copy(cellPos(start.c,start.r));startRing.position.y=.30;setRover(start.c,start.r,start.dir);rebuildObstacles();document.getElementById('objective-tag').textContent=${JSON.stringify(CFG.objective)}}`;
html = replaceFunction(html, 'function loadBoardStage(', loadBoardStage);

// Amplía el mismo motor de bloques N5; no crea otro editor.
const commandsStart = html.indexOf('const commands=');
const commandsEnd = html.indexOf(';const MAX=', commandsStart);
if (commandsStart < 0 || commandsEnd < 0) fail('commands_range');
const commands = `const commands={forward:{label:'AVANZAR',icon:'↑',cls:'block-forward',tone:'DO',freq:523.25},left:{label:'GIRAR IZQ.',icon:'↶',cls:'block-left',tone:'RE',freq:587.33},right:{label:'GIRAR DER.',icon:'↷',cls:'block-right',tone:'MI',freq:659.25},scan:{label:'ESCANEAR',icon:'⌁',cls:'block-scan',tone:'SCAN',freq:783.99,science:true},analyze:{label:'ANALIZAR',icon:'◇',cls:'block-analyze',tone:'ANÁLISIS',freq:659.25,science:true},send:{label:'ENVIAR DATOS',icon:'⇧',cls:'block-send',tone:'TX',freq:880,science:true}};let scienceScanned=false,scienceAnalyzed=false,scienceSent=false;const atSciencePoint=()=>roverState.c===goal.c&&roverState.r===goal.r;function resetScienceState(){scienceScanned=false;scienceAnalyzed=false;scienceSent=false}`;
html = html.slice(0, commandsStart) + commands + html.slice(commandsEnd);
html = html.replaceAll('${c.tone} ♪', "${c.science?c.tone:c.tone+' ♪'}");

// Conserva el movimiento original y envuelve solo las tres acciones nuevas.
html = required(html, 'async function executeCommand(cmd){', 'async function executeMovementCommand(cmd){', 'rename_execute_command');
const movementRange = functionRange(html, 'async function executeMovementCommand(');
const scienceExecute = `\nasync function executeCommand(cmd){
  if(cmd==='scan'){
    await playCmd(cmd);
    if(!atSciencePoint())throw {code:'SCIENCE_POSITION'};
    feedback.textContent='ESCANEANDO MUESTRA...';showStatus('ESCANEANDO MUESTRA...',900);await sleep(620);scienceScanned=true;feedback.textContent='MUESTRA OBTENIDA';showStatus('MUESTRA OBTENIDA',1100);await sleep(180);return;
  }
  if(cmd==='analyze'){
    await playCmd(cmd);
    if(!scienceScanned)throw {code:'SCIENCE_ORDER',message:'Primero debes ESCANEAR la muestra.'};
    feedback.textContent='ANALIZANDO...';showStatus('ANALIZANDO...',900);await sleep(620);scienceAnalyzed=true;feedback.textContent='ANÁLISIS COMPLETO';showStatus('ANÁLISIS COMPLETO',1100);await sleep(180);return;
  }
  if(cmd==='send'){
    await playCmd(cmd);
    if(!scienceAnalyzed)throw {code:'SCIENCE_ORDER',message:'Primero debes ANALIZAR los datos.'};
    feedback.textContent='TRANSMITIENDO A APULAB STATION...';showStatus('TRANSMITIENDO A APULAB STATION...',1050);await sleep(680);scienceSent=true;feedback.textContent='DATOS ENVIADOS';showStatus('DATOS ENVIADOS',1200);await sleep(180);return;
  }
  return executeMovementCommand(cmd);
}`;
html = html.slice(0, movementRange.end) + scienceExecute + html.slice(movementRange.end);

const runProgram = `async function runProgram(){
  ensureAudio();
  if(executing)return;
  if(needsAdjustment){needsAdjustment=false;resetRover();resetScienceState();setEditing(true);document.getElementById('run-btn').textContent='▶ INICIAR PRUEBA';feedback.textContent='Programa conservado. Ajusta solo lo que necesites y vuelve a probar.';return}
  if(!program.length)return showStatus('Arrastra al menos un bloque.');
  if(program.some(x=>isRepeat(x)&&!x.body.length))return showStatus('Cada REPETIR necesita al menos un bloque dentro.');
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
    if(!atSciencePoint()){feedback.textContent='AYNI debe terminar sobre el PUNTO DE ESTUDIO.';showStatus('Llega al punto de estudio antes de cerrar el ciclo.',2300);return}
    if(!usesRepeat()){feedback.textContent='La ruta funciona, pero este nivel requiere usar REPETIR.';showStatus('Usa REPETIR para compactar los AVANZAR.',2300);return}
    if(!scienceScanned||!scienceAnalyzed||!scienceSent){feedback.textContent='Completa el ciclo: ESCANEAR → ANALIZAR → ENVIAR DATOS.';showStatus('Falta completar el ciclo científico.',2300);return}
    completeLevel();
  }catch(err){
    lastFailure={top:err.top,body:err.body,iter:err.iter,count:err.count};renderProgram({top:err.top,body:err.body,iter:err.iter||0},Math.max(0,err.top));
    if(err.code==='BLOCKED')feedback.textContent=err.count?\`CAMINO BLOQUEADO · La repetición \${err.iter+1}/\${err.count} llevó a AYNI hacia una roca.\`:'CAMINO BLOQUEADO · Hay una roca delante de AYNI.';
    else if(err.code==='SCIENCE_POSITION')feedback.textContent='ESCANEAR solo funciona cuando AYNI está sobre el PUNTO DE ESTUDIO.';
    else if(err.code==='SCIENCE_ORDER')feedback.textContent=err.message||'Respeta el orden del ciclo científico.';
    else feedback.textContent='AYNI llegó al borde del simulador. Revisa el bloque resaltado.';
    needsAdjustment=true;setEditing(false);document.getElementById('run-btn').textContent='🔧 AJUSTAR PROGRAMA';showStatus(feedback.textContent,2900);
  }finally{executing=false;document.getElementById('run-btn').disabled=false;if(!needsAdjustment)setEditing(true)}
}`;
html = replaceFunction(html, 'async function runProgram(', runProgram);

const completeLevel = `function completeLevel(){phase='complete';finalProgram=clone(program);successMusic();launchConfetti(190);try{localStorage.setItem('apulab.level6.finalProgram',JSON.stringify(serialize(finalProgram)));localStorage.setItem('apulab.level6.idea','REPETIR permite llegar al punto de estudio y completar ESCANEAR → ANALIZAR → ENVIAR DATOS.')}catch{}document.getElementById('success-program-summary').textContent=\`Programa científico: \${topCount(program)} bloques.\`;const data=document.getElementById('success-data');if(data)data.textContent='Escaneo completado · Análisis completado · Datos enviados';document.getElementById('success-overlay').classList.add('visible')}`;
html = replaceFunction(html, 'function completeLevel(', completeLevel);

// Textos y paneles de ayuda: mismo componente N5, contenido N6.
const exploreSteps = `const exploreSteps=${JSON.stringify(CFG.explore)}`;
html = replaceArray(html, 'const exploreSteps=', exploreSteps, 'explore_steps');
html = html.replaceAll('${exploreIndex+1} / 5', '${exploreIndex+1} / 4');

const guideStart = html.indexOf("document.getElementById('guide-btn').onclick=()=>{");
const guideEndMarker = ";document.getElementById('info-close').onclick=";
const guideEnd = html.indexOf(guideEndMarker, guideStart);
if (guideStart < 0 || guideEnd < 0) fail('guide_handler_range');
const guideHandler = `document.getElementById('guide-btn').onclick=()=>{guideOpened=true;document.getElementById('guide-btn').classList.remove('is-recommended');guideStage=(guideStage+1)%3;const steps=${JSON.stringify(CFG.guide)};const step=steps[guideStage];showInfo('GUÍA',step[0],step[1],guideStage===0?'Busca movimientos repetidos y agrúpalos con REPETIR.':guideStage===1?'El orden científico importa: ESCANEAR antes de ANALIZAR.':'ENVIAR DATOS solo funciona después del análisis.','')}`;
html = html.slice(0, guideStart) + guideHandler + html.slice(guideEnd);

const openJournal = `function openJournal(){document.getElementById('journal-meta').textContent='MISIÓN 01 · NIVEL 6';document.getElementById('journal-title').textContent='MISIÓN CIENTÍFICA';document.getElementById('journal-text').textContent=\`Punto de estudio: \${atSciencePoint()?'alcanzado':'pendiente'} · Escaneo: \${scienceScanned?'completado':'pendiente'} · Análisis: \${scienceAnalyzed?'completado':'pendiente'} · Envío: \${scienceSent?'completado':'pendiente'}.\`;const jp=document.getElementById('journal-program');const source=finalProgram||program;jp.innerHTML='';if(source&&source.length){source.slice(0,16).forEach((x,i)=>{const d=document.createElement('div');if(isCmd(x))d.textContent=\`\${String(i+1).padStart(2,'0')} · \${commands[x.cmd]?.label||x.cmd}\`;else if(isRepeat(x))d.textContent=\`\${String(i+1).padStart(2,'0')} · REPETIR × \${x.count} [\${x.body.map(b=>commands[b.cmd]?.label||b.cmd).join(', ')}]\`;jp.appendChild(d)})}else jp.textContent='Construye tu programa científico para registrar el proceso.';document.getElementById('journal-overlay').classList.add('visible')}`;
html = replaceFunction(html, 'function openJournal(', openJournal);

// Success card científico.
if (!html.includes('id="success-program-summary"')) fail('success_summary');
html = html.replace(
  /<p id="success-program-summary">[\s\S]*?<\/p>/,
  `<p id="success-data">Escaneo pendiente · Análisis pendiente · Envío pendiente</p><p id="success-program-summary">Guardaremos tu programa científico.</p>`,
);
html = html
  .replace(/<h2>¡NIVEL 6 COMPLETADO!<\/h2><p>[\s\S]*?<\/p><div class="journal-card">/,
    `<h2>¡NIVEL 6 COMPLETADO!</h2><p>AYNI llegó al punto de estudio y completó correctamente el ciclo científico.</p><div class="journal-card">`)
  .replace(/<small>BITÁCORA ACTUALIZADA<\/small><strong>[\s\S]*?<\/strong>/,
    `<small>BITÁCORA ACTUALIZADA</small><strong>ESCANEAR → ANALIZAR → ENVIAR DATOS</strong>`);

// El target científico sustituye semánticamente a la bandera.
html = html
  .replaceAll('hasta la bandera', 'hasta el punto de estudio')
  .replaceAll('a la bandera', 'al punto de estudio')
  .replaceAll('la bandera', 'el punto de estudio')
  .replaceAll('meta amarilla', 'punto de estudio cyan');

// Contrato final.
const requiredTokens = [
  'APULAB_LEVEL6_FROM_LEVEL5_V1',
  'width:1672px;height:941px',
  'id="board-canvas" width="950" height="664"',
  'class="board-labels-top"',
  'class="board-labels-left"',
  'id="program-list"',
  'id="program-scroll"',
  'id="repeat-palette"',
  'data-command="scan"',
  'data-command="analyze"',
  'data-command="send"',
  'PUNTO DE ESTUDIO',
  'ESCANEANDO MUESTRA',
  'ANALIZANDO',
  'TRANSMITIENDO A APULAB STATION',
  "parent.postMessage({type:'apulab-level-complete',level:6,nextLevel:7}",
];
html = html.replace('<script type="module">', '<script type="module">\n// APULAB_LEVEL6_FROM_LEVEL5_V1');
for (const token of requiredTokens) if (!html.includes(token)) fail(`contract:${token}`);
if (html.includes('class="panel simulator"') || html.includes('class="panel editor"')) fail('old_level67_shell_returned');
if (html.includes('apulab-repeat-focus')) fail('level5_repeat_attention_leaked');

await writeFile(LEVEL6, html, 'utf8');

const level5After = await readFile(LEVEL5, 'utf8');
if (hash(level5After) !== level5HashBefore) fail('level5_mutated');

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
let entry = (manifest.levels || []).find((x) => Number(x.level) === 6);
if (!entry) {
  entry = { level: 6, file: 'level6.html' };
  manifest.levels = [...(manifest.levels || []), entry].sort((a,b)=>Number(a.level)-Number(b.level));
}
entry.file = 'level6.html';
entry.bytes = Buffer.byteLength(html, 'utf8');
entry.sha256 = hash(html);
manifest.totalLevels = 7;
manifest.availableLevels = [1,2,3,4,5,6,7];
manifest.unavailableLevels = [];
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.info('[mission01] Nivel 6 reconstruido desde el N5 final · shell/AYNI/tablero/editor 01–30 preservados · ciencia añadida');
