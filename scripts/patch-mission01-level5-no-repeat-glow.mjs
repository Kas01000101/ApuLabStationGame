import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const LEVEL5 = resolve(OUT, 'level5.html');
const MANIFEST = resolve(OUT, 'manifest.json');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

let html = await readFile(LEVEL5, 'utf8');

const legacyGlowCss = '.block-repeat.is-new{animation:repeatUnlock 1.15s ease-in-out infinite}@keyframes repeatUnlock{0%,100%{box-shadow:0 5px 0 rgba(0,0,0,.30),0 0 0 rgba(232,93,169,0)}50%{box-shadow:0 5px 0 rgba(0,0,0,.30),0 0 22px rgba(232,93,169,.70)}}';
if (!html.includes(legacyGlowCss)) throw new Error('mission01_level5_repeat_glow_css_missing');
html = html.replaceAll(legacyGlowCss, '');

html = html.replaceAll("setTimeout(()=>document.getElementById('repeat-palette').classList.remove('is-new'),4200)", '');
html = html.replace(/document\.getElementById\((['"])repeat-palette\1\)\.classList\.(?:add|toggle)\((['"])is-new\2(?:\s*,\s*true)?\);?/g, '');

const repeatTag = html.match(/<div id="repeat-palette"[^>]*>/)?.[0] || '';
if (!repeatTag) throw new Error('mission01_level5_repeat_palette_missing');
if (/\bis-new\b|apulab-explore-glow|apulabAttention/i.test(repeatTag)) throw new Error('mission01_level5_repeat_attention_class_remaining');
if (/\.block-repeat\.is-new|@keyframes\s+repeatUnlock|animation\s*:\s*repeatUnlock/i.test(html)) throw new Error('mission01_level5_repeat_glow_css_remaining');
if (/repeat-palette[^\n]{0,180}classList\.(?:add|toggle)\((['"])is-new\1/i.test(html)) throw new Error('mission01_level5_repeat_glow_runtime_remaining');

await writeFile(LEVEL5, html, 'utf8');

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
const entry = (manifest.levels || []).find((x) => Number(x.level) === 5);
if (!entry) throw new Error('mission01_level5_manifest_entry_missing');
entry.bytes = Buffer.byteLength(html, 'utf8');
entry.sha256 = hash(html);
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.info('[mission01] Nivel 5 · REPETIR sin pulse/halo · EXPLORAR conserva la atención exclusiva');
