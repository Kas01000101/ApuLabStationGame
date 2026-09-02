import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

function required(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`mission01_programming_patch_missing:${label}`);
  return source.replace(before, after);
}

function replaceArray(source, marker, replacement, label) {
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`mission01_programming_patch_missing:${label}:start`);
  const bracket = source.indexOf('[', start);
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
  throw new Error(`mission01_programming_patch_missing:${label}:end`);
}

const STEPS = {
  3: `const exploreSteps=[
    {title:'AYNI Y SU ORIENTACIÓN',text:'AYNI siempre mira hacia una dirección. Antes de moverlo, observa hacia dónde está apuntando.',hint:'La parte frontal y sus ojos cyan te muestran hacia dónde avanzará.',focus:'rover'},
    {title:'AVANZAR',text:'AVANZAR mueve a AYNI una casilla hacia la dirección que está mirando.',hint:'Al ejecutarse escucharás DO ♪.',focus:'command:forward'},
    {title:'GIRAR',text:'GIRAR IZQ. y GIRAR DER. cambian la orientación de AYNI sin moverlo de casilla.',hint:'RE ♪ gira a la izquierda y MI ♪ gira a la derecha.',focus:'command:left'},
    {title:'OBJETIVO · LLEGA A LA META',text:'Ordena los bloques y lleva a AYNI hasta la bandera. Cuando termines este paso podrás empezar a programar.',hint:'GUÍA queda disponible como ayuda opcional.',focus:'goal'}
  ]`,
  4: `const exploreSteps=[
    {title:'NUEVO TERRENO',text:'La ruta cambió. Observa el tablero completo antes de decidir por dónde avanzar.',hint:'Desde este nivel puedes programar directamente; EXPLORAR es opcional.',focus:'board'},
    {title:'OBSTÁCULOS',text:'Las rocas ocupan casillas y AYNI no puede atravesarlas.',hint:'Busca un camino alrededor de las casillas bloqueadas.',focus:'obstacle'},
    {title:'AYNI Y LA META',text:'Observa dónde está AYNI, hacia dónde mira y dónde se encuentra la baliza.',hint:'La orientación importa tanto como la posición.',focus:'rover'},
    {title:'PRUEBA TU RUTA',text:'Construye una secuencia y ejecútala. Si una roca bloquea el camino, ajusta solo lo necesario.',hint:'GUÍA es opcional y puede darte pistas si la necesitas.',focus:'run'}
  ]`,
  5: `const exploreSteps=[
    {title:'RUTA MÁS LARGA',text:'La bandera está más lejos. Observa la distancia y la forma general del recorrido.',hint:'Puedes comenzar a programar sin abrir EXPLORAR ni GUÍA.',focus:'board'},
    {title:'MÁS OBSTÁCULOS',text:'Las rocas ocupan casillas reales y obligan a planificar una ruta.',hint:'Busca primero un camino válido.',focus:'obstacle'},
    {title:'PATRONES',text:'Mientras programas, observa si una pequeña secuencia de instrucciones se repite varias veces.',hint:'Detectar patrones te ayudará a simplificar después.',focus:'workspace'},
    {title:'PRUEBA Y AJUSTA',text:'Haz que la ruta funcione y luego mejora tu programa usando los recursos del nivel.',hint:'EXPLORAR y GUÍA quedan como ayudas opcionales.',focus:'run'}
  ]`,
};

const FACE = `
// ApuLab · frente canónico de AYNI. -Z es el frente local del rover.
const apulabFaceGroup=new THREE.Group();apulabFaceGroup.name='AYNI_FRONT_ORIENTATION';
const apulabFaceDark=new THREE.MeshStandardMaterial({color:0x17182B,roughness:.50,metalness:.10});
const apulabEyeMat=new THREE.MeshStandardMaterial({color:0xA8EDF1,emissive:0x49C9D7,emissiveIntensity:2.6,roughness:.18,metalness:.02});
const apulabVisor=new THREE.Mesh(new THREE.BoxGeometry(.43,.045,.15),apulabFaceDark);apulabVisor.position.set(0,.56,-.285);apulabFaceGroup.add(apulabVisor);
[-.115,.115].forEach(x=>{const eye=new THREE.Mesh(new THREE.SphereGeometry(.052,16,12),apulabEyeMat);eye.position.set(x,.592,-.345);apulabFaceGroup.add(eye)});
const apulabDirectionMarker=new THREE.Mesh(new THREE.ConeGeometry(.070,.16,3),apulabEyeMat);apulabDirectionMarker.rotation.x=-Math.PI/2;apulabDirectionMarker.position.set(0,.615,-.155);apulabFaceGroup.add(apulabDirectionMarker);
rover.add(apulabFaceGroup);
`;

function addFace(html, level) {
  const marker = 'rover.scale.setScalar(';
  const at = html.indexOf(marker);
  if (at < 0) throw new Error(`mission01_programming_patch_missing:l${level}-rover-scale`);
  return html.slice(0, at) + FACE + html.slice(at);
}

function addYellowExplore(html, level) {
  const css = `<style id="apulab-l${level}-explore-yellow-style">
#info-panel.apulab-explore-yellow{background:#F4C75E!important;border-color:#17133A!important;color:#17133A!important;box-shadow:6px 6px 0 #D5A43D,inset 0 0 0 1px rgba(23,19,58,.22)!important}
#info-panel.apulab-explore-yellow #info-kicker,#info-panel.apulab-explore-yellow #info-title,#info-panel.apulab-explore-yellow #info-text,#info-panel.apulab-explore-yellow #info-hint,#info-panel.apulab-explore-yellow .hint{color:#17133A!important}
#info-panel.apulab-explore-yellow #info-progress{background:#FFF3C8!important;border-color:#17133A!important;color:#17133A!important}
</style>`;
  const js = `<script id="apulab-l${level}-explore-yellow-runtime">(()=>{const panel=document.getElementById('info-panel'),kicker=document.getElementById('info-kicker');if(!panel||!kicker)return;const sync=()=>panel.classList.toggle('apulab-explore-yellow',String(kicker.textContent||'').trim().toUpperCase()==='EXPLORAR');const observer=new MutationObserver(sync);observer.observe(kicker,{childList:true,subtree:true,characterData:true});sync();const cleanup=()=>observer.disconnect();window.addEventListener('pagehide',cleanup,{once:true});window.addEventListener('beforeunload',cleanup,{once:true});window.addEventListener('message',e=>{if(e.data&&e.data.type==='apulab-dispose')cleanup()})})();</script>`;
  html = required(html, '</head>', `${css}\n</head>`, `l${level}-yellow-head`);
  return required(html, '</body>', `${js}\n</body>`, `l${level}-yellow-body`);
}

function patch3(html) {
  html = required(html, '<title>AYNI · Nivel 2 · Entrenamiento de movimiento · v127</title>', '<title>AYNI · Nivel 3 · Entrenamiento de movimiento · v127</title>', 'l3-title');
  html = required(html, '<div class="level-badge">NIVEL 2</div>', '', 'l3-badge');
  html = required(html, '<strong id="info-title">Nivel 2</strong>', '<strong id="info-title">Nivel 3</strong>', 'l3-info');
  html = required(html, '<small>MISIÓN 01 · NIVEL 2</small>', '<small>MISIÓN 01 · NIVEL 3</small>', 'l3-journal');
  html = required(html, '<h2>¡NIVEL 2 COMPLETADO!</h2>', '<h2>¡NIVEL 3 COMPLETADO!</h2>', 'l3-success');
  html = replaceArray(html, 'const exploreSteps=', STEPS[3], 'l3-steps');
  html = required(html,
    "function finishExplore(){exploreDone=true;exploreActive=false;exploreIndex=0;exploreBtn.textContent='▶ EXPLORAR';exploreBtn.classList.remove('is-recommended');guideBtn.disabled=false;guideBtn.classList.add('is-recommended');info.classList.remove('visible');infoProgress.classList.remove('visible');clearFocus();showStatus('Ahora abre GUÍA.',1800)}",
    "function finishExplore(){exploreDone=true;exploreActive=false;exploreIndex=0;exploreBtn.textContent='▶ EXPLORAR';exploreBtn.classList.remove('is-recommended');guideBtn.disabled=false;guideBtn.classList.remove('is-recommended');info.classList.remove('visible');infoProgress.classList.remove('visible');clearFocus();showStatus('EXPLORAR completado. Ya puedes programar a AYNI; GUÍA es opcional.',1900)}",
    'l3-finish');
  html = required(html,
    "if(!exploreDone){showStatus('Primero completa EXPLORAR y abre GUÍA.');return}if(!guideOpened){showStatus('Abre GUÍA antes de iniciar.');return}",
    "if(!exploreDone){showStatus('Primero completa EXPLORAR.');return}",
    'l3-run-gate');
  return addYellowExplore(addFace(html, 3), 3);
}

function removeOptionalGates(html) {
  // Con o sin llaves, con cualquier espaciado: a partir de N4 ninguna condición
  // exploreDone/guideOpened puede bloquear el editor ni INICIAR PRUEBA.
  html = html.replace(/if\s*\(\s*!exploreDone\s*\)\s*\{[^{}]*\}/g, '');
  html = html.replace(/if\s*\(\s*!guideOpened\s*\)\s*\{[^{}]*\}/g, '');
  html = html.replace(/if\s*\(\s*!exploreDone\s*\)\s*return(?:\s+[^;]+)?;/g, '');
  html = html.replace(/if\s*\(\s*!guideOpened\s*\)\s*return(?:\s+[^;]+)?;/g, '');
  return html;
}

function patchOptional(html, level) {
  html = replaceArray(html, 'const exploreSteps=', STEPS[level], `l${level}-steps`);
  html = html.replace('<button id="explore-btn" class="btn btn-yellow btn-explore is-recommended">▶ EXPLORAR</button>','<button id="explore-btn" class="btn btn-yellow btn-explore">▶ EXPLORAR</button>');
  html = html.replace('<button id="guide-btn" class="btn btn-purple btn-guide" disabled>▶ GUÍA</button>','<button id="guide-btn" class="btn btn-purple btn-guide">▶ GUÍA</button>');
  html = removeOptionalGates(html);
  html = html.replaceAll("showStatus('Ahora abre GUÍA.',1800)","showStatus('EXPLORAR completado. Puedes seguir jugando; GUÍA es opcional.',1700)");
  return addYellowExplore(addFace(html, level), level);
}

function stepCount(html) {
  const start = html.indexOf('const exploreSteps=');
  const end = html.indexOf('];', start);
  return start < 0 || end < 0 ? 0 : (html.slice(start, end).match(/\{title:/g) || []).length;
}

function qa(level, html) {
  if (!html.includes(`${level} / 7`)) throw new Error(`mission01_programming_qa_progress:l${level}`);
  if (stepCount(html) !== 4) throw new Error(`mission01_programming_qa_steps:l${level}:${stepCount(html)}`);
  if (!html.includes(`apulab-l${level}-explore-yellow-style`)) throw new Error(`mission01_programming_qa_yellow:l${level}`);
  if (!html.includes('AYNI_FRONT_ORIENTATION')) throw new Error(`mission01_programming_qa_face:l${level}`);
  if (level === 3) {
    if (html.includes('<div class="level-badge">')) throw new Error('mission01_programming_qa_l3_badge');
    if (!html.includes('¡NIVEL 3 COMPLETADO!') || html.includes('¡NIVEL 2 COMPLETADO!')) throw new Error('mission01_programming_qa_l3_success');
    if (!html.includes('CONTINUAR AL NIVEL 4')) throw new Error('mission01_programming_qa_l3_continue');
    if (!html.includes("if(!exploreDone){showStatus('Primero completa EXPLORAR.');return}")) throw new Error('mission01_programming_qa_l3_required_explore');
    if (/if\s*\(\s*!guideOpened\s*\)/.test(html)) throw new Error('mission01_programming_qa_l3_guide_gate');
  } else {
    if (html.includes('id="guide-btn" class="btn btn-purple btn-guide" disabled')) throw new Error(`mission01_programming_qa_guide_disabled:l${level}`);
    if (/if\s*\(\s*!exploreDone\s*\)/.test(html)) throw new Error(`mission01_programming_qa_explore_gate:l${level}`);
    if (/if\s*\(\s*!guideOpened\s*\)/.test(html)) throw new Error(`mission01_programming_qa_guide_gate:l${level}`);
  }
}

const outputs = new Map();
for (const level of [3,4,5]) {
  const path = resolve(OUT, `level${level}.html`);
  let html = await readFile(path, 'utf8');
  html = level === 3 ? patch3(html) : patchOptional(html, level);
  qa(level, html);
  await writeFile(path, html, 'utf8');
  outputs.set(level, html);
  console.info(`[mission01] Nivel ${level} · EXPLORAR 4/4 amarillo · AYNI frontal restaurado · ${level===3?'EXPLORAR obligatorio, GUÍA opcional':'EXPLORAR/GUÍA opcionales'}`);
}

const manifestPath = resolve(OUT, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const entry of manifest.levels || []) {
  const level = Number(entry.level);
  if (!outputs.has(level)) continue;
  const html = outputs.get(level);
  entry.bytes = Buffer.byteLength(html, 'utf8');
  entry.sha256 = hash(html);
}
await writeFile(manifestPath, `${JSON.stringify(manifest,null,2)}\n`, 'utf8');
console.info('[mission01] programación QA OK · Nivel 3 cerrado · Niveles 4–5 opcionales · AYNI con frente/ojos');
