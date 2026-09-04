import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const manifestPath = resolve(process.cwd(), 'public/missions/mission01/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
manifest.totalLevels = 7;
manifest.availableLevels = [1, 2, 3, 4, 5, 6, 7];
manifest.unavailableLevels = [];
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.info('[mission01] manifest finalizado · N1–N7 disponibles · sin niveles pendientes');
