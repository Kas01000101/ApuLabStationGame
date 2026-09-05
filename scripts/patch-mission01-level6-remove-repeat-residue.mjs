import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const LEVEL6 = resolve(process.cwd(), 'public/missions/mission01/level6.html');
const fail = (code) => { throw new Error(`mission01_level6_repeat_residue:${code}`); };
let html = await readFile(LEVEL6, 'utf8');

// handleRunSuccess() era async en N5. El hardening elimina la función completa;
// este cleanup impide que el prefijo `async` o el marcador pedagógico de N5
// sobrevivan en el runtime de N6.
html = html
  .replace(/\n\s*async\s*\n\s*\/\/ APULAB_LEVEL5_TWO_PHASE_REPEAT_V3\s*\n/g, '\n')
  .replaceAll('// APULAB_LEVEL5_TWO_PHASE_REPEAT_V3', '');

// El criterio final exige terminar físicamente en el punto de comunicación.
// Haber enviado antes y luego alejarse no debe completar el nivel.
const oldCompletionGuard = "if(!scienceScanned||!scienceAnalyzed||!scienceSent){feedback.textContent='Completa el proceso: OBTENER → INTERPRETAR → COMUNICAR.';showStatus('Todavía falta una parte de la investigación.',2200);setEditing(true);return}";
const newCompletionGuard = "if(!scienceScanned||!scienceAnalyzed||!scienceSent||!atCommunicationPoint()){if(scienceSent&&!atCommunicationPoint()){feedback.textContent='AYNI debe finalizar en el punto de comunicación.';showStatus('Vuelve al punto de comunicación para cerrar la misión.',2200)}else{feedback.textContent='Completa el proceso: OBTENER → INTERPRETAR → COMUNICAR.';showStatus('Todavía falta una parte de la investigación.',2200)}setEditing(true);return}";
if (!html.includes(oldCompletionGuard)) fail('completion_guard_source_missing');
html = html.replace(oldCompletionGuard, newCompletionGuard);

if (/(?:^|\n)\s*async\s*(?:\n|$)/.test(html)) fail('orphan_async');
if (html.includes('APULAB_LEVEL5_TWO_PHASE_REPEAT_V3')) fail('level5_marker_remaining');
for (const token of ['function handleRunSuccess()', 'function unlockRepeat()', 'id="unlock-overlay"', 'Usa REPETIR para']) {
  if (html.includes(token)) fail(`repeat_tutorial_remaining:${token}`);
}
if (!html.includes("if(!scienceScanned||!scienceAnalyzed||!scienceSent||!atCommunicationPoint())")) fail('final_communication_position_missing');

await writeFile(LEVEL6, html, 'utf8');
console.info('[mission01] N6 repeat residue cleanup OK · sin async huérfano · sin tutorial N5 · cierre exige punto de comunicación');
