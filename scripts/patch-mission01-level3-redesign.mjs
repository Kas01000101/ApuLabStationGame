import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const LEVEL3_PATH = resolve(process.cwd(), 'public/missions/mission01/level3.html');
const html = await readFile(LEVEL3_PATH, 'utf8');

const ids = [...html.matchAll(/id=["']([^"']+)["']/g)]
  .map((m) => m[1])
  .filter((id) => /kawsay|tp|probe|cable|wire|route|trace|reading|meter|ayni/i.test(id));
console.info('[level3-audit] ids=' + [...new Set(ids)].join(','));

const functions = [...html.matchAll(/function\s+([A-Za-z0-9_$]+)/g)]
  .map((m) => m[1])
  .filter((name) => /guide|explan|probe|measure|read|cable|wire|trace|tp|ayni/i.test(name));
console.info('[level3-audit] functions=' + [...new Set(functions)].join(','));

const level3Names = [...html.matchAll(/(?:const|let)\s+([A-Za-z0-9_$]*level3[A-Za-z0-9_$]*)/gi)]
  .map((m) => m[1]);
console.info('[level3-audit] level3Names=' + [...new Set(level3Names)].join(','));

const tokens = [
  'AYNI DESTINO',
  'DESTINO',
  'RECORRIDO',
  '1 / 6',
  '1/6',
  'explanationSteps',
  'guidedExplanation',
  'updateGuide3',
  'measureTP(',
  'setReadingSlot',
  'worldTPPositions',
  'nearestTPToPoint',
  'redLooseCablePoints',
  'blackLooseCablePoints',
  'createFlexibleCable',
  'level3Readings',
  'tpReadings',
  'connectorReady',
  'diagnosisPending',
  'level3Completed',
  'TP1',
  'PUNTA NEGRA',
  'PUNTA ROJA',
  '28.0',
];

for (const token of tokens) {
  const index = html.toLowerCase().indexOf(token.toLowerCase());
  if (index < 0) continue;
  const start = Math.max(0, index - 900);
  const end = Math.min(html.length, index + token.length + 2200);
  const snippet = html.slice(start, end).replace(/\s+/g, ' ');
  console.info(`[level3-audit:${token}] ${snippet}`);
}
