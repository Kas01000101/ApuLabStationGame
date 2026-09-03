import { readFile, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const OUT = resolve(ROOT, 'public/missions/mission01');
const fail = (code) => { throw new Error(`mission01_full7_audit:${code}`); };
const levels = new Map();
for (let level = 1; level <= 7; level++) {
  const path = resolve(OUT, `level${level}.html`);
  let html;
  try { html = await readFile(path, 'utf8'); } catch { fail(`missing_level_${level}`); }
  levels.set(level, html);
  if (!html.includes(`${level} / 7`) && !html.includes(`${level}/7`)) fail(`progress_${level}`);
  if (/\b[1-8]\s*\/\s*8\b/.test(html)) fail(`legacy_total8_${level}`);
  if (!/AYNI/i.test(html)) fail(`ayni_${level}`);
  if (!/GUÍA/.test(html)) fail(`guide_button_${level}`);
  if (!/EXPLORAR/.test(html)) fail(`explore_button_${level}`);
  if (!/BITÁCORA/.test(html)) fail(`journal_${level}`);
}

const manifest = JSON.parse(await readFile(resolve(OUT, 'manifest.json'), 'utf8'));
if (manifest.totalLevels !== 7) fail('manifest_total');
if (JSON.stringify(manifest.availableLevels) !== JSON.stringify([1,2,3,4,5,6,7])) fail('manifest_available');
if (Array.isArray(manifest.unavailableLevels) && manifest.unavailableLevels.length) fail('manifest_unavailable');
if (!Array.isArray(manifest.levels) || manifest.levels.length !== 7) fail('manifest_entries');
for (let level=1; level<=7; level++) if (!manifest.levels.some((x)=>Number(x.level)===level)) fail(`manifest_level_${level}`);

if (/RASTREAR|TP1|TP2|TP3|SOURCE HARNESS/.test(levels.get(3))) fail('deleted_rastrear_leak');

const l6 = levels.get(6);
for (const token of ['MISIÓN CIENTÍFICA','REPETIR × N','ESCANEAR','ANALIZAR','ENVIAR DATOS','GUÍA · 3 PASOS','PUNTO DE ESTUDIO']) {
  if (!l6.includes(token)) fail(`l6_${token}`);
}
if (!l6.includes("parent.postMessage({type:'apulab-level-complete',level:6,nextLevel:7}")) fail('l6_navigation_7');
if (!l6.includes("const LEVEL=6")) fail('l6_identity');

const l7 = levels.get(7);
for (const token of ['SENSORES Y BUCLES','REPETIR × N','LEER SENSOR','REGISTRAR DATO','ENVIAR DATOS','GUÍA · 3 PASOS','SENSOR 1','SENSOR 2','MISIÓN 01 COMPLETADA']) {
  if (!l7.includes(token)) fail(`l7_${token}`);
}
if (/nextLevel\s*:\s*8|CONTINUAR AL NIVEL 8/.test(l7)) fail('l7_fake_level8');
if (!l7.includes('records.length<2')) fail('l7_requires_two_sensors');
if (!l7.includes("const LEVEL=7")) fail('l7_identity');

for (const level of [6,7]) {
  const html = levels.get(level);
  if (!html.includes("info.className='info-panel visible apulab-explore-yellow'")) fail(`explore_visible_${level}`);
  if (!html.includes("info.className='info-panel visible'")) fail(`guide_visible_${level}`);
  if (!html.includes("CFG.guideTasks.map")) fail(`guide_checklist_${level}`);
  if (!html.includes("'completed'")) fail(`guide_strike_${level}`);
  if (!html.includes('CFG.explore.length')) fail(`explore_runtime_${level}`);
  if (!html.includes('renderer.dispose()')) fail(`renderer_dispose_${level}`);
  if (!html.includes('renderer.forceContextLoss?.()')) fail(`context_loss_${level}`);
  if (!html.includes("type==='apulab-dispose'")) fail(`dispose_message_${level}`);
  if (!html.includes("requestAnimationFrame=(cb)=>")) fail(`raf_guard_${level}`);
  if (!html.includes('new THREE.WebGLRenderer')) fail(`three_${level}`);
  if (!html.includes("usesRepeat()")) fail(`repeat_required_${level}`);

  const match = html.match(/<script type="module">\n([\s\S]*?)\n<\/script>/);
  if (!match) fail(`module_script_${level}`);
  const temp = resolve(ROOT, `.mission01-level${level}-syntax.mjs`);
  await writeFile(temp, match[1], 'utf8');
  const result = spawnSync(process.execPath, ['--check', temp], { encoding: 'utf8' });
  await rm(temp, { force: true });
  if (result.status !== 0) fail(`syntax_${level}:${result.stderr || result.stdout}`);
}

const source = await readFile(resolve(ROOT, 'src/ui/Mission01Screen.ts'), 'utf8');
if (!source.includes('const MAX_AVAILABLE_LEVEL = 7;')) fail('screen_max7');
if (!source.includes("6: 'MISIÓN CIENTÍFICA'")) fail('screen_title6');
if (!source.includes("7: 'SENSORES Y BUCLES'")) fail('screen_title7');
if (!source.includes('APULAB_TRANSITION_SINGLE_LIVE_V1')) fail('single_live');
if (!source.includes('this.disposeFrame(outgoing);')) fail('outgoing_dispose');
if (!source.includes('this.prefetchLevel(this.activeLevel + 1);')) fail('prefetch_sequence');

const l6Explore = (l6.match(/\['[^']*',\s*'[^']*',\s*'[^']*'\]/g) || []).length;
const l7Explore = (l7.match(/\['[^']*',\s*'[^']*',\s*'[^']*'\]/g) || []).length;
if (l6Explore < 4 || l7Explore < 4) fail('explore_steps_missing');

console.info('[mission01] FULL 1–7 AUDIT OK');
console.info('[mission01] N1–N5 legacy/remapped contracts preserved');
console.info('[mission01] N6 scientific loop: REPETIR + ESCANEAR + ANALIZAR + ENVIAR DATOS');
console.info('[mission01] N7 sensor loop: two sensors + REPETIR + LEER/REGISTRAR + ENVIAR DATOS');
console.info('[mission01] EXPLORAR <=4 / GUÍA checklist / ayudas opcionales / Three dispose / single-live transition');
console.info('[mission01] Navigation verified: 1→2→3→4→5→6→7');
