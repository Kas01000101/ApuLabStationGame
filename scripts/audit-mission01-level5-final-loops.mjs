import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const html = await readFile(resolve(process.cwd(), 'public/missions/mission01/level5.html'), 'utf8');
const fail = (code) => { throw new Error(`mission01_level5_final_loops_audit:${code}`); };

for (const token of [
  'APULAB_LEVEL5_FINAL_LOOPS_V1',
  '<div class="title">SIMPLIFICAR</div>',
  'RECONOCE UN PATRÓN Y USA REPETIR PARA ACORTAR TU PROGRAMA.',
  'data-testid="level5-guide"',
  'data-testid="level5-guide-step-1"',
  'data-testid="level5-guide-step-4"',
  'GUÍA · <span>REPETIR</span>',
  'PASO 1 · LLEVA AYNI HASTA LA BANDERA',
  'PASO 2 · OBSERVA QUÉ ACCIONES SE REPITEN',
  'PASO 3 · USA REPETIR PARA AGRUPARLAS',
  'PASO 4 · VUELVE A PROBAR EL PROGRAMA',
  'goalTileMat', 'flagPole', 'flagGroup.position.set(gp.x,.22,gp.z)',
  'level5HandleFirstGoal', 'level5HandleFinalGoal',
  'level5ExecutableBlockCount', 'level5UsesRepeat', 'level5PatternRuns',
  'window.apulabLevel5QA=',
  'initial_program_completed', 'pattern_highlighted', 'repeat_unlocked',
  'repeat_added', 'repeat_count_changed', 'block_moved_into_repeat',
  'program_refactored', 'goal_reached', 'level_completed',
]) if (!html.includes(token)) fail(`missing:${token}`);

for (const forbidden of [
  'id="guide-btn"',
  'id="apulab-repeat-arrow"',
  '#apulab-repeat-arrow',
  'SENSOR DE TEMPERATURA', 'SENSOR DE PROXIMIDAD', 'ANALIZADOR DE MATERIALES',
  'ESCANEAR', 'ANALIZAR MUESTRA', 'ENVIAR DATOS', 'PUNTO DE ESTUDIO', 'PUNTO DE COMUNICACIÓN',
]) if (html.includes(forbidden)) fail(`forbidden:${forbidden}`);

if (!/repeatUnlocked\s*=\s*false/.test(html)) fail('repeat_not_locked_initially');
if (!/id="repeat-palette"[^>]*\shidden\b/.test(html)) fail('repeat_not_hidden_initially');
if (!html.includes("if(phase==='discover'){await level5HandleFirstGoal();return}level5HandleFinalGoal()")) fail('two_stage_success_gate');
if (!html.includes("if(!level5State.repeatUsed)")) fail('repeat_required_final');
if (!html.includes("count>=level5State.initialBlockCount")) fail('shorter_program_required');
if (!html.includes("localStorage.setItem('apulab.repeat.learned','1')")) fail('repeat_progress_not_persisted');

const explore = html.match(/const exploreSteps=([^;]+);/)?.[1] || '';
if ((explore.match(/"title"/g) || []).length !== 2) fail('explore_not_exactly_two');
const guideNodes = (html.match(/class="level5-guide-node"/g) || []).length;
if (guideNodes !== 4) fail(`guide_nodes:${guideNodes}`);

console.info('[mission01] N5 FINAL LOOPS AUDIT OK · first long solution · pattern recognition · REPETIR unlock · shorter second solution · no science · fixed 4-step guide');
