import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { LEVEL6_CONFIG as CFG } from './config/mission01-level6.mjs';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const l5 = await readFile(resolve(OUT, 'level5.html'), 'utf8');
const l6 = await readFile(resolve(OUT, 'level6.html'), 'utf8');
const l7 = await readFile(resolve(OUT, 'level7.html'), 'utf8');
const fail = (code) => { throw new Error(`mission01_level6_final_ux_audit:${code}`); };

for (const token of [
  'APULAB_LEVEL6_FINAL_UX_V1',
  'data-testid="level6-guide"',
  'data-testid="level6-guide-step-1"',
  'data-testid="level6-guide-step-5"',
  'data-testid="level6-science-zone"',
  'data-testid="level6-communication-point"',
  'data-testid="level6-investigate-block"',
  'ZONA DE INTERÉS',
  'VE AQUÍ PRIMERO',
  'PUNTO DE COMUNICACIÓN',
  'PASO 1 · LLEVA AYNI A LA ZONA DE INTERÉS',
  'PASO 2 · INVESTIGA LA ZONA',
  'PASO 3 · INTERPRETA EL DATO',
  'PASO 4 · LLEVA AYNI AL PUNTO DE COMUNICACIÓN',
  'PASO 5 · ENVÍA EL RESULTADO',
  'MISIÓN COMPLETADA',
  'science_zone_reached',
  'communication_point_reached',
  'explore_opened',
  'bitacora_opened',
]) if (!l6.includes(token)) fail(`missing:${token}`);

if (l6.includes('id="guide-btn"')) fail('top_guide_returned');
if (l6.includes("document.getElementById('guide-btn').onclick")) fail('popup_guide_handler_returned');
if ((l6.match(/class="level6-guide-step/g) || []).length !== 5) fail('guide_must_have_five_steps');
if ((CFG.obstacles || []).length > 5) fail(`too_many_board_rocks:${CFG.obstacles.length}`);
if (!/repeatUnlocked\s*=\s*true/.test(l6) || l6.includes('if(!usesRepeat())')) fail('repeat_must_remain_optional');

const investigateStart = l6.indexOf('id="level6-investigate-block"');
const investigateEnd = l6.indexOf('</div><div class="command-block block-send"', investigateStart);
if (investigateStart < 0 || investigateEnd < 0) fail('investigate_container_structure');
const investigateHtml = l6.slice(investigateStart, investigateEnd);
if (!investigateHtml.includes('data-command="scan"') || !investigateHtml.includes('data-command="analyze"')) fail('investigate_children');
if (investigateHtml.includes('data-command="send"')) fail('send_must_be_outside_investigate');
if (!l6.includes('class="command-block block-send" data-kind="cmd" data-command="send"')) fail('send_missing');
if (l6.includes('>SCAN<') || l6.includes('>ANÁLISIS<') || l6.includes('>TX<')) fail('duplicated_science_labels');

for (const forbidden of ['SENSOR DE TEMPERATURA','SENSOR DE PROXIMIDAD','ANALIZADOR DE MINERALES','RANURA DE SENSOR','ANALIZAR MUESTRA']) {
  if (l6.includes(forbidden)) fail(`n7_content_leaked:${forbidden}`);
}
if (l5.includes('APULAB_LEVEL6_FINAL_UX_V1')) fail('level5_touched');
if (l7.includes('APULAB_LEVEL6_FINAL_UX_V1')) fail('level7_touched');

console.info('[mission01] N6 FINAL UX AUDIT OK · GUÍA fija 1–5 · 2 checkpoints · INVESTIGAR agrupado · ≤5 rocas · REPETIR opcional · N5/N7 intactos');
