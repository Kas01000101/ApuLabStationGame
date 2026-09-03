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

function replaceRequired(source, before, after, label) {
  if (!source.includes(before)) fail(`${label}:missing`);
  return source.replace(before, after);
}

function replaceFunctionBefore(source, functionName, nextFunctionName, replacement, label) {
  const startMarker = `  function ${functionName}`;
  const endMarker = `  function ${nextFunctionName}`;
  const start = source.indexOf(startMarker);
  if (start < 0) fail(`${label}:start`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) fail(`${label}:end`);
  return source.slice(0, start) + replacement + '\n\n' + source.slice(end);
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

  // GUÍA debe tener un único propietario. Retiramos runtimes históricos que
  // escuchaban/re-renderizaban el mismo botón/panel.
  html = removeTaggedBlock(html, 'script', 'level1-pedagogy-final-runtime');
  html = removeTaggedBlock(html, 'script', 'level1-guide-strike-runtime');
  html = removeTaggedBlock(html, 'style', 'level1-guide-strike-patch');

  // EXPLORAR tampoco necesita MutationObserver sobre el panel compartido.
  // Su clase visual se controla directamente desde showExplanationStep/setHudNormal.
  html = removeTaggedBlock(html, 'script', 'level1-explore-panel-correction-runtime');
  html = replaceRequired(
    html,
    'conceptPanel.classList.remove("is-guide", "is-compact");',
    'conceptPanel.classList.remove("is-guide", "is-compact", "level1-explore-panel");',
    'l1:setHudNormal-explore-class',
  );
  html = replaceRequired(
    html,
    '    conceptPanel.classList.remove("is-guide");\n    sceneHint.textContent = "";',
    '    conceptPanel.classList.remove("is-guide");\n    conceptPanel.classList.add("level1-explore-panel");\n    sceneHint.textContent = "";',
    'l1:showExplanation-explore-class',
  );

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

  // La recomendación visual depende solo de la clase nativa is-recommended.
  html = html.replaceAll(
    '#kawsay-hud-container > #kawsay-guide.level1-guide-attention',
    '#kawsay-hud-container > #kawsay-guide.is-recommended',
  );

  // El audio no observa ni re-renderiza GUÍA. Se conservan click UI y confeti.
  html = removeRange(
    html,
    "  const guidePanel = document.getElementById('kawsay-concept-panel');",
    "  const confettiLayer = document.getElementById('kawsay-confetti');",
    'l1:guide_audio_observer',
    "  const guideObserver = null;\n\n",
  );

  // GUÍA es UI pura. Solo la primera apertura sincroniza el reto para desbloquear
  // la mesa; cerrar/reabrir nunca vuelve a recalcular geometría ni gameplay.
  const level1GuideMode = `  function setGuideMode(enabled) {
    enforceUiAnchors();
    if (enabled && !explanationCompleted) return;

    // APULAB_GUIDE_UI_ONLY_V3
    if (cameraTween) cameraTween = null;

    const firstGuideOpen = enabled && !guideOpenedOnce;
    guideActive = enabled;
    conceptPanel.classList.toggle("is-guide", enabled);
    conceptPanel.classList.remove("level1-explore-panel");
    guideButton.classList.toggle("is-active", enabled);
    guideButton.setAttribute("aria-pressed", String(enabled));

    if (enabled) {
      guideOpenedOnce = true;
      gameplayUnlocked = true;
      guideButton.classList.remove("is-recommended");
      explanationButton.classList.remove("is-recommended");

      if (firstGuideOpen) {
        // Única sincronización necesaria: pasar de INTRO al reto real.
        updateChallengeState();
        liveStatus.textContent = "GUÍA abierta. Puedes seguir usando POWER, las puntas y los terminales mientras consultas los pasos.";
      } else {
        updateGuide();
      }
    } else {
      setHudNormal();
    }
  }`;
  html = replaceFunctionBefore(html, 'setGuideMode(enabled) {', 'dismissExploreAttention() {', level1GuideMode, 'l1:setGuideMode-v3');

  // CRÍTICO: abrir GUÍA no puede cambiar el camino del requestAnimationFrame.
  // Los resaltados 3D quedan reservados a EXPLORAR; la GUÍA solo cambia DOM.
  html = replaceRequired(
    html,
    '    const guideVisible = guideActive && !explanationMode;',
    '    const guideVisible = false; // APULAB_GUIDE_RENDER_DECOUPLED_V3',
    'l1:guide-render-decouple',
  );

  // Si un resaltado auxiliar falla por GPU/driver, nunca debe impedir el render
  // principal de la mesa. Se registra una vez y renderer.render() continúa.
  html = replaceRequired(
    html,
    '    updateInteractiveHighlights(pulse, now);\n    renderer.render(scene, camera);',
    `    try {
      updateInteractiveHighlights(pulse, now);
    } catch (error) {
      if (!window.__APULAB_RENDER_HIGHLIGHT_ERROR__) {
        window.__APULAB_RENDER_HIGHLIGHT_ERROR__ = String(error?.stack || error);
        console.error('[ApuLab] highlight render guard', error);
      }
    }
    // APULAB_RENDER_HIGHLIGHT_GUARD_V3
    renderer.render(scene, camera);`,
    'l1:render-guard',
  );

  const l1Forbidden = [
    'level1-pedagogy-final-runtime',
    'level1-guide-strike-runtime',
    'guide-task-list',
    'level1-guide-task-panel',
    'level1-explore-panel-correction-runtime',
    'new MutationObserver(emphasizeGuidePanel)',
    'new MutationObserver(inspectCompletedGuideTasks)',
    'const guideVisible = guideActive && !explanationMode;',
  ];
  for (const marker of l1Forbidden) if (html.includes(marker)) fail(`l1:forbidden:${marker}`);
  if (!html.includes('APULAB_GUIDE_UI_ONLY_V3')) fail('l1:guide_ui_only_marker');
  if (!html.includes('APULAB_GUIDE_RENDER_DECOUPLED_V3')) fail('l1:render_decoupled_marker');
  if (!html.includes('APULAB_RENDER_HIGHLIGHT_GUARD_V3')) fail('l1:render_guard_marker');
  if (!html.includes('1 · ENCIENDE LA BATERÍA')) fail('l1:native_guide_copy_missing');
  assertSingleNativeOwner(level, html);

  await writeFile(path, html, 'utf8');
  outputs.set(level, html);
  console.info('[mission01] Nivel 1 · GUÍA UI-only · RAF desacoplado · sin observer del panel · renderer protegido');
}

// LEVEL 2 -------------------------------------------------------------------
{
  const level = 2;
  const path = resolve(OUT, 'level2.html');
  let html = await readFile(path, 'utf8');

  // El shell progresivo ocultaba el DOM nativo y mantenía polling propio.
  html = removeTaggedBlock(html, 'style', 'apulab-level2-progress-guide-style');
  html = removeTaggedBlock(html, 'script', 'apulab-level2-progress-guide-runtime');
  html = html.replace(/\n?window\.__apulabLevel2MeasuredCount\s*=\s*\(\)\s*=>\s*measuredValues\.size;?\n?/g, '\n');

  const level2GuideMode = `  function setGuideMode(enabled) {
    enforceUiAnchors();

    // APULAB_GUIDE_UI_ONLY_V3
    if (cameraTween) cameraTween = null;

    guideActive = enabled;
    guideOpenedOnce = true;
    gameplayUnlocked = true;
    conceptPanel.classList.toggle("is-guide", enabled);
    guideButton.classList.toggle("is-active", enabled);
    guideButton.classList.remove("is-recommended");
    guideButton.setAttribute("aria-pressed", String(enabled));

    if (enabled) {
      wrongChoiceFeedback = null;
      syncGuideBatteryFocus();
      updateGuide();
      liveStatus.textContent = "GUÍA abierta. Puedes seguir midiendo y moviendo las puntas sin salir del juego.";
    } else {
      setHudNormal();
    }
  }`;
  html = replaceFunctionBefore(html, 'setGuideMode(enabled) {', 'showExplanationStep() {', level2GuideMode, 'l2:setGuideMode-v3');

  html = replaceRequired(
    html,
    '    const guideVisible = guideActive && !explanationMode;',
    '    const guideVisible = false; // APULAB_GUIDE_RENDER_DECOUPLED_V3',
    'l2:guide-render-decouple',
  );

  html = replaceRequired(
    html,
    '    updateInteractiveHighlights(pulse, now);\n    updateBatteryArrowPosition();\n    renderer.render(scene, camera);',
    `    try {
      updateInteractiveHighlights(pulse, now);
    } catch (error) {
      if (!window.__APULAB_RENDER_HIGHLIGHT_ERROR__) {
        window.__APULAB_RENDER_HIGHLIGHT_ERROR__ = String(error?.stack || error);
        console.error('[ApuLab] highlight render guard', error);
      }
    }
    // APULAB_RENDER_HIGHLIGHT_GUARD_V3
    updateBatteryArrowPosition();
    renderer.render(scene, camera);`,
    'l2:render-guard',
  );

  const l2Forbidden = [
    'apulab-level2-progress-guide-runtime',
    'apulab-l2-guide-shell',
    'window.__apulabLevel2MeasuredCount',
    'window.setInterval(() => render(false), 300)',
    "document.getElementById('kawsay-guide')?.addEventListener",
    'const guideVisible = guideActive && !explanationMode;',
  ];
  for (const marker of l2Forbidden) if (html.includes(marker)) fail(`l2:forbidden:${marker}`);
  if (!html.includes('APULAB_GUIDE_UI_ONLY_V3')) fail('l2:guide_ui_only_marker');
  if (!html.includes('APULAB_GUIDE_RENDER_DECOUPLED_V3')) fail('l2:render_decoupled_marker');
  if (!html.includes('APULAB_RENDER_HIGHLIGHT_GUARD_V3')) fail('l2:render_guard_marker');
  if (!html.includes('MIDE LAS 3 BATERÍAS')) fail('l2:native_guide_copy_missing');
  assertSingleNativeOwner(level, html);

  await writeFile(path, html, 'utf8');
  outputs.set(level, html);
  console.info('[mission01] Nivel 2 · GUÍA UI-only · RAF desacoplado · sin shell/polling · renderer protegido');
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

console.info('[mission01] GUIDE RENDER DECOUPLING V3 OK · GUÍA no modifica RAF/Three.js en Niveles 1–2');
