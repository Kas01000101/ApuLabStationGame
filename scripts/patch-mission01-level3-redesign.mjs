import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const LEVEL3_PATH = resolve(process.cwd(), 'public/missions/mission01/level3.html');
const html = await readFile(LEVEL3_PATH, 'utf8');

const tokens = [
  'const level3ExploreSteps',
  'function showExplore3',
  'function finishExplore3',
  'const ayniGroup',
  'ayniGroup =',
  'diagnosticLights',
  'sourceCable',
  'negativeReferenceCable',
  'blackDelta',
  'drawLevel3Multimeter',
  'const tpMeshes',
  'function setGuideTPHalos',
  'function completeLevel3',
  'connectorAssembly',
  'makeSpriteLabel("AYNI',
  'AYNI',
];

for (const token of tokens) {
  const index = html.indexOf(token);
  if (index < 0) continue;
  const start = Math.max(0, index - 1100);
  const end = Math.min(html.length, index + token.length + 3600);
  const snippet = html.slice(start, end).replace(/\s+/g, ' ');
  console.info(`[level3-audit:${token}] ${snippet}`);
}
