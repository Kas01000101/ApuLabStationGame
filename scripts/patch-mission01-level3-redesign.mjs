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

const tokens = [
  'AYNI DESTINO',
  'guidedExplanation',
  'updateGuide',
  'TP1',
  'PUNTA NEGRA',
  'PUNTA ROJA',
  '28.0',
  'multimeter',
  'redProbe',
  'blackProbe',
  'probe',
  'cable',
  'wire',
  'trace',
];

for (const token of tokens) {
  const index = html.toLowerCase().indexOf(token.toLowerCase());
  if (index < 0) continue;
  const start = Math.max(0, index - 500);
  const end = Math.min(html.length, index + token.length + 900);
  const snippet = html.slice(start, end).replace(/\s+/g, ' ');
  console.info(`[level3-audit:${token}] ${snippet}`);
}
