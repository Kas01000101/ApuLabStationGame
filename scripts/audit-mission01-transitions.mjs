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

// La transición entre niveles debe ser directa. No se permite volver a introducir
// la tarjeta centrada "MISIÓN 01 / NIVEL X / título" ni su CSS.
if (/mission01-level-transition|transitionCurtain|transitionLevel|transitionTitle|showLevelTransition|hideLevelTransition/.test(shell)) {
  fail('level_transition_card_present');
}
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

// Cada documento sigue siendo responsable de limpiar su propio render cuando el
// navegador dispara pagehide/beforeunload durante la navegación del iframe único.
for (const level of [1, 2]) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  if (!html.includes('APULAB_TRANSITION_DISPOSE_V1')) fail('native_dispose_marker', `l${level}`);
  if (!html.includes('if (apulabTransitionDisposed) return;')) fail('native_raf_guard', `l${level}`);
  if (!html.includes('renderer.forceContextLoss?.();')) fail('native_context_release', `l${level}`);
  if (!html.includes('pagehide')) fail('native_pagehide', `l${level}`);
}

for (const level of [3, 4, 5]) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  if (!html.includes('function __apulabDisposeLevelV127()')) fail('structured_disposer', `l${level}`);
  if (!html.includes('window.__apulabStopAllAnimationFrames?.()')) fail('structured_raf_cancel', `l${level}`);
  if (!html.includes('renderer.forceContextLoss?.()')) fail('structured_context_release', `l${level}`);
  if (!html.includes('pagehide')) fail('structured_pagehide', `l${level}`);
}

for (const level of [6, 7]) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  if (!html.includes('rafIds.clear()')) fail('new_raf_cancel', `l${level}`);
  if (!html.includes('renderer.dispose()')) fail('new_renderer_dispose', `l${level}`);
  if (!html.includes('renderer.forceContextLoss?.()')) fail('new_context_release', `l${level}`);
  if (!html.includes('pagehide')) fail('new_pagehide', `l${level}`);
}

const l7 = await readFile(resolve(OUT, 'level7.html'), 'utf8');
if (/nextLevel\s*:\s*8|CONTINUAR AL NIVEL 8/.test(l7)) fail('fake_level8');

console.info('[mission01] TRANSITION CONTRACT V4 OK · 1→7 · direct level switch · no transition card · native unload cleanup');
