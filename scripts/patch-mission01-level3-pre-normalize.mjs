import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const path = resolve(process.cwd(), 'public/missions/mission01/level3.html');
let html = await readFile(path, 'utf8');

if (!html.includes('data-mission-level="3"')) {
  throw new Error('l3_pre_normalize_wrong_output');
}

const marker = 'const connectorPlugMat = new THREE.MeshStandardMaterial(';
const index = html.indexOf(marker);
if (index < 0) throw new Error('l3_pre_normalize_connector_missing');
const end = html.indexOf(';', index);
if (end < 0) throw new Error('l3_pre_normalize_connector_end_missing');

const normalized = 'const connectorPlugMat = new THREE.MeshStandardMaterial({ color: 0xf4c75e, emissive: 0xd5a43d, emissiveIntensity: 0.08, metalness: 0.55, roughness: 0.30 });';
html = html.slice(0, index) + normalized + html.slice(end + 1);

await writeFile(path, html, 'utf8');
console.info('[mission01] Level 3 · connector material normalized for final redesign');
