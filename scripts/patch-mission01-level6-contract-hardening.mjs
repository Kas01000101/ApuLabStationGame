import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const LEVEL6 = resolve(process.cwd(), 'public/missions/mission01/level6.html');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
const fail = (code) => { throw new Error(`mission01_level6_contract_hardening:${code}`); };

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
function removeFunction(source, marker) {
  const { start, end } = functionRange(source, marker);
  return source.slice(0, start) + source.slice(end);
}
function requiredReplace(source, before, after, code) {
  if (!source.includes(before)) fail(`missing:${code}`);
  return source.replace(before, after);
}

let html = await readFile(LEVEL6, 'utf8');
if (!html.includes('APULAB_LEVEL6_FROM_LEVEL5_V1') || !html.includes('APULAB_LEVEL6_TWO_CHECKPOINTS_V1')) fail('not_level6_contract');

// N5 enseña REPETIR. N6 solo lo conserva como herramienta ya aprendida y opcional.
for (const marker of ['function handleRunSuccess()', 'function unlockRepeat()', 'function usesSequenceRepeat(']) {
  if (html.includes(marker)) html = removeFunction(html, marker);
}
const unlockStart = html.indexOf('<div id="unlock-overlay"');
if (unlockStart >= 0) {
  const successStart = html.indexOf('<div id="success-overlay"', unlockStart);
  if (successStart < 0) fail('unlock_overlay_end');
  html = html.slice(0, unlockStart) + html.slice(successStart);
}
html = html
  .replace(/<div id="control-locked" class="control-locked hidden">[\s\S]*?<\/div>/g, '')
  .replace(/\.unlock-overlay \.popup\{width:580px\}/g, '')
  .replaceAll("document.getElementById('unlock-btn').onclick=unlockRepeat;", '')
  .replaceAll("document.getElementById('unlock-close').onclick=()=>document.getElementById('unlock-overlay').classList.remove('visible');", '')
  .replaceAll('Usa REPETIR para llegar al zona de interés y completa el ciclo científico.', 'Investiga la zona de interés y comunica el resultado a ApuLab Station.')
  .replaceAll('Usa REPETIR para llegar a la zona de interés y completa el ciclo científico.', 'Investiga la zona de interés y comunica el resultado a ApuLab Station.')
  .replaceAll('Usa REPETIR para llegar al punto de estudio y completa el ciclo científico.', 'Investiga la zona de interés y comunica el resultado a ApuLab Station.')
  .replaceAll('Ahora usa REPETIR para organizar la ruta.', 'Continúa investigando con las herramientas que ya conoces.')
  .replaceAll('REPETIR desbloqueado · úsalo para completar el nivel.', 'Continúa con el proceso científico.');

// Identificadores locales de QA. No modifican la presentación visual.
html = html
  .replace('class="command-block block-scan" data-kind="cmd" data-command="scan"', 'class="command-block block-scan" data-kind="cmd" data-command="scan" data-testid="block-scan"')
  .replace('class="command-block block-analyze" data-kind="cmd" data-command="analyze"', 'class="command-block block-analyze" data-kind="cmd" data-command="analyze" data-testid="block-analyze"')
  .replace('class="command-block block-send" data-kind="cmd" data-command="send"', 'class="command-block block-send" data-kind="cmd" data-command="send" data-testid="block-send"');

if (!html.includes('id="apulab-level6-focus-style"')) {
  html = requiredReplace(html, '</head>', `<style id="apulab-level6-focus-style">\n#palette .command-block:focus-visible{outline:4px solid #49C9D7!important;outline-offset:3px;box-shadow:0 0 18px rgba(73,201,215,.58)!important}\n</style>\n</head>`, 'focus_style');
}

// Estado científico explícito. El progreso válido sobrevive a un error; LIMPIAR es el reset explícito.
html = requiredReplace(
  html,
  'let scienceScanned=false,scienceAnalyzed=false,scienceSent=false;\nlet level6Attempt=',
  'let scienceScanned=false,scienceAnalyzed=false,scienceSent=false,scienceZoneReached=false,communicationPointReached=false;\nlet level6Attempt=',
  'science_state_flags',
);
html = requiredReplace(
  html,
  'function resetScienceState(){scienceScanned=false;scienceAnalyzed=false;scienceSent=false;level6ScienceOrder=[]}',
  `function resetScienceState(){scienceScanned=false;scienceAnalyzed=false;scienceSent=false;scienceZoneReached=false;communicationPointReached=false;level6ScienceOrder=[];try{document.getElementById('success-overlay')?.classList.remove('visible');document.getElementById('status')?.classList.remove('show')}catch{}}`,
  'science_reset',
);

// program_edit_count cuenta cambios reales en la representación ejecutable.
const editHelper = `\nfunction level6BlockType(item){if(!item)return 'unknown';if(isRepeat(item))return 'repeat';return item.cmd||item.type||'unknown'}\nfunction recordLevel6ProgramEdit(edit_type,block_type='unknown'){level6ProgramEditCount+=1;level6LastProgramSignature=level6ProgramSignature();emitLevel6Event('program_modified',{attempt_number:level6Attempt,edit_count:level6ProgramEditCount,edit_type,block_type,block_count:topCount(program),elapsed_ms:level6Elapsed()})}\n`;
html = requiredReplace(html, 'function level6ProgramSignature(){try{return JSON.stringify(serialize(program))}catch{return JSON.stringify(program)}}', `function level6ProgramSignature(){try{return JSON.stringify(serialize(program))}catch{return JSON.stringify(program)}}${editHelper}`, 'edit_helper');

const bindProgramEvents = `function bindProgramEvents(){document.querySelectorAll('[data-del]').forEach(b=>b.onclick=e=>{e.stopPropagation();if(executing)return;const removed=program[+b.dataset.del];program.splice(+b.dataset.del,1);lastFailure=null;recordLevel6ProgramEdit('delete',level6BlockType(removed));renderProgram()});document.querySelectorAll('[data-ndel]').forEach(b=>b.onclick=e=>{e.stopPropagation();if(executing)return;const [i,j]=b.dataset.ndel.split(':').map(Number);const removed=program[i].body[j];program[i].body.splice(j,1);lastFailure=null;recordLevel6ProgramEdit('repeat_body_delete',level6BlockType(removed));renderProgram()});document.querySelectorAll('[data-count]').forEach(b=>b.onclick=e=>{e.stopPropagation();if(executing)return;const [i,d]=b.dataset.count.split(':').map(Number);const before=program[i].count;program[i].count=Math.max(2,Math.min(9,program[i].count+d));lastFailure=null;if(program[i].count!==before)recordLevel6ProgramEdit('repeat_count','repeat');renderProgram()});document.querySelectorAll('.program-block[data-top]').forEach(el=>el.onpointerdown=e=>startDrag(e,{source:'top',index:+el.dataset.top,item:clone(program[+el.dataset.top])},el));document.querySelectorAll('.repeat-card[data-top] > .repeat-head').forEach(head=>head.onpointerdown=e=>{const card=head.parentElement,i=+card.dataset.top;startDrag(e,{source:'top',index:i,item:clone(program[i])},card)});document.querySelectorAll('.nested-chip').forEach(el=>el.onpointerdown=e=>{if(e.target.closest('button'))return;const i=+el.dataset.nestedTop,j=+el.dataset.nestedBody;startDrag(e,{source:'nested',top:i,body:j,item:clone(program[i].body[j])},el)})}`;
html = replaceFunction(html, 'function bindProgramEvents()', bindProgramEvents);

const performDrop = `function performDrop(target,src){if(executing)return;if(target.classList.contains('repeat-body')){if(src.item.type!=='cmd')return showStatus('Dentro de REPETIR van instrucciones.');const idx=+target.dataset.repeatBody,repeatRef=program[idx];if(!isRepeat(repeatRef))return;if(repeatRef.body.length>=MAX_REPEAT_BODY)return showStatus('Este REPETIR ya tiene suficientes bloques.');const item=removeSource(src);repeatRef.body.push(item);lastFailure=null;recordLevel6ProgramEdit(src.source==='palette'?'repeat_body_add':'move',level6BlockType(item));renderProgram();revealRow(idx);return}const idx=+target.dataset.index;if(idx>program.length)return;const item=removeSource(src);let insert=idx;if(src.source==='top'&&src.index<idx)insert--;insert=Math.max(0,Math.min(insert,program.length));program.splice(insert,0,item);if(program.length>MAX)program.pop();lastFailure=null;recordLevel6ProgramEdit(src.source==='palette'?'add':'move',level6BlockType(item));renderProgram();revealRow(insert)}`;
html = replaceFunction(html, 'function performDrop(', performDrop);

const appendItem = `function appendItem(item){if(program.length>=MAX)return showStatus('Llegaste a 30 pasos. Reordena o elimina bloques.');program.push(clone(item));lastFailure=null;recordLevel6ProgramEdit('add',level6BlockType(item));renderProgram();revealRow(program.length-1)}`;
html = replaceFunction(html, 'function appendItem(', appendItem);

// Mismo contrato para movimiento y ciencia: click, drag/drop, Enter, Space y foco visible.
const bindPalette = `function bindPalette(){const bindCmd=el=>{el.tabIndex=0;el.setAttribute('role','button');if(!el.getAttribute('aria-label'))el.setAttribute('aria-label',\`Añadir \${String(el.textContent||el.dataset.command||'comando').replace(/\\s+/g,' ').trim()} al programa\`);let clickTimer=0;el.onpointerdown=e=>{if(executing||e.button!==0)return;const sx=e.clientX,sy=e.clientY,id=e.pointerId;let moved=false;const move=ev=>{if(ev.pointerId===id&&Math.hypot(ev.clientX-sx,ev.clientY-sy)>7)moved=true};const up=ev=>{if(ev.pointerId!==id)return;document.removeEventListener('pointermove',move);if(!moved){clearTimeout(clickTimer);clickTimer=setTimeout(()=>appendItem({type:'cmd',cmd:el.dataset.command}),170)}};document.addEventListener('pointermove',move,{passive:true});document.addEventListener('pointerup',up,{once:true});startDrag(e,{source:'palette',item:{type:'cmd',cmd:el.dataset.command}},el)};el.ondblclick=e=>{e.preventDefault();clearTimeout(clickTimer);appendItem({type:'cmd',cmd:el.dataset.command})};el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();appendItem({type:'cmd',cmd:el.dataset.command})}}};document.querySelectorAll('.command-block[data-kind="cmd"]').forEach(bindCmd);const rp=document.getElementById('repeat-palette');rp.tabIndex=0;rp.setAttribute('role','button');rp.setAttribute('aria-label','Añadir REPETIR al programa');let repeatClickTimer=0;rp.onpointerdown=e=>{if(!repeatUnlocked||executing||e.button!==0)return;const sx=e.clientX,sy=e.clientY,id=e.pointerId;let moved=false;const move=ev=>{if(ev.pointerId===id&&Math.hypot(ev.clientX-sx,ev.clientY-sy)>7)moved=true};const up=ev=>{if(ev.pointerId!==id)return;document.removeEventListener('pointermove',move);if(!moved){clearTimeout(repeatClickTimer);repeatClickTimer=setTimeout(()=>appendItem({type:'repeat',count:2,body:[]}),170)}};document.addEventListener('pointermove',move,{passive:true});document.addEventListener('pointerup',up,{once:true});startDrag(e,{source:'palette',item:{type:'repeat',count:2,body:[]}},rp)};rp.ondblclick=e=>{e.preventDefault();clearTimeout(repeatClickTimer);if(repeatUnlocked)appendItem({type:'repeat',count:2,body:[]})};rp.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&repeatUnlocked){e.preventDefault();appendItem({type:'repeat',count:2,body:[]})}}}`;
html = replaceFunction(html, 'function bindPalette()', bindPalette);

// Telemetría de acciones científicas válida/inválida y checkpoints alcanzados.
html = requiredReplace(html,
  "if(!atSciencePoint()){\n      level6PrematureCount+=1;emitLevel6Event('premature_action',{attempt:level6Attempt,attempted_action:'scan',reason:'not_at_scientific_zone',elapsed_ms:level6Elapsed()});",
  "if(!atSciencePoint()){\n      level6PrematureCount+=1;emitLevel6Event('science_action',{attempt_number:level6Attempt,action:'scan',valid:false,rover_x:roverState.c,rover_y:roverState.r,elapsed_ms:level6Elapsed()});emitLevel6Event('premature_action',{attempt:level6Attempt,attempted_action:'scan',reason:'not_at_scientific_zone',elapsed_ms:level6Elapsed()});",
  'invalid_scan_telemetry');
html = requiredReplace(html,
  "emitLevel6Event('science_action',{attempt:level6Attempt,action:'scan',order_index:level6ScienceOrder.length,valid_state:true,rover_cell:{c:roverState.c,r:roverState.r},elapsed_ms:level6Elapsed()});",
  "scienceZoneReached=true;emitLevel6Event('science_action',{attempt_number:level6Attempt,action:'scan',order_index:level6ScienceOrder.length,valid:true,rover_x:roverState.c,rover_y:roverState.r,elapsed_ms:level6Elapsed()});",
  'valid_scan_state');
html = requiredReplace(html,
  "if(!scienceScanned){level6PrematureCount+=1;emitLevel6Event('premature_action',{attempt:level6Attempt,attempted_action:'analyze',reason:'no_data',elapsed_ms:level6Elapsed()});",
  "if(!scienceScanned){level6PrematureCount+=1;emitLevel6Event('science_action',{attempt_number:level6Attempt,action:'analyze',valid:false,rover_x:roverState.c,rover_y:roverState.r,elapsed_ms:level6Elapsed()});emitLevel6Event('premature_action',{attempt:level6Attempt,attempted_action:'analyze',reason:'no_data',elapsed_ms:level6Elapsed()});",
  'invalid_analyze_telemetry');
html = requiredReplace(html,
  "if(!atSciencePoint()){level6PrematureCount+=1;emitLevel6Event('premature_action',{attempt:level6Attempt,attempted_action:'analyze',reason:'left_scientific_zone',elapsed_ms:level6Elapsed()});",
  "if(!atSciencePoint()){level6PrematureCount+=1;emitLevel6Event('science_action',{attempt_number:level6Attempt,action:'analyze',valid:false,rover_x:roverState.c,rover_y:roverState.r,elapsed_ms:level6Elapsed()});emitLevel6Event('premature_action',{attempt:level6Attempt,attempted_action:'analyze',reason:'left_scientific_zone',elapsed_ms:level6Elapsed()});",
  'invalid_analyze_position_telemetry');
html = requiredReplace(html,
  "emitLevel6Event('science_action',{attempt:level6Attempt,action:'analyze',order_index:level6ScienceOrder.length,valid_state:true,rover_cell:{c:roverState.c,r:roverState.r},elapsed_ms:level6Elapsed()});",
  "emitLevel6Event('science_action',{attempt_number:level6Attempt,action:'analyze',order_index:level6ScienceOrder.length,valid:true,rover_x:roverState.c,rover_y:roverState.r,elapsed_ms:level6Elapsed()});",
  'valid_analyze_telemetry');
html = requiredReplace(html,
  "if(!scienceAnalyzed){level6PrematureCount+=1;emitLevel6Event('premature_action',{attempt:level6Attempt,attempted_action:'send',reason:'not_analyzed',elapsed_ms:level6Elapsed()});",
  "if(!scienceAnalyzed){level6PrematureCount+=1;emitLevel6Event('science_action',{attempt_number:level6Attempt,action:'send',valid:false,rover_x:roverState.c,rover_y:roverState.r,elapsed_ms:level6Elapsed()});emitLevel6Event('premature_action',{attempt:level6Attempt,attempted_action:'send',reason:'not_analyzed',elapsed_ms:level6Elapsed()});",
  'invalid_send_order_telemetry');
html = requiredReplace(html,
  "if(!atCommunicationPoint()){level6PrematureCount+=1;emitLevel6Event('premature_action',{attempt:level6Attempt,attempted_action:'send',reason:'not_at_communication_point',elapsed_ms:level6Elapsed()});",
  "if(!atCommunicationPoint()){level6PrematureCount+=1;emitLevel6Event('science_action',{attempt_number:level6Attempt,action:'send',valid:false,rover_x:roverState.c,rover_y:roverState.r,elapsed_ms:level6Elapsed()});emitLevel6Event('premature_action',{attempt:level6Attempt,attempted_action:'send',reason:'not_at_communication_point',elapsed_ms:level6Elapsed()});",
  'invalid_send_position_telemetry');
html = requiredReplace(html,
  "emitLevel6Event('science_action',{attempt:level6Attempt,action:'send',order_index:level6ScienceOrder.length,valid_state:true,rover_cell:{c:roverState.c,r:roverState.r},elapsed_ms:level6Elapsed()});",
  "communicationPointReached=true;emitLevel6Event('science_action',{attempt_number:level6Attempt,action:'send',order_index:level6ScienceOrder.length,valid:true,rover_x:roverState.c,rover_y:roverState.r,elapsed_ms:level6Elapsed()});",
  'valid_send_state');
html = requiredReplace(html,
  '  return executeMovementCommand(cmd);\n}',
  '  const result=await executeMovementCommand(cmd);if(atSciencePoint())scienceZoneReached=true;if(atCommunicationPoint())communicationPointReached=true;return result;\n}',
  'movement_checkpoint_state');

// Reintentar conserva progreso científico válido; LIMPIAR lo restablece explícitamente.
html = requiredReplace(html,
  "executing=true;setEditing(false);document.getElementById('run-btn').disabled=true;resetRover();resetScienceState();lastFailure=null;let done=0;",
  "executing=true;setEditing(false);document.getElementById('run-btn').disabled=true;resetRover();lastFailure=null;let done=0;",
  'run_preserve_science');
html = html.replace(/\s*const signature=level6ProgramSignature\(\);if\(level6LastProgramSignature&&signature!==level6LastProgramSignature\)\{level6ProgramEditCount\+=1;emitLevel6Event\('program_modified',[\s\S]*?\}level6LastProgramSignature=signature;\n/, "\n  level6LastProgramSignature=level6ProgramSignature();\n");

const oldClear = "document.getElementById('clear-btn').onclick=()=>{if(executing)return;program=[];lastFailure=null;renderProgram();feedback.textContent='Programa limpio. AYNI permanece en su posición inicial.'}";
const newClear = "document.getElementById('clear-btn').onclick=()=>{if(executing)return;const hadProgram=program.length>0;program=[];lastFailure=null;resetScienceState();resetRover();if(hadProgram)recordLevel6ProgramEdit('clear','all');renderProgram();feedback.textContent='Programa y datos científicos reiniciados. AYNI volvió a su posición inicial.';showStatus('Nivel 6 reiniciado.',1200)}";
html = requiredReplace(html, oldClear, newClear, 'clear_reset');

// Reutilización espontánea de REPETIR: telemetría, nunca condición de victoria.
const oldCompletionMetric = "const scienceOrderCorrect=level6ScienceOrder.join('>')==='scan>analyze>send';emitLevel6Event('level_completed',{attempts:level6Attempt,completion_time_ms:level6Elapsed(),help_count:level6HelpCount,premature_action_count:level6PrematureCount,program_edit_count:level6ProgramEditCount,science_order_correct:scienceOrderCorrect,first_attempt_success:level6Attempt===1,completed_level:true});";
const newCompletionMetric = "const scienceOrderCorrect=level6ScienceOrder.join('>')==='scan>analyze>send';const repeatInstances=program.filter(isRepeat).length;const repeatCommandsExecuted=program.filter(isRepeat).reduce((n,x)=>n+(x.count*x.body.length),0);const blocksWithoutRepeat=program.reduce((n,x)=>n+(isRepeat(x)?x.count*x.body.length:1),0);emitLevel6Event('level_completed',{attempts:level6Attempt,completion_time_ms:level6Elapsed(),help_count:level6HelpCount,premature_action_count:level6PrematureCount,program_edit_count:level6ProgramEditCount,science_order_correct:scienceOrderCorrect,first_attempt_success:level6Attempt===1,completed_level:true,used_repeat_n6:repeatInstances>0,repeat_instances_n6:repeatInstances,repeat_commands_executed:repeatCommandsExecuted,blocks_without_repeat:blocksWithoutRepeat,blocks_final:topCount(program)});";
html = requiredReplace(html, oldCompletionMetric, newCompletionMetric, 'completion_repeat_metrics');

// Puente de QA de solo lectura para E2E.
const qaBridge = `\nwindow.apulabLevel6QA={getState:()=>({hasScanned:scienceScanned,hasAnalyzed:scienceAnalyzed,hasSentData:scienceSent,scienceZoneReached,communicationPointReached,atSciencePoint:atSciencePoint(),atCommunicationPoint:atCommunicationPoint(),programEditCount:level6ProgramEditCount,attemptCount:level6Attempt,programLength:program.length,usedRepeat:program.some(isRepeat)}),hasCommunicationPoint:()=>!!communicationGroup&&communicationGroup.parent===scene&&communicationGroup.visible!==false,hasScienceZone:()=>!!flagGroup&&flagGroup.parent===scene&&flagGroup.visible!==false,getProgram:()=>serialize(program)};\n`;
html = requiredReplace(html, 'bindPalette();renderProgram();requestAnimationFrame(syncProgramScrollbar);', `bindPalette();renderProgram();requestAnimationFrame(syncProgramScrollbar);${qaBridge}`, 'qa_bridge');

for (const token of [
  "el.onkeydown=e=>{if(e.key==='Enter'||e.key===' ')",
  "rp.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&repeatUnlocked)",
  'data-testid="block-scan"',
  'data-testid="block-analyze"',
  'data-testid="block-send"',
  'window.apulabLevel6QA=',
  'used_repeat_n6',
  'repeat_instances_n6',
  "recordLevel6ProgramEdit('clear','all')",
]) if (!html.includes(token)) fail(`contract:${token}`);
for (const forbidden of [
  'function unlockRepeat()',
  'function handleRunSuccess()',
  'function usesSequenceRepeat(',
  'id="unlock-overlay"',
  'id="unlock-btn"',
  'Usa REPETIR para',
  'al zona de interés',
]) if (html.includes(forbidden)) fail(`repeat_residue:${forbidden}`);
if (html.includes('if(!usesRepeat())') || html.includes('if(!usesSequenceRepeat())')) fail('repeat_required');

await writeFile(LEVEL6, html, 'utf8');
console.info(`[mission01] N6 contract hardening OK · keyboard/click/drag unified · REPETIR optional · graceful failure/reset/telemetry hardened · ${hash(html).slice(0,12)}`);
