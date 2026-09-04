import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const LEVEL5 = resolve(OUT, 'level5.html');
const MANIFEST = resolve(OUT, 'manifest.json');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

function functionRange(source, marker) {
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`mission01_level5_function_missing:${marker}`);
  const open = source.indexOf('{', start + marker.length);
  if (open < 0) throw new Error(`mission01_level5_function_open_missing:${marker}`);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}' && --depth === 0) return { start, end: i + 1 };
  }
  throw new Error(`mission01_level5_function_close_missing:${marker}`);
}

let html = await readFile(LEVEL5, 'utf8');

// Elimina únicamente la llamada de atención LEGACY `is-new`. La señal aprobada
// ahora es una atención contextual rosa que aparece SOLO después de completar
// la primera ruta larga sin REPETIR.
const legacyGlowCss = '.block-repeat.is-new{animation:repeatUnlock 1.15s ease-in-out infinite}@keyframes repeatUnlock{0%,100%{box-shadow:0 5px 0 rgba(0,0,0,.30),0 0 0 rgba(232,93,169,0)}50%{box-shadow:0 5px 0 rgba(0,0,0,.30),0 0 22px rgba(232,93,169,.70)}}';
html = html.replaceAll(legacyGlowCss, '');
html = html.replaceAll("setTimeout(()=>document.getElementById('repeat-palette').classList.remove('is-new'),4200)", '');
html = html.replace(/document\.getElementById\((['"])repeat-palette\1\)\.classList\.(?:add|toggle)\((['"])is-new\2(?:\s*,\s*true)?\);?/g, '');

const repeatTag = html.match(/<div id="repeat-palette"[^>]*>/)?.[0] || '';
if (!repeatTag) throw new Error('mission01_level5_repeat_palette_missing');
if (/\bis-new\b|apulab-repeat-focus/i.test(repeatTag)) throw new Error('mission01_level5_repeat_initial_attention_class_remaining');

const style = `<style id="apulab-repeat-focus-style">
@keyframes apulab-repeat-focus-pulse{
  0%,100%{
    outline:3px solid rgba(255,99,184,.58);
    outline-offset:3px;
    box-shadow:0 5px 0 rgba(0,0,0,.30),0 0 0 3px rgba(255,99,184,.35),0 0 18px rgba(255,99,184,.62),0 0 34px rgba(232,93,169,.34)!important;
    filter:brightness(1.04);
  }
  50%{
    outline:5px solid rgba(255,168,218,.98);
    outline-offset:7px;
    box-shadow:0 5px 0 rgba(0,0,0,.30),0 0 0 5px rgba(255,99,184,.72),0 0 30px rgba(255,99,184,.96),0 0 52px rgba(232,93,169,.58)!important;
    filter:brightness(1.15);
  }
}
@keyframes apulab-repeat-arrow-nudge{
  0%,100%{transform:translateX(8px)}
  50%{transform:translateX(0)}
}
#repeat-palette.apulab-repeat-focus{
  position:relative!important;
  z-index:55!important;
  animation:apulab-repeat-focus-pulse 1.15s ease-in-out infinite!important;
  will-change:box-shadow,filter,outline,outline-offset;
}
#apulab-repeat-arrow{
  position:fixed;
  width:78px;
  height:28px;
  z-index:70;
  pointer-events:none;
  animation:apulab-repeat-arrow-nudge .82s ease-in-out infinite;
  filter:drop-shadow(0 0 8px rgba(255,99,184,.72));
}
#apulab-repeat-arrow::before{
  content:"";
  position:absolute;
  left:22px;
  top:9px;
  width:52px;
  height:10px;
  border-radius:999px;
  background:#ff63b8;
  box-shadow:0 0 12px rgba(255,99,184,.78);
}
#apulab-repeat-arrow::after{
  content:"";
  position:absolute;
  left:0;
  top:1px;
  width:0;
  height:0;
  border-top:13px solid transparent;
  border-bottom:13px solid transparent;
  border-right:24px solid #ff63b8;
}
@media(prefers-reduced-motion:reduce){
  #repeat-palette.apulab-repeat-focus{
    animation:none!important;
    outline:5px solid rgba(255,168,218,.98)!important;
    outline-offset:6px!important;
    box-shadow:0 5px 0 rgba(0,0,0,.30),0 0 0 5px rgba(255,99,184,.70),0 0 28px rgba(255,99,184,.92)!important;
    filter:brightness(1.12)!important;
  }
  #apulab-repeat-arrow{animation:none!important}
}
</style>`;

if (!html.includes('apulab-repeat-focus-style')) {
  html = html.replace('</head>', `${style}\n</head>`);
}

const runtime = `<script id="apulab-repeat-focus-runtime">(()=>{
  const palette=document.getElementById('repeat-palette');
  if(!palette)return;
  let arrow=null;
  let active=false;
  const positionArrow=()=>{
    if(!active||!arrow||palette.hidden)return;
    const r=palette.getBoundingClientRect();
    arrow.style.left=(r.right+10)+'px';
    arrow.style.top=(r.top+r.height/2-14)+'px';
  };
  const stop=()=>{
    if(!active)return;
    active=false;
    palette.classList.remove('apulab-repeat-focus');
    delete palette.dataset.apulabAttention;
    arrow?.remove();
    arrow=null;
    window.removeEventListener('resize',positionArrow);
  };
  const start=()=>{
    stop();
    active=true;
    palette.classList.add('apulab-repeat-focus');
    palette.dataset.apulabAttention='repeat-after-discovery';
    arrow=document.createElement('div');
    arrow.id='apulab-repeat-arrow';
    arrow.setAttribute('aria-hidden','true');
    document.body.appendChild(arrow);
    positionArrow();
    requestAnimationFrame(positionArrow);
    window.addEventListener('resize',positionArrow);
    palette.addEventListener('pointerdown',stop,{once:true,capture:true});
    palette.addEventListener('keydown',(event)=>{if(event.key==='Enter'||event.key===' ')stop()},{once:true,capture:true});
  };
  window.apulabRepeatFocus={start,stop};
  window.addEventListener('pagehide',stop,{once:true});
  window.addEventListener('beforeunload',stop,{once:true});
})();</script>`;

if (!html.includes('apulab-repeat-focus-runtime')) {
  html = html.replace('</body>', `${runtime}\n</body>`);
}

const unlockRange = functionRange(html, 'function unlockRepeat()');
let unlockBlock = html.slice(unlockRange.start, unlockRange.end);
if (!/repeatUnlocked\s*=\s*true/.test(unlockBlock)) throw new Error('mission01_level5_unlock_state_missing');
if (!/phase\s*=\s*['"]compress['"]/.test(unlockBlock)) throw new Error('mission01_level5_compress_phase_missing');
if (!unlockBlock.includes('window.apulabRepeatFocus?.start?.();')) {
  unlockBlock = `${unlockBlock.slice(0, -1)}window.apulabRepeatFocus?.start?.();}`;
}
html = html.slice(0, unlockRange.start) + unlockBlock + html.slice(unlockRange.end);

if (!html.includes('id="apulab-repeat-focus-style"')) throw new Error('mission01_level5_repeat_focus_style_missing');
if (!html.includes('id="apulab-repeat-focus-runtime"')) throw new Error('mission01_level5_repeat_focus_runtime_missing');
if (!html.includes("palette.classList.add('apulab-repeat-focus')")) throw new Error('mission01_level5_repeat_focus_start_missing');
if (!html.includes("palette.classList.remove('apulab-repeat-focus')")) throw new Error('mission01_level5_repeat_focus_stop_missing');
if (!html.includes("arrow.id='apulab-repeat-arrow'")) throw new Error('mission01_level5_repeat_arrow_missing');
if (!html.includes("palette.addEventListener('pointerdown',stop")) throw new Error('mission01_level5_repeat_focus_pointer_stop_missing');
if (!html.includes('window.apulabRepeatFocus?.start?.();')) throw new Error('mission01_level5_unlock_focus_trigger_missing');
if (!html.includes('height:10px')) throw new Error('mission01_level5_repeat_arrow_not_thick');
if (!html.includes('background:#ff63b8')) throw new Error('mission01_level5_repeat_arrow_not_pink');

await writeFile(LEVEL5, html, 'utf8');

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
const entry = (manifest.levels || []).find((x) => Number(x.level) === 5);
if (!entry) throw new Error('mission01_level5_manifest_entry_missing');
entry.bytes = Buffer.byteLength(html, 'utf8');
entry.sha256 = hash(html);
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.info('[mission01] Nivel 5 · tras la ruta larga, REPETIR recibe halo rosa + flecha rosa gruesa hasta la primera interacción');
