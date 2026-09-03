import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');

function fail(code, detail = '') {
  throw new Error(`mission01_guide_single_owner_contract:${code}${detail ? `:${detail}` : ''}`);
}

function count(source, needle) {
  return source.split(needle).length - 1;
}

function audit(level, html) {
  const listeners = count(html, 'guideButton.addEventListener("click", () =>');
  if (listeners !== 1) fail('guide_listener_count', `l${level}:${listeners}`);
  if (count(html, 'function setGuideMode(enabled)') !== 1) fail('setGuideMode_count', `l${level}`);
  if (count(html, 'function updateGuide()') !== 1) fail('updateGuide_count', `l${level}`);

  if (!html.includes('if (guideActive) return "guide";')) fail('help_mode_missing', `l${level}`);
  if (!html.includes('return gameplayUnlocked && currentHelpMode() !== "explore";')) fail('guide_table_gate', `l${level}`);

  if (html.includes('APULAB_HELP_LIFECYCLE_START') || html.includes('apulabHelpPanelClosed')) {
    fail('global_help_interceptor', `l${level}`);
  }

  if (level === 1) {
    const forbidden = [
      'level1-pedagogy-final-runtime',
      'level1-guide-strike-runtime',
      'guide-task-list',
      'new MutationObserver(emphasizeGuidePanel)',
      'new MutationObserver(inspectCompletedGuideTasks)',
    ];
    for (const marker of forbidden) if (html.includes(marker)) fail('l1_duplicate_runtime', marker);
    if (!html.includes('#kawsay-hud-container > #kawsay-guide.is-recommended')) fail('l1_recommendation_style_missing');
    if (!html.includes('1 · ENCIENDE LA BATERÍA')) fail('l1_native_guide_copy');
  }

  if (level === 2) {
    const forbidden = [
      'apulab-level2-progress-guide-runtime',
      'apulab-l2-guide-shell',
      'window.__apulabLevel2MeasuredCount',
      'window.setInterval(() => render(false), 300)',
      "document.getElementById('kawsay-guide')?.addEventListener",
    ];
    for (const marker of forbidden) if (html.includes(marker)) fail('l2_duplicate_runtime', marker);
    if (!html.includes('MIDE LAS 3 BATERÍAS')) fail('l2_native_guide_copy');
  }
}

for (const level of [1, 2]) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  audit(level, html);
}

console.info('[mission01] GUIDE SINGLE OWNER OK · L1/L2 un listener · renderer nativo único · sin observers/polling de GUÍA');
