import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const level5Path = resolve(process.cwd(), 'public/missions/mission01/level5.html');
const html = await readFile(level5Path, 'utf8');

const scenariosMatch = html.match(/const scenarios=\[[\s\S]*?\];\nlet scenarioIndex=0;/);
const scenarioCount = scenariosMatch ? (scenariosMatch[0].match(/\{start:/g) || []).length : 0;
const hasScenarioIndex = html.includes('scenarioIndex');
const hasAdvanceScenario = html.includes('advanceScenario');
const hasMultiScenarioBranch = html.includes('if(scenarioIndex<scenarios.length-1)');
const completeRouteCount = (html.match(/nextLevel\s*:\s*6/g) || []).length;

console.info(`[mission01][diag] Nivel 5 · scenarios=${scenarioCount} · scenarioIndex=${hasScenarioIndex} · advanceScenario=${hasAdvanceScenario} · multiBranch=${hasMultiScenarioBranch} · nextLevel6=${completeRouteCount}`);

if (scenariosMatch) {
  console.info('[mission01][diag] Nivel 5 · scenarios block:');
  console.info(scenariosMatch[0]);
}

for (const token of ['scenarioIndex', 'advanceScenario', 'completeLevel()', 'usesRepeat()', 'REPETIR']) {
  const at = html.indexOf(token);
  if (at < 0) continue;
  const start = Math.max(0, at - 220);
  const end = Math.min(html.length, at + 520);
  console.info(`[mission01][diag] contexto ${token}:\n${html.slice(start, end)}`);
}

if (hasMultiScenarioBranch || scenarioCount > 1) {
  throw new Error(`mission01_level5_hidden_sublevels:${scenarioCount || 'unknown'}`);
}

console.info('[mission01][diag] Nivel 5 · no hidden sublevels detected');
