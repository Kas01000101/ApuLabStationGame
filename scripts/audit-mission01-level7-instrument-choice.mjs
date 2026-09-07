import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const path = resolve(process.cwd(), 'public/missions/mission01/level7.html');
const html = await readFile(path, 'utf8');
const fail = (code) => { throw new Error(`mission01_level7_instrument_choice_audit:${code}`); };

for (const token of [
  'APULAB_LEVEL7_FROM_LEVEL5_V1','APULAB_LEVEL7_INSTRUMENT_UI_V2','APULAB_LEVEL7_FINAL_GDD_V1','APULAB_LEVEL7_FINAL_HARDENING_V1',
  'data-apulab-level="7"','width:1672px;height:941px','data-testid="block-analyze-sample"',
  'data-testid="level7-guide"','data-testid="level7-sample-checkpoint"','data-testid="level7-final-checkpoint"',
  'LA MUESTRA DESCONOCIDA','ELIGE EL INSTRUMENTO SEGÚN EL DATO QUE NECESITAS.','MUESTRA DESCONOCIDA','PUNTO DE COMUNICACIÓN',
  'ANALIZAR MUESTRA','data-command="send"','ENVIAR DATOS','TEMPERATURA','PROXIMIDAD','ANALIZADOR DE MATERIALES','CAMBIAR INSTRUMENTO',
  '−58 °C','0.4 m','HIERRO','SILICATOS',
  'sample_reached','sample_analyze_requested','instrument_modal_opened','instrument_selected','sample_analyzed',
  'instrument_changed','relevant_instrument_selected','communication_point_reached','data_sent','program_modified','explore_opened','bitacora_opened','level_completed',
  'used_repeat_n7','changed_after_irrelevant_feedback','window.apulabLevel7QA=',
  "singleClickTimer=setTimeout(()=>appendItem({type:'cmd',cmd:el.dataset.command}),160)",
  "type:'apulab-mission-complete',mission:1,level:7","button.textContent='MISIÓN COMPLETADA'",
]) if (!html.includes(token)) fail(`missing:${token}`);

for (const forbidden of [
  'id="guide-btn"','EQUIPA UN SENSOR','EQUIPAR SENSOR','RANURA DE SENSOR','CAMBIAR SENSOR','SENSOR DE TEMPERATURA','SENSOR DE PROXIMIDAD','ANALIZADOR DE MINERALES','ESPECTRÓMETRO',
  'data-command="read"','data-command="record"','if(!usesRepeat())','nextLevel:8','CONTINUAR AL NIVEL 8','level8.html','mission01-level8',
  'DESBLOQUEAR REPETIR','Usa REPETIR para','id="unlock-overlay"','function unlockRepeat()','CORRECTO','INCORRECTO','RESPUESTA EQUIVOCADA',
  'PUNTO FINAL','final_point_reached','isAdjacentToSample','junto a la muestra',
]) if (html.includes(forbidden)) fail(`forbidden:${forbidden}`);

if (!/repeatUnlocked\s*=\s*true/.test(html)) fail('repeat_not_available');
if (/id="repeat-palette"[^>]*\shidden\b/.test(html)) fail('repeat_hidden');
if (!html.includes("const isAtSample=()=>roverState.c===sampleCell.c&&roverState.r===sampleCell.r")) fail('sample_exact_guard');
if (!html.includes("if(!relevantInstrumentUsed){recordLevel7Event('premature_action',{action:'send',reason:'relevant_data_missing'})")) fail('premature_send_data_gate');
if (!html.includes("if(!atFinalCheckpoint()){recordLevel7Event('premature_action',{action:'send',reason:'communication_point_missing'})")) fail('premature_send_position_gate');
if (!html.includes("pendingAnalysisResolve=resolve;openInstrumentSelector()")) fail('analysis_pause_contract');
if (!html.includes("el.onkeydown=(e)=>{if(e.key==='Enter'||e.key===' ')")) fail('block_keyboard_contract');
if (!html.includes("rp.onkeydown=(e)=>{if((e.key==='Enter'||e.key===' ')&&repeatUnlocked)")) fail('repeat_keyboard_contract');
if (!html.includes('.instrument-option:focus-visible')) fail('modal_focus_visible');
if ((html.match(/recordLevel7Event\('sample_reached'/g)||[]).length!==1) fail('sample_reached_single_emitter');

const explore = html.match(/const exploreSteps=([^;]+);/)?.[1] || '';
const titles = (explore.match(/"title"/g) || []).length;
if (titles !== 2) fail(`explore_must_have_2_states:${titles}`);
const guideNodes = (html.match(/class="level7-guide-node"/g) || []).length;
if (guideNodes !== 5) fail(`guide_must_have_5_nodes:${guideNodes}`);

console.info('[mission01] LEVEL 7 FINAL GDD AUDIT OK · exact sample · deterministic inputs · three instruments · explicit communication/send · REPETIR optional');
