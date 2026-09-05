import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const LEVEL7 = resolve(OUT, 'level7.html');
const MANIFEST = resolve(OUT, 'manifest.json');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

let html = await readFile(LEVEL7, 'utf8');
const before = '<canvas id="board-canvas" width="950" height="664"';
const after = '<canvas id="board-canvas" width="950" height="664" role="img" aria-label="Tablero 8 por 8 con SENSOR 1 de 18 °C, SENSOR 2 de 23 °C y estación final"';

if (!html.includes('APULAB_LEVEL7_FROM_LEVEL5_V1')) throw new Error('mission01_level7_accessibility:not_canonical_level7');
if (!html.includes(before)) throw new Error('mission01_level7_accessibility:board_canvas_missing');
if (!html.includes('aria-label="Tablero 8 por 8 con SENSOR 1')) html = html.replace(before, after);

await writeFile(LEVEL7, html, 'utf8');
const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
const entry = (manifest.levels || []).find((x) => Number(x.level) === 7);
if (!entry) throw new Error('mission01_level7_accessibility:manifest_entry_missing');
entry.bytes = Buffer.byteLength(html, 'utf8');
entry.sha256 = hash(html);
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.info('[mission01] Nivel 7 · canvas 950×664 mantiene geometría y expone SENSOR 1/SENSOR 2 mediante nombre accesible');
