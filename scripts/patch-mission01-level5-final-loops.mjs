import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const LEVEL5 = resolve(OUT, 'level5.html');
const MANIFEST = resolve(OUT, 'manifest.json');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
const fail = (code) => { throw new Error(`mission01_level5_final_loops:${code}`); };

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
function replaceBetween(source, startMarker, endMarker, replacement, code) {
  const start = source.indexOf(startMarker);
  if (start < 0) fail(`range_start:${code}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) fail(`range_end:${code}`);
  return source.slice(0, start) + replacement + source.slice(end);
}
function replaceArray(source, marker, replacement, code) {
  const start = source.indexOf(marker);
  if (start < 0) fail(`array_start:${code}`);
  const bracket = source.indexOf('[', start);
  if (bracket < 0) fail(`array_bracket:${code}`);
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
  fail(`array_end:${code}`);
}

// Scope guard: final N5 patch is intentionally applied AFTER N6/N7 are generated.
const untouched = new Map();
for (const level of [1,2,3,4,6,7]) {
  const text = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  untouched.set(level, hash(text));
}

let html = await readFile(LEVEL5, 'utf8');
if (!html.includes('APULAB_LEVEL5_TWO_PHASE_REPEAT_V3')) fail('missing_two_phase_base');
if (html.includes('APULAB_LEVEL5_FINAL_LOOPS_V1')) fail('already_applied');

// ---------------------------------------------------------------------------
// Identity + scope: N5 teaches only loops.
// ---------------------------------------------------------------------------
html = html
  .replace(/<title>[\s\S]*?<\/title>/, '<title>AYNI · Nivel 5 · SIMPLIFICAR · Bucles</title>')
  .replace(/<div class="title">[\s\S]*?<\/div><div class="subtitle">[\s\S]*?<\/div>/,
    '<div class="title">SIMPLIFICAR</div><div class="subtitle">RECONOCE UN PATRÓN Y USA REPETIR PARA ACORTAR TU PROGRAMA.</div>');

// GUÍA superior desaparece. EXPLORAR y BITÁCORA permanecen.
html = html.replace(/<button id="guide-btn"[^>]*>[\s\S]*?<\/button>/, '');
html = html.replace("document.getElementById('guide-btn').disabled=false;document.getElementById('guide-btn').classList.remove('is-recommended');", '');
const guideHandlerStart = html.indexOf("document.getElementById('guide-btn').onclick=()=>{");
if (guideHandlerStart >= 0) {
  const guideHandlerEnd = html.indexOf(";document.getElementById('info-close').onclick=", guideHandlerStart);
  if (guideHandlerEnd < 0) fail('guide_handler_end');
  html = html.slice(0, guideHandlerStart) + "document.getElementById('info-close').onclick=" + html.slice(guideHandlerEnd + ";document.getElementById('info-close').onclick=".length);
}

// EXPLORAR final: máximo 2 estados y sin entregar una ruta para copiar.
const exploreSteps = [
  { title: 'RECONOCE UN PATRÓN', text: 'Un patrón aparece cuando una acción se repite.', hint: 'Observa tu programa cuando ya logre llegar a la bandera.', focus: 'workspace' },
  { title: 'AGRUPA LA REPETICIÓN', text: 'REPETIR permite ejecutar varias veces una misma instrucción.', hint: 'Primero haz funcionar la ruta larga; después podrás simplificarla.', focus: 'run' },
];
html = replaceArray(html, 'const exploreSteps=', `const exploreSteps=${JSON.stringify(exploreSteps)}`, 'explore_steps');

// El tutorial rosa legacy con flecha era demasiado prescriptivo para la versión final.
html = html
  .replace(/<style id="apulab-repeat-focus-style">[\s\S]*?<\/style>\s*/g, '')
  .replace(/<script id="apulab-repeat-focus-runtime">[\s\S]*?<\/script>\s*/g, '')
  .replace(/window\.apulabRepeatFocus\?\.start\?\.\(\);?/g, '')
  .replace(/window\.apulabRepeatFocus\?\.stop\?\.\(\);?/g, '');

// ---------------------------------------------------------------------------
// Meta única: reemplaza el marcador amarillo legacy por BANDERA + LOSETA.
// Usa exactamente la coordenada goal existente; no mueve la meta lógica.
// ---------------------------------------------------------------------------
const flagScene = `const flagGroup=new THREE.Group();scene.add(flagGroup);
const goalTileMat=new THREE.MeshBasicMaterial({color:0xF4C75E,transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide});
const goalTile=new THREE.Mesh(new THREE.PlaneGeometry(.96,.96),goalTileMat);goalTile.rotation.x=-Math.PI/2;goalTile.position.y=.018;flagGroup.add(goalTile);
const flagBase=new THREE.Mesh(new THREE.CylinderGeometry(.20,.25,.10,24),new THREE.MeshStandardMaterial({color:0x17133A,roughness:.48,metalness:.12}));flagBase.position.y=.09;flagGroup.add(flagBase);
const flagPole=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.82,12),new THREE.MeshStandardMaterial({color:0xFFF7E8,roughness:.40,metalness:.18}));flagPole.position.y=.52;flagGroup.add(flagPole);
const flag=new THREE.Mesh(new THREE.PlaneGeometry(.48,.28),new THREE.MeshStandardMaterial({color:0xF4C75E,emissive:0x6A5115,emissiveIntensity:.32,side:THREE.DoubleSide,roughness:.50}));flag.position.set(.24,.79,0);flag.rotation.y=-Math.PI/2;flagGroup.add(flag);
`;
html = replaceBetween(html, 'const flagGroup=new THREE.Group();', 'function clearObstacles()', flagScene, 'single_flag_marker');

const loadBoardStage = `function loadBoardStage(){stageIndex=0;start={...stages[0].start};goal={...stages[0].goal};const gp=cellPos(goal.c,goal.r);flagGroup.position.set(gp.x,.22,gp.z);startRing.position.copy(cellPos(start.c,start.r));startRing.position.y=.30;setRover(start.c,start.r,start.dir);rebuildObstacles();window.apulabLevel5GoalCell={c:goal.c,r:goal.r};document.getElementById('objective-tag').textContent='PASO 1 · LLEVA AYNI HASTA LA BANDERA'}`;
html = replaceFunction(html, 'function loadBoardStage(', loadBoardStage);

// ---------------------------------------------------------------------------
// Barra inferior fija, 4 pasos, estado derivado del gameplay real.
// ---------------------------------------------------------------------------
const guideTexts = [
  'Lleva AYNI hasta la bandera.',
  'Observa qué acciones se repiten.',
  'Usa REPETIR para agruparlas.',
  'Vuelve a probar con un programa más corto.',
];
const boardExtras = `<section id="level5-guide" class="level5-guide" data-testid="level5-guide" aria-label="Guía de progreso de REPETIR"><div class="level5-guide-title"><strong>GUÍA · <span>REPETIR</span></strong><small id="level5-pattern-copy"></small></div><div class="level5-guide-track"><div id="level5-guide-fill" class="level5-guide-fill"></div>${guideTexts.map((text,i)=>`<div class="level5-guide-step${i===0?' is-active':''}" data-step="${i+1}" data-testid="level5-guide-step-${i+1}"><span class="level5-guide-node">${i+1}</span><span class="level5-guide-text">${text}</span></div>`).join('')}</div></section>`;
const boardStart = html.indexOf('<section id="board-shell" class="board-shell">');
const boardEnd = html.indexOf('</section>\n<section class="editor">', boardStart);
if (boardStart < 0 || boardEnd < 0) fail('board_shell');
html = html.slice(0, boardEnd) + boardExtras + html.slice(boardEnd);

const style = `<style id="apulab-level5-final-loops-style">
/* APULAB_LEVEL5_FINAL_LOOPS_V1 */
.hud{gap:16px}.btn-journal{width:150px}.btn-progress{width:72px}
#board-canvas{height:574px!important}.board-labels-left{height:488px!important}.board-focus{bottom:130px!important}.obstacle-label{bottom:132px!important}
.objective-tag{min-width:410px;justify-content:center;border-color:#4D4288;color:#C9F6F7;font-size:11.5px}
.level5-guide{position:absolute;left:18px;right:18px;bottom:15px;height:104px;border:2px solid #4D4288;border-radius:9px;background:linear-gradient(180deg,rgba(20,25,56,.98),rgba(12,18,45,.98));box-shadow:inset 0 0 0 1px rgba(73,201,215,.10);z-index:12;padding:10px 18px 9px;overflow:hidden}
.level5-guide-title{height:19px;display:flex;align-items:center;justify-content:space-between;font-size:13px;color:#F8F9FA}.level5-guide-title span{color:#49C9D7}.level5-guide-title small{color:#F3A6C8;font:800 10px/1 Poppins,sans-serif;letter-spacing:.01em}
.level5-guide-track{position:relative;height:68px;display:grid;grid-template-columns:repeat(4,1fr);align-items:start;padding-top:4px}.level5-guide-track::before{content:"";position:absolute;left:12.5%;right:12.5%;top:18px;height:3px;border-radius:4px;background:#514B88;box-shadow:0 0 7px rgba(142,125,206,.20)}
.level5-guide-fill{position:absolute;left:12.5%;top:18px;height:3px;width:0;border-radius:4px;background:#49C9D7;box-shadow:0 0 10px rgba(73,201,215,.65);transition:width .28s ease}
.level5-guide-step{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;text-align:center;gap:5px;color:#D8D9EA;min-width:0}.level5-guide-node{width:30px;height:30px;border:2px solid #8E7DCE;border-radius:50%;background:#3B326B;display:flex;align-items:center;justify-content:center;font:800 13px/1 Poppins,sans-serif;color:#FFF;transition:.22s ease}.level5-guide-text{max-width:190px;font:700 10px/1.25 Poppins,sans-serif;color:#D8D9EA}
.level5-guide-step.is-active .level5-guide-node{border-color:#FFF3C8;background:#F4C75E;color:#17133A;box-shadow:0 0 0 4px rgba(244,199,94,.20),0 0 22px rgba(244,199,94,.92);animation:level5GuidePulse 1.6s ease-in-out infinite}.level5-guide-step.is-active .level5-guide-text{color:#F4C75E;font-weight:800}.level5-guide-step.is-done .level5-guide-node{border-color:#49C9D7;background:#254D66;color:#C9F6F7;box-shadow:0 0 10px rgba(73,201,215,.28)}
@keyframes level5GuidePulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.22);box-shadow:0 0 0 5px rgba(244,199,94,.22),0 0 26px rgba(244,199,94,.96)}}
#repeat-palette.level5-repeat-ready{outline:3px solid rgba(243,166,200,.76)!important;outline-offset:4px!important;box-shadow:0 5px 0 rgba(0,0,0,.30),0 0 0 3px rgba(243,166,200,.28),0 0 20px rgba(243,166,200,.62)!important;animation:level5RepeatReady 1.65s ease-in-out infinite!important}
@keyframes level5RepeatReady{0%,100%{filter:brightness(1.02)}50%{filter:brightness(1.12);box-shadow:0 5px 0 rgba(0,0,0,.30),0 0 0 4px rgba(243,166,200,.34),0 0 25px rgba(243,166,200,.72)!important}}
.program-row.apulab-pattern-repeat{position:relative;background:rgba(243,166,200,.09)!important;border-left:4px solid #F3A6C8!important;padding-left:3px!important}.program-row.apulab-pattern-repeat .slot{box-shadow:inset 0 0 0 2px rgba(243,166,200,.42)!important}.program-row.apulab-pattern-repeat::after{content:"";position:absolute;left:-9px;top:3px;bottom:3px;width:5px;border:2px solid #F3A6C8;border-right:0;border-radius:5px 0 0 5px;box-shadow:0 0 12px rgba(243,166,200,.45)}
#palette .command-block:focus-visible,#repeat-palette:focus-visible,.mini:focus-visible{outline:4px solid #49C9D7!important;outline-offset:3px;box-shadow:0 0 18px rgba(73,201,215,.58)!important}
@media(prefers-reduced-motion:reduce){.level5-guide-step.is-active .level5-guide-node,#repeat-palette.level5-repeat-ready{animation:none!important}}
</style>`;
html = html.replace('</head>', `${style}\n</head>`);

// ---------------------------------------------------------------------------
// Editor input contract and edit telemetry.
// ---------------------------------------------------------------------------
const bindProgramEvents = `function bindProgramEvents(){document.querySelectorAll('[data-del]').forEach(b=>b.onclick=e=>{e.stopPropagation();if(executing)return;const removed=program[+b.dataset.del];program.splice(+b.dataset.del,1);lastFailure=null;recordLevel5ProgramEdit('delete',level5BlockType(removed));renderProgram()});document.querySelectorAll('[data-ndel]').forEach(b=>b.onclick=e=>{e.stopPropagation();if(executing)return;const [i,j]=b.dataset.ndel.split(':').map(Number);const removed=program[i].body[j];program[i].body.splice(j,1);lastFailure=null;recordLevel5ProgramEdit('repeat_body_delete',level5BlockType(removed));renderProgram()});document.querySelectorAll('[data-count]').forEach(b=>{b.tabIndex=0;b.setAttribute('aria-label',(b.dataset.count||'').endsWith(':1')?'Aumentar repeticiones':'Disminuir repeticiones');b.onclick=e=>{e.stopPropagation();if(executing)return;const [i,d]=b.dataset.count.split(':').map(Number);const before=program[i].count;program[i].count=Math.max(2,Math.min(9,program[i].count+d));lastFailure=null;if(program[i].count!==before){recordLevel5Event('repeat_count_changed',{repeat_n:program[i].count,previous_repeat_n:before,elapsed_ms:level5Elapsed()});recordLevel5ProgramEdit('repeat_count','repeat')}renderProgram()};b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();b.click()}}});document.querySelectorAll('.program-block[data-top]').forEach(el=>el.onpointerdown=e=>startDrag(e,{source:'top',index:+el.dataset.top,item:clone(program[+el.dataset.top])},el));document.querySelectorAll('.repeat-card[data-top] > .repeat-head').forEach(head=>head.onpointerdown=e=>{const card=head.parentElement,i=+card.dataset.top;startDrag(e,{source:'top',index:i,item:clone(program[i])},card)});document.querySelectorAll('.nested-chip').forEach(el=>el.onpointerdown=e=>{if(e.target.closest('button'))return;const i=+el.dataset.nestedTop,j=+el.dataset.nestedBody;startDrag(e,{source:'nested',top:i,body:j,item:clone(program[i].body[j])},el)})}`;
html = replaceFunction(html, 'function bindProgramEvents()', bindProgramEvents);

const performDrop = `function performDrop(target,src){if(executing)return;if(target.classList.contains('repeat-body')){if(src.item.type!=='cmd')return showStatus('Dentro de REPETIR van instrucciones.');const idx=+target.dataset.repeatBody,repeatRef=program[idx];if(!isRepeat(repeatRef))return;if(repeatRef.body.length>=MAX_REPEAT_BODY)return showStatus('Este REPETIR ya tiene suficientes bloques.');const item=removeSource(src);repeatRef.body.push(item);lastFailure=null;recordLevel5Event('block_moved_into_repeat',{repeat_n:repeatRef.count,block_type:level5BlockType(item),elapsed_ms:level5Elapsed()});recordLevel5ProgramEdit(src.source==='palette'?'repeat_body_add':'move_into_repeat',level5BlockType(item));renderProgram();revealRow(idx);return}const idx=+target.dataset.index;if(idx>program.length)return;const item=removeSource(src);let insert=idx;if(src.source==='top'&&src.index<idx)insert--;insert=Math.max(0,Math.min(insert,program.length));program.splice(insert,0,item);if(program.length>MAX)program.pop();lastFailure=null;recordLevel5ProgramEdit(src.source==='palette'?'add':'move',level5BlockType(item));renderProgram();revealRow(insert)}`;
html = replaceFunction(html, 'function performDrop(', performDrop);

const appendItem = `function appendItem(item){if(program.length>=MAX)return showStatus('Llegaste a 30 pasos. Reordena o elimina bloques.');program.push(clone(item));lastFailure=null;if(isRepeat(item))recordLevel5Event('repeat_added',{repeat_n:item.count||2,program_block_count:level5ExecutableBlockCount(program),elapsed_ms:level5Elapsed()});recordLevel5ProgramEdit('add',level5BlockType(item));renderProgram();revealRow(program.length-1)}`;
html = replaceFunction(html, 'function appendItem(', appendItem);

const bindPalette = `function bindPalette(){const bindCmd=el=>{el.tabIndex=0;el.setAttribute('role','button');if(!el.getAttribute('aria-label'))el.setAttribute('aria-label',\`Añadir \${String(el.textContent||el.dataset.command||'comando').replace(/\\s+/g,' ').trim()} al programa\`);let clickTimer=0;el.onpointerdown=e=>{if(executing||e.button!==0)return;const sx=e.clientX,sy=e.clientY,id=e.pointerId;let moved=false;const move=ev=>{if(ev.pointerId===id&&Math.hypot(ev.clientX-sx,ev.clientY-sy)>7)moved=true};const up=ev=>{if(ev.pointerId!==id)return;document.removeEventListener('pointermove',move);if(!moved){clearTimeout(clickTimer);clickTimer=setTimeout(()=>appendItem({type:'cmd',cmd:el.dataset.command}),170)}};document.addEventListener('pointermove',move,{passive:true});document.addEventListener('pointerup',up,{once:true});startDrag(e,{source:'palette',item:{type:'cmd',cmd:el.dataset.command}},el)};el.ondblclick=e=>{e.preventDefault();clearTimeout(clickTimer);appendItem({type:'cmd',cmd:el.dataset.command})};el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();appendItem({type:'cmd',cmd:el.dataset.command})}}};document.querySelectorAll('.command-block[data-kind="cmd"]').forEach(bindCmd);const rp=document.getElementById('repeat-palette');rp.tabIndex=0;rp.setAttribute('role','button');rp.setAttribute('aria-label','Añadir REPETIR al programa');let repeatClickTimer=0;const consumeRepeatAttention=()=>rp.classList.remove('level5-repeat-ready');rp.onpointerdown=e=>{if(!repeatUnlocked||executing||e.button!==0)return;consumeRepeatAttention();const sx=e.clientX,sy=e.clientY,id=e.pointerId;let moved=false;const move=ev=>{if(ev.pointerId===id&&Math.hypot(ev.clientX-sx,ev.clientY-sy)>7)moved=true};const up=ev=>{if(ev.pointerId!==id)return;document.removeEventListener('pointermove',move);if(!moved){clearTimeout(repeatClickTimer);repeatClickTimer=setTimeout(()=>appendItem({type:'repeat',count:2,body:[]}),170)}};document.addEventListener('pointermove',move,{passive:true});document.addEventListener('pointerup',up,{once:true});startDrag(e,{source:'palette',item:{type:'repeat',count:2,body:[]}},rp)};rp.ondblclick=e=>{e.preventDefault();clearTimeout(repeatClickTimer);if(repeatUnlocked){consumeRepeatAttention();appendItem({type:'repeat',count:2,body:[]})}};rp.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&repeatUnlocked){e.preventDefault();consumeRepeatAttention();appendItem({type:'repeat',count:2,body:[]})}}}`;
html = replaceFunction(html, 'function bindPalette()', bindPalette);

// ---------------------------------------------------------------------------
// Pedagogical state and telemetry are kept inside the existing N5 module.
// ---------------------------------------------------------------------------
const moduleStart = html.indexOf('<script type="module">');
const moduleEnd = html.indexOf('</script>', moduleStart);
if (moduleStart < 0 || moduleEnd < 0) fail('module_range');

const runtime = `
// APULAB_LEVEL5_FINAL_LOOPS_V1
const level5StartedAt=performance.now();
const level5State={longSolutionCompleted:false,repeatUnlocked:false,repeatUsed:false,patternShown:false,initialBlockCount:null,finalBlockCount:null,initialProgram:null,finalProgram:null,goalReached:false,attemptCount:0,programEditCount:0,initialCompletionTime:null,completed:false};
let level5LastProgramSignature='';let level5RefactorEventSent=false;
const level5Elapsed=()=>Math.max(0,Math.round(performance.now()-level5StartedAt));
const level5Identity=()=>{let session_id=null,participant_id=null;try{participant_id=localStorage.getItem('apulab.study.participant_id')||null;session_id=sessionStorage.getItem('apulab.level5.session_id');if(!session_id){session_id='l5-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);sessionStorage.setItem('apulab.level5.session_id',session_id)}}catch{}return{participant_id,session_id,level:5}};
function recordLevel5Event(event,payload={}){const entry={event,...level5Identity(),elapsed_ms:level5Elapsed(),...payload};try{const key='apulab.level5.telemetry',items=JSON.parse(sessionStorage.getItem(key)||'[]');items.push(entry);sessionStorage.setItem(key,JSON.stringify(items));parent.postMessage({type:'apulab-study-event',source:'mission01-level5',...entry},location.origin)}catch{}return entry}
function level5BlockType(item){if(!item)return'unknown';if(isRepeat(item))return'repeat';return item.cmd||item.type||'unknown'}
function level5ExecutableBlockCount(items=program){return(items||[]).reduce((n,item)=>n+(isRepeat(item)?1+level5ExecutableBlockCount(item.body||[]):1),0)}
function level5UsesRepeat(items=program){return(items||[]).some(item=>isRepeat(item)||(item.body&&level5UsesRepeat(item.body)))}
function level5RepeatInstances(items=program){return(items||[]).reduce((n,item)=>n+(isRepeat(item)?1+level5RepeatInstances(item.body||[]):0),0)}
function level5ProgramSignature(){try{return JSON.stringify(serialize(program))}catch{return JSON.stringify(program)}}
function recordLevel5ProgramEdit(edit_type,block_type='unknown'){level5State.programEditCount+=1;level5State.repeatUsed=level5UsesRepeat();const block_count=level5ExecutableBlockCount();recordLevel5Event('program_modified',{edit_type,block_type,edit_count:level5State.programEditCount,block_count,attempt_number:level5State.attemptCount});if(level5State.longSolutionCompleted&&level5State.repeatUsed&&level5State.initialBlockCount!=null&&block_count<level5State.initialBlockCount&&!level5RefactorEventSent){level5RefactorEventSent=true;recordLevel5Event('program_refactored',{blocks_before:level5State.initialBlockCount,blocks_after:block_count,reduction_pct:Math.round((1-block_count/level5State.initialBlockCount)*1000)/10,repeat_n:level5FirstRepeatN()})}syncLevel5UX()}
function level5FirstRepeatN(){const r=(program||[]).find(isRepeat);return r?.count||null}
function level5PatternRuns(){const runs=[];let start=0;while(start<program.length){const item=program[start];if(!item||isRepeat(item)){start++;continue}let end=start+1;while(end<program.length&&!isRepeat(program[end])&&program[end]?.cmd===item.cmd)end++;if(end-start>=2)runs.push({start,end,cmd:item.cmd,count:end-start});start=end}return runs}
function clearLevel5Pattern(){document.querySelectorAll('.program-row.apulab-pattern-repeat').forEach(el=>el.classList.remove('apulab-pattern-repeat'))}
function highlightLevel5Pattern(){clearLevel5Pattern();const runs=level5PatternRuns();const rows=[...document.querySelectorAll('#program-list .program-row')];for(const run of runs)for(let i=run.start;i<run.end;i++)rows[i]?.classList.add('apulab-pattern-repeat');const best=runs.sort((a,b)=>b.count-a.count)[0];const label=best?.cmd==='forward'?'AVANZAR':best?.cmd==='left'?'GIRAR IZQ.':best?.cmd==='right'?'GIRAR DER.':'ACCIÓN';document.getElementById('level5-pattern-copy').textContent=best?\`${label} se repite ${best.count} veces.\`:'Hay acciones que se repiten.';return best}
function level5GuideStep(){if(level5State.completed)return 5;if(level5State.repeatUsed)return 4;if(level5State.patternShown||level5State.repeatUnlocked)return 3;if(level5State.longSolutionCompleted)return 2;return 1}
function syncLevel5UX(){const step=level5GuideStep();document.querySelectorAll('.level5-guide-step').forEach(el=>{const n=+el.dataset.step;el.classList.toggle('is-active',n===step);el.classList.toggle('is-done',n<step)});const fill=document.getElementById('level5-guide-fill');if(fill)fill.style.width=step<=1?'0%':step===2?'25%':step===3?'50%':step===4?'75%':'75%';const objective=document.getElementById('objective-tag');if(objective)objective.textContent=level5State.completed?'NIVEL COMPLETADO':step===1?'PASO 1 · LLEVA AYNI HASTA LA BANDERA':step===2?'PASO 2 · OBSERVA QUÉ ACCIONES SE REPITEN':step===3?'PASO 3 · USA REPETIR PARA AGRUPARLAS':'PASO 4 · VUELVE A PROBAR EL PROGRAMA';const rp=document.getElementById('repeat-palette');if(rp&&level5State.repeatUnlocked&&!level5State.repeatUsed)rp.classList.add('level5-repeat-ready');if(level5State.repeatUsed)rp?.classList.remove('level5-repeat-ready');updateLevel5Journal()}
function updateLevel5Journal(){const text=document.getElementById('journal-text');if(text){const before=level5State.initialBlockCount==null?'pendiente':level5State.initialBlockCount+' bloques';const after=level5State.finalBlockCount==null?'pendiente':level5State.finalBlockCount+' bloques';text.textContent=\`PROGRAMA INICIAL · ${before} · PROGRAMA CON REPETIR · ${after}${level5State.finalBlockCount!=null?' · Mismo recorrido, menos instrucciones.':''}\`}}
async function level5HandleFirstGoal(){level5State.longSolutionCompleted=true;level5State.goalReached=true;level5State.initialBlockCount=level5ExecutableBlockCount();level5State.initialProgram=serialize(program);level5State.initialCompletionTime=level5Elapsed();recordLevel5Event('goal_reached',{phase:'initial',used_repeat:false,block_count:level5State.initialBlockCount,attempt_number:level5State.attemptCount});recordLevel5Event('initial_program_completed',{block_count:level5State.initialBlockCount,attempt_number:level5State.attemptCount,completion_time_ms:level5State.initialCompletionTime,used_repeat:false});feedback.textContent='Tu programa funciona.';showStatus('Tu programa funciona.',900);syncLevel5UX();await sleep(650);level5State.patternShown=true;const pattern=highlightLevel5Pattern();recordLevel5Event('pattern_highlighted',{pattern_command:pattern?.cmd||null,repeat_count:pattern?.count||null});feedback.textContent='Ahora observa qué acciones se repiten.';showStatus('Ahora observa qué acciones se repiten.',1100);syncLevel5UX();await sleep(650);unlockRepeat()}
function level5HandleFinalGoal(){level5State.goalReached=true;level5State.repeatUsed=level5UsesRepeat();const count=level5ExecutableBlockCount();recordLevel5Event('goal_reached',{phase:'refactored',used_repeat:level5State.repeatUsed,block_count:count,attempt_number:level5State.attemptCount});if(!level5State.repeatUsed){feedback.textContent='Ahora usa REPETIR para agrupar las acciones repetidas.';showStatus(feedback.textContent,2400);return}if(level5State.initialBlockCount==null||count>=level5State.initialBlockCount){feedback.textContent='La ruta funciona. Ahora haz el programa más corto con REPETIR.';showStatus(feedback.textContent,2600);return}level5State.finalBlockCount=count;level5State.finalProgram=serialize(program);if(!level5RefactorEventSent){level5RefactorEventSent=true;recordLevel5Event('program_refactored',{blocks_before:level5State.initialBlockCount,blocks_after:count,reduction_pct:Math.round((1-count/level5State.initialBlockCount)*1000)/10,repeat_n:level5FirstRepeatN()})}completeLevel()}
const __level5CompleteLevel=completeLevel;
completeLevel=function(...args){if(level5State.completed)return;level5State.completed=true;level5State.repeatUsed=level5UsesRepeat();level5State.finalBlockCount??=level5ExecutableBlockCount();try{localStorage.setItem('apulab.level5.repeatUnlocked','1');localStorage.setItem('apulab.repeat.learned','1')}catch{}recordLevel5Event('level_completed',{blocks_before:level5State.initialBlockCount,blocks_after:level5State.finalBlockCount,block_reduction:(level5State.initialBlockCount??0)-(level5State.finalBlockCount??0),reduction_pct:level5State.initialBlockCount?Math.round((1-level5State.finalBlockCount/level5State.initialBlockCount)*1000)/10:null,repeat_n:level5FirstRepeatN(),repeat_instances:level5RepeatInstances(),attempt_count:level5State.attemptCount,completion_time:level5Elapsed()});syncLevel5UX();return __level5CompleteLevel(...args)};
const __level5RunProgram=runProgram;
runProgram=async function(...args){level5State.attemptCount+=1;recordLevel5Event('program_started',{attempt_number:level5State.attemptCount,block_count:level5ExecutableBlockCount(),used_repeat:level5UsesRepeat()});return __level5RunProgram(...args)};
document.getElementById('run-btn').onclick=runProgram;
const __level5RenderProgram=renderProgram;
renderProgram=function(...args){const result=__level5RenderProgram(...args);queueMicrotask(()=>{if(level5State.patternShown)highlightLevel5Pattern();syncLevel5UX()});return result};
const __level5OpenJournal=typeof openJournal==='function'?openJournal:null;if(__level5OpenJournal)openJournal=function(...args){const r=__level5OpenJournal(...args);queueMicrotask(updateLevel5Journal);return r};
const goalPulseTimer=window.setInterval(()=>{if(document.hidden)return;const p=(Math.sin(performance.now()/480)+1)/2;goalTileMat.opacity=.20+.16*p},100);window.addEventListener('pagehide',()=>clearInterval(goalPulseTimer),{once:true});
window.apulabLevel5QA={getState:()=>({...level5State,repeatUnlocked,phase,goalCell:window.apulabLevel5GoalCell||{c:goal?.c,r:goal?.r},usedRepeat:level5UsesRepeat(),repeatInstances:level5RepeatInstances(),currentBlockCount:level5ExecutableBlockCount(),program:serialize(program)}),telemetry:()=>{try{return JSON.parse(sessionStorage.getItem('apulab.level5.telemetry')||'[]')}catch{return[]}}};
level5LastProgramSignature=level5ProgramSignature();recordLevel5Event('level_started',{repeat_unlocked:false});syncLevel5UX();
`;
html = html.slice(0, moduleEnd) + runtime + html.slice(moduleEnd);

// Replace unlock only AFTER level5 runtime helpers are present in module scope.
const unlockFinal = `function unlockRepeat(){repeatUnlocked=true;phase='compress';level5State.repeatUnlocked=true;document.getElementById('repeat-palette').hidden=false;document.getElementById('repeat-palette').classList.add('level5-repeat-ready');const state=document.getElementById('control-state');if(state)state.textContent='DISPONIBLE';document.getElementById('control-locked')?.classList.add('hidden');try{localStorage.setItem('apulab.level5.repeatUnlocked','1');localStorage.setItem('apulab.repeat.learned','1')}catch{}recordLevel5Event('repeat_unlocked',{time_to_repeat_unlock:level5Elapsed()});feedback.textContent='Puedes usar REPETIR para agrupar acciones que se repiten.';showStatus(feedback.textContent,2200);syncLevel5UX()}`;
html = replaceFunction(html, 'function unlockRepeat()', unlockFinal);

// Success gate: first arrival records the long program; second arrival must be shorter and use REPETIR.
const successNeedle = "if(phase==='discover'){unlockRepeat();return}if(!usesSequenceRepeat()){feedback.textContent='Ahora usa REPETIR para organizar la ruta.';showStatus('REPETIR desbloqueado · úsalo para completar el nivel.',2800);return}completeLevel()}";
if (!html.includes(successNeedle)) fail('legacy_success_gate');
html = html.replace(successNeedle, "if(phase==='discover'){await level5HandleFirstGoal();return}level5HandleFinalGoal()}");

// LIMPIAR follows the current project policy: it clears the program but preserves the learned phase after unlock.
// This is intentionally documented in QA and leaves no visual residue from the current program.
const clearMarker = "document.getElementById('clear-btn').onclick=()=>";
if (html.includes(clearMarker)) {
  const clearRange = functionRange(html, clearMarker);
  const clearBlock = html.slice(clearRange.start, clearRange.end);
  const wrapped = `${clearBlock.slice(0,-1)};level5State.repeatUsed=false;level5State.goalReached=false;level5State.finalBlockCount=null;level5State.finalProgram=null;level5RefactorEventSent=false;clearLevel5Pattern();document.getElementById('level5-pattern-copy').textContent=level5State.patternShown?'Hay acciones que se repiten.':'';queueMicrotask(syncLevel5UX)}`;
  html = html.slice(0, clearRange.start) + wrapped + html.slice(clearRange.end);
}

// Static/runtime contract.
for (const token of [
  'APULAB_LEVEL5_FINAL_LOOPS_V1','SIMPLIFICAR','RECONOCE UN PATRÓN Y USA REPETIR PARA ACORTAR TU PROGRAMA.',
  'data-testid="level5-guide"','data-testid="level5-guide-step-1"','data-testid="level5-guide-step-4"',
  'PASO 1 · LLEVA AYNI HASTA LA BANDERA','PASO 2 · OBSERVA QUÉ ACCIONES SE REPITEN','PASO 3 · USA REPETIR PARA AGRUPARLAS','PASO 4 · VUELVE A PROBAR EL PROGRAMA',
  'goalTileMat','flagPole','flagGroup.position.set(gp.x,.22,gp.z)','level5HandleFirstGoal','level5HandleFinalGoal',
  'initial_program_completed','pattern_highlighted','repeat_unlocked','repeat_added','repeat_count_changed','block_moved_into_repeat','program_refactored','goal_reached','level_completed',
  'window.apulabLevel5QA=',
]) if (!html.includes(token)) fail(`contract:${token}`);
if (html.includes('id="guide-btn"')) fail('top_guide_remaining');
if (html.includes('apulab-repeat-arrow')) fail('legacy_repeat_arrow_remaining');
if (!/repeatUnlocked\s*=\s*false/.test(html)) fail('repeat_not_initially_locked');
if (!/id="repeat-palette"[^>]*\shidden\b/.test(html)) fail('repeat_not_initially_hidden');
if (html.includes('SENSOR DE') || html.includes('ESCANEAR') || html.includes('ANALIZAR MUESTRA') || html.includes('ENVIAR DATOS')) fail('science_leak');

await writeFile(LEVEL5, html, 'utf8');

for (const [level, before] of untouched) {
  const after = hash(await readFile(resolve(OUT, `level${level}.html`), 'utf8'));
  if (after !== before) fail(`out_of_scope_level_${level}`);
}

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
const entry = (manifest.levels || []).find((x) => Number(x.level) === 5);
if (!entry) fail('manifest_level5');
entry.bytes = Buffer.byteLength(html, 'utf8');
entry.sha256 = hash(html);
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.info('[mission01] N5 FINAL LOOPS OK · ruta larga → patrón → REPETIR → misma bandera con menos bloques · guía fija 1→4 · N1–N4/N6–N7 intactos');
