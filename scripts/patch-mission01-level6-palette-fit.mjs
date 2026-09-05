import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const LEVEL6 = resolve(OUT, 'level6.html');
const MANIFEST = resolve(OUT, 'manifest.json');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
const fail = (code) => { throw new Error(`mission01_level6_palette_fit:${code}`); };

let html = await readFile(LEVEL6, 'utf8');
if (!html.includes('APULAB_LEVEL6_FROM_LEVEL5_V1')) fail('not_n5_derived');
if (!html.includes('apulab-science-palette')) fail('science_palette_missing');
if (html.includes('id="apulab-level6-palette-fit"')) fail('already_patched');

const css = `<style id="apulab-level6-palette-fit">
/* Mantener exactamente la caja de COMANDOS de N5. Solo se compacta el grupo nuevo de CIENCIA. */
.apulab-science-palette{margin-top:0!important;padding-top:6px!important}
.apulab-science-palette .palette-group-title{margin-bottom:5px!important}
.apulab-science-palette .command-block{height:54px!important;margin-bottom:6px!important}
.apulab-science-palette .command-block:last-child{margin-bottom:0!important}
</style>`;

html = html.replace('</head>', `${css}\n</head>`);

for (const token of [
  'id="apulab-level6-palette-fit"',
  '.apulab-science-palette{margin-top:0!important;padding-top:6px!important}',
  '.apulab-science-palette .command-block{height:54px!important;margin-bottom:6px!important}',
]) if (!html.includes(token)) fail(`contract:${token}`);

await writeFile(LEVEL6, html, 'utf8');
const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
const entry = (manifest.levels || []).find((x) => Number(x.level) === 6);
if (!entry) fail('manifest_entry_missing');
entry.bytes = Buffer.byteLength(html, 'utf8');
entry.sha256 = hash(html);
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.info('[mission01] Nivel 6 palette fit OK · MOVIMIENTO/CONTROL N5 intactos · CIENCIA compactada sin invadir footer');
