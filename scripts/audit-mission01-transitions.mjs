import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const OUT = resolve(ROOT, 'public/missions/mission01');
const shell = await readFile(resolve(ROOT, 'src/ui/Mission01Screen.ts'), 'utf8');
const shellCss = await readFile(resolve(ROOT, 'src/styles/mission01.css'), 'utf8');

function fail(code, detail = '') {
  throw new Error(`mission01_transition_contract:${code}${detail ? `:${detail}` : ''}`);
}

if (!shell.includes('APULAB_TRANSITION_NATIVE_UNLOAD_V4')) fail('native_unload_marker');
if (!shell.includes("this.frames.push(this.createFrame('A'));")) fail('single_frame_creation');
if (/createFrame\('B'\)/.test(shell)) fail('reserve_frame_still_exists');
if (!shell.includes('const frameIndex = this.activeFrameIndex;')) fail('same_frame_index');
if (!shell.includes('frame.src = path;')) fail('same_frame_navigation');
if (/DISPOSE_HANDOFF_MS|handoffTimer/.test(shell)) fail('legacy_handoff_still_present');
if (!shell.includes('APULAB_LEGACY_NAV_BRIDGE_V1')) fail('legacy_bridge_marker');
if (!shell.includes('bridgeWindow.apulabCompleteLevel = this.handleLegacyLevelComplete;')) fail('legacy_complete_bridge');
if (!shell.includes('bridgeWindow.apulabLevelReady = this.handleLegacyLevelReady;')) fail('legacy_ready_bridge');
if (!shell.includes('completedLevel !== this.activeLevel')) fail('legacy_complete_active_guard');
if (!shell.includes('requestedNext !== this.activeLevel + 1')) fail('legacy_complete_next_guard');
if (!shell.includes('this.requestLevel(this.activeLevel + 1);')) fail('legacy_complete_navigation');

if (/mission01-level-transition|transitionCurtain|transitionLevel|transitionTitle|showLevelTransition|hideLevelTransition/.test(shell)) fail('level_transition_card_present');
if (/mission01-level-transition/.test(shellCss)) fail('level_transition_card_css_present');

const requestBlockStart = shell.indexOf('  private requestLevel(level: number): void {');
const requestBlockEnd = shell.indexOf('  private markPendingReady(', requestBlockStart);
const requestBlock = shell.slice(requestBlockStart, requestBlockEnd);
if (requestBlockStart < 0 || requestBlockEnd < 0) fail('request_block_missing');
if (requestBlock.includes('signalFrameDispose')) fail('dispose_message_during_transition');
if (requestBlock.includes('postMessage')) fail('postmessage_during_transition');
if (/frame\.src\s*=\s*['"]about:blank['"]/.test(requestBlock)) fail('about_blank_in_transition');
if (/activeFrameIndex\s*===\s*0\s*\?\s*1\s*:\s*0/.test(requestBlock)) fail('iframe_swap_still_present');
const pendingAt = requestBlock.indexOf('this.pending =');
const listenerAt = requestBlock.indexOf("frame.addEventListener('load', onLoad)");
const navigateAt = requestBlock.indexOf('frame.src = path;');
if (!(pendingAt >= 0 && listenerAt > pendingAt && navigateAt > listenerAt)) fail('direct_navigation_sequence');
if (!shell.includes('const MAX_AVAILABLE_LEVEL = 7;')) fail('available_level_contract');

for (let level = 1; level <= 7; level++) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  if (!html.includes(`${level} / 7`) && !html.includes(`${level}/7`)) fail('progress', `l${level}`);
}

const routePatterns = new Map([
  [1, /level\s*:\s*1\s*,\s*nextLevel\s*:\s*2/],
  [2, /level\s*:\s*2\s*,\s*nextLevel\s*:\s*3/],
  [3, /level\s*:\s*3\s*,\s*nextLevel\s*:\s*4/],
  [4, /level\s*:\s*4\s*,\s*nextLevel\s*:\s*5/],
  [5, /(?:level\s*:\s*5\s*,\s*nextLevel\s*:\s*6|apulabCompleteLevel\(5\s*,\s*6\))/],
  [6, /level\s*:\s*6\s*,\s*nextLevel\s*:\s*7/],
]);
for (const [level, pattern] of routePatterns) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  if (!pattern.test(html)) fail('route_missing', `l${level}->${level + 1}`);
}

const l3 = await readFile(resolve(OUT, 'level3.html'), 'utf8');
if (!l3.includes('CONTINUAR AL NIVEL 4')) fail('l3_continue_button');
if (!/apulabCompleteLevel\(3\s*,\s*4\)|level\s*:\s*3\s*,\s*nextLevel\s*:\s*4/.test(l3)) fail('l3_completion_bridge');

for (const level of [1, 2]) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  if (!html.includes('APULAB_TRANSITION_DISPOSE_V1')) fail('native_dispose_marker', `l${level}`);
  if (!html.includes('if (apulabTransitionDisposed) return;')) fail('native_raf_guard', `l${level}`);
  if (!html.includes('renderer.forceContextLoss?.();')) fail('native_context_release', `l${level}`);
  if (!html.includes('pagehide')) fail('native_pagehide', `l${level}`);
}

// N3–N7 usan el disposer estructurado de la familia canónica de programación.
for (const level of [3, 4, 5, 6, 7]) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  if (level === 6 && !html.includes('APULAB_LEVEL6_FROM_LEVEL5_V1')) fail('l6_source');
  if (level === 7 && !html.includes('APULAB_LEVEL7_FROM_LEVEL5_V1')) fail('l7_source');
  if (!html.includes('function __apulabDisposeLevelV127()')) fail('structured_disposer', `l${level}`);
  if (!html.includes('window.__apulabStopAllAnimationFrames?.()')) fail('structured_raf_cancel', `l${level}`);
  if (!html.includes('renderer.dispose()')) fail('structured_renderer_dispose', `l${level}`);
  if (!html.includes('renderer.forceContextLoss?.()')) fail('structured_context_release', `l${level}`);
  if (!html.includes('pagehide')) fail('structured_pagehide', `l${level}`);
}

const l7 = await readFile(resolve(OUT, 'level7.html'), 'utf8');
if (/nextLevel\s*:\s*8|CONTINUAR AL NIVEL 8/.test(l7)) fail('fake_level8');

console.info('[mission01] TRANSITION CONTRACT V6 OK · N6/N7 usan cleanup estructurado heredado de N5 · sin nivel 8');
