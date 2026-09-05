import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const path = resolve(process.cwd(), 'public/missions/mission01/level7.html');
let html = await readFile(path, 'utf8');

// The sensor state lives inside the main science runtime. Expose only a tiny API
// so UI controls in later HTML can mutate that lexical state safely.
const stateMarker = 'function resetSensorState(){lastAnalysis=null;analysisSolved=false}';
if (!html.includes(stateMarker)) throw new Error('mission01_level7_sensor_ui_lifecycle:state_marker_missing');
const runtimeBridge = `${stateMarker};window.apulabLevel7SensorRuntime={select(id){const sensor=sensorOptions.find(s=>s.id===id)||null;if(!sensor)return null;selectedSensorId=id;return sensor},equip(){if(!selectedSensorId)return null;equippedSensorId=selectedSensorId;const sensor=selectedSensor();feedback.textContent=\`Sensor equipado: \${sensor?.name||'sensor'}. Construye el programa y llega junto a la muestra.\`;return sensor},prepareChange(){selectedSensorId=equippedSensorId;feedback.textContent='Programa conservado. Cambia únicamente el sensor.';return selectedSensor()},completeIfSolved(){if(lastAnalysis?.success){completeLevel();return true}return false}}`;
html = html.replace(stateMarker, runtimeBridge);

// Remove the broken cross-script listeners produced by the first N7 patch.
const startMarker = "const sensorOverlay=document.getElementById('sensor-overlay')";
const endMarker = "document.getElementById('close-analysis-btn').addEventListener('click',()=>{analysisOverlay.classList.remove('visible');if(lastAnalysis?.success)completeLevel()});";
const start = html.indexOf(startMarker);
const endStart = html.indexOf(endMarker, start);
if (start < 0 || endStart < 0) throw new Error('mission01_level7_sensor_ui_lifecycle:handler_block_missing');
const end = endStart + endMarker.length;
const uiBridge = `// APULAB_LEVEL7_SENSOR_UI_BRIDGE_V2\nwindow.apulabLevel7SelectSensor=(id,button)=>{const sensor=window.apulabLevel7SensorRuntime?.select(id);if(!sensor)return;document.querySelectorAll('.sensor-option').forEach(x=>x.classList.toggle('selected',x===button));const slot=document.getElementById('sensor-slot-label');if(slot)slot.textContent=sensor.name;const equip=document.getElementById('equip-sensor-btn');if(equip)equip.disabled=false};\nwindow.apulabLevel7EquipSensor=()=>{const sensor=window.apulabLevel7SensorRuntime?.equip();if(!sensor)return;document.getElementById('sensor-overlay')?.classList.remove('visible')};\nwindow.apulabLevel7ChangeSensor=()=>{document.getElementById('analysis-overlay')?.classList.remove('visible');const sensor=window.apulabLevel7SensorRuntime?.prepareChange();document.querySelectorAll('.sensor-option').forEach(x=>x.classList.toggle('selected',x.dataset.sensor===sensor?.id));const slot=document.getElementById('sensor-slot-label');if(slot)slot.textContent=sensor?.name||'VACÍA';const equip=document.getElementById('equip-sensor-btn');if(equip)equip.disabled=!sensor;document.getElementById('sensor-overlay')?.classList.add('visible')};\nwindow.apulabLevel7CloseAnalysis=()=>{document.getElementById('analysis-overlay')?.classList.remove('visible');window.apulabLevel7SensorRuntime?.completeIfSolved()};`;
html = html.slice(0, start) + uiBridge + html.slice(end);

// Connect the rendered controls directly to the bridge. These handlers execute
// only after the user interacts, so they do not depend on DOM parse timing.
html = html.replace(/(<button class="sensor-option" type="button" data-sensor="[^"]+")/g, '$1 onclick="window.apulabLevel7SelectSensor?.(this.dataset.sensor,this)"');
html = html.replace('id="equip-sensor-btn" class="primary-science" type="button" disabled', 'id="equip-sensor-btn" class="primary-science" type="button" disabled onclick="window.apulabLevel7EquipSensor?.()"');
html = html.replace('id="change-sensor-btn" class="secondary-science" type="button"', 'id="change-sensor-btn" class="secondary-science" type="button" onclick="window.apulabLevel7ChangeSensor?.()"');
html = html.replace('id="close-analysis-btn" class="primary-science" type="button"', 'id="close-analysis-btn" class="primary-science" type="button" onclick="window.apulabLevel7CloseAnalysis?.()"');

for (const token of [
  'APULAB_LEVEL7_SENSOR_UI_BRIDGE_V2',
  'window.apulabLevel7SensorRuntime=',
  'window.apulabLevel7SelectSensor=',
  'window.apulabLevel7EquipSensor=',
  'onclick="window.apulabLevel7SelectSensor?.(this.dataset.sensor,this)"',
  'onclick="window.apulabLevel7EquipSensor?.()"',
]) if (!html.includes(token)) throw new Error(`mission01_level7_sensor_ui_lifecycle:missing:${token}`);
if (html.includes("equipBtn.addEventListener('click'")) throw new Error('mission01_level7_sensor_ui_lifecycle:stale_equip_listener');

await writeFile(path, html, 'utf8');
console.info('[mission01] Nivel 7 · selector conectado al estado científico por bridge · EQUIPAR/CAMBIAR SENSOR sin dependencia del orden DOM');
