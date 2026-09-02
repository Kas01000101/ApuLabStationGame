import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const OUT = resolve(ROOT, 'public/missions/mission01');

function snippet(html, marker, radius = 900) {
  const index = html.indexOf(marker);
  if (index < 0) return `[missing] ${marker}`;
  const start = Math.max(0, index - radius);
  const end = Math.min(html.length, index + marker.length + radius);
  return html.slice(start, end).replace(/\s+/g, ' ');
}

function names(html, pattern) {
  return [...new Set([...html.matchAll(pattern)].map((match) => match[1]))].slice(0, 80);
}

for (const level of [3, 4, 5]) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  console.info(`\n[inspect-l${level}] bytes=${Buffer.byteLength(html, 'utf8')}`);
  console.info(`[inspect-l${level}] EXPLORE NAMES`, names(html, /(?:function|const|let|var)\s+([A-Za-z_$][\w$]*(?:explor|guide|concept)[\w$]*)/gi));
  console.info(`[inspect-l${level}] AYNI NAMES`, names(html, /(?:function|const|let|var)\s+([A-Za-z_$][\w$]*(?:ayni|rover)[\w$]*)/gi));
  console.info(`[inspect-l${level}] COMPLETE NAMES`, names(html, /(?:function|const|let|var)\s+([A-Za-z_$][\w$]*(?:complete|success|modal|finish)[\w$]*)/gi));

  for (const marker of [
    'ENTRENAMIENTO DE MOVIMIENTO',
    'AYNI Y SU ORIENTACIÓN',
    'BANDERA MARCIANA',
    '¡NIVEL 2 COMPLETADO!',
    'NIVEL 2 COMPLETADO',
    'CONTINUAR AL NIVEL 4',
    'RUTA BLOQUEADA',
    'EXPLORAR',
    'GUÍA',
    'data-apulab-level',
  ]) {
    if (html.includes(marker)) console.info(`[inspect-l${level}] ${marker}: ${snippet(html, marker)}`);
  }

  const roverFunction = html.match(/function\s+([A-Za-z_$][\w$]*(?:Ayni|AYNI|Rover|rover)[\w$]*)\s*\([^)]*\)\s*\{/);
  if (roverFunction) console.info(`[inspect-l${level}] rover-function=${roverFunction[1]} :: ${snippet(html, roverFunction[0], 1600)}`);

  const exploreArrays = [...html.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*(?:explor|concept|guide)[\w$]*)\s*=\s*\[/gi)].slice(0, 12);
  for (const match of exploreArrays) console.info(`[inspect-l${level}] array ${match[1]} :: ${snippet(html, match[0], 2400)}`);
}
