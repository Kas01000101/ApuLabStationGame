import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const html = await readFile(resolve(process.cwd(), 'public/missions/mission01/level2.html'), 'utf8');

function snippet(marker, radius = 1100) {
  const i = html.indexOf(marker);
  if (i < 0) return `[missing] ${marker}`;
  return html.slice(Math.max(0, i - radius), Math.min(html.length, i + marker.length + radius)).replace(/\s+/g, ' ');
}

for (const marker of [
  'explanationMode',
  'guideActive',
  'guideButton.disabled',
  'kawsay-guide',
  'Primero',
  'EXPLORAR',
  'measuredValues',
  'pointerEvents',
  'disabled=true',
  'disabled = true',
]) {
  if (html.includes(marker)) console.info(`[inspect-l2] ${marker}: ${snippet(marker)}`);
}
