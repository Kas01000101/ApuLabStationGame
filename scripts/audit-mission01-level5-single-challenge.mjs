import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const html = await readFile(resolve(process.cwd(), 'public/missions/mission01/level5.html'), 'utf8');
const fail = (code) => { throw new Error(`mission01_level5_two_phase:${code}`); };

function functionRange(source, marker) {
  const start = source.indexOf(marker);
  if (start < 0) fail(`function_missing:${marker}`);
  const open = source.indexOf('{', start + marker.length);
  if (open < 0) fail(`function_open_missing:${marker}`);

  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}' && --depth === 0) return { start, end: i + 1 };
  }
  fail(`function_close_missing:${marker}`);
}

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

// No debe sobrevivir ninguna vía CSS capaz de hacer pulsar REPETIR. Esto evita
// que el brillo vuelva aunque un residuo legacy reintroduzca accidentalmente is-new.
if (/repeatUnlock/i.test(html)) fail('repeat_unlock_keyframes_present');
if (/\.block-repeat\.is-new\s*\{[^}]*animation/i.test(html)) fail('repeat_unlock_css_present');
if (/<div id="repeat-palette"[^>]*\bis-new\b/i.test(html)) fail('repeat_palette_attention_class_present');

// El desbloqueo se inspecciona por límites reales de la función, sin depender
// del orden de las funciones dentro del HTML legacy generado.
const unlockRange = functionRange(html, 'function unlockRepeat()');
const unlockBlock = html.slice(unlockRange.start, unlockRange.end);
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
const predicateRange = functionRange(html, 'function usesSequenceRepeat(');
const predicate = html.slice(predicateRange.start, predicateRange.end);
if (/\.body\.length\s*>=\s*2|\.body\.length\s*>\s*1/.test(predicate)) fail('multi_instruction_requirement');
if (!/\.body\.length\s*>=\s*1|\.body\.length\s*>\s*0/.test(predicate)) fail('single_instruction_repeat_not_allowed');
if (/más de una instrucción|pequeña secuencia dentro/i.test(html)) fail('multi_instruction_copy');
if (!html.includes("feedback.textContent='Ahora usa REPETIR para organizar la ruta.'")) fail('repeat_phase_feedback');

// Después de resolver con REPETIR, N5 termina y navega a N6.
if (!html.includes("parent.postMessage({type:'apulab-level-complete',level:5,nextLevel:6}")) fail('route_5_6');

console.info('[mission01] LEVEL 5 FLOW OK · 2 fases · REPETIR sin brillo · ruta sin REPETIR → desbloqueo → ruta con REPETIR → Nivel 6');
