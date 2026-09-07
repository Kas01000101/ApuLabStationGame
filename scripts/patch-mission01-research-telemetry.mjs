import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const MANIFEST = resolve(OUT, 'manifest.json');
const hash = (text) => createHash('sha256').update(Buffer.from(text,'utf8')).digest('hex');
const fail = (code) => { throw new Error(`mission01_research_telemetry:${code}`); };
function replaceRequired(source,before,after,code){if(!source.includes(before))fail(`missing:${code}`);return source.replace(before,after)}
function addCommon(html,level){
  const marker=`id="apulab-research-telemetry-l${level}"`;
  if(html.includes(marker))fail(`already_applied_l${level}`);
  const script=`<script id="apulab-research-telemetry-l${level}">(()=>{const started=performance.now();const emit=(event,payload={})=>{try{parent.postMessage({type:'apulab-telemetry',level:${level},event,payload,elapsed_ms:Math.max(0,Math.round(performance.now()-started))},location.origin)}catch{}};window.apulabResearchEmit=emit;emit('level_started',{});const q=s=>document.querySelector(s);q('#explore-btn,#kawsay-explanation')?.addEventListener('click',()=>emit('explore_opened',{}));q('#journal-btn,#kawsay-journal')?.addEventListener('click',()=>emit('bitacora_opened',{}));})();</script>`;
  html=html.replace('</body>',`${script}\n</body>`);if(!html.includes(marker))fail(`common_injection_l${level}`);return html;
}

function patchLevel1(source){
  let html=source;
  html=replaceRequired(html,'  function toggleBattery() {\n    batteryOn = !batteryOn;',`  let apulabResearchMeasurementAttempt = 0;\n  let apulabResearchModeSent = false;\n\n  function toggleBattery() {\n    batteryOn = !batteryOn;\n    window.apulabResearchEmit?.('battery_power_changed',{powered:batteryOn});`,'l1_battery_handler');
  html=replaceRequired(html,'  function toggleMultimeter() {\n    multimeterOn = !multimeterOn;',`  function toggleMultimeter() {\n    multimeterOn = !multimeterOn;\n    window.apulabResearchEmit?.('multimeter_power_changed',{powered:multimeterOn});\n    if(multimeterOn&&!apulabResearchModeSent){apulabResearchModeSent=true;window.apulabResearchEmit?.('multimeter_mode_changed',{previous_mode:null,mode:multimeterMode,source:'fixed_level_configuration'})}`,'l1_meter_handler');
  html=replaceRequired(html,'    if (color === "red") redProbeTerminal = terminal;\n    else blackProbeTerminal = terminal;\n    resetLooseProbe(color);',`    if (color === "red") redProbeTerminal = terminal;\n    else blackProbeTerminal = terminal;\n    window.apulabResearchEmit?.('probe_snap',{probe:color,terminal});\n    const researchMeasurementKind=measurementKind();\n    if(researchMeasurementKind==='conventional'||researchMeasurementKind==='reversed'){\n      apulabResearchMeasurementAttempt+=1;\n      const polarity=researchMeasurementKind==='conventional'?'normal':'reversed';\n      window.apulabResearchEmit?.('polarity_state',{polarity});\n      window.apulabResearchEmit?.('measurement_attempt',{attempt_number:apulabResearchMeasurementAttempt,polarity,measured_value:getVoltageReading()});\n    }\n    resetLooseProbe(color);`,'l1_probe_snap');
  html=replaceRequired(html,'    const record = intersection ? dragRecordFromObject(intersection.object) : null;\n    if (!record) return;',`    const record = intersection ? dragRecordFromObject(intersection.object) : null;\n    if (!record) return;\n    window.apulabResearchEmit?.('probe_drag_start',{probe:record.color});`,'l1_probe_drag');
  html=replaceRequired(html,'        if (firstCompletion) celebrateCompletion();',`        if (firstCompletion) {\n          window.apulabResearchEmit?.('valid_measurement',{attempt_number:apulabResearchMeasurementAttempt,measured_value:getVoltageReading(),polarity:'normal',valid:true});\n          window.apulabResearchEmit?.('level_completed',{result:'success',attempt_number:apulabResearchMeasurementAttempt});\n          celebrateCompletion();\n        }`,'l1_valid_measurement');
  return addCommon(html,1);
}

function patchLevel2(source){
  let html=source;
  html=replaceRequired(html,'  function setActiveBattery(index, options = {}) {\n    if (!level2BatteryConfigs.length) return;\n    const normalized = (index + level2BatteryConfigs.length) % level2BatteryConfigs.length;\n    activeBatteryIndex = normalized;',`  function setActiveBattery(index, options = {}) {\n    if (!level2BatteryConfigs.length) return;\n    const normalized = (index + level2BatteryConfigs.length) % level2BatteryConfigs.length;\n    activeBatteryIndex = normalized;\n    const researchViewedBattery=level2BatteryConfigs[activeBatteryIndex];\n    if(researchViewedBattery)window.apulabResearchEmit?.('battery_viewed',{battery_id:researchViewedBattery.id});`,'l2_real_view');
  html=replaceRequired(html,'    const isNew = !measuredValues.has(id);\n    measuredValues.set(id, config.voltage);',`    const isNew = !measuredValues.has(id);\n    measuredValues.set(id, config.voltage);\n    if(isNew){\n      const measurementOrder=measuredValues.size;\n      window.apulabResearchEmit?.('battery_measured',{battery_id:id,measured_value:config.voltage,measurement_order:measurementOrder});\n      if(measurementOrder===level2BatteryConfigs.length)window.apulabResearchEmit?.('all_batteries_measured',{count:measurementOrder});\n    }`,'l2_real_measurement');
  html=replaceRequired(html,'  function handleBatteryChoice(id) {\n    if (!choiceEnabled || hasCompleted) return;\n    const config = batteryConfigById(id);\n    if (!config) return;',`  let apulabResearchLastBatteryChoice = null;\n  function handleBatteryChoice(id) {\n    if (!choiceEnabled || hasCompleted) return;\n    const config = batteryConfigById(id);\n    if (!config) return;\n    if(apulabResearchLastBatteryChoice&&apulabResearchLastBatteryChoice!==id)window.apulabResearchEmit?.('battery_selection_changed',{from_battery:apulabResearchLastBatteryChoice,to_battery:id});\n    apulabResearchLastBatteryChoice=id;\n    const withinRequiredRange=Math.abs(config.voltage-SYSTEM_TEST_REQUIREMENT_VOLTAGE)<0.01;\n    window.apulabResearchEmit?.('battery_selected',{battery_id:id,measured_value:config.voltage,within_required_range:withinRequiredRange});`,'l2_real_choice');
  html=replaceRequired(html,'      setHudNormal();\n      celebrateCompletion();',`      setHudNormal();\n      window.apulabResearchEmit?.('level_completed',{result:'success',battery_id:id,measured_value:config.voltage});\n      celebrateCompletion();`,'l2_completion');
  html=addCommon(html,2);
  html=replaceRequired(html,"window.apulabResearchEmit=emit;emit('level_started',{});", "window.apulabResearchEmit=emit;emit('level_started',{});emit('battery_viewed',{battery_id:'pink'});",'l2_initial_view');
  return html;
}

function patchLevel3(source){
  let html=source;
  html=replaceRequired(html,"function dropAt(index){if(!dragSource)return;if(dragSource.kind==='palette'){program.splice(index,0,dragSource.command)}else if(dragSource.kind==='program'){const [m]=program.splice(dragSource.index,1);const target=dragSource.index<index?index-1:index;program.splice(target,0,m)}program=program.slice(0,8);dragSource=null;renderProgram()}","function dropAt(index){if(!dragSource)return;if(dragSource.kind==='palette'){program.splice(index,0,dragSource.command);window.apulabResearchEmit?.('command_added',{command_type:dragSource.command,insert_index:index,input_method:'drag'})}else if(dragSource.kind==='program'){const from=dragSource.index,[m]=program.splice(from,1);const target=from<index?index-1:index;program.splice(target,0,m);window.apulabResearchEmit?.('command_moved',{command_type:m,from_index:from,to_index:target,input_method:'drag'})}program=program.slice(0,8);dragSource=null;renderProgram()}",'l3_drop');
  html=replaceRequired(html,"block.querySelector('.mini-del').addEventListener('click',e=>{e.stopPropagation();if(executing)return;program.splice(i,1);renderProgram()})","block.querySelector('.mini-del').addEventListener('click',e=>{e.stopPropagation();if(executing)return;const removed=program[i];program.splice(i,1);window.apulabResearchEmit?.('command_removed',{command_type:removed,remove_index:i,input_method:'button'});renderProgram()})",'l3_remove');
  html=replaceRequired(html,"e.preventDefault();program.push(el.dataset.command);program=program.slice(0,8);renderProgram()","e.preventDefault();program.push(el.dataset.command);program=program.slice(0,8);window.apulabResearchEmit?.('command_added',{command_type:el.dataset.command,insert_index:program.length-1,input_method:'keyboard'});renderProgram()",'l3_keyboard');
  html=replaceRequired(html,'async function runProgram(){ensureAudio();if(executing)return;if(!program.length){showStatus(\'Arrastra al menos un comando a MI PROGRAMA.\');return}executing=true;',"let apulabResearchAttempt=0;async function runProgram(){ensureAudio();if(executing)return;if(!program.length){showStatus('Arrastra al menos un comando a MI PROGRAMA.');return}apulabResearchAttempt+=1;window.apulabResearchEmit?.('program_started',{attempt_number:apulabResearchAttempt,program_length:program.length});executing=true;",'l3_run_start');
  html=replaceRequired(html,'feedback.textContent=`Línea ${String(i+1).padStart(2,\'0\')} · ${commands[program[i]].label}`;await executeCommand(program[i])',"feedback.textContent=`Línea ${String(i+1).padStart(2,'0')} · ${commands[program[i]].label}`;window.apulabResearchEmit?.('command_executed',{attempt_number:apulabResearchAttempt,program_index:i,command_type:program[i]});await executeCommand(program[i])",'l3_execute');
  html=replaceRequired(html,"if(roverState.c===goal.c&&roverState.r===goal.r){feedback.textContent='AYNI llegó a la meta.';completeLevel()}","if(roverState.c===goal.c&&roverState.r===goal.r){feedback.textContent='AYNI llegó a la meta.';window.apulabResearchEmit?.('goal_reached',{attempt_number:apulabResearchAttempt,goal_cell:{c:goal.c,r:goal.r}});completeLevel()}",'l3_goal');
  html=replaceRequired(html,"function completeLevel(){document.getElementById('journal-text').innerHTML=", "function completeLevel(){window.apulabResearchEmit?.('level_completed',{result:'success',attempt_number:apulabResearchAttempt,program_length:program.length});document.getElementById('journal-text').innerHTML=",'l3_complete');
  return addCommon(html,3);
}

function patchLevel4(source){
  // Level 4 already emits from its real editor/engine: program_started, command_executed,
  // collision_detected (with cell/index), program_modified_after_failure and goal_reached.
  // Runtime aliases in eventRegistry canonicalize block_added/removed/reordered and level4_completed.
  return addCommon(source,4);
}

const patchers={1:patchLevel1,2:patchLevel2,3:patchLevel3,4:patchLevel4};
const manifest=JSON.parse(await readFile(MANIFEST,'utf8'));
for(const level of [1,2,3,4]){
  const path=resolve(OUT,`level${level}.html`);
  let html=await readFile(path,'utf8');
  html=patchers[level](html);
  await writeFile(path,html,'utf8');
  const entry=(manifest.levels||[]).find((x)=>Number(x.level)===level);
  if(entry){entry.bytes=Buffer.byteLength(html,'utf8');entry.sha256=hash(html)}
}
await writeFile(MANIFEST,JSON.stringify(manifest,null,2)+'\n','utf8');
console.info('[mission01] RESEARCH TELEMETRY N1–N4 OK · real handlers/state · no canvas-coordinate or DOM-text inference');
