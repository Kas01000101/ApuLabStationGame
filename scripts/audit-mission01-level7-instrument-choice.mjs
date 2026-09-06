import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const path = resolve(process.cwd(), 'public/missions/mission01/level7.html');
const html = await readFile(path, 'utf8');
const fail = (code) => { throw new Error(`mission01_level7_instrument_choice_audit:${code}`); };

for (const token of [
  'APULAB_LEVEL7_FROM_LEVEL5_V1',
  'APULAB_LEVEL7_INSTRUMENT_UI_V2',
  'data-apulab-level="7"',
  'data-apulab-shell-source="level5"',
  'width:1672px;height:941px',
  'id="board-canvas" width="950" height="664"',
  'data-testid="block-analyze-sample"',
  'ANALIZAR MUESTRA',
  'MUESTRA DESCONOCIDA',
  'PUNTO DE MISIÓN',
  'TEMPERATURA',
  'PROXIMIDAD',
  'ANALIZADOR DE MATERIALES',
  'CAMBIAR INSTRUMENTO',
  '−58 °C',
  '0.4 m',
  'HIERRO',
  'SILICATOS',
  'instrument_selected',
  'instrument_changed',
  'relevant_instrument_selected',
  'sample_checkpoint_reached',
  'final_checkpoint_reached',
  'mission_completed',
  'used_repeat_n7',
  'repeat_instances_n7',
  'changed_after_irrelevant_feedback',
  'window.apulabLevel7QA=',
  "clickTimer=setTimeout(()=>appendItem({type:'cmd',cmd:el.dataset.command}),170)",
  "type:'apulab-mission-complete',mission:1,level:7",
  "button.textContent='MISIÓN COMPLETADA'",
]) if (!html.includes(token)) fail(`missing:${token}`);

for (const forbidden of [
  'EQUIPA UN SENSOR',
  'EQUIPAR SENSOR',
  'RANURA DE SENSOR',
  'CAMBIAR SENSOR',
  'SENSOR DE TEMPERATURA',
  'SENSOR DE PROXIMIDAD',
  'ANALIZADOR DE MINERALES',
  'ESPECTRÓMETRO',
  'data-command="read"',
  'data-command="record"',
  'data-command="send"',
  'if(!usesRepeat())',
  'nextLevel:8',
  'CONTINUAR AL NIVEL 8',
  'level:5,nextLevel:6',
  'DESBLOQUEAR REPETIR',
  'Usa REPETIR para',
  'id="unlock-overlay"',
  'function unlockRepeat()',
]) if (html.includes(forbidden)) fail(`forbidden:${forbidden}`);

if (!/repeatUnlocked\s*=\s*true/.test(html)) fail('repeat_not_available');
if (/id="repeat-palette"[^>]*\shidden\b/.test(html)) fail('repeat_hidden');
if (!html.includes("if(!relevantInstrumentUsed){feedback.textContent='Todavía falta obtener un dato que responda de qué material está hecha la muestra.'")) fail('relevant_data_gate');
if (!html.includes("if(!atFinalCheckpoint()){feedback.textContent='Ya tenemos la información que necesitábamos. Lleva AYNI al punto final.'")) fail('final_checkpoint_gate');
if (!html.includes("if(!relevantInstrumentUsed||!atFinalCheckpoint())return")) fail('completion_guard');
if (!html.includes("if(!isAdjacentToSample())throw {code:'SAMPLE_POSITION',message:'AYNI necesita estar junto a la muestra para analizarla.'}")) fail('sample_position_guard');
if (!html.includes("pendingAnalysisResolve=resolve;openInstrumentSelector()")) fail('analysis_pause_contract');
if (!html.includes("document.getElementById('clear-btn')?.addEventListener('click',()=>{resetLevel7ScienceState()")) fail('clear_science_reset');
if (!html.includes("el.onkeydown=e=>{if(e.key==='Enter'||e.key===' ')")) fail('block_keyboard_contract');
if (!html.includes("rp.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&repeatUnlocked)")) fail('repeat_keyboard_contract');
if (!html.includes('.instrument-option:focus-visible')) fail('modal_focus_visible');
if (!html.includes("phase='science'")) fail('science_phase');

const explore = html.match(/const exploreSteps=([^;]+);/)?.[1] || '';
const titles = (explore.match(/"title"/g) || []).length;
if (titles !== 2) fail(`explore_must_have_2_states:${titles}`);

console.info('[mission01] LEVEL 7 INSTRUMENT CHOICE OK · click/drag/keyboard · sample→ANALIZAR→instrument→relevant datum→mission point · terminal mission · REPETIR optional');
