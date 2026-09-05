import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const LEVEL7 = resolve(OUT, 'level7.html');
const MANIFEST = resolve(OUT, 'manifest.json');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

let html = await readFile(LEVEL7, 'utf8');
const before = '<canvas id="board-canvas" width="950" height="664"';
const after = '<canvas id="board-canvas" width="950" height="664" role="img" aria-label="Tablero 8 por 8 con una muestra científica desconocida y AYNI"';

if (!html.includes('APULAB_LEVEL7_FROM_LEVEL5_V1')) throw new Error('mission01_level7_accessibility:not_canonical_level7');
if (!html.includes(before)) throw new Error('mission01_level7_accessibility:board_canvas_missing');
if (!html.includes('role="img" aria-label="Tablero 8 por 8')) html = html.replace(before, after);

const bindPaletteStart = "function bindPalette(){document.querySelectorAll('.command-block[data-kind=\"cmd\"]')";
const bindPaletteEnd = "function appendItem(item)";
const bindStart = html.indexOf(bindPaletteStart);
const appendStart = html.indexOf(bindPaletteEnd, bindStart);
if (bindStart < 0 || appendStart < 0) throw new Error('mission01_level7_accessibility:bind_palette_missing');

const accessibleBindPalette = `function bindPalette(){document.querySelectorAll('.command-block[data-kind="cmd"]').forEach(el=>{el.tabIndex=0;el.setAttribute('role','button');if(!el.getAttribute('aria-label'))el.setAttribute('aria-label',\`Añadir \${String(el.textContent||el.dataset.command||'comando').replace(/\\s+/g,' ').trim()} al programa\`);el.onpointerdown=e=>startDrag(e,{source:'palette',item:{type:'cmd',cmd:el.dataset.command}},el);el.ondblclick=()=>appendItem({type:'cmd',cmd:el.dataset.command});el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();appendItem({type:'cmd',cmd:el.dataset.command})}}});const rp=document.getElementById('repeat-palette');rp.tabIndex=0;rp.setAttribute('role','button');rp.setAttribute('aria-label','Añadir REPETIR al programa');rp.onpointerdown=e=>{if(repeatUnlocked)startDrag(e,{source:'palette',item:{type:'repeat',count:2,body:[]}},rp)};rp.ondblclick=()=>repeatUnlocked&&appendItem({type:'repeat',count:2,body:[]});rp.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&repeatUnlocked){e.preventDefault();appendItem({type:'repeat',count:2,body:[]})}}}`;
html = html.slice(0, bindStart) + accessibleBindPalette + html.slice(appendStart);

if (!html.includes("el.onkeydown=e=>{if(e.key==='Enter'||e.key===' ')")) throw new Error('mission01_level7_accessibility:command_keyboard_handler_missing');
if (!html.includes("rp.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&repeatUnlocked)")) throw new Error('mission01_level7_accessibility:repeat_keyboard_handler_missing');

await writeFile(LEVEL7, html, 'utf8');
const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
const entry = (manifest.levels || []).find((x) => Number(x.level) === 7);
if (!entry) throw new Error('mission01_level7_accessibility:manifest_entry_missing');
entry.bytes = Buffer.byteLength(html, 'utf8');
entry.sha256 = hash(html);
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.info('[mission01] Nivel 7 · canvas accesible + comandos AVANZAR/GIRAR/ANALIZAR/REPETIR operables con teclado');
