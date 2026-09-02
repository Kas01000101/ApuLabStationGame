import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const path = resolve(process.cwd(), 'public/missions/mission01/level4.html');
const html = await readFile(path, 'utf8');
const patterns = [
  /parent\.apulabCompleteLevel\([^)]*\)/g,
  /postMessage\(\{type:'apulab-level-complete'[^}]*\}/g,
  /function goToNextLevel\(\)[\s\S]{0,700}/g,
  /const stages=\[[\s\S]{0,1800}?\];/g,
  /let stageIndex[^;]*;/g,
  /let phase[^;]*;/g,
  /function loadBoardStage\([^)]*\)[\s\S]{0,900}/g,
  /async function handleRunSuccess\([^)]*\)[\s\S]{0,2600}/g,
  /function completeLevel\([^)]*\)[\s\S]{0,1300}/g,
  /overlay[^\n]{0,240}/g,
  /NIVEL 4 COMPLETADO/g,
  /CONTINUAR AL NIVEL 5/g,
];
console.info('[inspect-l4-transition] BEGIN');
for (const re of patterns) {
  const hits = html.match(re) || [];
  console.info(`[inspect-l4-transition] ${re} count=${hits.length}`);
  hits.slice(0, 12).forEach((hit, i) => console.info(`[inspect-l4-transition] ${i + 1}: ${hit.replace(/\s+/g,' ').slice(0,2600)}`));
}
console.info('[inspect-l4-transition] END');
