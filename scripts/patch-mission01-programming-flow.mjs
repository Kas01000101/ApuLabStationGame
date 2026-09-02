import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const OUT = resolve(ROOT, 'public/missions/mission01');

function sha256(text) {
  return createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
}

function replaceRequired(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`mission01_programming_patch_missing:${label}`);
  return source.replace(before, after);
}

function replaceArray(source, marker, replacement, label) {
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`mission01_programming_patch_missing:${label}:start`);
  const bracket = source.indexOf('[', start);
  if (bracket < 0) throw new Error(`mission01_programming_patch_missing:${label}:bracket`);

  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let i = bracket; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '[') depth += 1;
    else if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(0, start) + replacement + source.slice(i + 1);
      }
    }
  }
  throw new Error(`mission01_programming_patch_missing:${label}:end`);
}

const EXPLORE_STEPS = {
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

const exploreThemeCss = (level) => `
<style id="apulab-l${level}-explore-yellow-style">
#info-panel.apulab-explore-yellow {
  background: #F4C75E !important;
  border-color: #17133A !important;
  color: #17133A !important;
  box-shadow: 6px 6px 0 #D5A43D, inset 0 0 0 1px rgba(23,19,58,.22) !important;
}
#info-panel.apulab-explore-yellow #info-kicker,
#info-panel.apulab-explore-yellow #info-title,
#info-panel.apulab-explore-yellow #info-text,
#info-panel.apulab-explore-yellow #info-hint,
#info-panel.apulab-explore-yellow .hint {
  color: #17133A !important;
}
#info-panel.apulab-explore-yellow #info-progress {
  background: #FFF3C8 !important;
  border-color: #17133A !important;
  color: #17133A !important;
}
</style>`;

const exploreThemeRuntime = (level) => `
<script id="apulab-l${level}-explore-yellow-runtime">
(() => {
  const panel = document.getElementById('info-panel');
  const kicker = document.getElementById('info-kicker');
  if (!panel || !kicker) return;
  const sync = () => {
    const isExplore = String(kicker.textContent || '').trim().toUpperCase() === 'EXPLORAR';
    panel.classList.toggle('apulab-explore-yellow', isExplore);
  };
  const observer = new MutationObserver(sync);
  observer.observe(kicker, { childList: true, subtree: true, characterData: true });
  sync();
  const cleanup = () => observer.disconnect();
  window.addEventListener('pagehide', cleanup, { once: true });
  window.addEventListener('beforeunload', cleanup, { once: true });
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'apulab-dispose') cleanup();
  });
})();
</script>`;

const AYNI_FACE = `
// ApuLab · frente canónico de AYNI para niveles de programación.
// -Z es el frente local: visor + dos ojos cyan + marcador direccional.
const apulabFaceGroup=new THREE.Group();
apulabFaceGroup.name='AYNI_FRONT_ORIENTATION';
const apulabFaceDark=new THREE.MeshStandardMaterial({color:0x17182B,roughness:.50,metalness:.10});
const apulabEyeMat=new THREE.MeshStandardMaterial({color:0xA8EDF1,emissive:0x49C9D7,emissiveIntensity:2.6,roughness:.18,metalness:.02});
const apulabVisor=new THREE.Mesh(new THREE.BoxGeometry(.43,.045,.15),apulabFaceDark);
apulabVisor.position.set(0,.56,-.285);
apulabFaceGroup.add(apulabVisor);
[-.115,.115].forEach(x=>{
  const eye=new THREE.Mesh(new THREE.SphereGeometry(.052,16,12),apulabEyeMat);
  eye.position.set(x,.592,-.345);
  apulabFaceGroup.add(eye);
});
const apulabDirectionMarker=new THREE.Mesh(new THREE.ConeGeometry(.070,.16,3),apulabEyeMat);
apulabDirectionMarker.rotation.x=-Math.PI/2;
apulabDirectionMarker.position.set(0,.615,-.155);
apulabFaceGroup.add(apulabDirectionMarker);
rover.add(apulabFaceGroup);
`;

function injectExploreTheme(html, level) {
  if (html.includes(`apulab-l${level}-explore-yellow-style`)) {
    throw new Error(`mission01_programming_patch_duplicate_theme:l${level}`);
  }
  html = replaceRequired(html, '</head>', `${exploreThemeCss(level)}\n</head>`, `l${level}-theme-head`);
  html = replaceRequired(html, '</body>', `${exploreThemeRuntime(level)}\n</body>`, `l${level}-theme-body`);
  return html;
}

function injectAyniFace(html, level) {
  const marker = 'rover.scale.setScalar(';
  const index = html.indexOf(marker);
  if (index < 0) throw new Error(`mission01_programming_patch_missing:l${level}-rover-scale`);
  if (html.includes('AYNI_FRONT_ORIENTATION')) {
    throw new Error(`mission01_programming_patch_duplicate_face:l${level}`);
  }
  return html.slice(0, index) + AYNI_FACE + html.slice(index);
}

function patchLevel3(html) {
  html = replaceRequired(html, '<title>AYNI · Nivel 2 · Entrenamiento de movimiento · v127</title>', '<title>AYNI · Nivel 3 · Entrenamiento de movimiento · v127</title>', 'l3-title');
  html = replaceRequired(html, '<div class="level-badge">NIVEL 2</div>', '', 'l3-remove-level-badge');
  html = replaceRequired(html, '<strong id="info-title">Nivel 2</strong>', '<strong id="info-title">Nivel 3</strong>', 'l3-info-title');
  html = replaceRequired(html, '<small>MISIÓN 01 · NIVEL 2</small>', '<small>MISIÓN 01 · NIVEL 3</small>', 'l3-journal-level');
  html = replaceRequired(html, '<h2>¡NIVEL 2 COMPLETADO!</h2>', '<h2>¡NIVEL 3 COMPLETADO!</h2>', 'l3-success-title');

  html = replaceArray(html, 'const exploreSteps=', EXPLORE_STEPS[3], 'l3-explore-four');

  html = replaceRequired(
    html,
    "function finishExplore(){exploreDone=true;exploreActive=false;exploreIndex=0;exploreBtn.textContent='▶ EXPLORAR';exploreBtn.classList.remove('is-recommended');guideBtn.disabled=false;guideBtn.classList.add('is-recommended');info.classList.remove('visible');infoProgress.classList.remove('visible');clearFocus();showStatus('Ahora abre GUÍA.',1800)}",
    "function finishExplore(){exploreDone=true;exploreActive=false;exploreIndex=0;exploreBtn.textContent='▶ EXPLORAR';exploreBtn.classList.remove('is-recommended');guideBtn.disabled=false;guideBtn.classList.remove('is-recommended');info.classList.remove('visible');infoProgress.classList.remove('visible');clearFocus();showStatus('EXPLORAR completado. Ya puedes programar a AYNI; GUÍA es opcional.',1900)}",
    'l3-finish-explore',
  );

  html = replaceRequired(
    html,
    "if(!exploreDone){showStatus('Primero completa EXPLORAR y abre GUÍA.');return}if(!guideOpened){showStatus('Abre GUÍA antes de iniciar.');return}",
    "if(!exploreDone){showStatus('Primero completa EXPLORAR.');return}",
    'l3-run-guide-gate',
  );

  html = injectAyniFace(html, 3);
  html = injectExploreTheme(html, 3);
  return html;
}

function patchOptionalLevel(html, level) {
  html = replaceArray(html, 'const exploreSteps=', EXPLORE_STEPS[level], `l${level}-explore-four`);

  html = html.replace(
    '<button id="explore-btn" class="btn btn-yellow btn-explore is-recommended">▶ EXPLORAR</button>',
    '<button id="explore-btn" class="btn btn-yellow btn-explore">▶ EXPLORAR</button>',
  );
  html = html.replace(
    '<button id="guide-btn" class="btn btn-purple btn-guide" disabled>▶ GUÍA</button>',
    '<button id="guide-btn" class="btn btn-purple btn-guide">▶ GUÍA</button>',
  );

  if (html.includes('let exploreDone=false')) {
    html = html.replace('let exploreDone=false', 'let exploreDone=true');
  } else {
    throw new Error(`mission01_programming_patch_missing:l${level}-explore-state`);
  }

  // Desde Nivel 4 EXPLORAR y GUÍA son ayudas opcionales, nunca compuertas de ejecución.
  html = html.replace(
    "if(!exploreDone){showStatus('Primero completa EXPLORAR y abre GUÍA.');return}if(!guideOpened){showStatus('Abre GUÍA antes de iniciar.');return}",
    '',
  );
  html = html.replace(
    "if(!exploreDone)return showStatus('Primero completa EXPLORAR.'); if(!guideOpened)return showStatus('Abre GUÍA antes de iniciar.');",
    '',
  );
  html = html.replaceAll("showStatus('Ahora abre GUÍA.',1800)", "showStatus('EXPLORAR completado. Puedes seguir jugando; GUÍA es opcional.',1700)");

  html = injectAyniFace(html, level);
  html = injectExploreTheme(html, level);
  return html;
}

function countExploreSteps(html) {
  const start = html.indexOf('const exploreSteps=');
  if (start < 0) return 0;
  const end = html.indexOf('];', start);
  if (end < 0) return 0;
  return (html.slice(start, end).match(/\{title:/g) || []).length;
}

function assertLevel(level, html) {
  if (!html.includes(`${level} / 7`)) throw new Error(`mission01_programming_qa_progress:l${level}`);
  if (countExploreSteps(html) !== 4) throw new Error(`mission01_programming_qa_explore_count:l${level}:${countExploreSteps(html)}`);
  if (!html.includes(`apulab-l${level}-explore-yellow-style`)) throw new Error(`mission01_programming_qa_yellow:l${level}`);
  if (!html.includes('AYNI_FRONT_ORIENTATION')) throw new Error(`mission01_programming_qa_ayni_front:l${level}`);

  if (level === 3) {
    if (html.includes('<div class="level-badge">')) throw new Error('mission01_programming_qa_l3_badge_remains');
    if (html.includes('¡NIVEL 2 COMPLETADO!')) throw new Error('mission01_programming_qa_l3_old_success');
    if (!html.includes('¡NIVEL 3 COMPLETADO!')) throw new Error('mission01_programming_qa_l3_success');
    if (!html.includes('CONTINUAR AL NIVEL 4')) throw new Error('mission01_programming_qa_l3_continue');
    if (!html.includes("if(!exploreDone){showStatus('Primero completa EXPLORAR.');return}")) throw new Error('mission01_programming_qa_l3_explore_gate');
    if (html.includes("showStatus('Abre GUÍA antes de iniciar.')")) throw new Error('mission01_programming_qa_l3_guide_gate');
  } else {
    if (html.includes('id="guide-btn" class="btn btn-purple btn-guide" disabled')) throw new Error(`mission01_programming_qa_guide_disabled:l${level}`);
    if (html.includes("showStatus('Abre GUÍA antes de iniciar.')")) throw new Error(`mission01_programming_qa_guide_gate:l${level}`);
    if (html.includes("showStatus('Primero completa EXPLORAR y abre GUÍA.')") || html.includes("showStatus('Primero completa EXPLORAR.')")) {
      throw new Error(`mission01_programming_qa_explore_gate:l${level}`);
    }
  }
}

const outputs = new Map();
for (const level of [3, 4, 5]) {
  const path = resolve(OUT, `level${level}.html`);
  let html = await readFile(path, 'utf8');
  html = level === 3 ? patchLevel3(html) : patchOptionalLevel(html, level);
  assertLevel(level, html);
  await writeFile(path, html, 'utf8');
  outputs.set(level, html);
  console.info(`[mission01] Nivel ${level} · EXPLORAR 4/4 amarillo · AYNI frontal restaurado · ${level === 3 ? 'EXPLORAR obligatorio, GUÍA opcional' : 'EXPLORAR/GUÍA opcionales'}`);
}

// Mantener manifest.json consistente con los HTML finales post-parche.
const manifestPath = resolve(OUT, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const entry of manifest.levels || []) {
  const level = Number(entry.level);
  if (![3, 4, 5].includes(level)) continue;
  const html = outputs.get(level);
  entry.bytes = Buffer.byteLength(html, 'utf8');
  entry.sha256 = sha256(html);
}
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.info('[mission01] programación QA OK · Nivel 3 cerrado · Niveles 4–5 ayudas opcionales · EXPLORAR 4/4 · AYNI con ojos/frontales');
