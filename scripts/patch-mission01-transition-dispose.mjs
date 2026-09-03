import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const MANIFEST = resolve(OUT, 'manifest.json');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

function fail(code, detail = '') {
  throw new Error(`mission01_transition_dispose:${code}${detail ? `:${detail}` : ''}`);
}

const outputs = new Map();
for (const level of [1, 2]) {
  const path = resolve(OUT, `level${level}.html`);
  let html = await readFile(path, 'utf8');
  if (html.includes('APULAB_TRANSITION_DISPOSE_V1')) fail('already_patched', `l${level}`);

  const anchor = '  const clock = new THREE.Clock();\n  let lastRenderedAt = 0;\n  function render(timestamp = performance.now()) {\n    requestAnimationFrame(render);';
  if (!html.includes(anchor)) fail('render_anchor', `l${level}`);

  const replacement = `  const clock = new THREE.Clock();\n  let lastRenderedAt = 0;\n  let apulabTransitionDisposed = false; // APULAB_TRANSITION_DISPOSE_V1\n  const disposeForLevelTransition = () => {\n    if (apulabTransitionDisposed) return;\n    apulabTransitionDisposed = true;\n    try { renderer.setAnimationLoop?.(null); } catch (_) {}\n    try { renderer.renderLists?.dispose?.(); } catch (_) {}\n    try { renderer.dispose?.(); } catch (_) {}\n    try { renderer.forceContextLoss?.(); } catch (_) {}\n  };\n  window.addEventListener(\"message\", (event) => {\n    if (event?.data?.type === \"apulab-dispose\") disposeForLevelTransition();\n  });\n  window.addEventListener(\"pagehide\", disposeForLevelTransition, { once: true });\n  window.addEventListener(\"beforeunload\", disposeForLevelTransition, { once: true });\n  function render(timestamp = performance.now()) {\n    if (apulabTransitionDisposed) return;\n    requestAnimationFrame(render);`;

  html = html.replace(anchor, replacement);
  if (!html.includes('if (apulabTransitionDisposed) return;')) fail('render_guard', `l${level}`);
  if (!html.includes('renderer.forceContextLoss?.();')) fail('context_loss', `l${level}`);

  await writeFile(path, html, 'utf8');
  outputs.set(level, html);
  console.info(`[mission01] Nivel ${level} · RAF/renderer se apagan antes de transición`);
}

for (const level of [3, 4, 5]) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  if (!html.includes('function __apulabDisposeLevelV127()')) fail('structured_disposer_missing', `l${level}`);
  if (!html.includes('window.__apulabStopAllAnimationFrames?.()')) fail('structured_raf_stop_missing', `l${level}`);
  if (!html.includes('renderer.forceContextLoss?.()')) fail('structured_context_loss_missing', `l${level}`);
}

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
for (const entry of manifest.levels || []) {
  const level = Number(entry.level);
  if (!outputs.has(level)) continue;
  const html = outputs.get(level);
  entry.bytes = Buffer.byteLength(html, 'utf8');
  entry.sha256 = hash(html);
}
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.info('[mission01] TRANSITION DISPOSE OK · N1–N5 apagan render antes del siguiente nivel');
