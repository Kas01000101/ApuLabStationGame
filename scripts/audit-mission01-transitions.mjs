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
const disposeAt = shell.indexOf('this.disposeFrame(outgoing);');
const loadAt = shell.indexOf('incoming.src = path;');
if (showAt < 0 || disposeAt < 0 || loadAt < 0) fail('shell_sequence_missing');
if (!(showAt < disposeAt && disposeAt < loadAt)) fail('outgoing_not_disposed_before_incoming_load');
if (!shell.includes('const MAX_AVAILABLE_LEVEL = 7;')) fail('available_level_contract');
if (!shell.includes("6: 'MISIÓN CIENTÍFICA'")) fail('title6');
if (!shell.includes("7: 'SENSORES Y BUCLES'")) fail('title7');

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

for (const level of [6, 7]) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  if (!html.includes("type==='apulab-dispose'")) fail('new_dispose_listener', `l${level}`);
  if (!html.includes('rafIds.clear()')) fail('new_raf_cancel', `l${level}`);
  if (!html.includes('renderer.dispose()')) fail('new_renderer_dispose', `l${level}`);
  if (!html.includes('renderer.forceContextLoss?.()')) fail('new_context_release', `l${level}`);
}

const l7 = await readFile(resolve(OUT, 'level7.html'), 'utf8');
if (/nextLevel\s*:\s*8|CONTINUAR AL NIVEL 8/.test(l7)) fail('fake_level8');

console.info('[mission01] TRANSITION CONTRACT OK · N1→N2→N3→N4→N5→N6→N7 single-live');
