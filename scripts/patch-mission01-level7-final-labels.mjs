import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT=resolve(process.cwd(),'public/missions/mission01');
const LEVEL6=resolve(OUT,'level6.html');
const LEVEL7=resolve(OUT,'level7.html');
const hash=(text)=>createHash('sha256').update(Buffer.from(text,'utf8')).digest('hex');
const fail=(code)=>{throw new Error(`mission01_level7_final_labels:${code}`)};
const requiredReplace=(source,before,after,code)=>{if(!source.includes(before))fail(`missing:${code}`);return source.replace(before,after)};

const l6Before=await readFile(LEVEL6,'utf8');
const l6Hash=hash(l6Before);
let html=await readFile(LEVEL7,'utf8');
if(!html.includes('APULAB_LEVEL7_FINAL_GDD_V1'))fail('final_gdd_missing');
if(html.includes('APULAB_LEVEL7_SAMPLE_COMMUNICATION_FINAL_V2'))fail('already_applied');

// Final public terminology: checkpoint 1 is the sample; checkpoint 2 is communication.
html=html
  .replaceAll('MUESTRA DE INTERÉS','MUESTRA DESCONOCIDA')
  .replaceAll('PUNTO DE MISIÓN','PUNTO DE COMUNICACIÓN')
  .replaceAll('PUNTO FINAL','PUNTO DE COMUNICACIÓN')
  .replaceAll('Lleva AYNI al punto de comunicación.','Lleva AYNI al punto de comunicación y envía los datos.')
  .replaceAll('PASO 5 · LLEVA AYNI AL PUNTO DE COMUNICACIÓN','PASO 5 · LLEVA AYNI AL PUNTO DE COMUNICACIÓN Y ENVÍA LOS DATOS')
  .replaceAll('Necesitamos saber de qué material está hecha esta piedra. ¿Qué instrumento es el más indicado?','Necesitamos saber de qué material está hecha esta piedra.')
  .replaceAll('AYNI necesita estar junto a la muestra para analizarla.','Lleva AYNI hasta la muestra para analizarla.')
  .replaceAll('AYNI debe estar junto a la muestra para analizarla.','Lleva AYNI hasta la muestra para analizarla.')
  .replaceAll('junto a la muestra','sobre la muestra');

// Exact checkpoint semantics. Adjacency is forbidden in the final N7 contract.
html=html.replaceAll('isAdjacentToSample','atSampleCell');
html=requiredReplace(
  html,
  'const atSampleCell=()=>Math.abs(roverState.c-sampleCell.c)+Math.abs(roverState.r-sampleCell.r)===1;',
  'const atSampleCell=()=>roverState.c===sampleCell.c&&roverState.r===sampleCell.r;',
  'exact_sample_cell',
);
html=html
  .replaceAll('atFinalCheckpoint','atCommunicationPoint')
  .replaceAll('finalCheckpointReached','communicationPointReached')
  .replaceAll("'final_point_reached'","'communication_point_reached'");

// Reuse the N6 communication action, but keep ANALIZAR MUESTRA as N7's only new science block.
const sendBlock='<div class="command-block block-send" data-kind="cmd" data-command="send" data-testid="block-send-data" tabindex="0" role="button" aria-label="Añadir ENVIAR DATOS al programa"><span class="ico">⇧</span>ENVIAR DATOS<span class="tone">TX</span></div>';
const analyzePalette=/(<div class="command-block block-analyze-sample"[^>]*>[\s\S]*?<\/div>)(<\/div>)/;
if(!analyzePalette.test(html))fail('analyze_palette');
html=html.replace(analyzePalette,`$1${sendBlock}$2`);
html=requiredReplace(
  html,
  ';const instrumentOptions=',
  ";commands.send={label:'ENVIAR DATOS',icon:'⇧',cls:'block-send',tone:'TX',freq:880,sensor:true};const instrumentOptions=",
  'send_command_registry',
);

// Completion now requires relevant data + communication point + an explicit send.
html=requiredReplace(
  html,
  'if(!relevantInstrumentUsed||!atCommunicationPoint())return;',
  "if(!relevantInstrumentUsed||!communicationPointReached||!dataSent){if(relevantInstrumentUsed&&atCommunicationPoint()&&!dataSent){feedback.textContent='Ya estás en el punto de comunicación. Usa ENVIAR DATOS.';showStatus('Usa ENVIAR DATOS para comunicar el resultado.',2200)}return;}",
  'completion_gate',
);
html=html.replace(
  'completion_time:elapsed7(),completed_level:true',
  'communication_time:communicationReachedElapsedMs,completion_time:elapsed7(),completed_level:true',
);
html=html.replaceAll(
  'AYNI investigó la muestra y ApuLab obtuvo la información necesaria. Estos datos ayudarán al equipo a comprender mejor el entorno que Yachay está explorando.',
  'AYNI investigó la muestra y envió el resultado a ApuLab Station.',
);

// Step 5 remains active until the data is actually sent.
html=requiredReplace(html,'if(communicationPointReached)phaseStep=6;','if(dataSent)phaseStep=6;','guide_completion_state');
html=requiredReplace(
  html,
  "final?.classList.toggle('is-active',relevantInstrumentUsed&&!communicationPointReached);final?.classList.toggle('is-done',communicationPointReached);",
  "final?.classList.toggle('is-active',relevantInstrumentUsed&&!dataSent);final?.classList.toggle('is-done',dataSent);const atSampleNow=atSampleCell();document.querySelector('.block-analyze-sample')?.classList.toggle('is-ready',atSampleNow&&!relevantInstrumentUsed);document.querySelector('.block-send')?.classList.toggle('is-ready',relevantInstrumentUsed&&atCommunicationPoint()&&!dataSent);const sampleGlow=window.apulabLevel7SampleGlow;if(sampleGlow){sampleGlow.visible=atSampleNow&&!relevantInstrumentUsed;}",
  'state_visuals',
);

// One marker system: no separate question pin and no duplicated 3D text label.
const renderToken='questionSprite.position.y=.92+.045*Math.sin(t*1.8);';
if(html.includes(renderToken))html=html.replace(renderToken,`${renderToken}if(window.apulabLevel7SampleGlow?.visible){window.apulabLevel7SampleGlow.material.opacity=.55+.30*p;}`);

const style=`<style id="apulab-level7-sample-communication-final-v2">
/* APULAB_LEVEL7_SAMPLE_COMMUNICATION_FINAL_V2 */
.block-analyze-sample.is-ready,.block-send.is-ready{position:relative;z-index:2;box-shadow:0 0 0 4px rgba(73,201,215,.22),0 0 24px rgba(73,201,215,.92)!important;animation:l7ScienceReady 1.45s ease-in-out infinite}.block-send{background:linear-gradient(180deg,#FFD18E,#F4C75E)!important;color:#17133A!important}.block-send .tone{font-weight:900}.level7-checkpoint-final.is-active .level7-checkpoint-badge{border-color:#C9F6F7!important;background:#0D5263!important;box-shadow:0 0 0 4px rgba(73,201,215,.24),0 0 24px rgba(73,201,215,.9)!important}@keyframes l7ScienceReady{0%,100%{transform:translateZ(0)}50%{transform:translateY(-1px)}}
</style>`;
html=requiredReplace(html,'</head>',`${style}\n</head>`,'final_style');

const moduleStart=html.indexOf('<script type="module">');
const moduleEnd=html.indexOf('</script>',moduleStart);
if(moduleStart<0||moduleEnd<0)fail('module_range');
const runtime=`
// APULAB_LEVEL7_SAMPLE_COMMUNICATION_FINAL_V2
var dataSent=false;
var communicationReachedElapsedMs=null;
const sampleAyniGlow=new THREE.Mesh(new THREE.RingGeometry(.48,.66,48),new THREE.MeshBasicMaterial({color:0x49C9D7,transparent:true,opacity:.72,side:THREE.DoubleSide,depthTest:false}));
sampleAyniGlow.rotation.x=-Math.PI/2;sampleAyniGlow.position.y=.055;sampleAyniGlow.visible=false;sampleGroup.add(sampleAyniGlow);window.apulabLevel7SampleGlow=sampleAyniGlow;
questionSprite.visible=false;finalLabel.visible=false;
const __l7CommunicationCompleteLevel=completeLevel;
completeLevel=function(...args){if(!relevantInstrumentUsed||!communicationPointReached||!dataSent){if(relevantInstrumentUsed&&atCommunicationPoint()&&!dataSent){feedback.textContent='Ya estás en el punto de comunicación. Usa ENVIAR DATOS.';showStatus('Usa ENVIAR DATOS para comunicar el resultado.',2200)}syncLevel7FinalUX();return;}return __l7CommunicationCompleteLevel(...args)};
const __l7CommunicationExecuteCommand=executeCommand;
executeCommand=async function(cmd){
  if(dataSent)return;
  if(cmd==='send'){
    await playCmd(cmd);
    if(!(relevantInstrumentUsed&&atCommunicationPoint())){feedback.textContent='Lleva AYNI al punto de comunicación para enviar el resultado.';showStatus(feedback.textContent,2400);syncLevel7FinalUX();return;}
    if(!communicationPointReached){communicationPointReached=true;communicationReachedElapsedMs??=elapsed7();recordLevel7Event('communication_point_reached',{c:roverState.c,r:roverState.r,communication_time:communicationReachedElapsedMs})}
    communicationReachedElapsedMs??=elapsed7();dataSent=true;recordLevel7Event('data_sent',{communication_time:communicationReachedElapsedMs});feedback.textContent='DATOS ENVIADOS';showStatus('DATOS ENVIADOS A APULAB STATION',1000);await sleep(420);syncLevel7FinalUX();completeLevel();return;
  }
  const wasAtCommunication=communicationPointReached;
  const result=await __l7CommunicationExecuteCommand(cmd);
  if(!wasAtCommunication&&communicationPointReached)communicationReachedElapsedMs??=elapsed7();
  syncLevel7FinalUX();return result;
};
document.getElementById('clear-btn')?.addEventListener('click',()=>{dataSent=false;communicationReachedElapsedMs=null;firstInstrument=null;finalInstrument=null;instrumentSelectionCount=0;instrumentChangeCount=0;hadIrrelevantFeedback=false;changedAfterIrrelevantFeedback=false;firstChoiceElapsedMs=null;relevantChoiceElapsedMs=null;helpBeforeRelevantChoice=false;level7AnalyzeRequested=false;sampleAyniGlow.visible=false;questionSprite.visible=false;finalLabel.visible=false;queueMicrotask(syncLevel7FinalUX)},true);
const __l7CommunicationQA=window.apulabLevel7QA;
window.apulabLevel7QA={...__l7CommunicationQA,getState:()=>({...__l7CommunicationQA?.getState?.(),sampleReached:sampleCheckpointReached,communicationPointReached,dataSent,atSample:atSampleCell(),atCommunication:atCommunicationPoint(),communication_time:communicationReachedElapsedMs})};
syncLevel7FinalUX();
`;
html=html.slice(0,moduleEnd)+runtime+html.slice(moduleEnd);

for(const token of ['APULAB_LEVEL7_SAMPLE_COMMUNICATION_FINAL_V2','MUESTRA DESCONOCIDA','PUNTO DE COMUNICACIÓN','data-command="analyzeSample"','data-command="send"','ANALIZAR MUESTRA','ENVIAR DATOS','atSampleCell','roverState.c===sampleCell.c&&roverState.r===sampleCell.r','communication_point_reached','data_sent','level_completed'])if(!html.includes(token))fail(`contract:${token}`);
for(const forbidden of ['MUESTRA DE INTERÉS','PUNTO FINAL','PUNTO DE MISIÓN','isAdjacentToSample','final_point_reached','data-command="read"','data-command="record"','nextLevel:8','level8.html','mission01-level8','CORRECTO','INCORRECTO','RESPUESTA EQUIVOCADA'])if(html.includes(forbidden))fail(`forbidden:${forbidden}`);

await writeFile(LEVEL7,html,'utf8');
if(hash(await readFile(LEVEL6,'utf8'))!==l6Hash)fail('level6_mutated');
console.info('[mission01] N7 final communication OK · exact sample cell · one marker per checkpoint · ANALIZAR MUESTRA + ENVIAR DATOS · explicit data send · N6 intacto');
