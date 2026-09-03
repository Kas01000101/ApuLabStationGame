import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const LEVEL5 = resolve(OUT, 'level5.html');
const MANIFEST = resolve(OUT, 'manifest.json');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

let html = await readFile(LEVEL5, 'utf8');

// APULAB_LEVEL5_SINGLE_CHALLENGE_V2
// N5 enseña un único concepto nuevo: usar REPETIR. No exige una secuencia
// de dos o más instrucciones dentro del bucle; basta usar REPETIR correctamente
// con al menos una instrucción para llegar a la meta.
for (const marker of ["phase==='discover'", "phase==='compress'", "phase==='sequence'", 'function unlockRepeat()', 'function startSequenceStage()', 'function usesSequenceRepeat(']) {
  if (!html.includes(marker)) throw new Error(`mission01_level5_phase_marker_missing:${marker}`);
}

if (!html.includes('repeatUnlocked=false')) throw new Error('mission01_level5_repeat_locked_state_missing');
html = html.replaceAll('repeatUnlocked=false', 'repeatUnlocked=true');
html = html.replaceAll("phase='discover'", "phase='sequence'");
html = html.replaceAll('loadBoardStage(0)', 'loadBoardStage(1)');

html = html.replace(
  '<span id="control-state">BLOQUEADO</span>',
  '<span id="control-state">DESBLOQUEADO</span>',
);
html = html.replace(
  '<div id="control-locked" class="control-locked">🔒 Primero haz que la ruta funcione con los comandos que ya conoces.</div>',
  '<div id="control-locked" class="control-locked hidden">REPETIR está disponible desde el inicio.</div>',
);
html = html.replace(
  '<div id="repeat-palette" class="command-block block-repeat" data-kind="repeat" hidden>',
  '<div id="repeat-palette" class="command-block block-repeat" data-kind="repeat">',
);

// El runtime real declara usesSequenceRepeat(p=program). Cambiamos únicamente
// el requisito del cuerpo del bucle: body.length > 1 pasa a body.length > 0.
const predicateToken = 'function usesSequenceRepeat(';
const predicateStart = html.indexOf(predicateToken);
const predicateEnd = html.indexOf('function serialize(', predicateStart);
if (predicateStart < 0 || predicateEnd < 0) throw new Error('mission01_level5_repeat_predicate_bounds_missing');
const oldPredicate = html.slice(predicateStart, predicateEnd);
let relaxedPredicate = oldPredicate
  .replace(/\.body\.length\s*>=\s*2/g, '.body.length>=1')
  .replace(/\.body\.length\s*>\s*1/g, '.body.length>0');
if (relaxedPredicate === oldPredicate) {
  throw new Error('mission01_level5_repeat_predicate_not_relaxed');
}
if (/\.body\.length\s*>=\s*2|\.body\.length\s*>\s*1/.test(relaxedPredicate)) {
  throw new Error('mission01_level5_multi_instruction_requirement_remaining');
}
html = html.slice(0, predicateStart) + relaxedPredicate + html.slice(predicateEnd);

const phaseStart = html.indexOf("if(phase==='discover'){");
const phaseEndMarker = 'completeLevel()}}';
const phaseEnd = html.indexOf(phaseEndMarker, phaseStart);
if (phaseStart < 0 || phaseEnd < 0) throw new Error('mission01_level5_phase_success_block_missing');

const directSuccess = "if(!usesSequenceRepeat()){feedback.textContent='Usa REPETIR para resolver la ruta.';showStatus('Usa REPETIR para completar el nivel.',2800);return}completeLevel()}";
html = html.slice(0, phaseStart) + directSuccess + html.slice(phaseEnd + phaseEndMarker.length);

const unlockFunctionAt = html.indexOf('function unlockRepeat()');
if (unlockFunctionAt < 0) throw new Error('mission01_level5_unlock_function_missing_after_patch');
html = html.slice(0, unlockFunctionAt) + '// APULAB_LEVEL5_SINGLE_CHALLENGE_V2\n' + html.slice(unlockFunctionAt);

if (html.includes("if(phase==='discover')") || html.includes("if(phase==='compress')") || html.includes("if(phase==='sequence')")) {
  throw new Error('mission01_level5_staged_success_flow_remaining');
}
if (html.includes('repeatUnlocked=false')) throw new Error('mission01_level5_repeat_can_relock');
if (html.includes("phase='discover'")) throw new Error('mission01_level5_discover_assignment_remaining');
if (html.includes('loadBoardStage(0)')) throw new Error('mission01_level5_old_board_stage_remaining');
if (!html.includes('id="control-state">DESBLOQUEADO')) throw new Error('mission01_level5_control_not_unlocked');
if (!html.includes('id="repeat-palette" class="command-block block-repeat" data-kind="repeat">')) throw new Error('mission01_level5_repeat_not_visible');
if (/id="repeat-palette"[^>]*\bis-new\b/.test(html)) throw new Error('mission01_level5_repeat_attention_animation_present');
if (/más de una instrucción|pequeña secuencia dentro/i.test(html)) throw new Error('mission01_level5_old_sequence_copy_remaining');
if (!html.includes("parent.postMessage({type:'apulab-level-complete',level:5,nextLevel:6}")) throw new Error('mission01_level5_route_to_6_missing');

await writeFile(LEVEL5, html, 'utf8');

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
const entry = (manifest.levels || []).find((x) => Number(x.level) === 5);
if (!entry) throw new Error('mission01_level5_manifest_entry_missing');
entry.bytes = Buffer.byteLength(html, 'utf8');
entry.sha256 = hash(html);
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.info('[mission01] Nivel 5 · un reto · solo exige usar REPETIR · REPETIR sin animación · meta → Nivel 6');
