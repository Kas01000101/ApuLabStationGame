import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const MANIFEST = resolve(OUT, 'manifest.json');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
const outputs = new Map();

const STYLE = `<style id="apulab-celebration-confetti-style">
#apulab-celebration-layer{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:190}
.apulab-celebration-piece{position:absolute;top:-42px;left:var(--x);width:var(--w);height:var(--h);background:var(--c);border-radius:var(--r);opacity:.98;box-shadow:0 0 6px rgba(255,255,255,.18);animation:apulabCelebrationFall var(--d) cubic-bezier(.18,.68,.32,1) var(--delay) forwards;will-change:transform,opacity}
@keyframes apulabCelebrationFall{0%{transform:translate3d(0,-35px,0) rotate(0deg);opacity:1}82%{opacity:1}100%{transform:translate3d(var(--drift),1030px,0) rotate(var(--rot));opacity:.92}}
@media (prefers-reduced-motion:reduce){.apulab-celebration-piece{animation-duration:1.8s!important}}
</style>`;

const SCRIPT = `<script id="apulab-celebration-confetti-runtime">(()=>{
  const stage=document.getElementById('stage')||document.body;
  const success=document.getElementById('success-overlay');
  if(!stage||!success)return;
  let layer=document.getElementById('apulab-celebration-layer');
  if(!layer){layer=document.createElement('div');layer.id='apulab-celebration-layer';stage.appendChild(layer)}
  const colors=['#F4C75E','#49C9D7','#8E7DCE','#E85DA9','#74D99F','#FFF7E8','#FF8585','#A8EDF1','#F7D06F'];
  let timers=[];
  let visible=false;
  function clearTimers(){timers.forEach(clearTimeout);timers=[]}
  function wave(count,offset=0){
    const fragment=document.createDocumentFragment();
    for(let i=0;i<count;i++){
      const p=document.createElement('i');
      p.className='apulab-celebration-piece';
      p.style.setProperty('--x',Math.random()*100+'%');
      p.style.setProperty('--w',(5+Math.random()*9)+'px');
      p.style.setProperty('--h',(8+Math.random()*15)+'px');
      p.style.setProperty('--c',colors[(i+offset)%colors.length]);
      p.style.setProperty('--r',Math.random()>.68?'999px':(Math.random()>.5?'2px':'0px'));
      p.style.setProperty('--d',(2.7+Math.random()*1.9)+'s');
      p.style.setProperty('--delay',(Math.random()*.62)+'s');
      p.style.setProperty('--drift',(-230+Math.random()*460)+'px');
      p.style.setProperty('--rot',(-1080+Math.random()*2160)+'deg');
      fragment.appendChild(p);
    }
    layer.appendChild(fragment);
  }
  function celebrate(){
    clearTimers();
    layer.replaceChildren();
    const low=((navigator.hardwareConcurrency||8)<=4)||((navigator.deviceMemory||8)<=4);
    wave(low?150:210,0);
    timers.push(setTimeout(()=>wave(low?90:140,3),260));
    timers.push(setTimeout(()=>wave(low?60:90,6),620));
    timers.push(setTimeout(()=>layer.replaceChildren(),5600));
  }
  function sync(){
    const now=success.classList.contains('visible');
    if(now&&!visible)celebrate();
    visible=now;
  }
  const observer=new MutationObserver(sync);
  observer.observe(success,{attributes:true,attributeFilter:['class','aria-hidden']});
  sync();
  const cleanup=()=>{observer.disconnect();clearTimers();layer.replaceChildren()};
  window.addEventListener('pagehide',cleanup,{once:true});
  window.addEventListener('beforeunload',cleanup,{once:true});
  window.addEventListener('message',e=>{if(e?.data?.type==='apulab-dispose')cleanup()});
})();</script>`;

for (const level of [1,2,3,4,5]) {
  const path = resolve(OUT, `level${level}.html`);
  let html = await readFile(path, 'utf8');
  if (!html.includes('id="success-overlay"')) throw new Error(`mission01_confetti_missing_success_overlay:l${level}`);
  html = html.replace(/<style id="apulab-celebration-confetti-style">[\s\S]*?<\/style>/g, '');
  html = html.replace(/<script id="apulab-celebration-confetti-runtime">[\s\S]*?<\/script>/g, '');
  html = html.replace('</head>', `${STYLE}\n</head>`);
  html = html.replace('</body>', `${SCRIPT}\n</body>`);
  if (!html.includes('apulab-celebration-layer') || !html.includes('wave(low?150:210')) {
    throw new Error(`mission01_confetti_patch_failed:l${level}`);
  }
  await writeFile(path, html, 'utf8');
  outputs.set(level, html);
  console.info(`[mission01] Nivel ${level} · celebración global · 3 oleadas de confeti abundante`);
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
console.info('[mission01] CELEBRATION QA OK · niveles 1–5 muestran confeti al completar');
