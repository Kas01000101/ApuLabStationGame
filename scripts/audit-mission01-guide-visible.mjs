import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');

function fail(code, detail = '') {
  throw new Error(`mission01_guide_visible_contract:${code}${detail ? `:${detail}` : ''}`);
}

for (const level of [1, 2]) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  if (!html.includes('APULAB_GUIDE_VISIBLE_PANEL')) fail('native_visibility_marker_missing', `l${level}`);
  if (!html.includes('conceptPanel.hidden = false;')) fail('native_panel_stays_hidden', `l${level}`);
  if (!html.includes('GUÍA · 3 PASOS')) fail('native_checklist_title_missing', `l${level}`);
  if (!html.includes('guideActive = enabled;')) fail('native_toggle_missing', `l${level}`);
  if (!html.includes('updateGuide();')) fail('native_render_not_called', `l${level}`);
  if (!html.includes('setGuideMode(!guideActive)')) fail('native_click_toggle_missing', `l${level}`);
}

for (const level of [3, 4]) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  if (!html.includes('function renderStructuredGuide')) fail('structured_renderer_missing', `l${level}`);
  if (!html.includes("info.classList.add('visible')")) fail('structured_panel_stays_hidden', `l${level}`);
  if (!html.includes("textContent='GUÍA · 3 PASOS'")) fail('structured_checklist_title_missing', `l${level}`);
  const hasClick = html.includes("guideBtn.addEventListener('click',()=>") || html.includes("document.getElementById('guide-btn').onclick=()=>");
  if (!hasClick) fail('structured_click_missing', `l${level}`);
}

{
  const html = await readFile(resolve(OUT, 'level5.html'), 'utf8');
  if (html.includes('id="guide-btn"')) fail('l5_top_guide_returned');
  if (!html.includes('data-testid="level5-guide"')) fail('l5_fixed_guide_missing');
  if (!html.includes('GUÍA · <span>REPETIR</span>')) fail('l5_fixed_guide_title');
  if ((html.match(/class="level5-guide-node"/g) || []).length !== 4) fail('l5_fixed_guide_step_count');
  if (!html.includes('level5GuideStep()')) fail('l5_gameplay_driven_guide_missing');
}

console.info('[mission01] GUIDE VISIBLE CONTRACT OK · L1–L4 legacy guides preserved · L5 fixed lower 4-step guide');
