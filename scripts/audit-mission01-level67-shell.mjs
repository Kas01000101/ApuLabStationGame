import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const l6 = await readFile(resolve(OUT, 'level6.html'), 'utf8');
const l7 = await readFile(resolve(OUT, 'level7.html'), 'utf8');
const fail = (code) => { throw new Error(`mission01_level67_shell:${code}`); };

const canonical = [
  'data-apulab-shell-source="level5"',
  'width:1672px;height:941px',
  'SIMULADOR 8 × 8',
  'EDITOR DE MOVIMIENTO',
  'id="board-shell" class="board-shell"',
  'id="board-canvas" width="950" height="664"',
  'class="board-labels-top"',
  'class="board-labels-left"',
  'id="program-list" class="program-list"',
  'id="program-scroll"',
  'id="repeat-palette"',
  'AYNI_FRONT_ORIENTATION',
];
for (const [level, html] of [[6,l6],[7,l7]]) {
  for (const token of canonical) if (!html.includes(token)) fail(`l${level}_missing:${token}`);
  if (html.includes('class="panel simulator"') || html.includes('class="panel editor"') || html.includes('class="board-wrap"')) fail(`l${level}_parallel_shell`);
  if (html.includes('grid-template-columns:235px minmax(520px,1fr) 360px')) fail(`l${level}_legacy_three_column`);
  if (html.includes('apulab-repeat-focus')) fail(`l${level}_repeat_tutorial_leak`);
}

for (const token of ['APULAB_LEVEL6_FROM_LEVEL5_V1','PUNTO DE ESTUDIO','data-command="scan"','data-command="analyze"','data-command="send"','ESCANEANDO MUESTRA','ANALIZANDO','TRANSMITIENDO A APULAB STATION']) {
  if (!l6.includes(token)) fail(`l6_science:${token}`);
}
for (const token of ['APULAB_LEVEL7_FROM_LEVEL5_V1','LA MUESTRA DESCONOCIDA','MUESTRA DE INTERÉS','data-command="analyzeSample"','ANALIZAR MUESTRA','SENSOR DE TEMPERATURA','SENSOR DE PROXIMIDAD','ANALIZADOR DE MINERALES','RANURA DE SENSOR','CAMBIAR SENSOR','FINALIZAR MISIÓN','MISIÓN 01 COMPLETADA']) {
  if (!l7.includes(token)) fail(`l7_sample:${token}`);
}
for (const legacy of ['data-command="read"','data-command="record"','data-command="send"']) if (l7.includes(legacy)) fail(`l7_legacy:${legacy}`);
if (/nextLevel\s*:\s*8|CONTINUAR AL NIVEL 8/.test(l7)) fail('l7_fake_level8');

console.info('[mission01] LEVEL 6–7 CANONICAL SHELL OK · N6 ciencia + N7 muestra desconocida/3 sensores · ambos derivados de N5');
