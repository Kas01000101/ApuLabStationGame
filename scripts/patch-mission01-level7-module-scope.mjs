import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const LEVEL7 = resolve(process.cwd(), 'public/missions/mission01/level7.html');
const fail = (code) => { throw new Error(`mission01_level7_module_scope:${code}`); };
let html = await readFile(LEVEL7, 'utf8');

if (!html.includes('APULAB_LEVEL7_INSTRUMENT_UI_V2')) fail('instrument_bridge_missing');
if (!html.includes('<script type="module">')) fail('module_script_missing');

// V2 heredó el bridge de UI dentro de un <script> clásico añadido después del
// módulo principal. renderProgram/useInstrument/etc. viven en el scope del
// módulo y no son globals; referenciarlos desde el script clásico produce un
// ReferenceError. Eliminamos ese bridge cross-scope y lo reinstalamos dentro
// del mismo módulo que posee el editor y el estado científico.
const legacyStart = html.indexOf('// APULAB_LEVEL7_INSTRUMENT_UI_V2');
const legacyEnd = html.indexOf('</script>', legacyStart);
if (legacyStart < 0 || legacyEnd < 0) fail('legacy_bridge_range');
const legacyBlock = html.slice(legacyStart, legacyEnd);
if (!legacyBlock.includes('const __l7RenderProgram=renderProgram')) fail('legacy_render_wrapper_missing');
html = html.slice(0, legacyStart) + '// APULAB_LEVEL7_INSTRUMENT_UI_V2_MOVED_TO_MODULE\n' + html.slice(legacyEnd);

const moduleCloseAnchor = "try { parent.postMessage({type:'apulab-level-ready', level:7}, '*'); } catch (_) {}\n\n</script>";
if (!html.includes(moduleCloseAnchor)) fail('module_close_anchor_missing');

const moduleBridge = `try { parent.postMessage({type:'apulab-level-ready', level:7}, '*'); } catch (_) {}

// APULAB_LEVEL7_MODULE_SCOPE_BRIDGE_V1
window.apulabLevel7UseInstrument=(id)=>useInstrument(id);
window.apulabLevel7ChangeInstrument=()=>changeInstrument();
window.apulabLevel7ContinueAnalysis=()=>continueRelevantAnalysis();
const __l7RenderProgram=renderProgram;
renderProgram=function(...args){const result=__l7RenderProgram(...args);if(!executing)queueMicrotask(()=>recordProgramMutation('editor'));return result};
document.getElementById('clear-btn')?.addEventListener('click',()=>{resetLevel7ScienceState();queueMicrotask(()=>recordProgramMutation('clear'))},true);
document.getElementById('explore-btn')?.addEventListener('click',()=>{helpCount+=1;if(!relevantInstrumentUsed)helpBeforeRelevantChoice=true;recordLevel7Event('help_requested',{help_type:'explore',help_count:helpCount})});
lastProgramSignature=JSON.stringify(serialize(program));
recordLevel7Event('level_started',{question:'¿De qué material está hecha la muestra?'});
window.apulabLevel7QA={getState:()=>({sampleCheckpointReached,selectedInstrument,firstInstrument,finalInstrument,sampleAnalyzed,relevantInstrumentUsed,instrumentSelectionCount,instrumentChangeCount,helpCount,attemptCount,finalCheckpointReached,programEditCount,hadIrrelevantFeedback,changedAfterIrrelevantFeedback,atSample:isAdjacentToSample(),atFinal:atFinalCheckpoint(),...repeatMetrics()}),useInstrument,changeInstrument,continueRelevantAnalysis};

</script>`;
html = html.replace(moduleCloseAnchor, moduleBridge);

const moduleStart = html.indexOf('<script type="module">');
const moduleEnd = html.indexOf('</script>', moduleStart);
const moduleText = html.slice(moduleStart, moduleEnd);
const movedMarker = html.indexOf('// APULAB_LEVEL7_INSTRUMENT_UI_V2_MOVED_TO_MODULE');
if (!moduleText.includes('APULAB_LEVEL7_MODULE_SCOPE_BRIDGE_V1')) fail('module_bridge_not_inside_module');
if (!moduleText.includes('const __l7RenderProgram=renderProgram')) fail('render_wrapper_not_inside_module');
if (!moduleText.includes('window.apulabLevel7UseInstrument=(id)=>useInstrument(id)')) fail('instrument_export_not_inside_module');
if (movedMarker < moduleEnd) fail('legacy_marker_still_inside_module');
const afterModule = html.slice(moduleEnd);
if (/const __l7RenderProgram\s*=\s*renderProgram/.test(afterModule)) fail('cross_scope_render_reference_remaining');
if (/=>useInstrument\(id\)/.test(afterModule)) fail('cross_scope_instrument_reference_remaining');

await writeFile(LEVEL7, html, 'utf8');
console.info('[mission01] N7 module scope OK · editor/instrument bridge lives with runtime state · no cross-script ReferenceError');
