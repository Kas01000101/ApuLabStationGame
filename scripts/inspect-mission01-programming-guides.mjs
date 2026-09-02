import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');

function compact(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function context(html, marker, radius = 1800) {
  const at = html.indexOf(marker);
  if (at < 0) return null;
  return compact(html.slice(Math.max(0, at - radius), Math.min(html.length, at + marker.length + radius)));
}

for (const level of [1,2,3,4,5]) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  console.info(`[guide-audit] LEVEL ${level}`);
  const markers = level <= 2 ? [
    'explanationButton.addEventListener',
    'guideButton.addEventListener',
    'function finishExplanation()',
    'function setGuideMode(',
    'function advanceExplanation(',
    'guideOpenedOnce',
  ] : [
    'exploreBtn.addEventListener',
    "document.getElementById('explore-btn').onclick",
    'guideBtn.addEventListener',
    "document.getElementById('guide-btn').onclick",
    'function finishExplore()',
    'guideOpened',
  ];
  for (const marker of markers) {
    const hit = context(html, marker);
    if (hit) console.info(`[guide-audit] l${level} marker=${JSON.stringify(marker)} :: ${hit}`);
  }
}
console.info('[guide-audit] help reopen inspection complete');
