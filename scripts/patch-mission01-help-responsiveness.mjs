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

// Nivel 1: EXPLORAR no debe perder el click por una transición de cámara previa.
// Se conserva intacta la cadencia original de la escena principal para no degradar
// el arrastre ni la sensación de respuesta de los componentes de la mesa.
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

  // La flecha 3D sí es un renderer separado y puramente decorativo. Limitar solo
  // esta señal visual reduce trabajo extra sin tocar el loop interactivo principal.
  html = required(
    html,
    `    let frameId = 0;\n    let disposed = false;\n\n    const render = () => {\n      if (disposed) return;`,
    `    let frameId = 0;\n    let disposed = false;\n    let lastArrowRenderAt = 0;\n\n    const render = (timestamp = performance.now()) => {\n      if (disposed) return;\n      if (!reduceMotion && timestamp - lastArrowRenderAt < 50) {\n        frameId = requestAnimationFrame(render);\n        return;\n      }\n      lastArrowRenderAt = timestamp;`,
    'l1-arrow-frame-budget',
  );

  await writeFile(path, html, 'utf8');
  outputs.set(level, html);
  console.info('[mission01] Nivel 1 · EXPLORAR no pierde clicks · frame principal nativo · flecha 3D ~20 FPS');
}

// Nivel 2: una transición de cámara tampoco debe tragarse EXPLORAR. Durante el
// desplazamiento del carrusel no se fuerza una apertura posterior: el usuario
// conserva control total sobre GUÍA, EXPLORAR y la mesa cuando termina la animación.
{
  const level = 2;
  const path = resolve(OUT, 'level2.html');
  let html = await readFile(path, 'utf8');

  html = required(
    html,
    `  function advanceExplanation() {\n    if (cameraTween || batterySwapAnimating) return;`,
    `  function advanceExplanation() {\n    // La cámara no debe tragarse el click; el carrusel sí protege su transición\n    // activa, pero no deja callbacks pendientes que puedan interferir con GUÍA.\n    if (cameraTween) cameraTween = null;\n    if (batterySwapAnimating) return;`,
    'l2-explore-animation-guard',
  );

  await writeFile(path, html, 'utf8');
  outputs.set(level, html);
  console.info('[mission01] Nivel 2 · EXPLORAR no choca con GUÍA/carrusel · frame principal nativo');
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

console.info('[mission01] HELP RESPONSIVENESS QA PATCH OK · ayuda sin callbacks pendientes · loop interactivo principal intacto');
