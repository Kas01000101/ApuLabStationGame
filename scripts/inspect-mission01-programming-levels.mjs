import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const OUT = resolve(ROOT, 'public/missions/mission01');

function compact(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function snippet(html, marker, before = 500, after = 1500) {
  const index = html.indexOf(marker);
  if (index < 0) return `[missing] ${marker}`;
  return compact(html.slice(Math.max(0, index - before), Math.min(html.length, index + marker.length + after)));
}

function extractFunction(html, name) {
  const marker = `function ${name}`;
  const start = html.indexOf(marker);
  if (start < 0) return `[missing function ${name}]`;
  const brace = html.indexOf('{', start);
  if (brace < 0) return `[missing brace ${name}]`;
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let i = brace; i < html.length; i += 1) {
    const ch = html[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return compact(html.slice(start, i + 1));
    }
  }
  return `[unterminated function ${name}]`;
}

function extractArray(html, marker) {
  const start = html.indexOf(marker);
  if (start < 0) return `[missing array ${marker}]`;
  const bracket = html.indexOf('[', start);
  if (bracket < 0) return `[missing bracket ${marker}]`;
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let i = bracket; i < html.length; i += 1) {
    const ch = html[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '[') depth += 1;
    else if (ch === ']') {
      depth -= 1;
      if (depth === 0) return compact(html.slice(start, i + 1));
    }
  }
  return `[unterminated array ${marker}]`;
}

for (const level of [3, 4, 5]) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  console.info(`\n[deep-l${level}] bytes=${Buffer.byteLength(html, 'utf8')}`);
  console.info(`[deep-l${level}] exploreSteps=${extractArray(html, 'const exploreSteps=')}`);
  console.info(`[deep-l${level}] finishExplore=${extractFunction(html, 'finishExplore')}`);
  console.info(`[deep-l${level}] showExplore=${extractFunction(html, 'showExplore')}`);
  console.info(`[deep-l${level}] showGuide=${extractFunction(html, 'showGuide')}`);
  console.info(`[deep-l${level}] runProgram-head=${snippet(html, 'function runProgram', 150, 1100)}`);
  console.info(`[deep-l${level}] explore-listener=${snippet(html, "exploreBtn.addEventListener", 500, 1800)}`);
  console.info(`[deep-l${level}] guide-listener=${snippet(html, "guideBtn.addEventListener", 500, 1600)}`);
  console.info(`[deep-l${level}] rover-scale=${snippet(html, 'rover.scale.setScalar', 1800, 900)}`);
  console.info(`[deep-l${level}] success=${snippet(html, 'success-overlay', 350, 1700)}`);
}
