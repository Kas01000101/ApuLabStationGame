import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const MANIFEST = resolve(OUT, 'manifest.json');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

function fail(code, detail = '') {
  throw new Error(`mission01_guide_visibility:${code}${detail ? `:${detail}` : ''}`);
}

function balancedFunctionRange(source, signature, label) {
  const start = source.indexOf(signature);
  if (start < 0) fail('function_start', label);
  const brace = source.indexOf('{', start + signature.length);
  if (brace < 0) fail('function_brace', label);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = brace; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}' && --depth === 0) return [start, i + 1];
  }
  fail('function_unbalanced', label);
}

function patchNativeGuideVisibility(html, level) {
  const signature = '  function updateGuide() {';
  const [start, end] = balancedFunctionRange(html, signature, `l${level}:updateGuide`);
  let body = html.slice(start, end);
  if (!body.includes('conceptPanel.hidden = false;')) {
    const anchor = level === 1
      ? '    // APULAB_NATIVE_GUIDE_CHECKLIST_V4\n'
      : '    // APULAB_NATIVE_GUIDE_CHECKLIST_L2\n';
    if (!body.includes(anchor)) fail('checklist_anchor', `l${level}`);
    body = body.replace(
      anchor,
      `${anchor}    // APULAB_GUIDE_VISIBLE_PANEL · abrir GUÍA siempre hace visible su caja.\n    conceptPanel.hidden = false;\n`,
    );
  }
  if (!body.includes('conceptPanel.hidden = false;')) fail('panel_not_shown', `l${level}`);
  return html.slice(0, start) + body + html.slice(end);
}

const outputs = new Map();
for (const level of [1, 2]) {
  const path = resolve(OUT, `level${level}.html`);
  let html = await readFile(path, 'utf8');
  html = patchNativeGuideVisibility(html, level);
  await writeFile(path, html, 'utf8');
  outputs.set(level, html);
}

// Los niveles de programación ya usan una caja distinta. Verificamos que su
// renderer haga visible el panel en el mismo camino del click de GUÍA.
for (const level of [3, 4, 5]) {
  const path = resolve(OUT, `level${level}.html`);
  const html = await readFile(path, 'utf8');
  if (!html.includes('function renderStructuredGuide')) fail('structured_renderer_missing', `l${level}`);
  if (!html.includes("info.classList.add('visible')")) fail('structured_panel_not_shown', `l${level}`);
  outputs.set(level, html);
}

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
for (const entry of manifest.levels || []) {
  const level = Number(entry.level);
  const html = outputs.get(level);
  if (!html) continue;
  entry.bytes = Buffer.byteLength(html, 'utf8');
  entry.sha256 = hash(html);
}
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.info('[mission01] GUIDE VISIBILITY PATCH OK · L1/L2 hidden=false · L3–L5 renderer visible');
