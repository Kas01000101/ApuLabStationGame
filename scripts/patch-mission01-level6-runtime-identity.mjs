import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const LEVEL6 = resolve(OUT, 'level6.html');
const MANIFEST = resolve(OUT, 'manifest.json');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
const fail = (code) => { throw new Error(`mission01_level6_runtime_identity:${code}`); };

let html = await readFile(LEVEL6, 'utf8');
if (!html.includes('APULAB_LEVEL6_FROM_LEVEL5_V1')) fail('not_n5_derived');

html = html.replace(/<html([^>]*)>/, (_m, attrs) => {
  const clean = attrs
    .replace(/\sdata-apulab-level="[^"]*"/g, '')
    .replace(/\sdata-apulab-shell-source="[^"]*"/g, '');
  return `<html${clean} data-apulab-level="6" data-apulab-shell-source="level5">`;
});

html = html
  .replace(/parent\.apulabCompleteLevel\(5\s*,\s*6\)/g, 'parent.apulabCompleteLevel(6,7)')
  .replace(/type:'apulab-runtime-error',level:5/g, "type:'apulab-runtime-error',level:6")
  .replace(/type:'apulab-level-ready',\s*level:5/g, "type:'apulab-level-ready', level:6");

if ((html.match(/data-apulab-level="6"/g) || []).length !== 1) fail('root_level6_attribute_count');
if (html.includes('data-apulab-level="5"')) fail('root_level5_leak');
if (html.includes('parent.apulabCompleteLevel(5,6)')) fail('direct_bridge_level5_leak');
if (/type:'apulab-runtime-error',level:5/.test(html)) fail('runtime_error_level5_leak');
if (/type:'apulab-level-ready',\s*level:5/.test(html)) fail('ready_level5_leak');
if (!html.includes('parent.apulabCompleteLevel(6,7)')) fail('direct_bridge_6_7_missing');
if (!html.includes("type:'apulab-level-ready', level:6")) fail('ready_level6_missing');
if (!html.includes("type:'apulab-runtime-error',level:6")) fail('runtime_error_level6_missing');
if (!html.includes("parent.postMessage({type:'apulab-level-complete',level:6,nextLevel:7}")) fail('postmessage_6_7_missing');

await writeFile(LEVEL6, html, 'utf8');

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
const entry = (manifest.levels || []).find((x) => Number(x.level) === 6);
if (!entry) fail('manifest_entry_missing');
entry.bytes = Buffer.byteLength(html, 'utf8');
entry.sha256 = hash(html);
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.info('[mission01] Nivel 6 runtime identity OK · root=6 · ready=6 · error=6 · bridge 6→7 · postMessage 6→7');
