import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = process.cwd();

function replaceFunctionBefore(source, functionName, nextFunctionName, replacement, label) {
  const startMarker = `  function ${functionName}() {`;
  const endMarker = `  function ${nextFunctionName}() {`;
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`mission01_auto_guide_missing:${label}:start`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`mission01_auto_guide_missing:${label}:end`);
  return source.slice(0, start) + replacement + '\n\n' + source.slice(end);
}

function removeManualGuideGate(source) {
  return source.replace(
    /\n    if \(!explanationMode && explanationCompleted && !guideOpenedOnce && !cameraTween\) \{[\s\S]*?\n      return;\n    \}\n/,
    '\n',
  );
}

async function patchLevel1() {
  const path = resolve(ROOT, 'public/missions/mission01/level1.html');
  let html = await readFile(path, 'utf8');

  if (!html.includes('function dismissExploreAttention()')) {
    throw new Error('mission01_auto_guide_level1_missing_attention_runtime');
  }

  const replacement = `  function finishExplanation() {
    enforceUiAnchors();
    explanationMode = false;
    explanationCompleted = true;
    exploreCompleted = true;
    dismissExploreAttention();
    explanationIndex = -1;

    explanationButton.classList.remove("is-active", "is-recommended");
    explanationButton.textContent = "EXPLORAR";
    explanationButton.setAttribute("aria-label", "Explorar de nuevo");
    guideButton.disabled = false;
    setBatteryXray(false);

    // EXPLORAR 4/4 termina directamente en GUÍA: no pedimos "abre GUÍA".
    guideButton.classList.remove("is-recommended");
    guideButton.setAttribute("aria-label", "Cerrar GUÍA");
    setGuideMode(true);
  }`;

  html = replaceFunctionBefore(html, 'finishExplanation', 'advanceExplanation', replacement, 'level1-finish');
  html = removeManualGuideGate(html);
  html = html.replaceAll('Primero abre la GUÍA', 'GUÍA');
  html = html.replaceAll('Primero abre la Guía', 'GUÍA');
  html = html.replaceAll('Abrir GUÍA para desbloquear el reto', 'Abrir GUÍA');
  html = html.replaceAll('GUÍA disponible al terminar EXPLORAR', 'GUÍA no disponible durante EXPLORAR');

  await writeFile(path, html, 'utf8');
  console.info('[mission01] Level 1 · EXPLORAR 4/4 abre GUÍA automáticamente');
}

async function patchLevel2() {
  const path = resolve(ROOT, 'public/missions/mission01/level2.html');
  let html = await readFile(path, 'utf8');

  const replacement = `  function finishExplanation() {
    enforceUiAnchors();
    explanationMode = false;
    explanationCompleted = true;
    explanationIndex = -1;

    explanationButton.classList.remove("is-active", "is-recommended");
    explanationButton.textContent = "EXPLORAR";
    explanationButton.setAttribute("aria-label", "Explorar de nuevo");
    guideButton.disabled = false;
    setBatteryXray(false);

    // EXPLORAR 4/4 termina directamente en GUÍA: no pedimos "abre GUÍA".
    guideButton.classList.remove("is-recommended");
    guideButton.setAttribute("aria-label", "Cerrar GUÍA");
    setGuideMode(true);
  }`;

  html = replaceFunctionBefore(html, 'finishExplanation', 'advanceExplanation', replacement, 'level2-finish');
  html = removeManualGuideGate(html);
  html = html.replaceAll('Primero abre la GUÍA', 'GUÍA');
  html = html.replaceAll('Primero abre la Guía', 'GUÍA');
  html = html.replaceAll('Abrir GUÍA para desbloquear el reto', 'Abrir GUÍA');
  html = html.replaceAll('GUÍA disponible al terminar EXPLORAR', 'GUÍA no disponible durante EXPLORAR');
  html = html.replaceAll(
    'Nivel 2: primero pulsa EXPLORAR. Al terminar, abre GUÍA para desbloquear las mediciones.',
    'Nivel 2: pulsa EXPLORAR. Al terminar, la GUÍA se abrirá automáticamente.',
  );

  await writeFile(path, html, 'utf8');
  console.info('[mission01] Level 2 · EXPLORAR 4/4 abre GUÍA automáticamente');
}

await patchLevel1();
await patchLevel2();
