import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');

function fail(code, detail = '') {
  throw new Error(`mission01_guide_visible_contract:${code}${detail ? `:${detail}` : ''}`);
}

function functionBody(source, signature, label) {
  const start = source.indexOf(signature);
  if (start < 0) fail('missing_function', label);
  const brace = source.indexOf('{', start + signature.length);
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
    else if (ch === '}' && --depth === 0) return source.slice(brace + 1, i);
  }
  fail('unbalanced_function', label);
}

for (const level of [1, 2]) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  const guide = functionBody(html, '  function updateGuide() {', `l${level}:updateGuide`);
  const mode = functionBody(html, '  function setGuideMode(enabled) {', `l${level}:setGuideMode`);
  if (!guide.includes('conceptPanel.hidden = false;')) fail('native_panel_stays_hidden', `l${level}`);
  if (!guide.includes('GUÍA · 3 PASOS')) fail('native_checklist_title_missing', `l${level}`);
  if (!mode.includes('guideActive = enabled;')) fail('native_toggle_missing', `l${level}`);
  if (!mode.includes('updateGuide();')) fail('native_render_not_called', `l${level}`);
  if (!html.includes('setGuideMode(!guideActive)')) fail('native_click_toggle_missing', `l${level}`);
}

for (const level of [3, 4, 5]) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  const render = functionBody(html, 'function renderStructuredGuide', `l${level}:renderStructuredGuide`);
  if (!render.includes("info.classList.add('visible')")) fail('structured_panel_stays_hidden', `l${level}`);
  if (!render.includes("textContent='GUÍA · 3 PASOS'")) fail('structured_checklist_title_missing', `l${level}`);
  const hasClick = html.includes("guideBtn.addEventListener('click',()=>") || html.includes("document.getElementById('guide-btn').onclick=()=>");
  if (!hasClick) fail('structured_click_missing', `l${level}`);
}

console.info('[mission01] GUIDE VISIBLE CONTRACT OK · click → panel visible · L1–L5');
