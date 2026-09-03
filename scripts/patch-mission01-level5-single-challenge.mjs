import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const LEVEL5 = resolve(OUT, 'level5.html');
const MANIFEST = resolve(OUT, 'manifest.json');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

function functionRange(source, marker) {
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`mission01_level5_function_missing:${marker}`);
  const open = source.indexOf('{', start + marker.length);
  if (open < 0) throw new Error(`mission01_level5_function_open_missing:${marker}`);
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
  throw new Error(`mission01_level5_function_close_missing:${marker}`);
}

function removeFunction(source, marker) {
  const { start, end } = functionRange(source, marker);
  return source.slice(0, start) + source.slice(end);
}

let html = await readFile(LEVEL5, 'utf8');

// APULAB_LEVEL5_TWO_PHASE_REPEAT_V3
// Flujo pedagógico oficial de N5:
//   1) REPETIR empieza bloqueado. La jugadora resuelve primero la ruta con
//      AVANZAR / GIRAR IZQ. / GIRAR DER.
//   2) Al llegar a la meta se desbloquea REPETIR. La jugadora reorganiza la
//      misma ruta usando el bucle y, al volver a llegar a la meta, completa N5.
// Se elimina la tercera fase legacy que exigía una secuencia interna especial.
for (const marker of [
  "phase==='discover'",
  "phase==='compress'",
  "phase==='sequence'",
  'function unlockRepeat()',
  'function startSequenceStage()',
  'function usesSequenceRepeat(',
  'repeatUnlocked=false',
  "phase='discover'",
  'loadBoardStage(0)',
  '<span id="control-state">BLOQUEADO</span>',
  '<div id="repeat-palette" class="command-block block-repeat" data-kind="repeat" hidden>',
]) {
  if (!html.includes(marker)) throw new Error(`mission01_level5_two_phase_marker_missing:${marker}`);
}

// REPETIR no debe llamar la atención visualmente al desbloquearse. EXPLORAR es
// el único elemento con halo en N1/N3/N5. Se permite remove('is-new') legacy
// porque solo limpia la clase; lo prohibido es añadir/togglear atención.
const unlockRange = functionRange(html, 'function unlockRepeat()');
let unlockBlock = html.slice(unlockRange.start, unlockRange.end);
unlockBlock = unlockBlock
  .replace(/\.classList\.add\((['"])is-new\1\);?/g, '')
  .replaceAll(' is-new', '');
if (!/repeatUnlocked\s*=\s*true/.test(unlockBlock)) throw new Error('mission01_level5_unlock_state_missing');
if (!/phase\s*=\s*['"]compress['"]/.test(unlockBlock)) throw new Error('mission01_level5_compress_phase_missing');
if (/classList\.add\((['"])is-new\1\)|classList\.toggle\((['"])is-new\2\s*,\s*true\)|className\s*=\s*[^;\n]*is-new/.test(unlockBlock)) {
  throw new Error('mission01_level5_repeat_attention_remaining');
}
html = html.slice(0, unlockRange.start) + unlockBlock + html.slice(unlockRange.end);

// El tercer reto legacy (sequence) deja de existir físicamente como función,
// sin depender de dónde esté ordenada esa función en la plantilla histórica.
html = removeFunction(html, 'function startSequenceStage()');
if (html.includes('function startSequenceStage()')) throw new Error('mission01_level5_third_phase_function_remaining');

// El runtime histórico llama usesSequenceRepeat(p=program). La condición correcta
// solo exige que exista REPETIR con al menos UNA instrucción en su cuerpo.
const predicateStart = html.indexOf('function usesSequenceRepeat(');
const predicateEnd = html.indexOf('function serialize(', predicateStart);
if (predicateStart < 0 || predicateEnd < 0) throw new Error('mission01_level5_repeat_predicate_bounds_missing');
const oldPredicate = html.slice(predicateStart, predicateEnd);
let relaxedPredicate = oldPredicate
  .replace(/\.body\.length\s*>=\s*2/g, '.body.length>=1')
  .replace(/\.body\.length\s*>\s*1/g, '.body.length>0');
if (relaxedPredicate === oldPredicate) throw new Error('mission01_level5_repeat_predicate_not_relaxed');
if (/\.body\.length\s*>=\s*2|\.body\.length\s*>\s*1/.test(relaxedPredicate)) {
  throw new Error('mission01_level5_multi_instruction_requirement_remaining');
}
html = html.slice(0, predicateStart) + relaxedPredicate + html.slice(predicateEnd);

// Sustituye discover → compress → sequence por exactamente DOS momentos:
// discover → unlockRepeat() → compress → éxito usando REPETIR.
const phaseStart = html.indexOf("if(phase==='discover'){");
const phaseEndMarker = 'completeLevel()}}';
const phaseEnd = html.indexOf(phaseEndMarker, phaseStart);
if (phaseStart < 0 || phaseEnd < 0) throw new Error('mission01_level5_phase_success_block_missing');
const twoPhaseSuccess = "if(phase==='discover'){unlockRepeat();return}if(!usesSequenceRepeat()){feedback.textContent='Ahora usa REPETIR para organizar la ruta.';showStatus('REPETIR desbloqueado · úsalo para completar el nivel.',2800);return}completeLevel()}";
html = html.slice(0, phaseStart) + twoPhaseSuccess + html.slice(phaseEnd + phaseEndMarker.length);

// Conserva el mensaje inicial aprobado: “La ruta es más larga. Primero hazla
// funcionar; después descubre cómo organizarla.” Solo limpiamos textos de la
// tercera fase que exigían una secuencia interna de dos o más instrucciones.
html = html.replaceAll('OBJETIVO · REPITE UNA PEQUEÑA SECUENCIA', 'OBJETIVO · USA REPETIR PARA ORGANIZAR LA RUTA');
html = html.replaceAll(
  'Ahora construye una ruta usando REPETIR con más de una instrucción dentro.',
  'Ahora vuelve a resolver la ruta usando REPETIR.',
);
html = html.replaceAll(
  'Pista: busca una pequeña secuencia que pueda repetirse.',
  'Pista: observa qué movimientos repetiste en tu primera solución.',
);
html = html.replaceAll(
  'La ruta debe llegar a la meta usando REPETIR con una pequeña secuencia dentro.',
  'La ruta debe llegar a la meta usando REPETIR.',
);
html = html.replaceAll(
  'Usa REPETIR con más de una instrucción dentro.',
  'Usa REPETIR para completar el nivel.',
);

// Contrato final del runtime generado.
if (!html.includes('APULAB_LEVEL5_TWO_PHASE_REPEAT_V3')) {
  const markerAt = html.indexOf('function unlockRepeat()');
  if (markerAt < 0) throw new Error('mission01_level5_unlock_function_missing_after_patch');
  html = html.slice(0, markerAt) + '// APULAB_LEVEL5_TWO_PHASE_REPEAT_V3\n' + html.slice(markerAt);
}
if (!html.includes('repeatUnlocked=false')) throw new Error('mission01_level5_repeat_must_start_locked');
if (!html.includes("phase='discover'")) throw new Error('mission01_level5_discover_must_start');
if (!html.includes('loadBoardStage(0)')) throw new Error('mission01_level5_initial_board_missing');
if (!html.includes('id="control-state">BLOQUEADO')) throw new Error('mission01_level5_control_must_start_locked');
if (!html.includes('id="repeat-palette" class="command-block block-repeat" data-kind="repeat" hidden>')) throw new Error('mission01_level5_repeat_must_start_hidden');
if (html.includes("if(phase==='compress')") || html.includes("if(phase==='sequence')")) throw new Error('mission01_level5_extra_success_phase_remaining');
if (/phase\s*=\s*['"]sequence['"]/.test(html)) throw new Error('mission01_level5_sequence_assignment_remaining');
if (/más de una instrucción|pequeña secuencia dentro/i.test(html)) throw new Error('mission01_level5_old_sequence_copy_remaining');
if (!html.includes("if(phase==='discover'){unlockRepeat();return}")) throw new Error('mission01_level5_unlock_transition_missing');
if (!html.includes("feedback.textContent='Ahora usa REPETIR para organizar la ruta.'")) throw new Error('mission01_level5_repeat_phase_feedback_missing');
if (!html.includes("parent.postMessage({type:'apulab-level-complete',level:5,nextLevel:6}")) throw new Error('mission01_level5_route_to_6_missing');
if (html.includes('startSequenceStage(')) throw new Error('mission01_level5_third_phase_call_remaining');
if (html.includes("document.getElementById('sequence-overlay').classList.add('visible')")) throw new Error('mission01_level5_third_phase_overlay_trigger_remaining');

await writeFile(LEVEL5, html, 'utf8');

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
const entry = (manifest.levels || []).find((x) => Number(x.level) === 5);
if (!entry) throw new Error('mission01_level5_manifest_entry_missing');
entry.bytes = Buffer.byteLength(html, 'utf8');
entry.sha256 = hash(html);
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.info('[mission01] Nivel 5 · 2 fases · resuelve ruta → desbloquea REPETIR → resuelve con REPETIR → Nivel 6');
