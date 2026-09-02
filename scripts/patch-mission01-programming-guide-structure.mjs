import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const MANIFEST = resolve(OUT, 'manifest.json');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

function required(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`mission01_programming_guide_missing:${label}`);
  return source.replace(before, after);
}

function replaceRange(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`mission01_programming_guide_missing:${label}:start`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`mission01_programming_guide_missing:${label}:end`);
  return source.slice(0, start) + replacement + source.slice(end);
}

function addGuideCss(html, level) {
  const css = `<style id="apulab-l${level}-guide-structure">
#info-panel.apulab-guide-structured{background:#3B326B!important;border-color:#B8A9F0!important;color:#fff!important;box-shadow:6px 6px 0 #2D2654,inset 0 0 0 1px rgba(184,169,240,.18)!important}
#info-panel.apulab-guide-structured #info-kicker{color:#DCD7F3!important}
#info-panel.apulab-guide-structured #info-title{color:#fff!important;font-size:15px!important;font-weight:800!important;margin-bottom:9px!important}
#info-panel.apulab-guide-structured #info-text{display:block!important;margin:0!important}
#info-panel.apulab-guide-structured #info-progress{display:none!important}
.apulab-guide-list{display:grid;gap:6px;margin:0 0 10px 0}
.apulab-guide-task{position:relative;display:block;min-height:27px;padding:5px 8px;border-left:3px solid transparent;border-radius:3px;overflow:hidden;font-family:"Poppins",sans-serif;font-style:normal;font-size:12px;font-weight:700;line-height:1.25;color:#fff}
.apulab-guide-task.active{border-left-color:#49C9D7;background:rgba(73,201,215,.11)}
.apulab-guide-task.pending{color:#C8C4DF;opacity:.72}
.apulab-guide-task.completed{color:#D7B5D1;opacity:.72}
.apulab-guide-strike{position:absolute;left:7px;top:50%;width:0;height:3px;transform:translateY(-50%);border-radius:999px;background:#FF78B7;box-shadow:0 0 6px rgba(255,120,183,.55);pointer-events:none}
.apulab-guide-task.completed .apulab-guide-strike{animation:apulab-guide-strike-${level} .42s ease-out forwards}
#info-panel.apulab-guide-structured #info-hint{margin-top:0!important;padding-top:9px!important;border-top:1px solid rgba(255,255,255,.14)!important;color:#F0EEF8!important;line-height:1.4!important}
@keyframes apulab-guide-strike-${level}{from{width:0}to{width:calc(100% - 14px)}}
@media (prefers-reduced-motion:reduce){.apulab-guide-task.completed .apulab-guide-strike{width:calc(100% - 14px);animation:none}}
</style>`;
  if (!html.includes('</head>')) throw new Error(`mission01_programming_guide_invalid_head:l${level}`);
  return html.replace('</head>', `${css}\n</head>`);
}

const renderFn = () => `function renderStructuredGuide(active,tasks,detail,focus){info.classList.remove('apulab-explore-yellow');info.classList.add('apulab-guide-structured');document.getElementById('info-kicker').textContent='GUÍA';document.getElementById('info-title').textContent='GUÍA · 3 PASOS';document.getElementById('info-text').innerHTML='<span class="apulab-guide-list">'+tasks.map((label,index)=>{const state=index<active?'completed':index===active?'active':'pending';return '<span class="apulab-guide-task '+state+'"><span>'+label+'</span><span class="apulab-guide-strike" aria-hidden="true"></span></span>'}).join('')+'</span>';document.getElementById('info-hint').textContent=detail||'';infoProgress.textContent='';infoProgress.classList.remove('visible');info.classList.add('visible');if(focus)focusStep(focus)}`;

const outputs = new Map();

{
  const level = 3;
  const path = resolve(OUT, `level${level}.html`);
  let html = addGuideCss(await readFile(path, 'utf8'), level);
  html = required(html,
    "function closeInfo(){const kind=String(document.getElementById('info-kicker')?.textContent||'').trim().toUpperCase();info.classList.remove('visible');infoProgress.classList.remove('visible');if(kind==='EXPLORAR'){exploreActive=false;exploreIndex=0;exploreBtn.textContent='▶ EXPLORAR'}clearFocus()}",
    "function closeInfo(){const kind=String(document.getElementById('info-kicker')?.textContent||'').trim().toUpperCase();info.classList.remove('visible','apulab-guide-structured');infoProgress.classList.remove('visible');if(kind==='EXPLORAR'){exploreActive=false;exploreIndex=0;exploreBtn.textContent='▶ EXPLORAR'}else if(kind==='GUÍA'){guideStage=0}clearFocus()}",
    'l3-close');
  html = required(html,
    "const s=exploreSteps[current];showInfo('EXPLORAR',s.title,s.text,s.hint,`${current+1} / ${exploreSteps.length}`);",
    "const s=exploreSteps[current];info.classList.remove('apulab-guide-structured');showInfo('EXPLORAR',s.title,s.text,s.hint,`${current+1} / ${exploreSteps.length}`);",
    'l3-explore');
  const oldGuide = "guideBtn.addEventListener('click',()=>{if(!exploreDone)return;guideOpened=true;guideBtn.classList.remove('is-recommended');showInfo('GUÍA','LLEGA A LA META','Construye una secuencia que lleve a AYNI desde su posición inicial hasta la bandera marciana.','AVANZAR mueve una casilla hacia donde AYNI está mirando. GIRAR solo cambia su orientación. Escucha: DO = avanzar, RE = izquierda y MI = derecha.','');document.getElementById('workspace').classList.add('focus-dom');setTimeout(()=>document.getElementById('workspace').classList.remove('focus-dom'),1500)});";
  const newGuide = `let guideStage=0;${renderFn()}guideBtn.addEventListener('click',()=>{if(!exploreDone)return;guideOpened=true;guideBtn.classList.remove('is-recommended');const tasks=['1 · ARRASTRA LOS BLOQUES','2 · ORDENA LA SECUENCIA','3 · INICIA LA PRUEBA'];const details=['Lleva AVANZAR, GIRAR IZQ. o GIRAR DER. a MI PROGRAMA.','Coloca los bloques en el orden que AYNI debe ejecutar.','Pulsa INICIAR PRUEBA y observa si AYNI llega a la bandera.'];const focuses=['workspace','workspace','run'];renderStructuredGuide(guideStage,tasks,details[guideStage],focuses[guideStage]);guideStage=(guideStage+1)%3});`;
  html = required(html, oldGuide, newGuide, 'l3-guide');
  await writeFile(path, html, 'utf8'); outputs.set(level, html);
  console.info('[mission01] Nivel 3 · GUÍA unificada a GUÍA · 3 PASOS');
}

{
  const level = 4;
  const path = resolve(OUT, `level${level}.html`);
  let html = addGuideCss(await readFile(path, 'utf8'), level);
  html = required(html,
    "function closeInfo(){const kind=String(document.getElementById('info-kicker')?.textContent||'').trim().toUpperCase();info.classList.remove('visible');infoProgress.classList.remove('visible');if(kind==='EXPLORAR'){exploreActive=false;exploreIndex=0;exploreBtn.textContent='▶ EXPLORAR'}else if(kind==='GUÍA'){guideStage=0}clearFocus()}",
    "function closeInfo(){const kind=String(document.getElementById('info-kicker')?.textContent||'').trim().toUpperCase();info.classList.remove('visible','apulab-guide-structured');infoProgress.classList.remove('visible');if(kind==='EXPLORAR'){exploreActive=false;exploreIndex=0;exploreBtn.textContent='▶ EXPLORAR'}else if(kind==='GUÍA'){guideStage=0}clearFocus()}",
    'l4-close');
  html = required(html,
    "const current=exploreIndex,s=exploreSteps[current];showInfo('EXPLORAR',s.title,s.text,s.hint,`${current+1} / ${exploreSteps.length}`);",
    "const current=exploreIndex,s=exploreSteps[current];info.classList.remove('apulab-guide-structured');showInfo('EXPLORAR',s.title,s.text,s.hint,`${current+1} / ${exploreSteps.length}`);",
    'l4-explore');
  const replacement = `let guideStage=0;${renderFn()}guideBtn.addEventListener('click',()=>{guideOpened=true;guideBtn.classList.remove('is-recommended');hintCount++;telemetry('hint_requested',{hint_count:hintCount});const tasks=['1 · PLANEA TU CAMINO','2 · OBSERVA DÓNDE FALLÓ','3 · AJUSTA Y VUELVE A PROBAR'];if(collisionCount===0){guideStage=0;renderStructuredGuide(0,tasks,'Observa AYNI, la baliza y las casillas bloqueadas antes de ejecutar.','board');return}guideStage=guideStage===1?2:1;if(guideStage===1)renderStructuredGuide(1,tasks,'Mira dónde se detuvo AYNI y qué instrucción estaba ejecutando.','rover');else renderStructuredGuide(2,tasks,'Cambia solo lo necesario y vuelve a pulsar INICIAR PRUEBA.','turns')}); `;
  html = replaceRange(html, "let guideStage=0;", "const journalOverlay=document.getElementById('journal-overlay');", replacement, 'l4-guide');
  await writeFile(path, html, 'utf8'); outputs.set(level, html);
  console.info('[mission01] Nivel 4 · GUÍA unificada con pistas de colisión/depuración');
}

{
  const level = 5;
  const path = resolve(OUT, `level${level}.html`);
  let html = addGuideCss(await readFile(path, 'utf8'), level);
  html = required(html,
    "const s=exploreSteps[exploreIndex];showInfo('EXPLORAR',s.title,s.text,s.hint,`${exploreIndex+1} / ${exploreSteps.length}`);",
    "const s=exploreSteps[exploreIndex];info.classList.remove('apulab-guide-structured');showInfo('EXPLORAR',s.title,s.text,s.hint,`${exploreIndex+1} / ${exploreSteps.length}`);",
    'l5-explore');
  html = required(html,
    "document.getElementById('info-close').onclick=()=>{const kind=String(document.getElementById('info-kicker')?.textContent||'').trim().toUpperCase();info.classList.remove('visible');infoProgress.classList.remove('visible');if(kind==='EXPLORAR')exploreIndex=-1;else if(kind==='GUÍA')guideStage=0;clearFocus()};",
    "document.getElementById('info-close').onclick=()=>{const kind=String(document.getElementById('info-kicker')?.textContent||'').trim().toUpperCase();info.classList.remove('visible','apulab-guide-structured');infoProgress.classList.remove('visible');if(kind==='EXPLORAR')exploreIndex=-1;else if(kind==='GUÍA')guideStage=0;clearFocus()};",
    'l5-close');
  const replacement = `${renderFn()}document.getElementById('guide-btn').onclick=()=>{guideOpened=true;document.getElementById('guide-btn').classList.remove('is-recommended');const tasks=['1 · RESUELVE LA RUTA','2 · BUSCA REPETICIONES','3 · USA Y AJUSTA REPETIR'];if(!repeatUnlocked){guideStage=0;renderStructuredGuide(0,tasks,'Primero haz funcionar la ruta con AVANZAR y GIRAR. Mientras programas, observa qué instrucciones se repiten.','board');return}guideStage=guideStage===1?2:1;if(guideStage===1)renderStructuredGuide(1,tasks,'Busca bloques o pequeñas secuencias que aparecen varias veces.','workspace');else renderStructuredGuide(2,tasks,'Usa REPETIR y ajusta la cantidad o sus bloques internos si la ruta falla.','workspace')};`;
  html = replaceRange(html, "document.getElementById('guide-btn').onclick=", "document.getElementById('info-close').onclick=", replacement, 'l5-guide');
  await writeFile(path, html, 'utf8'); outputs.set(level, html);
  console.info('[mission01] Nivel 5 · GUÍA unificada para ruta, patrones y REPETIR');
}

for (const [level, html] of outputs) {
  if (!html.includes(`id="apulab-l${level}-guide-structure"`)) throw new Error(`mission01_programming_guide_css_qa:l${level}`);
  if (!html.includes("textContent='GUÍA · 3 PASOS'")) throw new Error(`mission01_programming_guide_title_qa:l${level}`);
  if (!html.includes('apulab-guide-strike')) throw new Error(`mission01_programming_guide_strike_qa:l${level}`);
  if (!html.includes("?'completed':index===active?'active':'pending'")) throw new Error(`mission01_programming_guide_states_qa:l${level}`);
}

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
for (const entry of manifest.levels || []) {
  const level = Number(entry.level);
  if (!outputs.has(level)) continue;
  const html = outputs.get(level);
  entry.bytes = Buffer.byteLength(html, 'utf8');
  entry.sha256 = hash(html);
}
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.info('[mission01] GUIDE QA OK · Niveles 3–5 usan caja única GUÍA · 3 PASOS con activo/tachado/pendiente');
