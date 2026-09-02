import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const TOTAL = 7;

const strip = (value = '') => value
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();

function assert(condition, code) {
  if (!condition) throw new Error(`mission01_numbering_audit_failed:${code}`);
}

for (let level = 1; level <= 5; level += 1) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  const visible = strip(html);
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || '';
  const progressPattern = new RegExp(`\\b${level}\\s*\\/\\s*${TOTAL}\\b`);
  const next = level + 1;

  assert(new RegExp(`\\bNivel\\s+${level}\\b`, 'i').test(title), `l${level}:title:${title}`);
  assert(progressPattern.test(visible), `l${level}:progress`);

  const badge = html.match(/<div[^>]*class=(['"])[^'"]*\blevel-badge\b[^'"]*\1[^>]*>([\s\S]*?)<\/div>/i);
  if (badge) {
    assert(new RegExp(`^\\s*NIVEL\\s+${level}\\s*$`, 'i').test(strip(badge[2])), `l${level}:badge:${strip(badge[2])}`);
  }

  const completionHeadings = [...html.matchAll(/<h2[^>]*>\s*¡NIVEL\s+(\d+)\s+COMPLETADO!\s*<\/h2>/gi)].map((m) => Number(m[1]));
  for (const completed of completionHeadings) {
    assert(completed === level, `l${level}:completion:${completed}`);
  }

  const nextLevels = [...html.matchAll(/nextLevel\s*:\s*(\d+)/g)].map((m) => Number(m[1]));
  for (const candidate of nextLevels) {
    assert(candidate === next, `l${level}:nextLevel:${candidate}`);
  }

  const bridges = [...html.matchAll(/apulabCompleteLevel\(\s*(\d+)\s*,\s*(\d+)\s*\)/g)];
  for (const bridge of bridges) {
    assert(Number(bridge[1]) === level && Number(bridge[2]) === next, `l${level}:bridge:${bridge[1]}->${bridge[2]}`);
  }

  const continueLabels = [...visible.matchAll(/CONTINUAR\s+AL\s+NIVEL\s+(\d+)/gi)].map((m) => Number(m[1]));
  for (const candidate of continueLabels) {
    assert(candidate === next, `l${level}:continue:${candidate}`);
  }

  if (level === 4) {
    assert(visible.includes('REGISTRO ANTERIOR · NIVEL 3'), 'l4:previous-journal-label');
  }
  if (level === 5) {
    assert(visible.includes('REGISTRO ANTERIOR · NIVEL 4'), 'l5:previous-journal-label');
  }

  console.info(`[audit-level] Nivel ${level}/${TOTAL} OK · title=${JSON.stringify(title)} · next=${next}`);
}

console.info('[audit-level] Mission 01 numbering/navigation contract OK · no duplicate current-level labels');
