import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const LEVEL5 = resolve(OUT, 'level5.html');
const MANIFEST = resolve(OUT, 'manifest.json');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
const fail = (code) => { throw new Error(`mission01_level5_goal_position:${code}`); };

const untouched = new Map();
for (const level of [1, 2, 3, 4, 6, 7]) {
  const text = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  untouched.set(level, hash(text));
}

let html = await readFile(LEVEL5, 'utf8');
if (!html.includes('APULAB_LEVEL5_FINAL_LOOPS_V1')) fail('missing_final_loops_runtime');
if (html.includes('APULAB_LEVEL5_GOAL_G4_V1')) fail('already_applied');

const oldStage = "{name:'RUTA LARGA',start:{c:0,r:6,dir:1},goal:{c:6,r:0},obstacles:[[4,6],[3,3],[7,4],[1,4],[2,2],[4,1],[5,3],[2,5],[6,2]]},";
const newStage = "{name:'RUTA LARGA',start:{c:0,r:6,dir:1},goal:{c:6,r:3},obstacles:[[4,6],[3,5],[7,4],[1,4],[2,2],[4,1],[5,5],[2,5],[6,2]]},/* APULAB_LEVEL5_GOAL_G4_V1 */";

const count = html.split(oldStage).length - 1;
if (count !== 1) fail(`stage_match_count_${count}`);
html = html.replace(oldStage, newStage);

// La bandera y su loseta usan `goal`, por lo que ambas quedan en G4.
// Reubicamos únicamente los dos obstáculos que ocupaban la nueva ruta L limpia:
// A7 → A4 → G4. Se conserva el mismo número total de obstáculos.
if (!html.includes("goal:{c:6,r:3}")) fail('goal_not_g4');
if (html.includes("goal:{c:6,r:0}")) fail('old_goal_remaining');
if (!html.includes('APULAB_LEVEL5_GOAL_G4_V1')) fail('marker_missing');

await writeFile(LEVEL5, html, 'utf8');

for (const [level, before] of untouched) {
  const after = hash(await readFile(resolve(OUT, `level${level}.html`), 'utf8'));
  if (after !== before) fail(`out_of_scope_level_${level}`);
}

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
const entry = (manifest.levels || []).find((x) => Number(x.level) === 5);
if (!entry) fail('manifest_level5');
entry.bytes = Buffer.byteLength(html, 'utf8');
entry.sha256 = hash(html);
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.info('[mission01] N5 GOAL POSITION OK · bandera + loseta en G4 · tres filas debajo · ruta L despejada · N1–N4/N6–N7 intactos');
