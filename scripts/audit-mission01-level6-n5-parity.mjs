import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const l5 = await readFile(resolve(OUT, 'level5.html'), 'utf8');
const l6 = await readFile(resolve(OUT, 'level6.html'), 'utf8');

const fail = (code) => { throw new Error(`mission01_level6_n5_parity:${code}`); };

for (const token of [
  'width:1672px;height:941px',
  'id="board-shell" class="board-shell"',
  'id="board-canvas" width="950" height="664"',
  'class="board-labels-top"',
  'class="board-labels-left"',
  'EDITOR DE MOVIMIENTO',
  'id="program-list" class="program-list"',
  'id="program-scroll"',
  'id="program-scroll-up"',
  'id="program-scroll-down"',
  'class="command-block block-forward"',
  'class="command-block block-left"',
  'class="command-block block-right"',
  'id="repeat-palette"',
  'AYNI_FRONT_ORIENTATION',
  'function renderProgram(',
  'function bindProgramEvents(',
]) {
  if (!l5.includes(token)) fail(`l5_reference_missing:${token}`);
  if (!l6.includes(token)) fail(`l6_parity_missing:${token}`);
}

if (!l6.includes('APULAB_LEVEL6_FROM_LEVEL5_V1')) fail('source_marker');
if (!l6.includes('APULAB_LEVEL6_TWO_CHECKPOINTS_V1')) fail('two_checkpoint_marker');
if (!l6.includes('data-apulab-shell-source="level5"')) fail('source_attribute');
if (l6.includes('class="panel simulator"') || l6.includes('class="panel editor"')) fail('parallel_shell_returned');
if (l6.includes('class="board-wrap"')) fail('old_level67_board_wrap_returned');
if (l6.includes('apulab-repeat-focus')) fail('n5_repeat_tutorial_leaked');

for (const token of [
  'INVESTIGAR',
  'DATOS CIENTÍFICOS',
  '6 / 7',
  'ZONA DE INTERÉS',
  'PUNTO DE COMUNICACIÓN',
  'data-command="scan"',
  'data-command="analyze"',
  'data-command="send"',
  'DATO OBTENIDO',
  'RESULTADO INTERPRETADO',
  'DATOS ENVIADOS A APULAB STATION',
  'OBTENER → INTERPRETAR → COMUNICAR',
  "atCommunicationPoint",
  "premature_action",
  "science_order_correct",
  "parent.postMessage({type:'apulab-level-complete',level:6,nextLevel:7}",
]) {
  if (!l6.includes(token)) fail(`science_contract:${token}`);
}

const classes = ['header','main','board-shell','editor','editor-body','palette','workspace','program-list'];
for (const cls of classes) {
  const rx = new RegExp(`\\.${cls.replace('-', '\\-')}\\{[^}]+\\}`);
  const a = l5.match(rx)?.[0];
  const b = l6.match(rx)?.[0];
  if (!a || !b) fail(`css_rule_missing:${cls}`);
  if (a !== b) fail(`core_geometry_changed:${cls}`);
}

const n5Canvas = l5.match(/<canvas id="board-canvas" width="(\d+)" height="(\d+)"/);
const n6Canvas = l6.match(/<canvas id="board-canvas" width="(\d+)" height="(\d+)"/);
if (!n5Canvas || !n6Canvas || n5Canvas[1] !== n6Canvas[1] || n5Canvas[2] !== n6Canvas[2]) fail('canvas_geometry');
if (n6Canvas[1] !== '950' || n6Canvas[2] !== '664') fail('canvas_expected_950x664');

if (!/repeatUnlocked\s*=\s*true/.test(l6)) fail('repeat_not_available');
if (/id="repeat-palette"[^>]*\shidden\b/.test(l6)) fail('repeat_still_hidden');
if (l6.includes('if(!usesRepeat())')) fail('repeat_must_be_optional');
if (!l6.includes('if(!scienceScanned||!scienceAnalyzed||!scienceSent)')) fail('science_cycle_not_required');

for (const forbidden of ['SENSOR DE TEMPERATURA','SENSOR DE PROXIMIDAD','ANALIZADOR DE MINERALES','RANURA DE SENSOR','ANALIZAR MUESTRA']) {
  if (l6.includes(forbidden)) fail(`level7_content_leaked:${forbidden}`);
}

console.info('[mission01] LEVEL 6 ↔ N5 PARITY OK · mismo shell 1672×941/950×664 · dos checkpoints · ciencia añadida · REPETIR opcional');
