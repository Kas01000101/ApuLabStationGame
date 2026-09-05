import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { LEVEL7_CONFIG as CFG } from './config/mission01-level7.mjs';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const LEVEL7 = resolve(OUT, 'level7.html');
const MANIFEST = resolve(OUT, 'manifest.json');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
const fail = (label) => { throw new Error(`mission01_level7_sample_sensors:${label}`); };

function functionRange(source, marker) {
  const start = source.indexOf(marker);
  if (start < 0) fail(`function_start:${marker}`);
  const open = source.indexOf('{', start + marker.length);
  if (open < 0) fail(`function_open:${marker}`);
  let depth = 0, quote = '', escaped = false;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}' && --depth === 0) return { start, end: i + 1 };
  }
  fail(`function_end:${marker}`);
}
const replaceFunction = (source, marker, replacement) => {
  const { start, end } = functionRange(source, marker);
  return source.slice(0, start) + replacement + source.slice(end);
};
function replaceBetween(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker), end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) fail(`range:${label}`);
  return source.slice(0, start) + replacement + source.slice(end);
}

let html = await readFile(LEVEL7, 'utf8');
if (!html.includes('APULAB_LEVEL7_FROM_LEVEL5_V1')) fail('not_level7_from_level5');

html = html.replace(/<div class="palette-group apulab-sensor-palette">[\s\S]*?<\/div><\/div>/, '');
const sciencePalette = `<div class="palette-group apulab-sample-palette"><div class="palette-group-title"><span>CIENCIA</span><span>MUESTRA</span></div><div class="command-block block-analyze-sample" data-kind="cmd" data-command="analyzeSample" tabindex="0" role="button" aria-label="Añadir ANALIZAR MUESTRA al programa"><span class="ico">🔬</span>ANALIZAR MUESTRA<span class="tone">SCAN</span></div></div>`;
if (!html.includes('data-command="analyzeSample"')) html = html.replace('</aside>', `${sciencePalette}</aside>`);

const css = `<style id="apulab-level7-sample-style">
.block-analyze-sample{background:linear-gradient(180deg,#D9F8FA,#8FE2E8)!important;color:#17133A!important}.apulab-sample-palette{margin-top:0!important;padding-top:6px!important}.apulab-sample-palette .command-block{height:54px!important}
#sensor-overlay,#analysis-overlay{position:absolute;inset:0;z-index:80;display:none;align-items:center;justify-content:center;background:rgba(11,14,38,.78);backdrop-filter:blur(4px)}#sensor-overlay.visible,#analysis-overlay.visible{display:flex}
.sensor-modal,.analysis-modal{width:min(1120px,86%);background:#171A3D;border:2px solid #5FD3DF;border-radius:22px;padding:28px;box-shadow:0 20px 80px rgba(0,0,0,.42);color:#F8F9FA}.sensor-modal h2,.analysis-modal h2{margin:0 0 8px;font-size:28px}.sensor-question{font-size:20px;font-weight:700;color:#C9F6F7;margin:12px 0 20px}
.sensor-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.sensor-option{min-height:184px;border:2px solid #4D4288;border-radius:18px;padding:18px;background:#26224E;color:#F8F9FA;text-align:left;cursor:pointer}.sensor-option.selected{border-color:#F4C75E;box-shadow:0 0 0 4px rgba(244,199,94,.18)}.sensor-option .sensor-icon{font-size:34px}.sensor-option strong{display:block;margin:8px 0 6px;font-size:17px}.sensor-option small{color:#A8EDF1;font-weight:700}.sensor-option p{margin:8px 0 0;line-height:1.4}
.sensor-slot{margin:20px 0 14px;padding:14px 16px;border:2px dashed #8E7DCE;border-radius:14px;background:#101431}.sensor-slot strong{color:#F4C75E}.sensor-actions,.analysis-actions{display:flex;justify-content:flex-end;gap:12px;margin-top:18px}.sensor-actions button,.analysis-actions button{border:0;border-radius:12px;padding:12px 20px;font:800 15px Poppins,sans-serif;cursor:pointer}.primary-science{background:#F4C75E;color:#17133A}.secondary-science{background:#3B326B;color:#F8F9FA}.analysis-result{margin-top:16px;padding:16px;border-radius:14px;background:#0F1534;border:1px solid #4D4288;line-height:1.6}.analysis-result strong{color:#C9F6F7}
</style>`;
html = html.replace('</head>', `${css}\n</head>`);

const sensorCards = CFG.sensorOptions.map((s) => `<button class="sensor-option" type="button" data-sensor="${s.id}"><span class="sensor-icon">${s.icon}</span><strong>${s.name}</strong>${s.subtitle ? `<small>${s.subtitle}</small>` : ''}<p>${s.description}</p></button>`).join('');
const overlays = `<div id="sensor-overlay" class="visible" role="dialog" aria-modal="true" aria-labelledby="sensor-title"><div class="sensor-modal"><h2 id="sensor-title">EQUIPA UN SENSOR</h2><p class="sensor-question">Queremos saber QUÉ CONTIENE la muestra. ¿Qué sensor puede obtener ese dato?</p><div class="sensor-grid">${sensorCards}</div><div class="sensor-slot">RANURA DE SENSOR · <strong id="sensor-slot-label">VACÍA</strong></div><div class="sensor-actions"><button id="equip-sensor-btn" class="primary-science" type="button" disabled>EQUIPAR SENSOR</button></div></div></div><div id="analysis-overlay" role="dialog" aria-modal="true" aria-labelledby="analysis-title"><div class="analysis-modal"><h2 id="analysis-title">RESULTADO DEL ANÁLISIS</h2><div id="analysis-result" class="analysis-result"></div><div class="analysis-actions"><button id="change-sensor-btn" class="secondary-science" type="button">CAMBIAR SENSOR</button><button id="close-analysis-btn" class="primary-science" type="button">CONTINUAR</button></div></div></div>`;
html = html.replace('</body>', `${overlays}\n</body>`);
html = html.replace(/aria-label="Tablero 8 por 8 con SENSOR 1 de 18 °C, SENSOR 2 de 23 °C y estación final"/, 'aria-label="Tablero 8 por 8 con una muestra científica desconocida y AYNI"');

const sampleJson = JSON.stringify(CFG.sample);
const sampleScene = `const flagGroup=new THREE.Group();scene.add(flagGroup);const flag=new THREE.Object3D();flagGroup.add(flag);flagGroup.visible=false;
const sampleTarget=${sampleJson};const sampleGroup=new THREE.Group();scene.add(sampleGroup);const sampleCore=new THREE.Mesh(new THREE.DodecahedronGeometry(.34,1),new THREE.MeshStandardMaterial({color:0x7A3D34,roughness:.72,metalness:.04,emissive:0x24183D,emissiveIntensity:.35}));sampleCore.scale.set(1.18,.78,.96);sampleCore.position.y=.22;sampleGroup.add(sampleCore);const crystalMat=new THREE.MeshStandardMaterial({color:0xA8EDF1,emissive:0x49C9D7,emissiveIntensity:.8,roughness:.32});for(const [x,y,z,s] of [[-.15,.38,.02,.11],[.12,.34,-.08,.09],[.05,.44,.10,.07]]){const c=new THREE.Mesh(new THREE.OctahedronGeometry(s,0),crystalMat);c.position.set(x,y,z);sampleGroup.add(c)}const sampleRingMat=new THREE.MeshBasicMaterial({color:0x8E7DCE,transparent:true,opacity:.22});const sampleRing=new THREE.Mesh(new THREE.RingGeometry(.43,.58,48),sampleRingMat);sampleRing.rotation.x=-Math.PI/2;sampleRing.position.y=.045;sampleGroup.add(sampleRing);const questionCanvas=document.createElement('canvas');questionCanvas.width=128;questionCanvas.height=128;const qx=questionCanvas.getContext('2d');qx.fillStyle='rgba(11,14,38,.90)';qx.beginPath();qx.arc(64,64,48,0,Math.PI*2);qx.fill();qx.strokeStyle='#5FD3DF';qx.lineWidth=7;qx.stroke();qx.fillStyle='#F8F9FA';qx.font='900 70px Poppins,sans-serif';qx.textAlign='center';qx.textBaseline='middle';qx.fillText('?',64,67);const questionTexture=new THREE.CanvasTexture(questionCanvas);const questionSprite=new THREE.Sprite(new THREE.SpriteMaterial({map:questionTexture,transparent:true,depthTest:false}));questionSprite.position.set(0,.92,0);questionSprite.scale.set(.48,.48,1);sampleGroup.add(questionSprite);const sp=cellPos(sampleTarget.c,sampleTarget.r);sampleGroup.position.set(sp.x,.12,sp.z);const sensorVisuals=[];
`;
html = replaceBetween(html, 'const flagGroup=new THREE.Group();scene.add(flagGroup);', 'function clearObstacles()', sampleScene, 'sample_scene');

const commandsStart = html.indexOf('const commands='), commandsEnd = html.indexOf(';const MAX=', commandsStart);
if (commandsStart < 0 || commandsEnd < 0) fail('commands_range');
const commands = `const commands={forward:{label:'AVANZAR',icon:'↑',cls:'block-forward',tone:'DO',freq:523.25},left:{label:'GIRAR IZQ.',icon:'↶',cls:'block-left',tone:'RE',freq:587.33},right:{label:'GIRAR DER.',icon:'↷',cls:'block-right',tone:'MI',freq:659.25},analyzeSample:{label:'ANALIZAR MUESTRA',icon:'🔬',cls:'block-analyze-sample',tone:'SCAN',freq:783.99,sensor:true}};const sensorOptions=${JSON.stringify(CFG.sensorOptions)};let selectedSensorId=null,equippedSensorId=null,lastAnalysis=null,analysisSolved=false;const sampleCell=${sampleJson};const isAdjacentToSample=()=>Math.abs(roverState.c-sampleCell.c)+Math.abs(roverState.r-sampleCell.r)===1;const selectedSensor=()=>sensorOptions.find(s=>s.id===equippedSensorId)||null;function resetSensorState(){lastAnalysis=null;analysisSolved=false}`;
html = html.slice(0, commandsStart) + commands + html.slice(commandsEnd);

html = replaceFunction(html, 'async function executeCommand(', `async function executeCommand(cmd){if(cmd==='analyzeSample'){await playCmd(cmd);if(!equippedSensorId)throw {code:'NO_SENSOR',message:'Equipa un sensor antes de analizar.'};if(!isAdjacentToSample())throw {code:'SAMPLE_POSITION',message:'AYNI debe estar junto a la muestra para analizarla.'};const sensor=selectedSensor();if(sensor.id==='temperature')lastAnalysis={sensor:sensor.id,success:false,html:'<strong>🌡 -58 °C</strong><br>Este sensor nos permitió conocer la temperatura.<br><br>Pero todavía no sabemos qué materiales contiene la muestra.'};else if(sensor.id==='proximity')lastAnalysis={sensor:sensor.id,success:false,html:'<strong>📡 DISTANCIA: 0.4 m</strong><br>Ahora sabemos qué tan cerca está la muestra.<br><br>Pero este dato no nos dice de qué materiales está hecha.'};else{lastAnalysis={sensor:sensor.id,success:true,html:'<strong>ANÁLISIS DE MUESTRA</strong><br>Hierro ............. DETECTADO<br>Silicatos .......... DETECTADOS<br>Firma mineral ...... COMPATIBLE<br><br>¡Tenemos el dato que necesitábamos!<br>El analizador nos permitió estudiar los materiales de la muestra.'};analysisSolved=true}document.getElementById('analysis-result').innerHTML=lastAnalysis.html;document.getElementById('change-sensor-btn').style.display=lastAnalysis.success?'none':'';document.getElementById('close-analysis-btn').textContent=lastAnalysis.success?'VER RESULTADO FINAL':'CONTINUAR';document.getElementById('analysis-overlay').classList.add('visible');feedback.textContent=lastAnalysis.success?'ANÁLISIS MINERAL COMPLETADO':'DATO OBTENIDO · PRUEBA OTRO SENSOR';await sleep(380);return}return executeMovementCommand(cmd)}`);

html = replaceFunction(html, 'async function runProgram(', `async function runProgram(){ensureAudio();if(executing)return;if(!equippedSensorId)return showStatus('Primero equipa uno de los tres sensores.');if(needsAdjustment){needsAdjustment=false;resetRover();setEditing(true);document.getElementById('run-btn').textContent='▶ INICIAR PRUEBA';feedback.textContent='Programa conservado. Ajusta solo lo necesario y vuelve a probar.';return}if(!program.length)return showStatus('Arrastra al menos un bloque.');if(program.some(x=>isRepeat(x)&&!x.body.length))return showStatus('Cada REPETIR necesita al menos un bloque dentro.');executing=true;setEditing(false);document.getElementById('run-btn').disabled=true;resetRover();lastAnalysis=null;analysisSolved=false;lastFailure=null;let done=0;try{for(let i=0;i<program.length;i++){const item=program[i];if(isCmd(item)){renderProgram({top:i,body:null,iter:0},done);feedback.textContent=\`Línea \${String(i+1).padStart(2,'0')} · \${commands[item.cmd].label}\`;try{await executeCommand(item.cmd)}catch(err){throw {...err,top:i,body:null,iter:null,count:null}}}else{for(let iter=0;iter<item.count;iter++)for(let j=0;j<item.body.length;j++){renderProgram({top:i,body:j,iter},done);feedback.textContent=\`REPETIR \${iter+1}/\${item.count} · \${commands[item.body[j].cmd].label}\`;try{await executeCommand(item.body[j].cmd)}catch(err){throw {...err,top:i,body:j,iter,count:item.count}}}}done=i+1}renderProgram(null,program.length);if(!lastAnalysis){feedback.textContent='Falta ejecutar ANALIZAR MUESTRA junto a la roca.';showStatus('Añade ANALIZAR MUESTRA al programa.',2300);return}if(analysisSolved){feedback.textContent='ANÁLISIS MINERAL COMPLETADO';return}feedback.textContent='El sensor funcionó, pero aún no responde qué materiales contiene la muestra.';showStatus('Puedes cambiar de sensor sin borrar tu programa.',2800)}catch(err){lastFailure={top:err.top,body:err.body,iter:err.iter,count:err.count};renderProgram({top:err.top,body:err.body,iter:err.iter||0},Math.max(0,err.top));if(err.code==='BLOCKED')feedback.textContent='CAMINO BLOQUEADO · Hay una roca delante de AYNI.';else if(err.code==='NO_SENSOR'||err.code==='SAMPLE_POSITION')feedback.textContent=err.message;else feedback.textContent='AYNI llegó al borde del simulador. Revisa el bloque resaltado.';needsAdjustment=true;setEditing(false);document.getElementById('run-btn').textContent='🔧 AJUSTAR PROGRAMA';showStatus(feedback.textContent,2900)}finally{executing=false;document.getElementById('run-btn').disabled=false;if(!needsAdjustment)setEditing(true)}}`);

html = replaceFunction(html, 'function completeLevel(', `function completeLevel(){document.getElementById('analysis-overlay')?.classList.remove('visible');document.getElementById('info-panel')?.classList.remove('visible');document.getElementById('journal-overlay')?.classList.remove('visible');phase='complete';finalProgram=clone(program);successMusic();launchConfetti(220);try{localStorage.setItem('apulab.level7.finalProgram',JSON.stringify(serialize(finalProgram)));localStorage.setItem('apulab.level7.sensor',equippedSensorId);localStorage.setItem('apulab.mission01.completed','1')}catch{}document.getElementById('success-program-summary').textContent=\`Programa final: \${topCount(program)} bloques.\`;const data=document.getElementById('success-data');if(data)data.textContent='Hierro detectado · Silicatos detectados · Firma mineral compatible';document.getElementById('success-overlay').classList.add('visible')}`);

html = replaceFunction(html, 'function openJournal(', `function openJournal(){document.getElementById('info-panel')?.classList.remove('visible');document.getElementById('success-overlay')?.classList.remove('visible');document.getElementById('journal-meta').textContent='MISIÓN 01 · NIVEL 7';document.getElementById('journal-title').textContent='LA MUESTRA DESCONOCIDA';document.getElementById('journal-text').textContent=equippedSensorId?\`Sensor equipado: \${selectedSensor()?.name||'sin sensor'} · \${analysisSolved?'muestra analizada':'análisis pendiente'}.\`:'Selecciona un sensor para comenzar la investigación.';const jp=document.getElementById('journal-program');const source=finalProgram||program;jp.innerHTML='';if(source&&source.length){source.slice(0,16).forEach((x,i)=>{const d=document.createElement('div');if(isCmd(x))d.textContent=\`\${String(i+1).padStart(2,'0')} · \${commands[x.cmd]?.label||x.cmd}\`;else if(isRepeat(x))d.textContent=\`\${String(i+1).padStart(2,'0')} · REPETIR × \${x.count} [\${x.body.map(b=>commands[b.cmd]?.label||b.cmd).join(', ')}]\`;jp.appendChild(d)})}else jp.textContent='Construye el recorrido de AYNI hasta la muestra.';document.getElementById('journal-overlay').classList.add('visible')}`);

html = html.replace(/sensorVisuals\.forEach\(\(sensor,i\)=>\{[^}]*\}\);flag\.rotation\.z=Math\.sin\(t\*1\.6\)\*\.018;/, "sampleRingMat.opacity=.14+.14*p;sampleRing.rotation.z=t*.18;questionSprite.position.y=.92+.045*Math.sin(t*1.8);");
html = html.replace(/SENSORES Y BUCLES/g, 'LA MUESTRA DESCONOCIDA').replace(/2 SENSORES REGISTRADOS · DATOS ENVIADOS/g, 'MUESTRA ANALIZADA · MISIÓN COMPLETADA').replace(/AYNI registró los dos sensores y envió correctamente los datos a ApuLab Station\./g, 'AYNI analizó la muestra y obtuvo la información científica necesaria.').replace(/SENSOR 1 pendiente · SENSOR 2 pendiente · Envío pendiente/g, 'Muestra pendiente de análisis');

const terminalMarker = '<script id="apulab-level7-terminal-runtime">';
const terminalAt = html.indexOf(terminalMarker);
const mainClose = html.lastIndexOf('</script>', terminalAt);
if (terminalAt < 0 || mainClose < 0) fail('main_module_hook');
const handlers = `\nconst sensorOverlay=document.getElementById('sensor-overlay'),analysisOverlay=document.getElementById('analysis-overlay'),slotLabel=document.getElementById('sensor-slot-label'),equipBtn=document.getElementById('equip-sensor-btn');document.querySelectorAll('.sensor-option').forEach(btn=>btn.addEventListener('click',()=>{selectedSensorId=btn.dataset.sensor;document.querySelectorAll('.sensor-option').forEach(x=>x.classList.toggle('selected',x===btn));slotLabel.textContent=sensorOptions.find(s=>s.id===selectedSensorId)?.name||'VACÍA';equipBtn.disabled=false}));equipBtn.addEventListener('click',()=>{if(!selectedSensorId)return;equippedSensorId=selectedSensorId;sensorOverlay.classList.remove('visible');feedback.textContent=\`Sensor equipado: \${selectedSensor()?.name}. Construye el programa y llega junto a la muestra.\`});document.getElementById('change-sensor-btn').addEventListener('click',()=>{analysisOverlay.classList.remove('visible');selectedSensorId=equippedSensorId;document.querySelectorAll('.sensor-option').forEach(x=>x.classList.toggle('selected',x.dataset.sensor===selectedSensorId));slotLabel.textContent=selectedSensor()?.name||'VACÍA';sensorOverlay.classList.add('visible');feedback.textContent='Programa conservado. Cambia únicamente el sensor.'});document.getElementById('close-analysis-btn').addEventListener('click',()=>{analysisOverlay.classList.remove('visible');if(lastAnalysis?.success)completeLevel()});\n`;
html = html.slice(0, mainClose) + handlers + html.slice(mainClose);

for (const forbidden of ['data-command="read"','data-command="record"','data-command="send"','nextLevel:8','CONTINUAR AL NIVEL 8']) if (html.includes(forbidden)) fail(`legacy_contract:${forbidden}`);
for (const required of ['ANALIZAR MUESTRA','SENSOR DE TEMPERATURA','SENSOR DE PROXIMIDAD','ANALIZADOR DE MINERALES','RANURA DE SENSOR','CAMBIAR SENSOR','-58 °C','DISTANCIA: 0.4 m','Hierro ............. DETECTADO','MUESTRA DE INTERÉS']) if (!html.includes(required)) fail(`missing:${required}`);

await writeFile(LEVEL7, html, 'utf8');
const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));const entry=(manifest.levels||[]).find(x=>Number(x.level)===7);if(!entry)fail('manifest_entry');entry.bytes=Buffer.byteLength(html,'utf8');entry.sha256=hash(html);manifest.totalLevels=7;manifest.availableLevels=[1,2,3,4,5,6,7];manifest.unavailableLevels=[];await writeFile(MANIFEST,`${JSON.stringify(manifest,null,2)}\n`,'utf8');
console.info('[mission01] Nivel 7 corregido · muestra desconocida · 1 ranura · 3 sensores funcionales · ANALIZAR MUESTRA · programa preservado');
