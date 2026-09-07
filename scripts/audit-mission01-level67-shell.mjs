import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const l6 = await readFile(resolve(OUT, 'level6.html'), 'utf8');
const l7 = await readFile(resolve(OUT, 'level7.html'), 'utf8');
const fail = (code) => { throw new Error(`mission01_level67_shell:${code}`); };

const canonical = [
  'data-apulab-shell-source="level5"','width:1672px;height:941px','SIMULADOR 8 × 8','EDITOR DE MOVIMIENTO',
  'id="board-shell" class="board-shell"','id="board-canvas" width="950" height="664"','class="board-labels-top"','class="board-labels-left"',
  'id="program-list" class="program-list"','id="program-scroll"','id="repeat-palette"','AYNI_FRONT_ORIENTATION',
];
for (const [level, html] of [[6,l6],[7,l7]]) {
  for (const token of canonical) if (!html.includes(token)) fail(`l${level}_missing:${token}`);
  if (html.includes('class="panel simulator"') || html.includes('class="panel editor"') || html.includes('class="board-wrap"')) fail(`l${level}_parallel_shell`);
  if (html.includes('apulab-repeat-focus')) fail(`l${level}_repeat_tutorial_leak`);
}

for (const token of ['APULAB_LEVEL6_FROM_LEVEL5_V1','APULAB_LEVEL6_TWO_CHECKPOINTS_V1','APULAB_LEVEL6_FINAL_UX_V1','INVESTIGAR','DATOS CIENTÍFICOS','ZONA DE INTERÉS','PUNTO DE COMUNICACIÓN','data-command="scan"','data-command="analyze"','data-command="send"','data-testid="level6-guide"']) {
  if (!l6.includes(token)) fail(`l6_science:${token}`);
}
if (l6.includes('if(!usesRepeat())')) fail('l6_repeat_must_be_optional');
for (const forbidden of ['ANALIZAR MUESTRA','ANALIZADOR DE MATERIALES']) if (l6.includes(forbidden)) fail(`l6_level7_leak:${forbidden}`);

for (const token of ['APULAB_LEVEL7_FROM_LEVEL5_V1','APULAB_LEVEL7_INSTRUMENT_UI_V2','APULAB_LEVEL7_FINAL_GDD_V1','APULAB_LEVEL7_FINAL_HARDENING_V1','LA MUESTRA DESCONOCIDA','MUESTRA DESCONOCIDA','PUNTO DE COMUNICACIÓN','data-command="analyzeSample"','data-command="send"','data-testid="block-analyze-sample"','data-testid="level7-guide"','ANALIZAR MUESTRA','ENVIAR DATOS','TEMPERATURA','PROXIMIDAD','ANALIZADOR DE MATERIALES','CAMBIAR INSTRUMENTO','FINALIZAR MISIÓN']) {
  if (!l7.includes(token)) fail(`l7_sample:${token}`);
}
for (const legacy of ['data-command="read"','data-command="record"','EQUIPA UN SENSOR','EQUIPAR SENSOR','RANURA DE SENSOR','CAMBIAR SENSOR','ANALIZADOR DE MINERALES','id="guide-btn"','PUNTO FINAL','final_point_reached','isAdjacentToSample']) if (l7.includes(legacy)) fail(`l7_legacy:${legacy}`);
if (/nextLevel\s*:\s*8|CONTINUAR AL NIVEL 8|level8\.html|mission01-level8/.test(l7)) fail('l7_fake_level8');
if (l7.includes('if(!usesRepeat())')) fail('l7_repeat_must_be_optional');
if (!l7.includes("recordLevel7Event('communication_point_reached'")) fail('l7_communication_event');
if (!l7.includes("recordLevel7Event('data_sent'")) fail('l7_explicit_send_event');

console.info('[mission01] LEVEL 6–7 CONTINUITY OK · N6 obtain→interpret→communicate · N7 exact sample→instrument→communication→explicit send · fixed guides · REPETIR optional');
