import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');

const strip = (value = '') => value
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();

const uniq = (items) => [...new Set(items.filter(Boolean))];
const matches = (html, re, map = (m) => m[0]) => uniq([...html.matchAll(re)].map(map));

function labelContexts(text) {
  const result = [];
  for (const match of text.matchAll(/\bNIVEL\s+\d+\b/gi)) {
    const start = Math.max(0, match.index - 95);
    const end = Math.min(text.length, match.index + match[0].length + 120);
    result.push(text.slice(start, end));
  }
  return uniq(result);
}

for (let level = 1; level <= 5; level += 1) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  const visible = strip(html);
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || '(sin title)';
  const headings = matches(html, /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi, (m) => strip(m[1])).slice(0, 8);
  const visibleLevelLabels = matches(visible, /\bNIVEL\s+\d+\b/gi, (m) => m[0].toUpperCase());
  const progress = matches(visible, /\b\d+\s*\/\s*7\b/g);
  const missionLevels = matches(html, /data-mission-level=(['"])(\d+)\1/g, (m) => m[2]);
  const unlockedFrom = matches(html, /data-unlocked-from-level=(['"])(\d+)\1/g, (m) => m[2]);
  const nextLevels = matches(html, /nextLevel\s*:\s*(\d+)/g, (m) => m[1]);
  const directBridges = matches(html, /apulabCompleteLevel\(\s*(\d+)\s*,\s*(\d+)\s*\)/g, (m) => `${m[1]}→${m[2]}`);
  const continueLabels = matches(visible, /CONTINUAR\s+AL\s+NIVEL\s+\d+/gi, (m) => m[0].toUpperCase());

  console.info(`[audit-level] file=${level} title=${JSON.stringify(title)}`);
  console.info(`[audit-level] file=${level} headings=${JSON.stringify(headings)}`);
  console.info(`[audit-level] file=${level} labels=${JSON.stringify(visibleLevelLabels)} progress=${JSON.stringify(progress)} dataMission=${JSON.stringify(missionLevels)} unlockedFrom=${JSON.stringify(unlockedFrom)} next=${JSON.stringify(nextLevels)} bridge=${JSON.stringify(directBridges)} continue=${JSON.stringify(continueLabels)}`);
  console.info(`[audit-context] file=${level} contexts=${JSON.stringify(labelContexts(visible))}`);
}

console.info('[audit-level] Mission 01 numbering audit complete');
