import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const [baselineRootArg, researchRootArg, baselineShaArg] = process.argv.slice(2);
if (!baselineRootArg || !researchRootArg || !baselineShaArg) {
  throw new Error('usage: verify-ge-gameplay-immutability <baseline-root> <research-root> <baseline-sha>');
}

const baselineRoot = resolve(baselineRootArg);
const researchRoot = resolve(researchRootArg);
const baselineSha = baselineShaArg.trim();

const OUTPUTS = [
  'public/missions/mission01/level1.html',
  'public/missions/mission01/level2.html',
  'public/missions/mission01/level3.html',
  'public/missions/mission01/level4.html',
  'public/missions/mission01/level5.html',
  'public/missions/mission01/level6.html',
  'public/missions/mission01/level7.html',
  'public/missions/mission01/manifest.json',
];

const PROTECTED_EXACT = new Set([
  'package.json',
  'package-lock.json',
  '.github/workflows/build.yml',
  'src/systems/Level6TelemetryBridge.ts',
  'src/systems/Level7TelemetryBridge.ts',
  'src/styles/mission01.css',
]);

const PROTECTED_PREFIXES = [
  'scripts/config/',
  'src/app/',
  'src/three/',
  'public/assets/audio/',
];

const PROTECTED_SCRIPT_PATTERNS = [
  /^scripts\/build-mission01-/,
  /^scripts\/generate-mission01-/,
  /^scripts\/finalize-mission01-/,
  /^scripts\/patch-mission01-/,
  /^scripts\/stabilize-mission01-/,
  /^scripts\/consolidate-mission01-/,
  /^scripts\/normalize-mission01-/,
  /^scripts\/repair-mission01-/,
];

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function isProtected(path) {
  if (PROTECTED_EXACT.has(path)) return true;
  if (PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix))) return true;
  if (PROTECTED_SCRIPT_PATTERNS.some((pattern) => pattern.test(path))) return true;
  if (/^src\/screens\/Mission01Screen/.test(path)) return true;
  return false;
}

function changedPaths() {
  const out = execFileSync(
    'git',
    ['-C', researchRoot, 'diff', '--name-only', `${baselineSha}...HEAD`],
    { encoding: 'utf8' },
  );
  return out.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
}

const changed = changedPaths();
const protectedChanges = changed.filter(isProtected);
if (protectedChanges.length) {
  throw new Error(`protected_gameplay_inputs_changed:\n${protectedChanges.join('\n')}`);
}

const rows = [];
for (const relative of OUTPUTS) {
  const baselineBytes = await readFile(resolve(baselineRoot, relative));
  const researchBytes = await readFile(resolve(researchRoot, relative));
  const baselineHash = sha256(baselineBytes);
  const researchHash = sha256(researchBytes);
  rows.push({ relative, baselineHash, researchHash, match: baselineHash === researchHash });
}

const mismatch = rows.filter((row) => !row.match);

const level6 = await readFile(resolve(researchRoot, 'public/missions/mission01/level6.html'), 'utf8');
const level7 = await readFile(resolve(researchRoot, 'public/missions/mission01/level7.html'), 'utf8');

for (const token of ['PUNTO DE COMUNICACIÓN', 'ENVIAR DATOS', 'communication_point_reached', 'data_sent']) {
  if (!level6.includes(token)) throw new Error(`n6_contract_missing:${token}`);
}
for (const token of ['PUNTO FINAL', 'final_point_reached']) {
  if (!level7.includes(token)) throw new Error(`n7_contract_missing:${token}`);
}
for (const token of ['data-command="send"', 'PUNTO DE COMUNICACIÓN', 'ENVIAR DATOS', 'APULAB_LEVEL7_FINAL_HARDENING_V1']) {
  if (level7.includes(token)) throw new Error(`n7_contamination_present:${token}`);
}

const reportLines = [
  '# GE Gameplay Hash Evidence',
  '',
  `Baseline: \`${baselineSha}\``,
  '',
  '| Artifact | Baseline SHA-256 | Research SHA-256 | Result |',
  '| --- | --- | --- | --- |',
  ...rows.map((row) => `| \`${row.relative.replace('public/missions/mission01/', '')}\` | \`${row.baselineHash}\` | \`${row.researchHash}\` | ${row.match ? 'PASS' : 'FAIL'} |`),
  '',
  `ALL_HASHES_MATCH = ${mismatch.length === 0 ? 'YES' : 'NO'}`,
  'MISSION_BUILD_PIPELINE_DIFF = 0',
  'RESEARCH_EXTRA_GAMEPLAY_PATCHES = 0',
  'N7_PUNTO_FINAL_REQUIRED = YES',
  'N7_SEND_COMMAND_FORBIDDEN = YES',
  '',
  '## Research isolation diff',
  '',
  ...changed.map((path) => `- \`${path}\``),
  '',
];

const reportPath = resolve(researchRoot, 'docs/GE_GAMEPLAY_HASHES.generated.md');
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, reportLines.join('\n'), 'utf8');

if (process.env.GITHUB_STEP_SUMMARY) {
  await writeFile(process.env.GITHUB_STEP_SUMMARY, reportLines.join('\n'), { encoding: 'utf8', flag: 'a' });
}

for (const row of rows) {
  console.log(`${row.match ? 'PASS' : 'FAIL'} ${row.relative} ${row.baselineHash} ${row.researchHash}`);
}
console.log(`ALL_HASHES_MATCH=${mismatch.length === 0 ? 'YES' : 'NO'}`);
console.log(`PROTECTED_GAMEPLAY_INPUT_CHANGES=${protectedChanges.length}`);

if (mismatch.length) {
  throw new Error(`generated_gameplay_hash_mismatch:${mismatch.map((row) => row.relative).join(',')}`);
}
