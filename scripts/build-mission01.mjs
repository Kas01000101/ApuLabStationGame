import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';

const ROOT = process.cwd();
const MISSION_SRC = resolve(ROOT, 'src/missions/mission01/final');
const OUT_DIR = resolve(ROOT, 'public/missions/mission01');

const EXPECTED = {
  1: { sha256: 'ae79c89d4c5ca52bf854b42b3d847b5b3d8e779bf0e2e87ebc9f279118cd18fb', bytes: 162855 },
  2: { sha256: 'e6a93e42ddb2d3e561b09d95ae4416f8d9b1dd0e03e77d16b8891e7d2be3f29c', bytes: 206358 },
  3: { sha256: '9ffbca00d019fcad5de92c6b44d8f171cc67c9a7ddc08173a6b98df6d70fc9c8', bytes: 216199 },
};

function sha256(text) {
  return createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
}

async function concatParts(directory, pattern) {
  const names = (await readdir(directory))
    .filter((name) => pattern.test(name))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  if (!names.length) throw new Error(`mission01_missing_parts:${directory}`);
  const chunks = await Promise.all(
    names.map(async (name) => (await readFile(resolve(directory, name), 'utf8')).replace(/\s+/g, '')),
  );
  return chunks.join('');
}

function replaceRequired(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`mission01_patch_missing:${label}`);
  return source.replace(before, after);
}

function patchLevel1(source) {
  let html = source;
  html = replaceRequired(
    html,
    '/* El progreso 1/3 queda intacto: el usuario pidió cambiar solo botones y cajas de texto. */',
    '/* El progreso 1/8 queda fijado para Misión 01: el usuario pidió cambiar solo botones y cajas de texto. */',
    'l1-progress-comment',
  );
  html = replaceRequired(
    html,
    'V53 — Ajustes finales: 1/3 estándar + Bitácora más clara',
    'V53 — Ajustes finales: progreso estándar + Bitácora más clara',
    'l1-v53-comment',
  );
  html = replaceRequired(
    html,
    'V54 — Felicitación en crema/amarillo + 1/3 con misma fuente',
    'V54 — Felicitación en crema/amarillo + progreso con misma fuente',
    'l1-v54-comment',
  );
  html = replaceRequired(
    html,
    'aria-label="Nivel 1 de 3: medir el voltaje del módulo de energía de AYNI"',
    'aria-label="Nivel 1 de 8: medir el voltaje del módulo de energía de AYNI"',
    'l1-canvas-aria',
  );
  html = replaceRequired(
    html,
    'aria-label="Nivel 1 de 3">1 / 3</span>',
    'aria-label="Nivel 1 de 8">1 / 8</span>',
    'l1-progress',
  );
  return html.replaceAll('three@0.160.0', 'three@0.180.0');
}

function patchLevel2(source) {
  let html = source;
  html = replaceRequired(
    html,
    'NIVEL 2 / 3 · COMPARAR — prototipo funcional',
    'NIVEL 2 / 8 · COMPARAR — prototipo funcional',
    'l2-comment',
  );
  html = replaceRequired(
    html,
    'aria-label="Nivel 2: mide tres baterías, desbloquea el dato de misión, compara sus voltajes y elige una candidata"',
    'aria-label="Nivel 2 de 8: mide tres baterías, desbloquea el dato de misión, compara sus voltajes y elige una candidata"',
    'l2-canvas-aria',
  );
  html = replaceRequired(
    html,
    'aria-label="Nivel 2 de 3">2 / 3</span>',
    'aria-label="Nivel 2 de 8">2 / 8</span>',
    'l2-progress',
  );
  return html.replaceAll('three@0.160.0', 'three@0.180.0');
}

async function unpackLevel(level) {
  const directory = resolve(MISSION_SRC, `level${level}`);
  const encoded = await concatParts(directory, /^part\d+\.b64$/);
  return gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8');
}

async function buildLevel1() {
  return patchLevel1(await unpackLevel(1));
}

async function buildLevel2() {
  return patchLevel2(await unpackLevel(2));
}

async function buildLevel3() {
  const directory = resolve(MISSION_SRC, 'level3');
  const exactHead = await concatParts(directory, /^head\d+\.b64$/);
  const exactTail = await concatParts(directory, /^tail\d+\.gz\.b64$/);
  return gunzipSync(Buffer.from(exactHead + exactTail, 'base64')).toString('utf8');
}

function verifySemanticContract(level, html) {
  const required = [`${level} / 8`, `Nivel ${level} de 8`, 'three@0.180.0'];
  for (const marker of required) {
    if (!html.includes(marker)) throw new Error(`mission01_semantic_missing:level${level}:${marker}`);
  }
  if (html.includes('three@0.160.0')) throw new Error(`mission01_legacy_three:level${level}`);

  if (level === 3) {
    for (const marker of ['Conector de seguridad', 'NIVEL 4 · PRÓXIMAMENTE', 'TP1', 'TP2', 'TP3']) {
      if (!html.includes(marker)) throw new Error(`mission01_level3_missing:${marker}`);
    }
  }
}

async function verifyAndWrite(level, html) {
  verifySemanticContract(level, html);
  const actualHash = sha256(html);
  const actualBytes = Buffer.byteLength(html, 'utf8');
  const expected = EXPECTED[level];
  if (actualHash !== expected.sha256 || actualBytes !== expected.bytes) {
    throw new Error(`mission01_integrity_failed:level${level}:sha=${actualHash}:bytes=${actualBytes}`);
  }
  await writeFile(resolve(OUT_DIR, `level${level}.html`), html, 'utf8');
  console.info(`[mission01] level ${level}/8 OK · ${actualBytes} bytes · ${actualHash}`);
  return { level, sha256: actualHash, bytes: actualBytes };
}

await mkdir(OUT_DIR, { recursive: true });
const results = [];
results.push(await verifyAndWrite(1, await buildLevel1()));
results.push(await verifyAndWrite(2, await buildLevel2()));
results.push(await verifyAndWrite(3, await buildLevel3()));

await writeFile(
  resolve(OUT_DIR, 'manifest.json'),
  `${JSON.stringify({ mission: 1, totalLevels: 8, availableLevels: [1, 2, 3], levels: results }, null, 2)}\n`,
  'utf8',
);
console.info('[mission01] integrity verification complete');
