import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const MANIFEST = resolve(OUT, 'manifest.json');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

function fail(label) {
  throw new Error(`mission01_help_interaction_controller:${label}`);
}

function findBalancedRange(source, anchor, label) {
  const anchorIndex = source.indexOf(anchor);
  if (anchorIndex < 0) fail(`${label}:anchor`);
  const openBrace = source.indexOf('{', anchorIndex + anchor.length);
  if (openBrace < 0) fail(`${label}:brace`);

  let depth = 0;
  let quote = null;
  let escaped = false;
  let templateDepth = 0;

  for (let i = openBrace; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];

    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (quote === '`' && ch === '$' && next === '{') { templateDepth += 1; i += 1; continue; }
      if (quote === '`' && ch === '}' && templateDepth > 0) { templateDepth -= 1; continue; }
      if (ch === quote && templateDepth === 0) quote = null;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '/' && next === '/') {
      const nl = source.indexOf('\n', i + 2);
      if (nl < 0) break;
      i = nl;
      continue;
    }
    if (ch === '/' && next === '*') {
      const close = source.indexOf('*/', i + 2);
      if (close < 0) fail(`${label}:comment`);
      i = close + 1;
      continue;
    }

    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return {
          anchorIndex,
          openBrace,
          closeBrace: i,
          body: source.slice(openBrace + 1, i),
        };
      }
    }
  }

  fail(`${label}:unbalanced`);
}

function insertBefore(source, marker, snippet, label) {
  const index = source.indexOf(marker);
  if (index < 0) fail(`${label}:marker`);
  return source.slice(0, index) + snippet + source.slice(index);
}

function patchGuideLifecycle(source, level) {
  const range = findBalancedRange(source, 'function setGuideMode(enabled)', `l${level}:guide`);
  if (range.body.includes('APULAB_GUIDE_NONBLOCKING')) fail(`l${level}:guide_already_patched`);

  const tail = `\n    // APULAB_GUIDE_NONBLOCKING\n    // GUÍA es una capa pedagógica: nunca conserva una transición de cámara\n    // que pueda impedir tocar POWER, puntas, terminales o el carrusel.\n    if (cameraTween) cameraTween = null;\n    updateChallengeState();\n    if (guideActive) updateGuide();\n  `;

  return source.slice(0, range.closeBrace) + tail + source.slice(range.closeBrace);
}

function patchTableInteraction(source, level) {
  if (source.includes('function canInteractWithTable()')) fail(`l${level}:interaction_already_patched`);

  const helpers = `  // APULAB_TABLE_INTERACTION_CONTROLLER\n  function currentHelpMode() {\n    if (explanationMode) return \"explore\";\n    if (guideActive) return \"guide\";\n    return \"idle\";\n  }\n\n  function canInteractWithTable() {\n    // GUÍA acompaña el juego; solo EXPLORAR puede suspender la manipulación.\n    return gameplayUnlocked && currentHelpMode() !== \"explore\";\n  }\n\n  function prepareTableInteraction() {\n    // La cámara es decorativa. El primer gesto del usuario siempre tiene prioridad.\n    if (cameraTween) cameraTween = null;\n  }\n\n`;

  source = insertBefore(
    source,
    '  canvas.addEventListener("pointerdown", (event) => {',
    helpers,
    `l${level}:interaction_helpers`,
  );

  const blockingGuard = /    if \(explanationMode \|\| !gameplayUnlocked \|\| cameraTween\) return;/g;
  const matches = source.match(blockingGuard) || [];
  if (matches.length < 2) fail(`l${level}:expected_pointer_guards:${matches.length}`);

  source = source.replace(
    blockingGuard,
    `    if (!canInteractWithTable()) return;\n    if (typeof batterySwapAnimating !== \"undefined\" && batterySwapAnimating) return;\n    prepareTableInteraction();`,
  );

  if (source.includes('if (explanationMode || !gameplayUnlocked || cameraTween) return;')) {
    fail(`l${level}:camera_guard_remains`);
  }

  return source;
}

const outputs = new Map();
for (const level of [1, 2]) {
  const path = resolve(OUT, `level${level}.html`);
  let html = await readFile(path, 'utf8');
  html = patchGuideLifecycle(html, level);
  html = patchTableInteraction(html, level);
  await writeFile(path, html, 'utf8');
  outputs.set(level, html);
  console.info(`[mission01] Nivel ${level} · GUÍA no bloqueante · cámara cancelable · mesa con controlador único`);
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

console.info('[mission01] HELP INTERACTION CONTROLLER OK · GUÍA desacoplada de cámara · pointerdown/pointerup no dependen de tween');
