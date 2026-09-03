import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const LEVEL4 = resolve(OUT, 'level4.html');
const MANIFEST = resolve(OUT, 'manifest.json');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

let html = await readFile(LEVEL4, 'utf8');

// APULAB_LEVEL4_SINGLE_CHALLENGE_V1
// Nivel 4 debe completarse una sola vez. El contenido legacy incluía tres
// escenarios internos consecutivos bajo el mismo HUD "NIVEL 4", lo que hacía
// que la jugadora sintiera que tenía que repetir el nivel antes de llegar a N5.
const scenariosPattern = /const scenarios=\[[\s\S]*?\];\nlet scenarioIndex=0;/;
if (!scenariosPattern.test(html)) throw new Error('mission01_level4_scenarios_block_missing');
html = html.replace(
  scenariosPattern,
  `// APULAB_LEVEL4_SINGLE_CHALLENGE_V1\nconst scenarios=[\n  {start:{c:1,r:6,dir:0},goal:{c:3,r:2},obstacles:[[1,4],[2,4]]}\n];\nlet scenarioIndex=0;`,
);

const multiScenarioBranch = /if\(scenarioIndex<scenarios\.length-1\)\{feedback\.textContent='Ruta completada\. La zona de entrenamiento cambiará\.';playSuccessMusic\(\);await sleep\(900\);await advanceScenario\(\)\}else\{completeLevel\(\)\}/;
if (!multiScenarioBranch.test(html)) throw new Error('mission01_level4_multiscenario_branch_missing');
html = html.replace(multiScenarioBranch, 'completeLevel()');

// Limpiar identidad/telemetría legacy del antiguo Nivel 5.
html = html.replaceAll("telemetry('level5_completed'", "telemetry('level4_completed'");
html = html.replaceAll('__apulabLevel5Telemetry', '__apulabLevel4Telemetry');
html = html.replaceAll("console.debug('[ApuLab L5]'", "console.debug('[ApuLab L4]'");

if (!html.includes('APULAB_LEVEL4_SINGLE_CHALLENGE_V1')) throw new Error('mission01_level4_single_marker_missing');
if (html.includes('if(scenarioIndex<scenarios.length-1)')) throw new Error('mission01_level4_still_multiscenario');
if (!html.includes("parent.postMessage({type:'apulab-level-complete',level:4,nextLevel:5}")) throw new Error('mission01_level4_complete_route_missing');
if (!html.includes('CONTINUAR AL NIVEL 5')) throw new Error('mission01_level4_continue_label_missing');
if (html.includes('level5_completed') || html.includes('__apulabLevel5Telemetry') || html.includes('[ApuLab L5]')) throw new Error('mission01_level4_legacy_identity_remaining');

await writeFile(LEVEL4, html, 'utf8');

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
const entry = (manifest.levels || []).find((x) => Number(x.level) === 4);
if (!entry) throw new Error('mission01_level4_manifest_entry_missing');
entry.bytes = Buffer.byteLength(html, 'utf8');
entry.sha256 = hash(html);
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.info('[mission01] Nivel 4 · reto único aplicado · completar meta → Nivel 5');