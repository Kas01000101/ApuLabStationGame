import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const fail = (code) => { throw new Error(`mission01_help_lifecycle_n1_n4:${code}`); };

for (const level of [1,2]) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  if (!html.includes('setGuideMode(!guideActive)')) fail(`l${level}_guide_toggle`);
  if (!html.includes('explanationButton.addEventListener("click", advanceExplanation)')) fail(`l${level}_explore_listener`);
  if (!html.includes('lowPowerDevice ? 22 : 16')) fail(`l${level}_render_cadence`);
}
for (const level of [3,4]) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  if (!html.includes('function closeInfo()')) fail(`l${level}_close_info`);
  if (!html.includes("exploreBtn.addEventListener('click',()=>")) fail(`l${level}_explore_listener`);
  if (!html.includes("guideBtn.addEventListener('click',()=>")) fail(`l${level}_guide_listener`);
}

const l5 = await readFile(resolve(OUT, 'level5.html'), 'utf8');
if (l5.includes('id="guide-btn"')) fail('l5_top_guide_returned');
if (!l5.includes('data-testid="level5-guide"')) fail('l5_fixed_guide_missing');

console.info('[mission01] HELP LIFECYCLE N1–N4 OK · N5 uses fixed gameplay-driven guide with no popup lifecycle');
