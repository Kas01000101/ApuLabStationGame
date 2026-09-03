import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const LEVEL5 = resolve(OUT, 'level5.html');
const MANIFEST = resolve(OUT, 'manifest.json');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

let html = await readFile(LEVEL5, 'utf8');

// APULAB_LEVEL5_SINGLE_CHALLENGE_V1
// El legacy dividía N5 en tres fases consecutivas: discover -> compress -> sequence.
// Desde UX se percibían como varios niveles. N5 ahora presenta REPETIR desde el
// inicio y se completa una sola vez al llegar a la meta usando un bucle con una
// pequeña secuencia interna.
for (const marker of ["phase==='discover'", "phase==='compress'", "phase==='sequence'", 'function unlockRepeat()', 'function startSequenceStage()']) {
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

const phaseStart = html.indexOf("if(phase==='discover'){");
const phaseEndMarker = 'completeLevel()}}';
const phaseEnd = html.indexOf(phaseEndMarker, phaseStart);
if (phaseStart < 0 || phaseEnd < 0) throw new Error('mission01_level5_phase_success_block_missing');

const directSuccess = "if(!usesSequenceRepeat()){feedback.textContent='La ruta debe llegar a la meta usando REPETIR con una pequeña secuencia dentro.';showStatus('Usa REPETIR con más de una instrucción dentro.',2800);return}completeLevel()}";
html = html.slice(0, phaseStart) + directSuccess + html.slice(phaseEnd + phaseEndMarker.length);

const unlockFunctionAt = html.indexOf('function unlockRepeat()');
if (unlockFunctionAt < 0) throw new Error('mission01_level5_unlock_function_missing_after_patch');
html = html.slice(0, unlockFunctionAt) + '// APULAB_LEVEL5_SINGLE_CHALLENGE_V1\n' + html.slice(unlockFunctionAt);

if (html.includes("if(phase==='discover')") || html.includes("if(phase==='compress')") || html.includes("if(phase==='sequence')")) {
  throw new Error('mission01_level5_staged_success_flow_remaining');
}
if (html.includes('repeatUnlocked=false')) throw new Error('mission01_level5_repeat_can_relock');
if (html.includes("phase='discover'")) throw new Error('mission01_level5_discover_assignment_remaining');
if (html.includes('loadBoardStage(0)')) throw new Error('mission01_level5_old_board_stage_remaining');
if (!html.includes('id="control-state">DESBLOQUEADO')) throw new Error('mission01_level5_control_not_unlocked');
if (!html.includes('id="repeat-palette" class="command-block block-repeat" data-kind="repeat">')) throw new Error('mission01_level5_repeat_not_visible');
if (/id="repeat-palette"[^>]*\bis-new\b/.test(html)) throw new Error('mission01_level5_repeat_attention_animation_present');
if (!html.includes("parent.postMessage({type:'apulab-level-complete',level:5,nextLevel:6}")) throw new Error('mission01_level5_route_to_6_missing');
if (!html.includes('usesSequenceRepeat()')) throw new Error('mission01_level5_sequence_repeat_requirement_missing');

await writeFile(LEVEL5, html, 'utf8');

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
const entry = (manifest.levels || []).find((x) => Number(x.level) === 5);
if (!entry) throw new Error('mission01_level5_manifest_entry_missing');
entry.bytes = Buffer.byteLength(html, 'utf8');
entry.sha256 = hash(html);
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.info('[mission01] Nivel 5 · reto único · REPETIR disponible sin animación de atención · meta → Nivel 6');
