import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const path = resolve(process.cwd(), 'public/missions/mission01/level7.html');
let html = await readFile(path, 'utf8');
if (!html.includes('APULAB_LEVEL7_FROM_LEVEL5_V1')) throw new Error('mission01_level7_render:not_canonical_level7');

const inherited = "goalGlowMat.opacity=.14+.24*p;flag.rotation.z=Math.sin(t*1.6)*.018;";
const sensors = "sensorVisuals.forEach((sensor,i)=>{sensor.ring.material.emissiveIntensity=.82+.28*Math.sin(t*3.4+i*.8);sensor.ring.rotation.z=t*(.42+i*.05)});flag.rotation.z=Math.sin(t*1.6)*.018;";
if (!html.includes(inherited)) throw new Error('mission01_level7_render:inherited_goal_glow_marker_missing');
html = html.replace(inherited, sensors);
if (html.includes('goalGlowMat')) throw new Error('mission01_level7_render:stale_goal_glow_reference');
if (!html.includes('sensorVisuals.forEach((sensor,i)=>')) throw new Error('mission01_level7_render:sensor_animation_missing');

await writeFile(path, html, 'utf8');
console.info('[mission01] Nivel 7 · render canónico adaptado · sensores cyan animados · sin goalGlowMat heredado');
