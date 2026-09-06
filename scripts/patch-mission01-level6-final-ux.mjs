import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const LEVEL5 = resolve(OUT, 'level5.html');
const LEVEL6 = resolve(OUT, 'level6.html');
const LEVEL7 = resolve(OUT, 'level7.html');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
const fail = (code) => { throw new Error(`mission01_level6_final_ux:${code}`); };

function requiredReplace(source, before, after, code) {
  if (!source.includes(before)) fail(`missing:${code}`);
  return source.replace(before, after);
}
function replaceBetween(source, startMarker, endMarker, replacement, code) {
  const start = source.indexOf(startMarker);
  if (start < 0) fail(`range_start:${code}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) fail(`range_end:${code}`);
  return source.slice(0, start) + replacement + source.slice(end);
}

const l5Before = await readFile(LEVEL5, 'utf8');
const l7Before = await readFile(LEVEL7, 'utf8');
const l5Hash = hash(l5Before);
const l7Hash = hash(l7Before);
let html = await readFile(LEVEL6, 'utf8');

if (!html.includes('APULAB_LEVEL6_FROM_LEVEL5_V1') || !html.includes('APULAB_LEVEL6_TWO_CHECKPOINTS_V1')) fail('not_current_level6');
if (html.includes('APULAB_LEVEL6_FINAL_UX_V1')) fail('already_applied');

// N6 keeps EXPLORAR + BITÁCORA only. The old popup GUÍA lifecycle is removed locally.
html = requiredReplace(html, '<button id="guide-btn" class="btn btn-purple btn-guide">▶ GUÍA</button>', '', 'top_guide_button');
html = html.replace("document.getElementById('guide-btn').disabled=false;document.getElementById('guide-btn').classList.remove('is-recommended');", '');
const guideHandlerStart = html.indexOf("document.getElementById('guide-btn').onclick=()=>{");
const guideHandlerEnd = html.indexOf(";document.getElementById('info-close').onclick=", guideHandlerStart);
if (guideHandlerStart < 0 || guideHandlerEnd < 0) fail('old_guide_handler');
html = html.slice(0, guideHandlerStart) + "document.getElementById('info-close').onclick=" + html.slice(guideHandlerEnd + ";document.getElementById('info-close').onclick=".length);

const exploreSteps = [
  { title: 'ZONAS DE INTERÉS', text: 'AYNI puede investigar zonas de interés para obtener información científica.', hint: 'Primero llega al punto marcado con el número 1.', focus: 'board' },
  { title: 'DATOS CIENTÍFICOS', text: 'Los datos deben obtenerse, interpretarse y comunicarse.', hint: 'Sigue la secuencia visual 1 → investigar → 2 → enviar.', focus: 'palette' },
];
html = replaceBetween(html, 'const exploreSteps=', ';let exploreIndex=', `const exploreSteps=${JSON.stringify(exploreSteps)}`, 'explore_steps');

// INVESTIGAR is a visual/semantic container, not a new command.
const sciencePalette = `<div class="palette-group apulab-science-palette"><div class="palette-group-title"><span>CIENCIA</span></div><div id="level6-investigate-block" class="level6-investigate-block" data-testid="level6-investigate-block"><div class="level6-investigate-head"><span class="ico">◇</span><span>INVESTIGAR</span></div><div class="level6-investigate-actions"><div class="command-block block-scan" data-kind="cmd" data-command="scan" data-testid="block-scan"><span class="ico">⌁</span>ESCANEAR</div><div class="command-block block-analyze" data-kind="cmd" data-command="analyze" data-testid="block-analyze"><span class="ico">◇</span>ANALIZAR</div></div></div><div class="command-block block-send" data-kind="cmd" data-command="send" data-testid="block-send"><span class="ico">⇧</span>ENVIAR DATOS</div></div>`;
const scienceStart = html.indexOf('<div class="palette-group apulab-science-palette">');
const scienceEnd = html.indexOf('</aside>', scienceStart);
if (scienceStart < 0 || scienceEnd < 0) fail('science_palette');
html = html.slice(0, scienceStart) + sciencePalette + html.slice(scienceEnd);
html = html.replace("tone:'SCAN'", "tone:''").replace("tone:'ANÁLISIS'", "tone:''").replace("tone:'TX'", "tone:''");

// Replace canvas text labels with state-aware checkpoint callouts.
html = html
  .replace('studyLabel.position.set(0,1.05,0);studyLabel.scale.set(1.72,.38,1);flagGroup.add(studyLabel);', 'studyLabel.position.set(0,1.05,0);studyLabel.scale.set(1.72,.38,1);studyLabel.visible=false;flagGroup.add(studyLabel);')
  .replace('communicationLabel.position.set(0,1.18,0);communicationLabel.scale.set(2.04,.36,1);communicationGroup.add(communicationLabel);', 'communicationLabel.position.set(0,1.18,0);communicationLabel.scale.set(2.04,.36,1);communicationLabel.visible=false;communicationGroup.add(communicationLabel);');
if (!html.includes('studyLabel.visible=false') || !html.includes('communicationLabel.visible=false')) fail('three_labels');

const guideTexts = [
  'Lleva AYNI a la zona de interés.',
  'Obtén información de la zona.',
  'Interpreta el dato.',
  'Lleva AYNI al punto de comunicación.',
  'Envía el resultado a ApuLab Station.',
];
const boardExtras = `<div id="level6-zone-checkpoint" class="level6-checkpoint level6-checkpoint-zone is-active" data-testid="level6-science-zone" aria-hidden="true"><span class="level6-checkpoint-badge">1</span><span class="level6-checkpoint-copy"><strong>ZONA DE INTERÉS</strong><small>VE AQUÍ PRIMERO</small></span></div><div id="level6-communication-checkpoint" class="level6-checkpoint level6-checkpoint-communication" data-testid="level6-communication-point" aria-hidden="true"><span class="level6-checkpoint-badge">2</span><span class="level6-checkpoint-copy"><strong>PUNTO DE COMUNICACIÓN</strong></span></div><section id="level6-guide" class="level6-guide" data-testid="level6-guide" aria-label="Guía de progreso de investigar"><div class="level6-guide-title"><strong>GUÍA · <span>INVESTIGAR</span></strong></div><div class="level6-guide-track"><div id="level6-guide-fill" class="level6-guide-fill"></div>${guideTexts.map((text,i)=>`<div class="level6-guide-step${i===0?' is-active':''}" data-step="${i+1}" data-testid="level6-guide-step-${i+1}"><span class="level6-guide-node">${i+1}</span><span class="level6-guide-text">${text}</span></div>`).join('')}</div></section>`;
const boardStart = html.indexOf('<section id="board-shell" class="board-shell">');
const boardEnd = html.indexOf('</section>\n<section class="editor">', boardStart);
if (boardStart < 0 || boardEnd < 0) fail('board_shell_end');
html = html.slice(0, boardEnd) + boardExtras + html.slice(boardEnd);

const style = `<style id="apulab-level6-final-ux-style">
/* APULAB_LEVEL6_FINAL_UX_V1 · generated N6 only */
.hud{gap:16px}.btn-journal{width:150px}.btn-progress{width:72px}
#board-canvas{height:574px!important}.board-labels-left{height:488px!important}.board-focus{bottom:130px!important}.obstacle-label{bottom:132px!important}
.objective-tag{min-width:380px;justify-content:center;border-color:#4D4288;color:#C9F6F7;font-size:11.5px}
.level6-guide{position:absolute;left:18px;right:18px;bottom:15px;height:104px;border:2px solid #4D4288;border-radius:9px;background:linear-gradient(180deg,rgba(20,25,56,.98),rgba(12,18,45,.98));box-shadow:inset 0 0 0 1px rgba(73,201,215,.10);z-index:12;padding:10px 18px 9px;overflow:hidden}
.level6-guide-title{height:19px;display:flex;align-items:center;font-size:13px;color:#F8F9FA}.level6-guide-title span{color:#49C9D7}
.level6-guide-track{position:relative;height:68px;display:grid;grid-template-columns:repeat(5,1fr);align-items:start;padding-top:4px}.level6-guide-track::before{content:"";position:absolute;left:10%;right:10%;top:18px;height:3px;border-radius:4px;background:#514B88;box-shadow:0 0 7px rgba(142,125,206,.20)}
.level6-guide-fill{position:absolute;left:10%;top:18px;height:3px;width:0;border-radius:4px;background:#49C9D7;box-shadow:0 0 10px rgba(73,201,215,.65);transition:width .28s ease}
.level6-guide-step{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;text-align:center;gap:5px;color:#D8D9EA;min-width:0}.level6-guide-node{width:30px;height:30px;border:2px solid #8E7DCE;border-radius:50%;background:#3B326B;display:flex;align-items:center;justify-content:center;font:800 13px/1 Poppins,sans-serif;color:#FFF;transition:.22s ease}.level6-guide-text{max-width:160px;font:700 10px/1.25 Poppins,sans-serif;color:#D8D9EA}
.level6-guide-step.is-active .level6-guide-node{border-color:#C9F6F7;background:#F8F9FA;color:#141938;box-shadow:0 0 0 4px rgba(73,201,215,.20),0 0 22px rgba(73,201,215,.95);animation:level6GuidePulse 1.55s ease-in-out infinite}.level6-guide-step.is-active .level6-guide-text{color:#49C9D7;font-weight:800}.level6-guide-step.is-done .level6-guide-node{border-color:#49C9D7;background:#254D66;color:#C9F6F7;box-shadow:0 0 10px rgba(73,201,215,.28)}
@keyframes level6GuidePulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.25);box-shadow:0 0 0 5px rgba(73,201,215,.23),0 0 26px rgba(73,201,215,1)}}
.level6-checkpoint{position:absolute;z-index:11;display:flex;align-items:center;gap:7px;pointer-events:none;filter:saturate(.8);opacity:.70;transition:opacity .25s,filter .25s,transform .25s}.level6-checkpoint-zone{left:417px;top:350px}.level6-checkpoint-communication{left:408px;top:178px}
.level6-checkpoint-badge{width:35px;height:35px;border-radius:50%;border:3px solid #8E7DCE;background:#2D2654;color:#FFF;display:flex;align-items:center;justify-content:center;font:800 15px/1 Poppins,sans-serif;box-shadow:0 0 0 3px rgba(142,125,206,.12)}.level6-checkpoint-copy{display:flex;flex-direction:column;align-items:flex-start;min-width:160px}.level6-checkpoint-copy strong{padding:6px 10px;border:2px solid #4D4288;border-radius:5px;background:rgba(23,19,58,.95);font:800 10px/1 Poppins,sans-serif;color:#F8F9FA}.level6-checkpoint-copy small{margin-left:9px;padding:5px 8px;border-radius:0 0 5px 5px;background:#49C9D7;color:#141938;font:800 9px/1 Poppins,sans-serif}
.level6-checkpoint-zone.is-active{opacity:1;filter:none}.level6-checkpoint-zone.is-active .level6-checkpoint-badge{border-color:#C9F6F7;background:#0D5263;box-shadow:0 0 0 4px rgba(73,201,215,.25),0 0 23px rgba(73,201,215,.90);animation:level6CheckpointPulse 1.55s ease-in-out infinite}.level6-checkpoint-zone.is-active .level6-checkpoint-copy strong{border-color:#49C9D7;box-shadow:0 0 13px rgba(73,201,215,.55)}
.level6-checkpoint-communication.is-ready{opacity:1;filter:none}.level6-checkpoint-communication.is-ready .level6-checkpoint-badge{border-color:#C9F6F7;background:#403A7A;box-shadow:0 0 0 4px rgba(142,125,206,.24),0 0 23px rgba(142,125,206,.85);animation:level6CheckpointPulse 1.55s ease-in-out infinite}.level6-checkpoint.is-done{opacity:.82;filter:none}.level6-checkpoint.is-done .level6-checkpoint-badge{animation:none;border-color:#49C9D7;background:#254D66;box-shadow:0 0 10px rgba(73,201,215,.28)}@keyframes level6CheckpointPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
.apulab-science-palette{margin-top:5px!important}.apulab-science-palette>.palette-group-title{margin-bottom:6px!important}.level6-investigate-block{border:2px solid #8E7DCE;border-radius:11px;background:linear-gradient(180deg,#5B4E92,#3B326B);padding:7px 7px 2px;margin-bottom:9px;box-shadow:inset 0 2px 0 rgba(255,255,255,.17),0 4px 0 rgba(0,0,0,.20)}.level6-investigate-head{height:25px;display:flex;align-items:center;gap:7px;padding:0 3px 5px;font:800 11px/1 Poppins,sans-serif;color:#F8F9FA}.level6-investigate-actions{position:relative;padding-left:9px}.level6-investigate-actions::before{content:"";position:absolute;left:2px;top:4px;bottom:10px;width:2px;background:#C7B7F7;border-radius:2px}.level6-investigate-actions::after{content:"";position:absolute;left:2px;top:50%;width:8px;height:2px;background:#C7B7F7}
.apulab-science-palette .command-block{height:43px!important;margin-bottom:6px!important;border-radius:9px!important;padding-left:10px!important;font-size:11.5px!important}.apulab-science-palette .level6-investigate-actions .command-block:last-child{margin-bottom:4px!important}.apulab-science-palette>.block-send{height:49px!important;margin-bottom:0!important;background:linear-gradient(180deg,#FFD77D,#F4C75E)!important}.apulab-science-palette .tone,.program-block.block-scan .tone,.program-block.block-analyze .tone,.program-block.block-send .tone{display:none!important}
.program-row.level6-investigate-start,.program-row.level6-investigate-end{position:relative;background:rgba(142,125,206,.08);border-left:3px solid #8E7DCE;padding-left:3px}.program-row.level6-investigate-start{border-radius:7px 7px 0 0;margin-bottom:2px}.program-row.level6-investigate-end{border-radius:0 0 7px 7px;margin-top:-2px}.program-row.level6-investigate-start::after{content:"INVESTIGAR";position:absolute;right:13px;top:-7px;padding:2px 6px;border-radius:5px;background:#4D4288;color:#F8F9FA;font:800 8px/1 Poppins,sans-serif;letter-spacing:.03em}
</style>`;
html = requiredReplace(html, '</head>', `${style}\n</head>`, 'final_style');

html = html.replace(/document\.getElementById\('objective-tag'\)\.textContent="[^"]*"/g, "document.getElementById('objective-tag').textContent='PASO 1 · LLEVA AYNI A LA ZONA DE INTERÉS'");

const oldRender = 'const t=clock.getElapsedTime(),p=.5+.5*Math.sin(t*3.4);goalGlowMat.opacity=.14+.24*p;flag.rotation.z=Math.sin(t*1.6)*.018;if(roverHaloMat.opacity>0)roverHaloMat.opacity=.45+.25*p;renderer.render(scene,camera)';
const newRender = "const t=clock.getElapsedTime(),p=.5+.5*Math.sin(t*3.4);goalGlowMat.opacity=scienceZoneReached?.07:(.14+.24*p);communicationRingMat.opacity=scienceAnalyzed?(.22+.24*p):.10;communicationPole.material.emissiveIntensity=scienceAnalyzed?(.72+.18*p):.22;flag.rotation.z=Math.sin(t*1.6)*.018;if(roverHaloMat.opacity>0)roverHaloMat.opacity=.45+.25*p;renderer.render(scene,camera)";
html = requiredReplace(html, oldRender, newRender, 'checkpoint_render_states');

const oldMovementTail = 'const result=await executeMovementCommand(cmd);if(atSciencePoint())scienceZoneReached=true;if(atCommunicationPoint())communicationPointReached=true;return result;';
const newMovementTail = `const result=await executeMovementCommand(cmd);if(atSciencePoint()&&!scienceZoneReached){scienceZoneReached=true;emitLevel6Event('science_zone_reached',{attempt_number:level6Attempt,rover_x:roverState.c,rover_y:roverState.r,elapsed_ms:level6Elapsed()})}if(atCommunicationPoint()&&!communicationPointReached){communicationPointReached=true;emitLevel6Event('communication_point_reached',{attempt_number:level6Attempt,rover_x:roverState.c,rover_y:roverState.r,elapsed_ms:level6Elapsed()})}window.apulabLevel6Visual?.sync?.();return result;`;
html = requiredReplace(html, oldMovementTail, newMovementTail, 'movement_checkpoint_events');
html = html
  .replace('scienceScanned=true;level6ScienceOrder.push', 'scienceScanned=true;window.apulabLevel6Visual?.sync?.();level6ScienceOrder.push')
  .replace('scienceAnalyzed=true;level6ScienceOrder.push', 'scienceAnalyzed=true;window.apulabLevel6Visual?.sync?.();level6ScienceOrder.push')
  .replace('scienceSent=true;level6ScienceOrder.push', 'scienceSent=true;window.apulabLevel6Visual?.sync?.();level6ScienceOrder.push');
html = requiredReplace(html,
  "function resetScienceState(){scienceScanned=false;scienceAnalyzed=false;scienceSent=false;scienceZoneReached=false;communicationPointReached=false;level6ScienceOrder=[];try{document.getElementById('success-overlay')?.classList.remove('visible');document.getElementById('status')?.classList.remove('show')}catch{}}",
  "function resetScienceState(){scienceScanned=false;scienceAnalyzed=false;scienceSent=false;scienceZoneReached=false;communicationPointReached=false;level6ScienceOrder=[];try{document.getElementById('success-overlay')?.classList.remove('visible');document.getElementById('status')?.classList.remove('show')}catch{};window.apulabLevel6Visual?.sync?.()}",
  'reset_visual_state');

html = html.replace("document.getElementById('explore-btn').onclick=()=>{exploreIndex++;", "document.getElementById('explore-btn').onclick=()=>{emitLevel6Event('explore_opened',{elapsed_ms:level6Elapsed()});exploreIndex++;");
html = html.replace("function openJournal(){document.getElementById('info-panel')", "function openJournal(){emitLevel6Event('bitacora_opened',{elapsed_ms:level6Elapsed()});document.getElementById('info-panel')");

const visualRuntime = `<script id="apulab-level6-final-ux-runtime">
// APULAB_LEVEL6_FINAL_UX_V1
window.addEventListener('DOMContentLoaded',()=>{
  const guide=document.getElementById('level6-guide'),fill=document.getElementById('level6-guide-fill'),zone=document.getElementById('level6-zone-checkpoint'),comm=document.getElementById('level6-communication-checkpoint'),objective=document.getElementById('objective-tag'),programList=document.getElementById('program-list');
  const objectiveText={1:'PASO 1 · LLEVA AYNI A LA ZONA DE INTERÉS',2:'PASO 2 · INVESTIGA LA ZONA',3:'PASO 3 · INTERPRETA EL DATO',4:'PASO 4 · LLEVA AYNI AL PUNTO DE COMUNICACIÓN',5:'PASO 5 · ENVÍA EL RESULTADO',6:'MISIÓN COMPLETADA'};
  function state(){return window.apulabLevel6QA?.getState?.()||{}}
  function phase(s){if(s.hasSentData)return 6;if(s.hasAnalyzed&&s.communicationPointReached)return 5;if(s.hasAnalyzed)return 4;if(s.hasScanned)return 3;if(s.scienceZoneReached)return 2;return 1}
  function sync(){const s=state(),p=phase(s),completed=p===6?5:p-1;objective.textContent=objectiveText[p];guide.dataset.phase=String(p);fill.style.width=\`\${Math.min(4,completed)*20}%\`;guide.querySelectorAll('.level6-guide-step').forEach((el,i)=>{const n=i+1;el.classList.toggle('is-done',n<=completed);el.classList.toggle('is-active',p<6&&n===p)});zone.classList.toggle('is-active',!s.scienceZoneReached);zone.classList.toggle('is-done',!!s.scienceZoneReached);comm.classList.toggle('is-ready',!!s.hasAnalyzed&&!s.communicationPointReached);comm.classList.toggle('is-done',!!s.communicationPointReached)}
  function groupProgram(){if(!programList)return;const rows=[...programList.querySelectorAll('.program-row')];rows.forEach(r=>r.classList.remove('level6-investigate-start','level6-investigate-end'));for(let i=0;i<rows.length-1;i++){if(rows[i].querySelector('.program-block.block-scan')&&rows[i+1].querySelector('.program-block.block-analyze')){rows[i].classList.add('level6-investigate-start');rows[i+1].classList.add('level6-investigate-end');i++}}}
  window.apulabLevel6Visual={sync,groupProgram};sync();groupProgram();if(programList)new MutationObserver(groupProgram).observe(programList,{childList:true,subtree:true});document.getElementById('clear-btn')?.addEventListener('click',()=>queueMicrotask(sync));
});
</script>`;
html = requiredReplace(html, '</body>', `${visualRuntime}\n</body>`, 'visual_runtime');

for (const token of ['APULAB_LEVEL6_FINAL_UX_V1','data-testid="level6-guide"','data-testid="level6-guide-step-1"','data-testid="level6-guide-step-5"','data-testid="level6-science-zone"','data-testid="level6-communication-point"','data-testid="level6-investigate-block"','PASO 1 · LLEVA AYNI A LA ZONA DE INTERÉS','PASO 5 · ENVÍA EL RESULTADO','science_zone_reached','communication_point_reached','explore_opened','bitacora_opened']) if (!html.includes(token)) fail(`contract:${token}`);
if (html.includes('id="guide-btn"')) fail('top_guide_still_present');
if (html.includes("document.getElementById('guide-btn').onclick")) fail('popup_guide_handler_still_present');
if (html.includes('>SCAN<') || html.includes('>ANÁLISIS<') || html.includes('>TX<')) fail('duplicate_science_labels_visible');

await writeFile(LEVEL6, html, 'utf8');
if (hash(await readFile(LEVEL5, 'utf8')) !== l5Hash) fail('level5_mutated');
if (hash(await readFile(LEVEL7, 'utf8')) !== l7Hash) fail('level7_mutated');
console.info('[mission01] N6 FINAL UX OK · guía fija 1→5 · checkpoints 1/2 · INVESTIGAR agrupado · REPETIR opcional · N5/N7 intactos');
