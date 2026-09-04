import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const manifestPath = resolve(OUT, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const sha256 = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

manifest.totalLevels = 7;
manifest.availableLevels = [1, 2, 3, 4, 5, 6, 7];
manifest.unavailableLevels = [];
manifest.levels = Array.isArray(manifest.levels) ? manifest.levels.filter((entry) => ![6, 7].includes(Number(entry.level))) : [];
for (const level of [6, 7]) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  manifest.levels.push({
    level,
    sha256: sha256(html),
    bytes: Buffer.byteLength(html, 'utf8'),
  });
}
manifest.levels.sort((a, b) => Number(a.level) - Number(b.level));
if (manifest.levels.length !== 7 || manifest.levels.some((entry, index) => Number(entry.level) !== index + 1)) {
  throw new Error(`mission01_manifest_finalization_failed:${manifest.levels.map((x) => x.level).join(',')}`);
}
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.info('[mission01] manifest finalizado · N1–N7 disponibles · 7 hashes/bytes · sin niveles pendientes');
