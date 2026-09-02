import { readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const LEGACY_BUILD = resolve(ROOT, 'scripts/build-mission01.mjs');
const TEMP_BUILD = resolve(ROOT, 'scripts/.build-mission01-seven.tmp.mjs');

function replaceRequired(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`mission01_seven_source_missing:${label}`);
  return source.replace(before, after);
}

function removeBlock(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`mission01_seven_source_missing:${label}:start`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`mission01_seven_source_missing:${label}:end`);
  return source.slice(0, start) + source.slice(end);
}

let source = await readFile(LEGACY_BUILD, 'utf8');

// El antiguo Nivel 3 queda fuera del build activo. El archivo histórico se usa
// únicamente como plantilla para conservar intactos los parches aprobados de
// Niveles 1, 2 y de las fuentes antiguas 4–6.
source = replaceRequired(
  source,
  "  3: { sha256: '9ffbca00d019fcad5de92c6b44d8f171cc67c9a7ddc08173a6b98df6d70fc9c8', bytes: 216199 },\n",
  '',
  'source-expected-level3',
);
source = removeBlock(source, 'function patchLevel3(source) {', 'function patchLevel4(source) {', 'patch-level3');
source = removeBlock(source, 'async function unpackLevel3() {', 'function verifySemanticContract(level, html) {', 'unpack-level3');
source = replaceRequired(
  source,
  '  if (level === 1 || level === 2 || level === 3) {',
  '  if (level === 1 || level === 2) {',
  'semantic-level-list',
);
source = removeBlock(
  source,
  '  if (level === 3) {',
  "  if (level === 4 && !html.includes('apulab.level4.successProgram')) {",
  'semantic-level3',
);
source = replaceRequired(
  source,
  'results.push(await buildVerifiedSourceLevel(3, await unpackLevel3(), patchLevel3));\n',
  '',
  'build-level3',
);
source = replaceRequired(
  source,
  'availableLevels: [1, 2, 3, 4, 5, 6]',
  'availableLevels: [1, 2, 4, 5, 6]',
  'intermediate-manifest-level3',
);
source = replaceRequired(
  source,
  "console.info('[mission01] integrity verification complete · levels 1–6 available');",
  "console.info('[mission01] source build complete · legacy sources 1, 2, 4, 5, 6 only');",
  'build-console',
);

if (source.includes('await unpackLevel3()') || source.includes('patchLevel3(source)')) {
  throw new Error('mission01_seven_source_level3_still_active');
}

await writeFile(TEMP_BUILD, source, 'utf8');
try {
  await import(`${pathToFileURL(TEMP_BUILD).href}?v=${Date.now()}`);
} finally {
  await rm(TEMP_BUILD, { force: true });
}

console.info('[mission01] antiguo Nivel 3 excluido del build activo');
