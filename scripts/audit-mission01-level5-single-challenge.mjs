import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const html = await readFile(resolve(process.cwd(), 'public/missions/mission01/level5.html'), 'utf8');
const fail = (code) => { throw new Error(`mission01_level5_two_phase:${code}`); };

if (!html.includes('APULAB_LEVEL5_TWO_PHASE_REPEAT_V3')) fail('marker');

// Fase 1: REPETIR debe empezar realmente bloqueado/oculto.
if (!html.includes('repeatUnlocked=false')) fail('repeat_not_initially_locked');
if (!html.includes("phase='discover'")) fail('discover_not_initial_phase');
if (!html.includes('loadBoardStage(0)')) fail('initial_board_missing');
if (!html.includes('id="control-state">BLOQUEADO')) fail('control_not_locked');
const repeatTag = html.match(/<div id="repeat-palette"[^>]*>/)?.[0] || '';
if (!repeatTag) fail('repeat_palette_missing');
if (!/\shidden(?:\s|>)/.test(repeatTag)) fail('repeat_not_hidden_initially');
if (/\bis-new\b|apulab-explore-glow|apulabAttention/i.test(repeatTag)) fail('repeat_initial_attention_present');

// El desbloqueo debe existir. Se permite remove('is-new') porque solo limpia un
// residuo legacy; está prohibido añadir o activar atención sobre REPETIR.
const unlockStart = html.indexOf('function unlockRepeat()');
const predicateStart = html.indexOf('function usesSequenceRepeat(', unlockStart);
if (unlockStart < 0 || predicateStart < 0) fail('unlock_bounds');
const unlockBlock = html.slice(unlockStart, predicateStart);
if (!/repeatUnlocked\s*=\s*true/.test(unlockBlock)) fail('unlock_state_missing');
if (!/phase\s*=\s*['"]compress['"]/.test(unlockBlock)) fail('compress_phase_missing');
if (/classList\.add\((['"])is-new\1\)|classList\.toggle\((['"])is-new\2\s*,\s*true\)|className\s*=\s*[^;\n]*is-new|apulab-explore-glow|apulabAttention/i.test(unlockBlock)) fail('repeat_unlock_attention_present');

// Exactamente dos momentos: discover → unlock → compress → éxito.
if (!html.includes("if(phase==='discover'){unlockRepeat();return}")) fail('discover_to_unlock_missing');
if (!html.includes("if(!usesSequenceRepeat())")) fail('repeat_success_gate_missing');
if (html.includes("if(phase==='compress')")) fail('compress_subchallenge_present');
if (html.includes("if(phase==='sequence')")) fail('sequence_subchallenge_present');
if (/phase\s*=\s*['"]sequence['"]/.test(html)) fail('sequence_assignment_present');
if (html.includes('function startSequenceStage()')) fail('third_phase_function_present');
if (html.includes("document.getElementById('sequence-overlay').classList.add('visible')")) fail('third_phase_overlay_trigger_present');

// Usar REPETIR es obligatorio, pero UNA instrucción dentro es suficiente.
const repeatPredicateStart = html.indexOf('function usesSequenceRepeat(');
const repeatPredicateEnd = html.indexOf('function serialize(', repeatPredicateStart);
if (repeatPredicateStart < 0 || repeatPredicateEnd < 0) fail('repeat_predicate_bounds');
const predicate = html.slice(repeatPredicateStart, repeatPredicateEnd);
if (/\.body\.length\s*>=\s*2|\.body\.length\s*>\s*1/.test(predicate)) fail('multi_instruction_requirement');
if (!/\.body\.length\s*>=\s*1|\.body\.length\s*>\s*0/.test(predicate)) fail('single_instruction_repeat_not_allowed');
if (/más de una instrucción|pequeña secuencia dentro/i.test(html)) fail('multi_instruction_copy');
if (!html.includes("feedback.textContent='Ahora usa REPETIR para organizar la ruta.'")) fail('repeat_phase_feedback');

// Después de resolver con REPETIR, N5 termina y navega a N6.
if (!html.includes("parent.postMessage({type:'apulab-level-complete',level:5,nextLevel:6}")) fail('route_5_6');

console.info('[mission01] LEVEL 5 FLOW OK · 2 fases · ruta sin REPETIR → desbloqueo → ruta con REPETIR → Nivel 6');
