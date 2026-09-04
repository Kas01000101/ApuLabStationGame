import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');

const requiredShared = [
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

for (const level of [6, 7]) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  for (const token of requiredShared) {
    if (!html.includes(token)) throw new Error(`mission01_level67_shell_missing:L${level}:${token}`);
  }
  if (html.includes('grid-template-columns:235px minmax(520px,1fr) 360px')) {
    throw new Error(`mission01_level67_legacy_three_column_shell:L${level}`);
  }
  if ((html.match(/class="overlay visible"/g) || []).length) {
    throw new Error(`mission01_level67_overlay_boots_visible:L${level}`);
  }
  if (!html.includes('font-size:28px') || !html.includes('font-size:14px')) {
    throw new Error(`mission01_level67_typography_regression:L${level}`);
  }
}

const l6 = await readFile(resolve(OUT, 'level6.html'), 'utf8');
for (const token of ['PUNTO DE ESTUDIO', 'ESCANEANDO MUESTRA', 'ANALIZANDO', 'TRANSMITIENDO A APULAB STATION', 'Escaneo completado', 'Análisis completado']) {
  if (!l6.includes(token)) throw new Error(`mission01_level6_science_visual_missing:${token}`);
}
if (l6.includes('goalRing')) throw new Error('mission01_level6_duplicate_goal_marker_returned');

const l7 = await readFile(resolve(OUT, 'level7.html'), 'utf8');
for (const token of ['SENSOR 1', 'SENSOR 2', 'LEER SENSOR', 'REGISTRAR DATO', 'FINALIZAR MISIÓN']) {
  if (!l7.includes(token)) throw new Error(`mission01_level7_sensor_visual_missing:${token}`);
}

console.info('[mission01] LEVEL 6–7 SHELL OK · 2 columnas · Marte · AYNI · ciencia/sensores · overlays exclusivos · dispose GPU · first-frame gate · drag/drop');
