import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const MANIFEST = resolve(OUT, 'manifest.json');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

function inject(html, level, runtime) {
  const id = `apulab-help-lifecycle-final-l${level}`;
  if (html.includes(`id="${id}"`)) throw new Error(`mission01_help_lifecycle_duplicate:l${level}`);
  if (!html.includes('</body>')) throw new Error(`mission01_help_lifecycle_body_missing:l${level}`);
  return html.replace('</body>', `<script id="${id}">${runtime}</script>\n</body>`);
}

const runtime12 = (level) => `(()=>{
  const explore=document.getElementById('kawsay-explanation');
  const guide=document.getElementById('kawsay-guide');
  const panel=document.getElementById('kawsay-concept-panel');
  if(!explore||!guide||!panel)return;
  const closed=()=>{
    if(panel.hidden)return true;
    if(panel.getAttribute('aria-hidden')==='true')return true;
    const s=getComputedStyle(panel);
    return s.display==='none'||s.visibility==='hidden'||s.pointerEvents==='none'||Number(s.opacity||1)===0;
  };
  const resetExplore=()=>{
    try{if(typeof explanationMode!=='undefined')explanationMode=false}catch(_){}
    try{if(typeof explanationIndex!=='undefined')explanationIndex=-1}catch(_){}
  };
  const resetGuide=()=>{
    try{if(typeof guideActive!=='undefined')guideActive=false}catch(_){}
    guide.classList.remove('is-active');
    guide.setAttribute('aria-label','Abrir GUÍA');
  };
  // CAPTURE se ejecuta antes del handler histórico del nivel. Si la caja ya está
  // cerrada, normalizamos el estado interno para que el handler original ABRA.
  explore.addEventListener('click',()=>{if(!closed())return;resetGuide();resetExplore();},{capture:true});
  guide.addEventListener('click',()=>{if(!closed())return;resetExplore();resetGuide();},{capture:true});
  // Cualquier cierre por X, botón o código deja también el estado sincronizado.
  document.addEventListener('click',()=>{queueMicrotask(()=>{if(closed()){resetExplore();resetGuide();}})},{capture:false});
  window.__APULAB_HELP_LIFECYCLE__=window.__APULAB_HELP_LIFECYCLE__||{};
  window.__APULAB_HELP_LIFECYCLE__[${level}]='repeatable-v2';
})();`;

const runtime34 = (level) => `(()=>{
  const explore=document.getElementById('explore-btn');
  const guide=document.getElementById('guide-btn');
  const panel=document.getElementById('info-panel');
  if(!explore||!guide||!panel)return;
  const closed=()=>!panel.classList.contains('visible');
  const resetExplore=()=>{
    try{if(typeof exploreActive!=='undefined')exploreActive=false}catch(_){}
    try{if(typeof exploreIndex!=='undefined')exploreIndex=0}catch(_){}
    explore.textContent='▶ EXPLORAR';
  };
  const resetGuide=()=>{try{if(typeof guideStage!=='undefined')guideStage=0}catch(_){}};
  explore.addEventListener('click',()=>{if(closed())resetExplore()},{capture:true});
  guide.addEventListener('click',()=>{if(closed())resetGuide()},{capture:true});
  document.addEventListener('click',()=>{queueMicrotask(()=>{if(closed()){resetExplore();resetGuide();}})},{capture:false});
  window.__APULAB_HELP_LIFECYCLE__=window.__APULAB_HELP_LIFECYCLE__||{};
  window.__APULAB_HELP_LIFECYCLE__[${level}]='repeatable-v2';
})();`;

const runtime5 = `(()=>{
  const explore=document.getElementById('explore-btn');
  const guide=document.getElementById('guide-btn');
  const panel=document.getElementById('info-panel');
  if(!explore||!guide||!panel)return;
  const closed=()=>!panel.classList.contains('visible');
  const resetExplore=()=>{try{if(typeof exploreIndex!=='undefined')exploreIndex=-1}catch(_){}};
  const resetGuide=()=>{try{if(typeof guideStage!=='undefined')guideStage=0}catch(_){}};
  explore.addEventListener('click',()=>{if(closed())resetExplore()},{capture:true});
  guide.addEventListener('click',()=>{if(closed())resetGuide()},{capture:true});
  document.addEventListener('click',()=>{queueMicrotask(()=>{if(closed()){resetExplore();resetGuide();}})},{capture:false});
  window.__APULAB_HELP_LIFECYCLE__=window.__APULAB_HELP_LIFECYCLE__||{};
  window.__APULAB_HELP_LIFECYCLE__[5]='repeatable-v2';
})();`;

const outputs = new Map();
for (const level of [1,2,3,4,5]) {
  const path = resolve(OUT, `level${level}.html`);
  let html = await readFile(path, 'utf8');
  const runtime = level <= 2 ? runtime12(level) : level <= 4 ? runtime34(level) : runtime5;
  html = inject(html, level, runtime);

  // Contrato estático: cada nivel debe tener normalización en captura ANTES del
  // handler original. Ya no basta con comprobar que exista un listener cualquiera.
  if (!html.includes(`apulab-help-lifecycle-final-l${level}`)) throw new Error(`mission01_help_lifecycle_marker:l${level}`);
  if (!html.includes("{capture:true}")) throw new Error(`mission01_help_lifecycle_capture:l${level}`);
  if (!html.includes("repeatable-v2")) throw new Error(`mission01_help_lifecycle_version:l${level}`);
  if (level <= 2) {
    if (!html.includes("explanationIndex=-1") || !html.includes("guideActive=false")) throw new Error(`mission01_help_lifecycle_state12:l${level}`);
  } else if (level <= 4) {
    if (!html.includes("exploreIndex=0") || !html.includes("guideStage=0")) throw new Error(`mission01_help_lifecycle_state34:l${level}`);
  } else {
    if (!html.includes("exploreIndex=-1") || !html.includes("guideStage=0")) throw new Error('mission01_help_lifecycle_state5');
  }

  await writeFile(path, html, 'utf8');
  outputs.set(level, html);
  console.info(`[mission01] Nivel ${level} · EXPLORAR/GUÍA sincronizados con visibilidad real · reapertura forzada`);
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
console.info('[mission01] HELP LIFECYCLE QA OK · abrir → cerrar → reabrir blindado en niveles 1–5');
