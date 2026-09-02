import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT=resolve(process.cwd(),'public/missions/mission01');
const MANIFEST=resolve(OUT,'manifest.json');
const hash=text=>createHash('sha256').update(Buffer.from(text,'utf8')).digest('hex');

function replaceFunction(source,name,replacement,label){
  const token=`function ${name}(`;
  const start=source.indexOf(token);
  if(start<0) throw new Error(`mission01_polish_missing:${label}:${name}:start`);
  const brace=source.indexOf('{',start);
  if(brace<0) throw new Error(`mission01_polish_missing:${label}:${name}:brace`);
  let depth=0,quote='',escaped=false;
  for(let i=brace;i<source.length;i++){
    const ch=source[i];
    if(quote){
      if(escaped) escaped=false;
      else if(ch==='\\') escaped=true;
      else if(ch===quote) quote='';
      continue;
    }
    if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue}
    if(ch==='{') depth++;
    else if(ch==='}'&&--depth===0) return source.slice(0,start)+replacement+source.slice(i+1);
  }
  throw new Error(`mission01_polish_missing:${label}:${name}:end`);
}

const MOVE=`function animateMove(from,to,dur=500){return new Promise(resolve=>{const t0=performance.now(),baseScale=rover.scale.clone();function f(now){const k=Math.min(1,(now-t0)/dur),e=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2,bounce=Math.sin(Math.PI*k),squash=bounce*.035;rover.position.lerpVectors(from,to,e);rover.position.y=.26+bounce*.11;rover.scale.set(baseScale.x*(1+squash),baseScale.y*(1-squash*.5),baseScale.z*(1+squash));roverHalo.position.set(rover.position.x,.23,rover.position.z);if(k<1)requestAnimationFrame(f);else{rover.position.y=.26;rover.scale.copy(baseScale);resolve()}}requestAnimationFrame(f)})}`;

const TURN=`function animateTurn(fromY,toY,dur=360){return new Promise(resolve=>{const t0=performance.now(),delta=toY-fromY,sign=Math.sign(delta)||1;function f(now){const k=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-k,3),accent=Math.sin(Math.PI*k)*.035*sign;rover.rotation.y=fromY+delta*e+accent;if(k<1)requestAnimationFrame(f);else{rover.rotation.y=toY;resolve()}}requestAnimationFrame(f)})}`;

const COLLISION=`function pulseObstacle(c,r){const g=obstacleGroups.find(o=>o.userData.c===c&&o.userData.r===r);if(!g)return;const label=document.getElementById('obstacle-label'),t0=performance.now(),roverOrigin=rover.position.clone(),sideX=roverState.dir%2===0?.055:0,sideZ=roverState.dir%2===1?.055:0;label&&(label.textContent='RUTA BLOQUEADA · REVISA EL BLOQUE RESALTADO',label.classList.add('show'),setTimeout(()=>label.classList.remove('show'),1350));const originals=g.children.map(ch=>ch.material.emissiveIntensity??.02);function anim(now){const k=Math.min(1,(now-t0)/760),pulse=Math.sin(Math.PI*k),shake=Math.sin(k*Math.PI*8)*(1-k);g.scale.setScalar(1+.20*pulse);g.children.forEach(ch=>{ch.material.emissive.setHex(0xFF6B35);ch.material.emissiveIntensity=.12+1.18*pulse});rover.position.x=roverOrigin.x+sideX*shake;rover.position.z=roverOrigin.z+sideZ*shake;if(k<1)requestAnimationFrame(anim);else{g.scale.setScalar(1);rover.position.copy(roverOrigin);g.children.forEach((ch,i)=>{ch.material.emissive.setHex(0x2B0F0A);ch.material.emissiveIntensity=originals[i]??.02})}}requestAnimationFrame(anim)}`;

const STYLE=`<style id="apulab-programming-polish-style">
/* Código → movimiento: la instrucción que AYNI ejecuta debe ser inequívoca. */
.program-row.active .line-no{background:#F4C75E!important;color:#17133A!important;border-color:#17133A!important;box-shadow:3px 3px 0 #D5A43D,0 0 14px rgba(244,199,94,.58)!important;transform:scale(1.04)}
.program-row.active .slot{background:rgba(244,199,94,.12)!important;border-color:#F4C75E!important;box-shadow:0 0 0 3px #FFF3C8,0 0 28px rgba(244,199,94,.72)!important}
.program-row.active .program-block,.program-row.active .repeat-card{animation:apulabActiveInstruction .52s ease-in-out infinite alternate!important;filter:brightness(1.12)}
.program-row.done{opacity:.72!important}
.program-row.done .line-no{color:#74D99F!important;border-color:#74D99F!important}
.nested-chip.active{outline:3px solid #FFF3C8!important;outline-offset:2px;box-shadow:0 0 18px rgba(244,199,94,.75)!important;filter:brightness(1.15)}
.repeat-progress{min-width:78px!important;padding:5px 7px!important;border:2px solid rgba(255,255,255,.72)!important;border-radius:5px!important;background:#17133A!important;color:#FFF3C8!important;font:800 10px/1 Poppins,sans-serif!important;text-align:center!important;letter-spacing:.015em}
.repeat-progress:empty{visibility:hidden}
.repeat-progress:not(:empty)::before{content:'VUELTA ';color:#A8EDF1;font-size:8px;font-weight:800}
@keyframes apulabActiveInstruction{from{transform:translateX(0) scale(1);box-shadow:3px 3px 0 rgba(0,0,0,.28)}to{transform:translateX(4px) scale(1.015);box-shadow:3px 3px 0 rgba(0,0,0,.28),0 0 18px rgba(244,199,94,.58)}}
@media(prefers-reduced-motion:reduce){.program-row.active .program-block,.program-row.active .repeat-card{animation:none!important;transform:none!important}}
</style>`;

const outputs=new Map();
for(const level of [3,4,5]){
  const path=resolve(OUT,`level${level}.html`);
  let html=await readFile(path,'utf8');
  html=html.replace(/<style id="apulab-programming-polish-style">[\s\S]*?<\/style>/g,'');
  html=html.replace('</head>',`${STYLE}\n</head>`);
  html=replaceFunction(html,'animateMove',MOVE,`l${level}`);
  html=replaceFunction(html,'animateTurn',TURN,`l${level}`);
  if(level>=4) html=replaceFunction(html,'pulseObstacle',COLLISION,`l${level}`);
  if(level===5){
    const before='<span class="repeat-progress">${prog}</span>';
    const after='<span class="repeat-progress" aria-live="polite">${prog}</span>';
    if(!html.includes(before)) throw new Error('mission01_polish_missing:l5-repeat-progress');
    html=html.replace(before,after);
  }
  if(!html.includes('apulab-programming-polish-style')) throw new Error(`mission01_polish_qa_style:l${level}`);
  if(!html.includes('function animateMove(from,to,dur=500)')) throw new Error(`mission01_polish_qa_move:l${level}`);
  if(!html.includes('function animateTurn(fromY,toY,dur=360)')) throw new Error(`mission01_polish_qa_turn:l${level}`);
  if(level>=4&&!html.includes('RUTA BLOQUEADA · REVISA EL BLOQUE RESALTADO')) throw new Error(`mission01_polish_qa_collision:l${level}`);
  if(level===5&&(!html.includes('repeat-progress" aria-live="polite"')||!html.includes("content:'VUELTA '"))) throw new Error('mission01_polish_qa_repeat:l5');
  await writeFile(path,html,'utf8');
  outputs.set(level,html);
  console.info(`[mission01] Nivel ${level} · bloque activo reforzado · movimiento 500ms · giro 360ms${level>=4?' · choque visual reforzado':''}${level===5?' · REPETIR con VUELTA n/N':''}`);
}

const manifest=JSON.parse(await readFile(MANIFEST,'utf8'));
for(const entry of manifest.levels||[]){const level=Number(entry.level);if(!outputs.has(level))continue;const html=outputs.get(level);entry.bytes=Buffer.byteLength(html,'utf8');entry.sha256=hash(html)}
await writeFile(MANIFEST,`${JSON.stringify(manifest,null,2)}\n`,'utf8');
console.info('[mission01] PROGRAMMING POLISH QA OK · ejecución, movimiento, choque y bucles visibles');
