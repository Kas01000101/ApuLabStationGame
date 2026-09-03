import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const path = resolve(process.cwd(), 'public/missions/mission01/level4.html');
const html = await readFile(path, 'utf8');

const must = (condition, code) => {
  if (!condition) throw new Error(code);
};

must(html.includes('APULAB_LEVEL4_SINGLE_CHALLENGE_V1'), 'mission01_level4_single_marker_missing');
must(!html.includes('if(scenarioIndex<scenarios.length-1)'), 'mission01_level4_hidden_sublevels_present');
must(!html.includes("await advanceScenario()"), 'mission01_level4_advance_scenario_still_called');
must(html.includes('CONTINUAR AL NIVEL 5'), 'mission01_level4_continue_label_wrong');
must(html.includes("parent.postMessage({type:'apulab-level-complete',level:4,nextLevel:5}"), 'mission01_level4_completion_event_wrong');
must(!html.includes('level5_completed'), 'mission01_level4_legacy_level5_telemetry');
must(!html.includes('__apulabLevel5Telemetry'), 'mission01_level4_legacy_level5_global');

const scenariosMatch = html.match(/const scenarios=\[([\s\S]*?)\];\nlet scenarioIndex=0;/);
must(Boolean(scenariosMatch), 'mission01_level4_scenarios_block_missing');
const startCount = (scenariosMatch[1].match(/start:\{/g) || []).length;
must(startCount === 1, `mission01_level4_expected_one_scenario:found_${startCount}`);

console.info('[mission01] LEVEL 4 FLOW OK · un reto → completar una vez → Nivel 5');