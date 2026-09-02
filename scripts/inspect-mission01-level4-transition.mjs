import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const path = resolve(process.cwd(), 'public/missions/mission01/level4.html');
const html = await readFile(path, 'utf8');
const patterns = [
  /parent\.apulabCompleteLevel\([^)]*\)/g,
  /postMessage\(\{type:'apulab-level-complete'[^}]*\}/g,
  /apulab-level-complete/g,
  /continue-btn[^\n]{0,180}/g,
  /function goToNextLevel\(\)[\s\S]{0,650}/g,
  /apulabLevelReady\([^)]*\)/g,
  /apulab-level-ready[^\n]{0,120}/g,
];
console.info('[inspect-l4-transition] BEGIN');
for (const re of patterns) {
  const hits = html.match(re) || [];
  console.info(`[inspect-l4-transition] ${re} count=${hits.length}`);
  hits.slice(0, 12).forEach((hit, i) => console.info(`[inspect-l4-transition] ${i + 1}: ${hit.replace(/\s+/g,' ').slice(0,900)}`));
}
console.info('[inspect-l4-transition] END');
