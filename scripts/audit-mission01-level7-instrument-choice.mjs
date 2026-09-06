import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const path = resolve(process.cwd(), 'public/missions/mission01/level7.html');
const html = await readFile(path, 'utf8');
const fail = (code) => { throw new Error(`mission01_level7_instrument_choice_audit:${code}`); };

for (const token of [
  'APULAB_LEVEL7_FROM_LEVEL5_V1','APULAB_LEVEL7_INSTRUMENT_UI_V2','APULAB_LEVEL7_FINAL_GDD_V1',
  'data-apulab-level="7"','width:1672px;height:941px','data-testid="block-analyze-sample"',
  'data-testid="level7-guide"','data-testid="level7-sample-checkpoint"','data-testid="level7-final-checkpoint"',
  'LA MUESTRA DESCONOCIDA','ELIGE EL INSTRUMENTO SEGÚN EL DATO QUE NECESITAS.','MUESTRA DESCONOCIDA','PUNTO FINAL',
  'ANALIZAR MUESTRA','TEMPERATURA','PROXIMIDAD','ANALIZADOR DE MATERIALES','CAMBIAR INSTRUMENTO',
  '−58 °C','0.4 m','HIERRO','SILICATOS',
  'sample_reached','sample_analyze_requested','instrument_modal_opened','instrument_selected','sample_analyzed',
  'instrument_changed','relevant_instrument_selected','final_point_reached','program_modified','explore_opened','bitacora_opened','level_completed',
  'used_repeat_n7','changed_after_irrelevant_feedback','window.apulabLevel7QA=',
  "clickTimer=setTimeout(()=>appendItem({type:'cmd',cmd:el.dataset.command}),170)",
  "type:'apulab-mission-complete',mission:1,level:7","button.textContent='MISIÓN COMPLETADA'",
]) if (!html.includes(token)) fail(`missing:${token}`);

for (const forbidden of [
  'id="guide-btn"','EQUIPA UN SENSOR','EQUIPAR SENSOR','RANURA DE SENSOR','CAMBIAR SENSOR','SENSOR DE TEMPERATURA','SENSOR DE PROXIMIDAD','ANALIZADOR DE MINERALES','ESPECTRÓMETRO',
  'data-command="read"','data-command="record"','data-command="send"','if(!usesRepeat())','nextLevel:8','CONTINUAR AL NIVEL 8','level8.html','mission01-level8',
  'DESBLOQUEAR REPETIR','Usa REPETIR para','id="unlock-overlay"','function unlockRepeat()','CORRECTO','INCORRECTO','RESPUESTA EQUIVOCADA',
]) if (html.includes(forbidden)) fail(`forbidden:${forbidden}`);

if (!/repeatUnlocked\s*=\s*true/.test(html)) fail('repeat_not_available');
if (/id="repeat-palette"[^>]*\shidden\b/.test(html)) fail('repeat_hidden');
if (!html.includes("if(!relevantInstrumentUsed){feedback.textContent='Todavía falta obtener un dato que responda de qué material está hecha la muestra.'")) fail('relevant_data_gate');
if (!html.includes("if(!isAdjacentToSample())throw {code:'SAMPLE_POSITION',message:'AYNI necesita estar junto a la muestra para analizarla.'}")) fail('sample_position_guard');
if (!html.includes("pendingAnalysisResolve=resolve;openInstrumentSelector()")) fail('analysis_pause_contract');
if (!html.includes("el.onkeydown=e=>{if(e.key==='Enter'||e.key===' ')")) fail('block_keyboard_contract');
if (!html.includes("rp.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&repeatUnlocked)")) fail('repeat_keyboard_contract');
if (!html.includes('.instrument-option:focus-visible')) fail('modal_focus_visible');

const explore = html.match(/const exploreSteps=([^;]+);/)?.[1] || '';
const titles = (explore.match(/"title"/g) || []).length;
if (titles !== 2) fail(`explore_must_have_2_states:${titles}`);
const guideNodes = (html.match(/class="level7-guide-node"/g) || []).length;
if (guideNodes !== 5) fail(`guide_must_have_5_nodes:${guideNodes}`);

console.info('[mission01] LEVEL 7 FINAL GDD AUDIT OK · fixed guide 1→5 · three equal instruments · relevant datum gate · terminal mission · REPETIR optional');
