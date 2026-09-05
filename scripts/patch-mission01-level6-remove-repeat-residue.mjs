import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const LEVEL6 = resolve(process.cwd(), 'public/missions/mission01/level6.html');
const fail = (code) => { throw new Error(`mission01_level6_repeat_residue:${code}`); };
let html = await readFile(LEVEL6, 'utf8');

// handleRunSuccess() era async en N5. El hardening elimina la función completa;
// este cleanup impide que el prefijo `async` o el marcador pedagógico de N5
// sobrevivan en el runtime de N6.
html = html
  .replace(/\n\s*async\s*\n\s*\/\/ APULAB_LEVEL5_TWO_PHASE_REPEAT_V3\s*\n/g, '\n')
  .replaceAll('// APULAB_LEVEL5_TWO_PHASE_REPEAT_V3', '');

if (/(?:^|\n)\s*async\s*(?:\n|$)/.test(html)) fail('orphan_async');
if (html.includes('APULAB_LEVEL5_TWO_PHASE_REPEAT_V3')) fail('level5_marker_remaining');
for (const token of ['function handleRunSuccess()', 'function unlockRepeat()', 'id="unlock-overlay"', 'Usa REPETIR para']) {
  if (html.includes(token)) fail(`repeat_tutorial_remaining:${token}`);
}

await writeFile(LEVEL6, html, 'utf8');
console.info('[mission01] N6 repeat residue cleanup OK · sin async huérfano · sin marcador/tutorial N5');
