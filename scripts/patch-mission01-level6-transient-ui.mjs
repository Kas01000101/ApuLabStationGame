import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const LEVEL6 = resolve(OUT, 'level6.html');
const MANIFEST = resolve(OUT, 'manifest.json');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

let html = await readFile(LEVEL6, 'utf8');
if (!html.includes('APULAB_LEVEL6_FROM_LEVEL5_V1')) throw new Error('mission01_level6_transient_ui:not_n5_derived');

const journalBefore = 'function openJournal(){';
const journalAfter = "function openJournal(){document.getElementById('info-panel')?.classList.remove('visible');document.getElementById('success-overlay')?.classList.remove('visible');";
if (!html.includes(journalBefore)) throw new Error('mission01_level6_transient_ui:journal_missing');
html = html.replace(journalBefore, journalAfter);

const successBefore = "function completeLevel(){phase='complete';";
const successAfter = "function completeLevel(){document.getElementById('info-panel')?.classList.remove('visible');document.getElementById('journal-overlay')?.classList.remove('visible');phase='complete';";
if (!html.includes(successBefore)) throw new Error('mission01_level6_transient_ui:success_missing');
html = html.replace(successBefore, successAfter);

if (!html.includes("function openJournal(){document.getElementById('info-panel')?.classList.remove('visible')")) throw new Error('mission01_level6_transient_ui:journal_owner');
if (!html.includes("function completeLevel(){document.getElementById('info-panel')?.classList.remove('visible')")) throw new Error('mission01_level6_transient_ui:success_owner');

await writeFile(LEVEL6, html, 'utf8');
const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
const entry = (manifest.levels || []).find((x) => Number(x.level) === 6);
if (!entry) throw new Error('mission01_level6_transient_ui:manifest');
entry.bytes = Buffer.byteLength(html, 'utf8');
entry.sha256 = hash(html);
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.info('[mission01] Nivel 6 · GUÍA/BITÁCORA/SUCCESS con propietario único de overlay');
