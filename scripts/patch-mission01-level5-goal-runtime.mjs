import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const LEVEL5 = resolve(OUT, 'level5.html');
const MANIFEST = resolve(OUT, 'manifest.json');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
const fail = (code) => { throw new Error(`mission01_level5_goal_runtime:${code}`); };

const untouched = new Map();
for (const level of [1, 2, 3, 4, 6, 7]) {
  const text = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  untouched.set(level, hash(text));
}

let html = await readFile(LEVEL5, 'utf8');
if (!html.includes('APULAB_LEVEL5_FINAL_LOOPS_V1')) fail('missing_final_loops_runtime');
if (html.includes('APULAB_LEVEL5_GOAL_RUNTIME_V1')) fail('already_applied');

const legacyGoalPulse = 'goalGlowMat.opacity=.14+.24*p;';
const occurrences = html.split(legacyGoalPulse).length - 1;
if (occurrences !== 1) fail(`legacy_goal_pulse_count_${occurrences}`);

html = html.replace(
  legacyGoalPulse,
  'goalTileMat.opacity=.20+.16*p;/* APULAB_LEVEL5_GOAL_RUNTIME_V1 */',
);

html = html.replace(
  /const goalPulseTimer=window\.setInterval\(\(\)=>\{if\(document\.hidden\)return;const p=\(Math\.sin\(performance\.now\(\)\/480\)\+1\)\/2;goalTileMat\.opacity=\.20\+\.16\*p\},100\);window\.addEventListener\('pagehide',\(\)=>clearInterval\(goalPulseTimer\),\{once:true\}\);?/g,
  '',
);

if (html.includes('goalGlowMat')) fail('legacy_goal_glow_reference_remaining');
if (!html.includes('goalTileMat.opacity=.20+.16*p;/* APULAB_LEVEL5_GOAL_RUNTIME_V1 */')) fail('goal_tile_render_pulse_missing');
if (html.includes('goalPulseTimer')) fail('duplicate_goal_timer_remaining');

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

console.info('[mission01] N5 GOAL RUNTIME OK · bandera + loseta única · render sin goalGlowMat · sin timer duplicado · N1–N4/N6–N7 intactos');
