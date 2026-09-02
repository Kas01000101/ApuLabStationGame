import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');

function compact(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function context(html, marker, radius = 1600) {
  const at = html.indexOf(marker);
  if (at < 0) return null;
  return compact(html.slice(Math.max(0, at - radius), Math.min(html.length, at + marker.length + radius)));
}

for (const level of [3,4,5]) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  console.info(`[guide-audit] LEVEL ${level}`);
  for (const marker of [
    "guideBtn.addEventListener",
    "guideOpened",
    "function openGuide",
    "function renderGuide",
    "showGuide",
    "GUÍA",
    "infoTitle.textContent",
    "infoKicker.textContent",
  ]) {
    const hit = context(html, marker);
    if (hit) console.info(`[guide-audit] l${level} marker=${JSON.stringify(marker)} :: ${hit}`);
  }
}
console.info('[guide-audit] programming guide inspection complete');
