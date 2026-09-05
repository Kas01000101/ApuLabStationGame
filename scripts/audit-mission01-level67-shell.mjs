import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const l6 = await readFile(resolve(OUT, 'level6.html'), 'utf8');
const l7 = await readFile(resolve(OUT, 'level7.html'), 'utf8');

// N6 ya NO usa el template paralelo N6/N7. Debe provenir del N5 final.
for (const token of [
  'APULAB_LEVEL6_FROM_LEVEL5_V1',
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
  'PUNTO DE ESTUDIO',
  'data-command="scan"',
  'data-command="analyze"',
  'data-command="send"',
  'ESCANEANDO MUESTRA',
  'ANALIZANDO',
  'TRANSMITIENDO A APULAB STATION',
  'Escaneo completado',
  'Análisis completado',
]) {
  if (!l6.includes(token)) throw new Error(`mission01_level6_n5_shell_missing:${token}`);
}
if (l6.includes('class="panel simulator"') || l6.includes('class="panel editor"')) {
  throw new Error('mission01_level6_parallel_shell_returned');
}
if (l6.includes('grid-template-columns:235px minmax(520px,1fr) 360px')) {
  throw new Error('mission01_level6_legacy_three_column_shell_returned');
}
if (l6.includes('goalRing')) throw new Error('mission01_level6_duplicate_goal_marker_returned');
if (l6.includes('apulab-repeat-focus')) throw new Error('mission01_level6_repeat_tutorial_leaked_from_level5');

// N7 se conserva sin rediseño en este PR y mantiene el contrato vigente.
const requiredN7 = [
  'width:1672px;height:941px',
  'SIMULADOR 8 × 8',
  'EDITOR DE MOVIMIENTO',
  'grid-template-columns:990px 614px',
  'createAyni()',
  "await import('/vendor/three/three.module.js')",
  "function closeTransientUI(except='')",
  "closeTransientUI('journal')",
  "closeTransientUI('success')",
  'scene.traverse((obj)=>',
  'geometry?.dispose?.()',
  'font-family:Poppins,Arial,sans-serif',
  'class="panel simulator"',
  'class="panel editor"',
  'class="board-loading"',
  'scene-ready',
  "dataset.apulabSceneReady='true'",
  "new CustomEvent('apulab-scene-ready'",
  'b.draggable=true',
  "text/apulab-command",
  "repeatBody.ondrop=",
];
for (const token of requiredN7) {
  if (!l7.includes(token)) throw new Error(`mission01_level7_shell_missing:${token}`);
}
if (l7.includes('grid-template-columns:235px minmax(520px,1fr) 360px')) {
  throw new Error('mission01_level7_legacy_three_column_shell');
}
if ((l7.match(/class="overlay visible"/g) || []).length) {
  throw new Error('mission01_level7_overlay_boots_visible');
}
for (const token of ['SENSOR 1', 'SENSOR 2', 'LEER SENSOR', 'REGISTRAR DATO', 'FINALIZAR MISIÓN']) {
  if (!l7.includes(token)) throw new Error(`mission01_level7_sensor_visual_missing:${token}`);
}

console.info('[mission01] LEVEL 6–7 SHELL OK · N6 derivado del N5 real · N7 conserva shell vigente');
