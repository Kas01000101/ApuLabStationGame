import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const LEVEL3_PATH = resolve(process.cwd(), 'public/missions/mission01/level3.html');
const html = await readFile(LEVEL3_PATH, 'utf8');

const names = [...html.matchAll(/(?:const|let|var)\s+([A-Za-z0-9_$]*(?:ayni|rover)[A-Za-z0-9_$]*)/gi)].map((m)=>m[1]);
console.info('[level3-audit] ayniRoverNames=' + [...new Set(names)].join(','));

for (const name of [...new Set(names)]) {
  const index = html.search(new RegExp('(?:const|let|var)\\s+' + name.replace(/[$]/g,'\\$&') + '\\b'));
  if (index < 0) continue;
  const start = Math.max(0, index - 450);
  const end = Math.min(html.length, index + 1700);
  console.info(`[level3-audit:${name}] ` + html.slice(start,end).replace(/\s+/g,' '));
}
