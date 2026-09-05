import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const path = resolve(process.cwd(), 'public/missions/mission01/level7.html');
let html = await readFile(path, 'utf8');

const startMarker = "const sensorOverlay=document.getElementById('sensor-overlay')";
const endMarker = "document.getElementById('close-analysis-btn').addEventListener('click',()=>{analysisOverlay.classList.remove('visible');if(lastAnalysis?.success)completeLevel()});";
const start = html.indexOf(startMarker);
const endStart = html.indexOf(endMarker, start);
if (start < 0 || endStart < 0) throw new Error('mission01_level7_sensor_ui_lifecycle:handler_block_missing');
const end = endStart + endMarker.length;
const current = html.slice(start, end);

const replacement = `// APULAB_LEVEL7_SENSOR_UI_DOM_READY_V1\nconst bindLevel7SensorUI=()=>{${current}};\nif(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindLevel7SensorUI,{once:true});else bindLevel7SensorUI();`;
html = html.slice(0, start) + replacement + html.slice(end);

if (!html.includes('APULAB_LEVEL7_SENSOR_UI_DOM_READY_V1')) throw new Error('mission01_level7_sensor_ui_lifecycle:marker_missing');
if (!html.includes("document.addEventListener('DOMContentLoaded',bindLevel7SensorUI,{once:true})")) throw new Error('mission01_level7_sensor_ui_lifecycle:dom_ready_guard_missing');

await writeFile(path, html, 'utf8');
console.info('[mission01] Nivel 7 · selector de sensores enlazado después de DOM ready · EQUIPAR SENSOR funcional');
