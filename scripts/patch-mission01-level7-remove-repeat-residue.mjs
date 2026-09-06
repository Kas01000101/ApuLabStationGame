import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const LEVEL7 = resolve(process.cwd(), 'public/missions/mission01/level7.html');
const fail = (code) => { throw new Error(`mission01_level7_repeat_residue:${code}`); };

function functionRange(source, marker) {
  const start = source.indexOf(marker);
  if (start < 0) return null;
  const open = source.indexOf('{', start + marker.length);
  if (open < 0) fail(`function_open:${marker}`);
  let depth = 0, quote = '', escaped = false;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}' && --depth === 0) return { start, end: i + 1 };
  }
  fail(`function_end:${marker}`);
}
function removeFunction(source, marker) {
  const range = functionRange(source, marker);
  return range ? source.slice(0, range.start) + source.slice(range.end) : source;
}

let html = await readFile(LEVEL7, 'utf8');
if (!html.includes('APULAB_LEVEL7_FROM_LEVEL5_V1')) fail('not_level7');

// N5 teaches REPETIR. In N7 it is prior knowledge and must be immediately
// available without unlock UI, tutorial copy, halo, arrows or victory gates.
for (const marker of ['function handleRunSuccess()', 'function unlockRepeat()', 'function usesSequenceRepeat(']) {
  html = removeFunction(html, marker);
}

const unlockStart = html.indexOf('<div id="unlock-overlay"');
if (unlockStart >= 0) {
  const successStart = html.indexOf('<div id="success-overlay"', unlockStart);
  if (successStart < 0) fail('unlock_overlay_end');
  html = html.slice(0, unlockStart) + html.slice(successStart);
}

html = html
  .replace(/<div id="control-locked" class="control-locked hidden">[\s\S]*?<\/div>/g, '')
  .replace(/\.unlock-overlay \.popup\{width:580px\}/g, '')
  .replaceAll("document.getElementById('unlock-btn').onclick=unlockRepeat;", '')
  .replaceAll("document.getElementById('unlock-close').onclick=()=>document.getElementById('unlock-overlay').classList.remove('visible');", '')
  .replaceAll('// APULAB_LEVEL5_TWO_PHASE_REPEAT_V3', '')
  .replaceAll('DESBLOQUEAR REPETIR', '')
  .replaceAll('Usa REPETIR para llegar a la meta y completa la ruta.', 'Investiga la muestra y completa la misión.')
  .replaceAll('Usa REPETIR para llegar al punto de estudio y completa el ciclo científico.', 'Investiga la muestra y completa la misión.')
  .replaceAll('Ahora usa REPETIR para organizar la ruta.', 'Continúa con las herramientas que ya conoces.')
  .replaceAll('REPETIR desbloqueado · úsalo para completar el nivel.', 'REPETIR está disponible como herramienta opcional.');

// `async function handleRunSuccess()` can leave an orphan async token if an
// inherited patch has already removed only the function body/signature.
html = html.replace(/\n\s*async\s*\n(?=\s*(?:\/\/|function|const|let|document|window))/g, '\n');

for (const forbidden of [
  'function unlockRepeat()',
  'function handleRunSuccess()',
  'function usesSequenceRepeat(',
  'id="unlock-overlay"',
  'id="unlock-btn"',
  'DESBLOQUEAR REPETIR',
  'Usa REPETIR para',
  'apulab-repeat-focus',
  'apulab-repeat-arrow',
  'if(!usesRepeat())',
  'if(!usesSequenceRepeat())',
]) if (html.includes(forbidden)) fail(`repeat_tutorial_remaining:${forbidden}`);

if (/(?:^|\n)\s*async\s*(?:\n|$)/.test(html)) fail('orphan_async');

await writeFile(LEVEL7, html, 'utf8');
console.info('[mission01] N7 repeat residue cleanup OK · REPETIR available/optional · no N5 unlock tutorial');
