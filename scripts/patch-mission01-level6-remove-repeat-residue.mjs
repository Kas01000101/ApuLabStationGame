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

// level_started no puede depender de que el listener se registre antes de load.
// La inicialización es idempotente y cubre tanto documentos aún cargando como
// documentos cuyo evento load ya ocurrió cuando termina de evaluarse el runtime.
const oldTelemetryInit = "window.addEventListener('load',()=>{emitLevel6Event('level_started',{elapsed_ms:0});document.getElementById('guide-btn')?.addEventListener('click',()=>{level6HelpCount+=1;emitLevel6Event('help_requested',{source:'guide',help_count:level6HelpCount,elapsed_ms:level6Elapsed()})});document.getElementById('explore-btn')?.addEventListener('click',()=>{level6HelpCount+=1;emitLevel6Event('help_requested',{source:'explore',help_count:level6HelpCount,elapsed_ms:level6Elapsed()})})},{once:true})";
const telemetryInit = "let __apulabLevel6TelemetryInitialized=false;function __apulabInitLevel6Telemetry(){if(__apulabLevel6TelemetryInitialized)return;__apulabLevel6TelemetryInitialized=true;emitLevel6Event('level_started',{elapsed_ms:0});document.getElementById('guide-btn')?.addEventListener('click',()=>{level6HelpCount+=1;emitLevel6Event('help_requested',{source:'guide',help_count:level6HelpCount,elapsed_ms:level6Elapsed()})});document.getElementById('explore-btn')?.addEventListener('click',()=>{level6HelpCount+=1;emitLevel6Event('help_requested',{source:'explore',help_count:level6HelpCount,elapsed_ms:level6Elapsed()})})}if(document.readyState==='complete')__apulabInitLevel6Telemetry();else window.addEventListener('load',__apulabInitLevel6Telemetry,{once:true})";
if (!html.includes(oldTelemetryInit)) fail('telemetry_init_source_missing');
html = html.replace(oldTelemetryInit, telemetryInit);

if (/(?:^|\n)\s*async\s*(?:\n|$)/.test(html)) fail('orphan_async');
if (html.includes('APULAB_LEVEL5_TWO_PHASE_REPEAT_V3')) fail('level5_marker_remaining');
for (const token of ['function handleRunSuccess()', 'function unlockRepeat()', 'id="unlock-overlay"', 'Usa REPETIR para']) {
  if (html.includes(token)) fail(`repeat_tutorial_remaining:${token}`);
}
if (!html.includes("if(!scienceScanned||!scienceAnalyzed||!scienceSent||!atCommunicationPoint())")) fail('final_communication_position_missing');
for (const token of [
  '__apulabLevel6TelemetryInitialized=false',
  "if(document.readyState==='complete')__apulabInitLevel6Telemetry()",
  "emitLevel6Event('level_started',{elapsed_ms:0})",
]) if (!html.includes(token)) fail(`telemetry_init_missing:${token}`);
if (html.includes("window.addEventListener('load',()=>{emitLevel6Event('level_started'")) fail('fragile_telemetry_init_remaining');

await writeFile(LEVEL6, html, 'utf8');
console.info('[mission01] N6 final cleanup OK · sin tutorial N5 · cierre en comunicación · telemetría inicial idempotente');
