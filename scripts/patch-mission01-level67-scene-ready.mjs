import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');

for (const level of [6, 7]) {
  const path = resolve(OUT, `level${level}.html`);
  let html = await readFile(path, 'utf8');

  const canvasCss = '.board-wrap canvas{display:block;width:100%;height:100%}';
  const hardenedCanvasCss = '.board-wrap canvas{display:block;width:100%;height:100%;opacity:0;transition:opacity .14s ease}.board-wrap.scene-ready canvas{opacity:1}.board-loading{position:absolute;inset:0;z-index:4;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,#4a161e,#8f241e 34%,#c84025 100%);color:#C9F6F7;font-size:15px;font-weight:900;letter-spacing:.05em}.board-wrap.scene-ready .board-loading{display:none}';
  if (!html.includes(canvasCss)) throw new Error(`mission01_level67_scene_ready_css_anchor_missing:L${level}`);
  html = html.replace(canvasCss, hardenedCanvasCss);

  const commandHoverCss = '.command:hover{transform:translateY(-1px)}';
  const hardenedCommandCss = '.command:hover{transform:translateY(-1px)}.command[draggable="true"]{cursor:grab;touch-action:none}.command[draggable="true"]:active{cursor:grabbing}';
  if (!html.includes(commandHoverCss)) throw new Error(`mission01_level67_drag_css_anchor_missing:L${level}`);
  html = html.replace(commandHoverCss, hardenedCommandCss);

  const boardMarkup = '<div class="board-wrap"><div class="board-label">AYNI · FRENTE = LUZ CYAN</div><canvas id="board-canvas" width="950" height="720"></canvas><div id="status" class="status"></div></div>';
  const hardenedBoardMarkup = '<div class="board-wrap"><div class="board-loading" role="status" aria-live="polite">CARGANDO SIMULADOR…</div><div class="board-label">AYNI · FRENTE = LUZ CYAN</div><canvas id="board-canvas" width="950" height="720"></canvas><div id="status" class="status"></div></div>';
  if (!html.includes(boardMarkup)) throw new Error(`mission01_level67_scene_ready_markup_anchor_missing:L${level}`);
  html = html.replace(boardMarkup, hardenedBoardMarkup);

  const renderAnchor = 'let roverState={...CFG.start};function syncRover(){rover.position.copy(cellPos(roverState.c,roverState.r));rover.position.y=.20;rover.rotation.y=[-Math.PI/2,0,Math.PI/2,Math.PI][roverState.dir]||0}syncRover();let last=0;function render(t=0){requestAnimationFrame(render);const dt=Math.min(.05,(t-last)/1000||0);last=t;markers.forEach((m,i)=>{m.rotation.z+=dt*(.65+i*.09);m.material.emissiveIntensity=.42+Math.sin(t*.004+i)*.18});renderer.render(scene,camera)}requestAnimationFrame(render);';
  const hardenedRender = 'let roverState={...CFG.start};function syncRover(){rover.position.copy(cellPos(roverState.c,roverState.r));rover.position.y=.20;rover.rotation.y=[-Math.PI/2,0,Math.PI/2,Math.PI][roverState.dir]||0}syncRover();const boardWrap=document.querySelector(\'.board-wrap\');let sceneReady=false;let last=0;function render(t=0){requestAnimationFrame(render);const dt=Math.min(.05,(t-last)/1000||0);last=t;markers.forEach((m,i)=>{m.rotation.z+=dt*(.65+i*.09);m.material.emissiveIntensity=.42+Math.sin(t*.004+i)*.18});renderer.render(scene,camera);if(!sceneReady){sceneReady=true;boardWrap?.classList.add(\'scene-ready\');document.documentElement.dataset.apulabSceneReady=\'true\';window.dispatchEvent(new CustomEvent(\'apulab-scene-ready\',{detail:{level:LEVEL}}))}}requestAnimationFrame(render);';
  if (!html.includes(renderAnchor)) throw new Error(`mission01_level67_scene_ready_render_anchor_missing:L${level}`);
  html = html.replace(renderAnchor, hardenedRender);

  const commandAnchor = "function target(){return activeRepeat?activeRepeat.body:program}function usesRepeat(nodes=program){return nodes.some(n=>n.type==='repeat'||(n.body&&usesRepeat(n.body)))}function addCommand(cmd){if(executing)return;if(cmd==='repeat'){const node={type:'repeat',count:2,body:[]};target().push(node);activeRepeat=node}else target().push({type:'cmd',cmd});renderProgram()}document.querySelectorAll('.command').forEach((b)=>b.addEventListener('click',()=>addCommand(b.dataset.command)));";
  const hardenedCommands = "function target(){return activeRepeat?activeRepeat.body:program}function usesRepeat(nodes=program){return nodes.some(n=>n.type==='repeat'||(n.body&&usesRepeat(n.body)))}function addCommand(cmd){if(executing||!cmd)return;if(cmd==='repeat'){const node={type:'repeat',count:2,body:[]};target().push(node);activeRepeat=node}else target().push({type:'cmd',cmd});renderProgram()}document.querySelectorAll('.command').forEach((b)=>{b.draggable=true;b.addEventListener('click',()=>addCommand(b.dataset.command));b.addEventListener('dragstart',(e)=>{if(executing){e.preventDefault();return}e.dataTransfer?.setData('text/apulab-command',b.dataset.command||'');if(e.dataTransfer)e.dataTransfer.effectAllowed='copy'})});programEl.addEventListener('dragover',(e)=>{e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect='copy'});programEl.addEventListener('drop',(e)=>{e.preventDefault();const cmd=e.dataTransfer?.getData('text/apulab-command');if(!cmd)return;activeRepeat=null;addCommand(cmd)});";
  if (!html.includes(commandAnchor)) throw new Error(`mission01_level67_drag_command_anchor_missing:L${level}`);
  html = html.replace(commandAnchor, hardenedCommands);

  const repeatAnchor = "d.onclick=()=>{activeRepeat=node;renderProgram()};draw(node.body,d.querySelector('.repeat-body'))}else{";
  const hardenedRepeat = "d.onclick=()=>{activeRepeat=node;renderProgram()};const repeatBody=d.querySelector('.repeat-body');repeatBody.ondragover=(e)=>{e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect='copy'};repeatBody.ondrop=(e)=>{e.preventDefault();e.stopPropagation();const cmd=e.dataTransfer?.getData('text/apulab-command');if(!cmd)return;activeRepeat=node;addCommand(cmd)};draw(node.body,repeatBody)}else{";
  if (!html.includes(repeatAnchor)) throw new Error(`mission01_level67_drag_repeat_anchor_missing:L${level}`);
  html = html.replace(repeatAnchor, hardenedRepeat);

  await writeFile(path, html, 'utf8');
  console.info(`[mission01] Nivel ${level} · first-frame gate + drag/drop de comandos activos`);
}
