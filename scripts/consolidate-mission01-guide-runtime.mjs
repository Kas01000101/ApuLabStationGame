import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const MANIFEST = resolve(OUT, 'manifest.json');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

function fail(code) {
  throw new Error(`mission01_guide_single_owner:${code}`);
}

function removeTaggedBlock(source, tag, id, required = true) {
  const startMarker = `<${tag} id="${id}">`;
  const start = source.indexOf(startMarker);
  if (start < 0) {
    if (required) fail(`missing:${id}`);
    return source;
  }
  const endMarker = `</${tag}>`;
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) fail(`unclosed:${id}`);
  return source.slice(0, start) + source.slice(end + endMarker.length);
}

function removeRange(source, startMarker, endMarker, label, replacement = '') {
  const start = source.indexOf(startMarker);
  if (start < 0) fail(`${label}:start`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) fail(`${label}:end`);
  return source.slice(0, start) + replacement + source.slice(end);
}

function count(source, needle) {
  return source.split(needle).length - 1;
}

function assertSingleNativeOwner(level, html) {
  const guideListenerCount = count(html, 'guideButton.addEventListener("click", () =>');
  if (guideListenerCount !== 1) fail(`l${level}:guide_listener_count:${guideListenerCount}`);
  if (count(html, 'function setGuideMode(enabled)') !== 1) fail(`l${level}:setGuideMode_count`);
  if (count(html, 'function updateGuide()') !== 1) fail(`l${level}:updateGuide_count`);
}

const outputs = new Map();

// LEVEL 1 -------------------------------------------------------------------
{
  const level = 1;
  const path = resolve(OUT, 'level1.html');
  let html = await readFile(path, 'utf8');

  // El runtime pedagógico añadía un segundo listener a GUÍA y un observer que
  // volvía a escribir el contenido nativo. Conservamos únicamente su CSS visual.
  html = removeTaggedBlock(html, 'script', 'level1-pedagogy-final-runtime');

  // La lista/tachado era un segundo renderer de la misma GUÍA. El controlador
  // nativo updateGuide() vuelve a ser la única fuente del título/texto/pista.
  html = removeTaggedBlock(html, 'script', 'level1-guide-strike-runtime');
  html = removeTaggedBlock(html, 'style', 'level1-guide-strike-patch');

  // El layout añadido después del checklist todavía dependía de .guide-task-*.
  // Lo sustituimos por el mismo tamaño/posición pero aplicado al panel nativo.
  html = removeTaggedBlock(html, 'style', 'level1-guide-vertical-layout-patch');
  const nativeGuideLayout = `
<style id="level1-guide-native-layout-patch">
#kawsay-guide-container > #kawsay-concept-panel.is-guide {
  top: 32px !important;
  left: 76px !important;
  right: auto !important;
  bottom: auto !important;
  width: 286px !important;
  min-width: 286px !important;
  max-width: 286px !important;
  min-height: 228px !important;
  height: auto !important;
  padding: 14px 14px 12px !important;
  border-radius: 10px !important;
  box-sizing: border-box !important;
}
#kawsay-guide-container > #kawsay-concept-panel.is-guide > #kawsay-concept-title {
  margin-bottom: 10px !important;
}
#kawsay-guide-container > #kawsay-concept-panel.is-guide > #kawsay-hint {
  margin-top: 10px !important;
  padding-top: 10px !important;
  line-height: 1.35 !important;
}
</style>`;
  if (!html.includes('</head>')) fail('l1:head_missing');
  html = html.replace('</head>', `${nativeGuideLayout}\n</head>`);

  // La recomendación visual sigue existiendo, pero depende del estado nativo
  // is-recommended en vez de un listener auxiliar que llevaba su propio estado.
  html = html.replaceAll(
    '#kawsay-hud-container > #kawsay-guide.level1-guide-attention',
    '#kawsay-hud-container > #kawsay-guide.is-recommended',
  );

  // El audio no debe observar/re-renderizar GUÍA. Mantenemos click UI y confeti.
  html = removeRange(
    html,
    "  const guidePanel = document.getElementById('kawsay-concept-panel');",
    "  const confettiLayer = document.getElementById('kawsay-confetti');",
    'l1:guide_audio_observer',
    "  const guideObserver = null;\n\n",
  );

  if (html.includes('level1-pedagogy-final-runtime')) fail('l1:pedagogy_runtime_remains');
  if (html.includes('level1-guide-strike-runtime') || html.includes('guide-task-list') || html.includes('level1-guide-task-panel')) fail('l1:guide_renderer_remains');
  if (html.includes('new MutationObserver(emphasizeGuidePanel)')) fail('l1:pedagogy_observer_remains');
  if (html.includes('new MutationObserver(inspectCompletedGuideTasks)')) fail('l1:audio_guide_observer_remains');
  if (!html.includes('1 · ENCIENDE LA BATERÍA')) fail('l1:native_guide_copy_missing');
  assertSingleNativeOwner(level, html);

  await writeFile(path, html, 'utf8');
  outputs.set(level, html);
  console.info('[mission01] Nivel 1 · GUÍA consolidada · un listener · renderer nativo único · sin observers/checklist paralelo');
}

// LEVEL 2 -------------------------------------------------------------------
{
  const level = 2;
  const path = resolve(OUT, 'level2.html');
  let html = await readFile(path, 'utf8');

  // El shell progresivo ocultaba el DOM nativo y mantenía un polling de 300 ms.
  // updateGuide() ya conoce measuredValues y es suficiente para toda la guía.
  html = removeTaggedBlock(html, 'style', 'apulab-level2-progress-guide-style');
  html = removeTaggedBlock(html, 'script', 'apulab-level2-progress-guide-runtime');
  html = html.replace(/\n?window\.__apulabLevel2MeasuredCount\s*=\s*\(\)\s*=>\s*measuredValues\.size;?\n?/g, '\n');

  if (html.includes('apulab-level2-progress-guide-runtime') || html.includes('apulab-l2-guide-shell')) fail('l2:progress_renderer_remains');
  if (html.includes('window.__apulabLevel2MeasuredCount')) fail('l2:progress_getter_remains');
  if (html.includes('window.setInterval(() => render(false), 300)')) fail('l2:guide_polling_remains');
  if (html.includes("document.getElementById('kawsay-guide')?.addEventListener")) fail('l2:secondary_guide_listener_remains');
  if (!html.includes('MIDE LAS 3 BATERÍAS')) fail('l2:native_guide_copy_missing');
  assertSingleNativeOwner(level, html);

  await writeFile(path, html, 'utf8');
  outputs.set(level, html);
  console.info('[mission01] Nivel 2 · GUÍA consolidada · un listener · renderer nativo único · sin shell ni polling');
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

console.info('[mission01] GUIDE SINGLE OWNER CONSOLIDATION OK · Niveles 1–2 usan solo setGuideMode/updateGuide nativos');
