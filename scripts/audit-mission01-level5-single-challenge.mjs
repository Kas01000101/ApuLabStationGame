import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const html = await readFile(resolve(process.cwd(), 'public/missions/mission01/level5.html'), 'utf8');
const fail = (code) => { throw new Error(`mission01_level5_single_challenge:${code}`); };

if (!html.includes('APULAB_LEVEL5_SINGLE_CHALLENGE_V2')) fail('marker');
if (html.includes("if(phase==='discover')") || html.includes("if(phase==='compress')") || html.includes("if(phase==='sequence')")) fail('staged_success_flow');
if (html.includes('repeatUnlocked=false')) fail('repeat_relocks');
if (html.includes("phase='discover'")) fail('discover_assignment');
if (html.includes('loadBoardStage(0)')) fail('old_board_stage');
if (!html.includes('id="control-state">DESBLOQUEADO')) fail('control_locked');
if (!html.includes('id="repeat-palette" class="command-block block-repeat" data-kind="repeat">')) fail('repeat_hidden');
if (/id="repeat-palette"[^>]*\bis-new\b/.test(html)) fail('repeat_attention_animation');
if (!html.includes('function usesSequenceRepeat()')) fail('repeat_predicate_missing');
if (/más de una instrucción|pequeña secuencia dentro/i.test(html)) fail('multi_instruction_copy');
if (!html.includes("feedback.textContent='Usa REPETIR para resolver la ruta.'")) fail('basic_repeat_feedback');
if (!html.includes("parent.postMessage({type:'apulab-level-complete',level:5,nextLevel:6}")) fail('route_5_6');

const predicateStart = html.indexOf('function usesSequenceRepeat()');
const predicateEnd = html.indexOf('function ', predicateStart + 'function usesSequenceRepeat()'.length);
if (predicateStart < 0 || predicateEnd < 0) fail('repeat_predicate_bounds');
const predicate = html.slice(predicateStart, predicateEnd);
if (/\.length\s*>=\s*2|\.length\s*>\s*1/.test(predicate)) fail('multi_instruction_requirement');
if (!/\.length\s*>=\s*1|\.length\s*>\s*0/.test(predicate)) fail('single_instruction_repeat_not_allowed');

const stagedOverlayTriggers = [
  "document.getElementById('unlock-overlay').classList.add('visible')",
  "document.getElementById('sequence-overlay').classList.add('visible')",
];
for (const trigger of stagedOverlayTriggers) {
  const at = html.indexOf(trigger);
  const directSuccessAt = html.indexOf("if(!usesSequenceRepeat())");
  if (at >= 0 && directSuccessAt >= 0 && at < directSuccessAt) fail('overlay_before_direct_success');
}

console.info('[mission01] LEVEL 5 FLOW OK · un reto · solo exige usar REPETIR · una instrucción dentro es suficiente → Nivel 6');
