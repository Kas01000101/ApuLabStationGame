import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const OUT = resolve(ROOT, 'public/missions/mission01');
const shell = await readFile(resolve(ROOT, 'src/ui/Mission01Screen.ts'), 'utf8');

function fail(code, detail = '') {
  throw new Error(`mission01_transition_contract:${code}${detail ? `:${detail}` : ''}`);
}

if (!shell.includes('APULAB_TRANSITION_SINGLE_LIVE_V1')) fail('shell_marker');
const showAt = shell.indexOf('this.showLevelTransition(level);');
const disposeAt = shell.indexOf('this.disposeFrame(outgoing, true);');
const loadAt = shell.indexOf('incoming.src = path;');
if (showAt < 0 || disposeAt < 0 || loadAt < 0) fail('shell_sequence_missing');
if (!(showAt < disposeAt && disposeAt < loadAt)) fail('outgoing_not_disposed_before_incoming_load');
if (shell.includes('this.disposeFrame(oldFrame);')) fail('legacy_crossfade_dispose');
if (!shell.includes('const MAX_AVAILABLE_LEVEL = 5;')) fail('available_level_contract');

const routes = new Map([
  [1, { next: 2, marker: 'level: 1, nextLevel: 2' }],
  [2, { next: 3, marker: 'level: 2, nextLevel: 3' }],
  [3, { next: 4, marker: "level:3,nextLevel:4" }],
  [4, { next: 5, marker: "level:4,nextLevel:5" }],
]);

for (const [level, route] of routes) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  if (!html.includes(route.marker)) fail('route_missing', `l${level}->${route.next}`);
}

for (const level of [1, 2]) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  if (!html.includes('APULAB_TRANSITION_DISPOSE_V1')) fail('native_dispose_marker', `l${level}`);
  if (!html.includes('if (apulabTransitionDisposed) return;')) fail('native_raf_guard', `l${level}`);
  if (!html.includes('renderer.forceContextLoss?.();')) fail('native_context_release', `l${level}`);
}

for (const level of [3, 4, 5]) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  if (!html.includes('function __apulabDisposeLevelV127()')) fail('structured_disposer', `l${level}`);
  if (!html.includes('window.__apulabStopAllAnimationFrames?.()')) fail('structured_raf_cancel', `l${level}`);
  if (!html.includes('renderer.forceContextLoss?.()')) fail('structured_context_release', `l${level}`);
}

const l5 = await readFile(resolve(OUT, 'level5.html'), 'utf8');
if (!l5.includes('CONTINUAR AL NIVEL 6')) fail('l5_continue_label');
if (!shell.includes('NIVEL ${level} DE ${TOTAL_LEVELS} · AÚN NO ESTÁ INTEGRADO')) fail('unavailable_feedback');

console.info('[mission01] TRANSITION CONTRACT OK · N1→N2→N3→N4→N5 single-live · N6/N7 no integrados');
