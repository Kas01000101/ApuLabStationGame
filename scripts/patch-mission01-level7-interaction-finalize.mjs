import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const LEVEL7 = resolve(process.cwd(), 'public/missions/mission01/level7.html');
const fail = (code) => { throw new Error(`mission01_level7_interaction_finalize:${code}`); };

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
if (!html.includes('APULAB_LEVEL7_INSTRUMENT_UI_V2')) fail('v2_missing');

// Same input contract for every program block: click, double click, pointer drag,
// Enter and Space. A small movement threshold distinguishes click from drag.
html = replaceFunction(html, 'function bindPalette()', `function bindPalette(){const bindCmd=el=>{el.tabIndex=0;el.setAttribute('role','button');if(!el.getAttribute('aria-label'))el.setAttribute('aria-label',\`Añadir \${String(el.textContent||el.dataset.command||'comando').replace(/\\s+/g,' ').trim()} al programa\`);let clickTimer=0;el.onpointerdown=e=>{if(executing||e.button!==0)return;const sx=e.clientX,sy=e.clientY,id=e.pointerId;let moved=false;const move=ev=>{if(ev.pointerId===id&&Math.hypot(ev.clientX-sx,ev.clientY-sy)>7)moved=true};const up=ev=>{if(ev.pointerId!==id)return;document.removeEventListener('pointermove',move);if(!moved){clearTimeout(clickTimer);clickTimer=setTimeout(()=>appendItem({type:'cmd',cmd:el.dataset.command}),170)}};document.addEventListener('pointermove',move,{passive:true});document.addEventListener('pointerup',up,{once:true});startDrag(e,{source:'palette',item:{type:'cmd',cmd:el.dataset.command}},el)};el.ondblclick=e=>{e.preventDefault();clearTimeout(clickTimer);appendItem({type:'cmd',cmd:el.dataset.command})};el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();appendItem({type:'cmd',cmd:el.dataset.command})}}};document.querySelectorAll('.command-block[data-kind="cmd"]').forEach(bindCmd);const rp=document.getElementById('repeat-palette');rp.tabIndex=0;rp.setAttribute('role','button');rp.setAttribute('aria-label','Añadir REPETIR al programa');let repeatClickTimer=0;rp.onpointerdown=e=>{if(!repeatUnlocked||executing||e.button!==0)return;const sx=e.clientX,sy=e.clientY,id=e.pointerId;let moved=false;const move=ev=>{if(ev.pointerId===id&&Math.hypot(ev.clientX-sx,ev.clientY-sy)>7)moved=true};const up=ev=>{if(ev.pointerId!==id)return;document.removeEventListener('pointermove',move);if(!moved){clearTimeout(repeatClickTimer);repeatClickTimer=setTimeout(()=>appendItem({type:'repeat',count:2,body:[]}),170)}};document.addEventListener('pointermove',move,{passive:true});document.addEventListener('pointerup',up,{once:true});startDrag(e,{source:'palette',item:{type:'repeat',count:2,body:[]}},rp)};rp.ondblclick=e=>{e.preventDefault();clearTimeout(repeatClickTimer);if(repeatUnlocked)appendItem({type:'repeat',count:2,body:[]})};rp.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&repeatUnlocked){e.preventDefault();appendItem({type:'repeat',count:2,body:[]})}}}`);

// Level 7 is terminal. FINALIZAR MISIÓN must never emit an inherited 5→6 or
// fabricate a level 8. It leaves the completed result visible and emits a
// semantic mission-complete message for any future parent integration.
html = replaceFunction(html, 'function goToNextLevel()', `function goToNextLevel(){if(phase!=='complete')return;const button=document.getElementById('continue-btn');if(button){button.textContent='MISIÓN COMPLETADA';button.disabled=true}feedback.textContent='MISIÓN 01 COMPLETADA · ApuLab recibió la información de AYNI.';try{localStorage.setItem('apulab.mission01.completed','1')}catch{}try{parent.postMessage({type:'apulab-mission-complete',mission:1,level:7},location.origin)}catch{}}`);

html = html.replace("phase='sensors'", "phase='science'");

for (const forbidden of [
  "level:5,nextLevel:6",
  'nextLevel:8',
  'CONTINUAR AL NIVEL 8',
  'if(!usesRepeat())',
  'DESBLOQUEAR REPETIR',
  'Usa REPETIR para',
]) if (html.includes(forbidden)) fail(`forbidden:${forbidden}`);

for (const required of [
  "clickTimer=setTimeout(()=>appendItem({type:'cmd',cmd:el.dataset.command}),170)",
  "rp.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&repeatUnlocked)",
  "type:'apulab-mission-complete',mission:1,level:7",
  "button.textContent='MISIÓN COMPLETADA'",
  "phase='science'",
]) if (!html.includes(required)) fail(`missing:${required}`);

await writeFile(LEVEL7, html, 'utf8');
console.info('[mission01] N7 interaction/finalize OK · click+drag+Enter+Space · terminal mission action · no fake next level');
