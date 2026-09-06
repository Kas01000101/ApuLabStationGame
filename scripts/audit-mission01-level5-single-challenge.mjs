import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const html = await readFile(resolve(process.cwd(), 'public/missions/mission01/level5.html'), 'utf8');
const fail = (code) => { throw new Error(`mission01_level5_two_phase:${code}`); };

if (!html.includes('APULAB_LEVEL5_FINAL_LOOPS_V1')) fail('final_marker');
if (!/repeatUnlocked\s*=\s*false/.test(html)) fail('repeat_not_initially_locked');
if (!/id="repeat-palette"[^>]*\shidden\b/.test(html)) fail('repeat_not_hidden_initially');
if (!html.includes("phase='discover'")) fail('discover_not_initial_phase');
if (html.includes('id="guide-btn"')) fail('top_guide_returned');
if (!html.includes('data-testid="level5-guide"')) fail('fixed_guide_missing');
if ((html.match(/class="level5-guide-node"/g) || []).length !== 4) fail('fixed_guide_not_four_steps');

if (!html.includes("if(phase==='discover'){await level5HandleFirstGoal();return}level5HandleFinalGoal()")) fail('first_then_refactor_gate');
if (!html.includes('initial_program_completed')) fail('initial_program_event_missing');
if (!html.includes('pattern_highlighted')) fail('pattern_event_missing');
if (!html.includes('repeat_unlocked')) fail('repeat_unlock_event_missing');
if (!html.includes("if(!level5State.repeatUsed)")) fail('repeat_not_required_at_end');
if (!html.includes('count>=level5State.initialBlockCount')) fail('shorter_program_not_required');
if (!html.includes("parent.postMessage({type:'apulab-level-complete',level:5,nextLevel:6}")) fail('route_5_6');
if (!html.includes("document.getElementById('run-btn').onclick=runProgram")) fail('run_listener_missing');

for (const forbidden of ['phase=\'sequence\'','startSequenceStage','id="sequence-overlay"','más de una instrucción','pequeña secuencia dentro']) {
  if (html.includes(forbidden)) fail(`legacy:${forbidden}`);
}

console.info('[mission01] LEVEL 5 FLOW OK · solución larga sin REPETIR → patrón → desbloqueo → solución más corta con REPETIR → Nivel 6');
