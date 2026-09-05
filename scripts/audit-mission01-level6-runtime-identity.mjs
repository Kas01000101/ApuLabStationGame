import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const html = await readFile(resolve(process.cwd(), 'public/missions/mission01/level6.html'), 'utf8');
const fail = (code) => { throw new Error(`mission01_level6_identity_audit:${code}`); };

const required = [
  'data-apulab-level="6"',
  'data-apulab-shell-source="level5"',
  "type:'apulab-level-ready', level:6",
  "type:'apulab-runtime-error',level:6",
  'parent.apulabCompleteLevel(6,7)',
  "parent.postMessage({type:'apulab-level-complete',level:6,nextLevel:7}",
];
for (const token of required) if (!html.includes(token)) fail(`missing:${token}`);

const forbidden = [
  'data-apulab-level="5"',
  "type:'apulab-level-ready', level:5",
  "type:'apulab-runtime-error',level:5",
  'parent.apulabCompleteLevel(5,6)',
];
for (const token of forbidden) if (html.includes(token)) fail(`legacy_identity:${token}`);

if ((html.match(/data-apulab-level="6"/g) || []).length !== 1) fail('duplicate_root_identity');
if (/level\s*:\s*5\s*,\s*nextLevel\s*:\s*6/.test(html)) fail('legacy_postmessage_navigation');

console.info('[mission01] LEVEL 6 IDENTITY AUDIT OK · ready/error/root=6 · direct+fallback navigation 6→7');
