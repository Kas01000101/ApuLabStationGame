import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const l5 = await readFile(resolve(OUT, 'level5.html'), 'utf8');
const l7 = await readFile(resolve(OUT, 'level7.html'), 'utf8');
const fail = (code) => { throw new Error(`mission01_level7_n5_parity:${code}`); };

for (const token of [
  'APULAB_LEVEL7_FROM_LEVEL5_V1',
  'data-apulab-level="7"',
  'data-apulab-shell-source="level5"',
  'width:1672px;height:941px',
  'id="board-shell" class="board-shell"',
  'id="board-canvas" width="950" height="664"',
  'class="board-labels-top"',
  'class="board-labels-left"',
  'id="program-list" class="program-list"',
  'id="program-scroll"',
  'id="program-scroll-up"',
  'id="program-scroll-down"',
  'id="repeat-palette"',
  'AYNI_FRONT_ORIENTATION',
  'data-command="read"',
  'data-command="record"',
  'data-command="send"',
  'SENSOR 1',
  'SENSOR 2',
  'LEER SENSOR',
  'REGISTRAR DATO',
  'ENVIAR DATOS',
  'MISIÓN 01 COMPLETADA',
]) if (!l7.includes(token)) fail(`missing:${token}`);

for (const token of ['class="panel simulator"','class="panel editor"','class="board-wrap"','grid-template-columns:990px 614px','Tu programa aparecerá aquí.','AYNI · FRENTE · LUZ CYAN']) {
  if (l7.includes(token)) fail(`parallel_shell_leak:${token}`);
}
if (l7.includes('apulab-repeat-focus')) fail('repeat_tutorial_leak');
if (/nextLevel\s*:\s*8|CONTINUAR AL NIVEL 8/.test(l7)) fail('fake_level8');
if (!/repeatUnlocked\s*=\s*true/.test(l7)) fail('repeat_not_available');
if (!l7.includes('if(!usesRepeat())')) fail('repeat_not_required');
if (!l7.includes('sensorRecords.length<2')) fail('two_sensor_requirement_missing');
if (!l7.includes("type:'apulab-level-ready', level:7")) fail('ready_identity');
if (!l7.includes("type:'apulab-runtime-error',level:7")) fail('error_identity');

// La estructura crítica de N5 debe seguir presente en N7.
for (const token of ['board-shell','board-labels-top','board-labels-left','program-list','program-scroll','repeat-card','command-block']) {
  if (!l5.includes(token) || !l7.includes(token)) fail(`canonical_structure:${token}`);
}

console.info('[mission01] LEVEL 7 ↔ N5 STATIC PARITY OK · 1672×941 · 950×664 · editor 01–30 · AYNI · sensores');
