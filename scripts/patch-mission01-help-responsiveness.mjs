import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const MANIFEST = resolve(OUT, 'manifest.json');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

function required(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`mission01_help_responsiveness_missing:${label}`);
  return source.replace(before, after);
}

const outputs = new Map();

// Nivel 1: un click en EXPLORAR debe tener prioridad sobre una transición de cámara
// que aún esté terminando. El siguiente showExplanationStep() crea su propio tween.
{
  const level = 1;
  const path = resolve(OUT, 'level1.html');
  let html = await readFile(path, 'utf8');

  html = required(
    html,
    `  function advanceExplanation() {\n    if (cameraTween) return;`,
    `  function advanceExplanation() {\n    // EXPLORAR tiene prioridad: no descartamos el click por un tween anterior.\n    if (cameraTween) cameraTween = null;`,
    'l1-explore-camera-guard',
  );

  // La escena principal no necesita 60 FPS para este tablero estático. Reducir el
  // ritmo evita picos de GPU sin cambiar tiempos de interacción ni animaciones lógicas.
  html = required(
    html,
    `const minFrameInterval = modalOpen ? 100 : (lowPowerDevice ? 22 : 16);`,
    `const minFrameInterval = modalOpen ? 100 : (lowPowerDevice ? 30 : 20);`,
    'l1-frame-budget',
  );

  // La flecha 3D es una señal visual secundaria; ~20 FPS es suficiente y evita
  // mantener un segundo renderer al mismo ritmo que la escena principal.
  html = required(
    html,
    `    let frameId = 0;\n    let disposed = false;\n\n    const render = () => {\n      if (disposed) return;`,
    `    let frameId = 0;\n    let disposed = false;\n    let lastArrowRenderAt = 0;\n\n    const render = (timestamp = performance.now()) => {\n      if (disposed) return;\n      if (!reduceMotion && timestamp - lastArrowRenderAt < 50) {\n        frameId = requestAnimationFrame(render);\n        return;\n      }\n      lastArrowRenderAt = timestamp;`,
    'l1-arrow-frame-budget',
  );

  await writeFile(path, html, 'utf8');
  outputs.set(level, html);
  console.info('[mission01] Nivel 1 · EXPLORAR no pierde clicks por cameraTween · render 50/33 FPS · flecha 3D ~20 FPS');
}

// Nivel 2: GUÍA y el carrusel usan transiciones de cámara. Antes, advanceExplanation
// descartaba el click por completo si cualquiera seguía activa. Ahora cancela solo el
// tween de cámara; si el carrusel está desplazándose, conserva un único click pendiente.
{
  const level = 2;
  const path = resolve(OUT, 'level2.html');
  let html = await readFile(path, 'utf8');

  html = required(
    html,
    `  let batterySwapAnimating = false;`,
    `  let batterySwapAnimating = false;\n  let pendingExploreAfterSwap = false;`,
    'l2-pending-explore-state',
  );

  html = required(
    html,
    `  function advanceExplanation() {\n    if (cameraTween || batterySwapAnimating) return;`,
    `  function advanceExplanation() {\n    // No descartamos EXPLORAR porque GUÍA/cámara todavía estén regresando.\n    if (cameraTween) cameraTween = null;\n    if (batterySwapAnimating) {\n      if (!pendingExploreAfterSwap) {\n        pendingExploreAfterSwap = true;\n        window.setTimeout(() => {\n          pendingExploreAfterSwap = false;\n          if (!batterySwapAnimating) advanceExplanation();\n        }, 460);\n      }\n      return;\n    }`,
    'l2-explore-animation-guard',
  );

  html = required(
    html,
    `const minFrameInterval = modalOpen ? 100 : (lowPowerDevice ? 22 : 16);`,
    `const minFrameInterval = modalOpen ? 100 : (lowPowerDevice ? 30 : 20);`,
    'l2-frame-budget',
  );

  await writeFile(path, html, 'utf8');
  outputs.set(level, html);
  console.info('[mission01] Nivel 2 · EXPLORAR conserva click durante cámara/carrusel · render 50/33 FPS');
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

console.info('[mission01] HELP RESPONSIVENESS QA PATCH OK · clicks preservados + frame budget reducido');
