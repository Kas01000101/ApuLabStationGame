import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { LEVEL7_CONFIG as CFG } from './config/mission01-level7.mjs';

const OUT=resolve(process.cwd(),'public/missions/mission01');
const html=await readFile(resolve(OUT,'level7.html'),'utf8');
const fail=(code)=>{throw new Error(`mission01_level7_final_gdd_audit:${code}`)};

if(CFG.level!==7||CFG.totalLevels!==7)fail('identity');
if(CFG.obstacles.length>5)fail(`rocks:${CFG.obstacles.length}`);
if(CFG.sensorOptions.length!==3)fail(`instruments:${CFG.sensorOptions.length}`);
if(CFG.explore.length!==2)fail(`explore:${CFG.explore.length}`);
if(CFG.guide.length!==5)fail(`guide:${CFG.guide.length}`);

for(const token of [
  'NIVEL 7','7 / 7','LA MUESTRA DESCONOCIDA','ELIGE EL INSTRUMENTO SEGÚN EL DATO QUE NECESITAS.',
  'PASO 1 · LLEVA AYNI A LA MUESTRA','PASO 2 · ANALIZA LA MUESTRA','PASO 3 · ELIGE UN INSTRUMENTO','PASO 4 · ENCUENTRA EL DATO QUE RESPONDE LA PREGUNTA','PASO 5 · LLEVA AYNI AL PUNTO FINAL','MISIÓN COMPLETADA',
  'data-testid="level7-guide"','data-testid="level7-sample-checkpoint"','data-testid="level7-final-checkpoint"',
  'MUESTRA DESCONOCIDA','VE AQUÍ PRIMERO','PUNTO FINAL','data-command="analyzeSample"','ANALIZAR MUESTRA',
  'TEMPERATURA','PROXIMIDAD','ANALIZADOR DE MATERIALES','−58 °C','0.4 m','HIERRO','SILICATOS','CAMBIAR INSTRUMENTO','FINALIZAR MISIÓN',
  'sample_reached','sample_analyze_requested','instrument_modal_opened','instrument_selected','sample_analyzed','instrument_changed','relevant_instrument_selected','final_point_reached','program_modified','explore_opened','bitacora_opened','level_completed',
  'changed_after_irrelevant_feedback','time_to_first_choice','time_to_relevant_choice','help_before_relevant_choice','used_repeat_n7','completion_time','completed_level',
])if(!html.includes(token))fail(`missing:${token}`);

for(const forbidden of [
  'id="guide-btn"','data-command="read"','data-command="record"','data-command="send"','EQUIPA UN SENSOR','INSTALAR SENSOR','CAMBIAR SENSOR','SENSOR DE TEMPERATURA','SENSOR DE PROXIMIDAD','ANALIZADOR DE MINERALES',
  'CORRECTO','INCORRECTO','PERDISTE','RESPUESTA EQUIVOCADA','CONTINUAR AL NIVEL 8','SIGUIENTE NIVEL','nextLevel:8','level8.html','mission01-level8',
])if(html.includes(forbidden))fail(`forbidden:${forbidden}`);

if((html.match(/class="instrument-option"/g)||[]).length!==3)fail('instrument_cards_not_3');
if((html.match(/class="level7-guide-node"/g)||[]).length!==5)fail('guide_nodes_not_5');
if(!/repeatUnlocked\s*=\s*true/.test(html))fail('repeat_not_available');
if(html.includes('if(!usesRepeat())'))fail('repeat_required');
if(!html.includes("if(!relevantInstrumentUsed||!atFinalCheckpoint())return"))fail('victory_gate');
if(!html.includes("button.textContent='MISIÓN COMPLETADA'"))fail('terminal_button');

console.info(`[mission01] N7 FINAL GDD ACCEPTANCE OK · ${CFG.obstacles.length} rocks · 3 instruments · guide 1→5 · canonical telemetry · no N8`);
