import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const html = await readFile(resolve(process.cwd(), 'public/missions/mission01/level5.html'), 'utf8');
const fail = (code) => { throw new Error(`mission01_level5_single_challenge:${code}`); };

if (!html.includes('APULAB_LEVEL5_SINGLE_CHALLENGE_V1')) fail('marker');
if (html.includes("if(phase==='discover')") || html.includes("if(phase==='compress')") || html.includes("if(phase==='sequence')")) fail('staged_success_flow');
if (html.includes('repeatUnlocked=false')) fail('repeat_relocks');
if (html.includes("phase='discover'")) fail('discover_assignment');
if (html.includes('loadBoardStage(0)')) fail('old_board_stage');
if (!html.includes('id="control-state">DESBLOQUEADO')) fail('control_locked');
if (!html.includes('id="repeat-palette" class="command-block block-repeat is-new"')) fail('repeat_hidden');
if (!html.includes('usesSequenceRepeat()')) fail('sequence_repeat_requirement');
if (!html.includes("parent.postMessage({type:'apulab-level-complete',level:5,nextLevel:6}")) fail('route_5_6');

const stagedOverlayTriggers = [
  "document.getElementById('unlock-overlay').classList.add('visible')",
  "document.getElementById('sequence-overlay').classList.add('visible')",
];
for (const trigger of stagedOverlayTriggers) {
  const at = html.indexOf(trigger);
  const directSuccessAt = html.indexOf("if(!usesSequenceRepeat())");
  if (at >= 0 && directSuccessAt >= 0 && at < directSuccessAt) fail('overlay_before_direct_success');
}

console.info('[mission01] LEVEL 5 FLOW OK · un reto de bucle → completar una vez → Nivel 6');
