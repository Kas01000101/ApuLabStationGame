import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const l6 = await readFile(resolve(OUT, 'level6.html'), 'utf8');
const l7 = await readFile(resolve(OUT, 'level7.html'), 'utf8');
const fail = (code) => { throw new Error(`mission01_level7_final_shell:${code}`); };

for (const token of [
  'APULAB_LEVEL7_FROM_LEVEL5_V1','APULAB_LEVEL7_INSTRUMENT_UI_V2','APULAB_LEVEL7_FINAL_GDD_V1',
  'data-apulab-level="7"','width:1672px;height:941px','id="board-shell" class="board-shell"','id="board-canvas" width="950" height="664"',
  'class="board-labels-top"','class="board-labels-left"','id="program-list" class="program-list"','id="program-scroll"','id="repeat-palette"',
  'data-command="analyzeSample"','data-testid="block-analyze-sample"','ANALIZAR MUESTRA','MUESTRA DESCONOCIDA','PUNTO FINAL',
  'TEMPERATURA','PROXIMIDAD','ANALIZADOR DE MATERIALES','CAMBIAR INSTRUMENTO','−58 °C','0.4 m','HIERRO','SILICATOS','FINALIZAR MISIÓN','level_completed',
  'data-testid="level7-guide"','data-testid="level7-sample-checkpoint"','data-testid="level7-final-checkpoint"',
]) if (!l7.includes(token)) fail(`missing:${token}`);

for (const token of [
  'class="panel simulator"','class="panel editor"','class="board-wrap"','Tu programa aparecerá aquí.','AYNI · FRENTE · LUZ CYAN',
  'data-command="read"','data-command="record"','data-command="send"','EQUIPA UN SENSOR','EQUIPAR SENSOR','RANURA DE SENSOR','CAMBIAR SENSOR',
  'SENSOR DE TEMPERATURA','SENSOR DE PROXIMIDAD','ANALIZADOR DE MINERALES','ESPECTRÓMETRO','id="guide-btn"',
]) if (l7.includes(token)) fail(`legacy_or_parallel_contract:${token}`);

if (l7.includes('apulab-repeat-focus')) fail('repeat_tutorial_leak');
if (/nextLevel\s*:\s*8|CONTINUAR AL NIVEL 8|level8\.html|mission01-level8/.test(l7)) fail('fake_level8');
if (!/repeatUnlocked\s*=\s*true/.test(l7)) fail('repeat_not_available');
if (l7.includes('if(!usesRepeat())')) fail('repeat_must_not_be_required');
if (!l7.includes("type:'apulab-level-ready', level:7")) fail('ready_identity');
if (!l7.includes("type:'apulab-runtime-error',level:7")) fail('error_identity');
if (!l7.includes('pendingAnalysisResolve=resolve;openInstrumentSelector()')) fail('analysis_pause_missing');
if (!l7.includes('instrumentChangeCount+=1')) fail('instrument_change_preservation_missing');
if (!l7.includes("if(!relevantInstrumentUsed||!atFinalCheckpoint())return")) fail('final_completion_gate_missing');

// N7 follows the final N6 two-panel proportions and fixed-guide concept, while keeping its own science content.
for (const token of ['board-shell','board-labels-top','board-labels-left','program-list','program-scroll','repeat-card','command-block']) {
  if (!l6.includes(token) || !l7.includes(token)) fail(`shared_shell:${token}`);
}
if (!l6.includes('data-testid="level6-guide"') || !l7.includes('data-testid="level7-guide"')) fail('fixed_guide_continuity');

console.info('[mission01] LEVEL 7 FINAL SHELL OK · N6 continuity · fixed guide · unknown sample + final point · REPETIR optional');
