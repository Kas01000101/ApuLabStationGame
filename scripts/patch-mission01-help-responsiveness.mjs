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

  if (html.includes('createExploreAttentionThreeArrow') || html.includes('NIVEL 1 · FLECHA EXPLORAR 3D · THREE.JS')) {
    throw new Error('mission01_help_responsiveness_unexpected:l1-three-arrow-remains');
  }

  await writeFile(path, html, 'utf8');
  outputs.set(level, html);
  console.info('[mission01] Nivel 1 · EXPLORAR no pierde clicks · sin renderer Three.js decorativo');
}

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

console.info('[mission01] HELP RESPONSIVENESS QA PATCH OK · ayuda sin callbacks pendientes · sin flecha Three.js en Nivel 1');
