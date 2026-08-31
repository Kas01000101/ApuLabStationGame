import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';

const ROOT = process.cwd();
const MISSION_SRC = resolve(ROOT, 'src/missions/mission01/final');
const OUT_DIR = resolve(ROOT, 'public/missions/mission01');

// Niveles 1 y 2 ya se verifican después de sus parches históricos.
const FINAL_EXPECTED = {
  1: { sha256: 'ae79c89d4c5ca52bf854b42b3d847b5b3d8e779bf0e2e87ebc9f279118cd18fb', bytes: 162855 },
  2: { sha256: 'e6a93e42ddb2d3e561b09d95ae4416f8d9b1dd0e03e77d16b8891e7d2be3f29c', bytes: 206358 },
};

// Fuentes verificadas ANTES de aplicar los parches de integración.
const SOURCE_EXPECTED = {
  3: { sha256: '9ffbca00d019fcad5de92c6b44d8f171cc67c9a7ddc08173a6b98df6d70fc9c8', bytes: 216199 },
  4: { sha256: '6280407de00b0000246f9c867c8afc56aaa6517201d0eed1ef478f92f83c3090', bytes: 65468 },
  5: { sha256: '91e91872fab766d2b9c00b7bb6f660e2eac00a80c71f2e24bf4521e8d905819c', bytes: 73992 },
  6: { sha256: 'cf4ffca1d26291f81f38572142d09153be0d72a0da3aa9bed7da90e23fa93110', bytes: 85709 },
};

function sha256(text) {
  return createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
}

function integrity(level, html, expected, phase) {
  const actualHash = sha256(html);
  const actualBytes = Buffer.byteLength(html, 'utf8');
  if (actualHash !== expected.sha256 || actualBytes !== expected.bytes) {
    throw new Error(
      `mission01_integrity_failed:${phase}:level${level}:sha=${actualHash}:bytes=${actualBytes}`,
    );
  }
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

function patchLevel3(source) {
  let html = source.replaceAll('NIVEL 4 · PRÓXIMAMENTE', 'CONTINUAR AL NIVEL 4');
  html = html.replaceAll('continueLevel3Button.disabled=true', 'continueLevel3Button.disabled=false');
  html = html.replaceAll(
    'continueLevel3Button.setAttribute("aria-disabled","true")',
    'continueLevel3Button.removeAttribute("aria-disabled")',
  );
  html = replaceRequired(
    html,
    '// ---------- Render y transferencia visual de la batería del Nivel 2 ----------',
    `continueLevel3Button.addEventListener("click",()=>{\n  let handled=false;\n  try{\n    if(parent&&typeof parent.apulabCompleteLevel==="function"){\n      parent.apulabCompleteLevel(3,4);\n      handled=true;\n    }\n  }catch(_){}\n  if(!handled){\n    try{parent.postMessage({type:"apulab-level-complete",level:3,nextLevel:4},"*")}catch(_){}\n  }\n});\n\n// ---------- Render y transferencia visual de la batería del Nivel 2 ----------`,
    'l3-next-level-listener',
  );
  return html;
}

function patchLevel4(source) {
  let html = source.replaceAll('three@0.160.0', 'three@0.180.0');
  const before = "function goToNextLevel(){let handled=false;try{if(parent&&typeof parent.apulabCompleteLevel==='function'){parent.apulabCompleteLevel(4,5);handled=true}}catch(e){console.warn('Direct navigation bridge unavailable',e)}if(!handled){try{parent.postMessage({type:'apulab-level-complete',level:4,nextLevel:5},'*')}catch(e){console.error('Navigation failed',e)}}}";
  const after = "function goToNextLevel(){try{localStorage.setItem('apulab.level4.successProgram',JSON.stringify(program))}catch(_){}let handled=false;try{if(parent&&typeof parent.apulabCompleteLevel==='function'){parent.apulabCompleteLevel(4,5);handled=true}}catch(e){console.warn('Direct navigation bridge unavailable',e)}if(!handled){try{parent.postMessage({type:'apulab-level-complete',level:4,nextLevel:5},'*')}catch(e){console.error('Navigation failed',e)}}}";
  html = replaceRequired(html, before, after, 'l4-program-continuity');
  return html;
}

function patchLevel5(source) {
  return source.replaceAll('three@0.160.0', 'three@0.180.0');
}

function patchLevel6(source) {
  return source.replaceAll('three@0.160.0', 'three@0.180.0');
}

async function unpackLevel(level) {
  const directory = resolve(MISSION_SRC, `level${level}`);
  const encoded = await concatParts(directory, /^part\d+\.b64$/);
  return gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8');
}

async function unpackLevel3() {
  const directory = resolve(MISSION_SRC, 'level3');
  const exactHead = await concatParts(directory, /^head\d+\.b64$/);
  const exactTail = await concatParts(directory, /^tail\d+\.gz\.b64$/);
  return gunzipSync(Buffer.from(exactHead + exactTail, 'base64')).toString('utf8');
}

function verifySemanticContract(level, html) {
  const baseMarkers = [`${level} / 8`, 'three@0.180.0'];
  for (const marker of baseMarkers) {
    if (!html.includes(marker)) throw new Error(`mission01_semantic_missing:level${level}:${marker}`);
  }
  if (html.includes('three@0.160.0')) throw new Error(`mission01_legacy_three:level${level}`);

  if (level === 1 || level === 2 || level === 3) {
    if (!html.includes(`Nivel ${level} de 8`)) {
      throw new Error(`mission01_semantic_missing:level${level}:Nivel ${level} de 8`);
    }
  } else if (!html.includes(`data-apulab-level="${level}"`)) {
    throw new Error(`mission01_semantic_missing:level${level}:data-apulab-level`);
  }

  const next = level + 1;
  if (level >= 3 && level <= 6 && !html.includes(`nextLevel:${next}`)) {
    throw new Error(`mission01_transition_missing:level${level}:next${next}`);
  }

  if (level === 3) {
    for (const marker of ['Conector de seguridad', 'CONTINUAR AL NIVEL 4', 'TP1', 'TP2', 'TP3']) {
      if (!html.includes(marker)) throw new Error(`mission01_level3_missing:${marker}`);
    }
    if (html.includes('NIVEL 4 · PRÓXIMAMENTE')) {
      throw new Error('mission01_level3_still_blocks_level4');
    }
  }

  if (level === 4 && !html.includes('apulab.level4.successProgram')) {
    throw new Error('mission01_level4_missing_program_persistence');
  }
  if (level === 5) {
    for (const marker of ['apulab.level4.successProgram', 'apulab.level5.finalProgram']) {
      if (!html.includes(marker)) throw new Error(`mission01_level5_missing:${marker}`);
    }
  }
  if (level === 6 && !html.includes('apulab.level5.finalProgram')) {
    throw new Error('mission01_level6_missing_previous_program');
  }
}

async function writeResult(level, html) {
  verifySemanticContract(level, html);
  const actualHash = sha256(html);
  const actualBytes = Buffer.byteLength(html, 'utf8');
  await writeFile(resolve(OUT_DIR, `level${level}.html`), html, 'utf8');
  console.info(`[mission01] level ${level}/8 OK · ${actualBytes} bytes · ${actualHash}`);
  return { level, sha256: actualHash, bytes: actualBytes };
}

async function buildLegacyLevel(level, patch) {
  const html = patch(await unpackLevel(level));
  integrity(level, html, FINAL_EXPECTED[level], 'final');
  return writeResult(level, html);
}

async function buildVerifiedSourceLevel(level, source, patch) {
  integrity(level, source, SOURCE_EXPECTED[level], 'source');
  return writeResult(level, patch(source));
}

await mkdir(OUT_DIR, { recursive: true });
const results = [];
results.push(await buildLegacyLevel(1, patchLevel1));
results.push(await buildLegacyLevel(2, patchLevel2));
results.push(await buildVerifiedSourceLevel(3, await unpackLevel3(), patchLevel3));
results.push(await buildVerifiedSourceLevel(4, await unpackLevel(4), patchLevel4));
results.push(await buildVerifiedSourceLevel(5, await unpackLevel(5), patchLevel5));
results.push(await buildVerifiedSourceLevel(6, await unpackLevel(6), patchLevel6));

await writeFile(
  resolve(OUT_DIR, 'manifest.json'),
  `${JSON.stringify({ mission: 1, totalLevels: 8, availableLevels: [1, 2, 3, 4, 5, 6], levels: results }, null, 2)}\n`,
  'utf8',
);
console.info('[mission01] integrity verification complete · levels 1–6 available');
