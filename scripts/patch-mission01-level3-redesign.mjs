import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const path = resolve(process.cwd(), 'public/missions/mission01/level3.html');
let html = await readFile(path, 'utf8');

if (html.includes('id="apulab-level3-redesign-style"')) throw new Error('l3_redesign_duplicate');
if (!html.includes('data-mission-level="3"') || !html.includes('const level3ExploreSteps = [')) {
  throw new Error('l3_redesign_wrong_output');
}

const req = (before, after, label) => {
  if (!html.includes(before)) throw new Error(`l3_redesign_missing:${label}`);
  html = html.replace(before, after);
};
const block = (start, end, replacement, label) => {
  const a = html.indexOf(start);
  const b = html.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw new Error(`l3_redesign_missing:${label}:${a < 0 ? 'start' : 'end'}`);
  html = html.slice(0, a) + replacement + html.slice(b);
};

const css = `<style id="apulab-level3-redesign-style">
/* NIVEL 3 ÚNICAMENTE · negra fija / roja rastrea / TP actual rosado / medido cyan */
#kawsay-guide{
  background:#8E7DCE!important;color:#FFFFFF!important;border-color:#B8A9F0!important;
  box-shadow:5px 5px 0 #4D4288!important
}
#kawsay-guide:hover:not(:disabled){background:#9B8BDD!important}
#kawsay-guide:active:not(:disabled){background:#8072C4!important;box-shadow:3px 3px 0 #4D4288!important}
#kawsay-concept-panel.apulab-l3-guide{
  background:linear-gradient(180deg,#3B326B 0%,#2D2654 100%)!important;
  border-color:#8E7DCE!important;color:#FFFFFF!important;box-shadow:5px 5px 0 #241E4A!important
}
#kawsay-concept-panel.apulab-l3-guide #kawsay-concept-title{
  display:block!important;margin:0 0 9px!important;color:#FFFFFF!important;
  font:800 13px/1.15 "Poppins",sans-serif!important
}
#kawsay-concept-panel.apulab-l3-guide #kawsay-concept-text{
  display:block!important;margin:0!important;color:#FFFFFF!important
}
.apulab-l3-guide-list{display:flex;flex-direction:column;gap:6px}
.apulab-l3-guide-step{
  position:relative;display:block;min-height:27px;padding:6px 8px;overflow:hidden;
  border-left:3px solid transparent;border-radius:3px;color:#B8C2CC;
  font:700 12px/1.25 "Poppins",sans-serif
}
.apulab-l3-guide-step.is-active{
  border-left-color:#FF78B7;background:rgba(255,120,183,.10);color:#FFFFFF;font-weight:800
}
.apulab-l3-guide-step.is-complete{color:#CFC9E3;opacity:.74}
.apulab-l3-guide-step.is-complete::after{
  content:"";position:absolute;left:7px;top:50%;width:calc(100% - 14px);height:3px;border-radius:999px;
  background:#FF78B7;box-shadow:0 0 6px rgba(255,120,183,.55);
  transform:translateY(-50%) scaleX(1);transform-origin:left center
}
.apulab-l3-guide-step.is-complete.is-new::after{animation:apulabL3Strike .42s ease-out both}
.apulab-l3-active-copy{
  display:block;margin-top:9px;padding:8px 9px;border-radius:4px;
  background:rgba(20,25,56,.72);color:#F8F9FA;font:600 10.5px/1.35 "Poppins",sans-serif
}
.apulab-l3-guide-reminder{
  display:block;margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.14);
  color:#DCD7F3;font:600 10.5px/1.35 "Poppins",sans-serif
}
.apulab-l3-guide-reminder strong{color:#A8EDF1;font-weight:800}
.apulab-l3-conclusion{
  display:block;margin-top:9px;padding:9px 10px;border-radius:4px;
  background:rgba(73,201,215,.10);border-left:3px solid #49C9D7;color:#FFFFFF;
  font:700 10.5px/1.4 "Poppins",sans-serif
}
.apulab-l3-conclusion strong{color:#A8EDF1}
@keyframes apulabL3Strike{from{transform:translateY(-50%) scaleX(0)}to{transform:translateY(-50%) scaleX(1)}}
@media(prefers-reduced-motion:reduce){.apulab-l3-guide-step.is-complete.is-new::after{animation:none}}
</style>`;
req('</head>', `${css}\n</head>`, 'css');

html = html
  .replace('<b id="measure-pink">—</b>', '<b id="measure-pink">--.- V</b>')
  .replace('<b id="measure-green">—</b>', '<b id="measure-green">--.- V</b>')
  .replace('<b id="measure-coral">—</b>', '<b id="measure-coral">--.- V</b>');

req(
  'const moduleLabel = makeSpriteLabel("RASTREO DE ENERGÍA", 760, 100);',
  'const moduleLabel = makeSpriteLabel("RECORRIDO DE ENERGÍA", 760, 100);',
  'route-title',
);
req(
  'const connectorPlugMat = new THREE.MeshStandardMaterial({ color: 0xf4c75e, emissive: 0xd5a43d, emissiveIntensity: 0.08, metalness: 0.55, roughness: 0.30 });',
  'const connectorPlugMat = new THREE.MeshStandardMaterial({ color: 0x59647f, emissive: 0x2d2654, emissiveIntensity: 0.02, metalness: 0.42, roughness: 0.46 });',
  'connector-secondary',
);
req(
  'color: id === "TP2" ? tpGuidePink : tpGuideCyan,',
  'color: tpGuidePink,',
  'tp-active-halo-color',
);
req(
  'const trackToAyni = addTrackSegment(2.45, 3.10, level3TrackMat);',
  `const trackToAyni = addTrackSegment(2.45, 3.10, level3TrackMat);
const routeFixedMat = new THREE.MeshStandardMaterial({
  color:0x4D4288, emissive:0x49C9D7, emissiveIntensity:0.10,
  metalness:0.12, roughness:0.58
});
[track1,track2,track3,trackToAyni].forEach((track)=>{ track.material = routeFixedMat; });
const routeArrowMat = new THREE.MeshBasicMaterial({color:0xA8EDF1,toneMapped:false});
[-1.25, 1.00, 3.22].forEach((x)=>{
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.13,0.32,24),routeArrowMat);
  arrow.rotation.z=-Math.PI/2;arrow.position.set(x,trackY+0.02,trackZ);arrow.renderOrder=30;
  diagnosticGroup.add(arrow);
});`,
  'fixed-route-arrows',
);

req(
  'const redLooseProbeCenter = new THREE.Vector3(-0.22, -1.48, 2.34);',
  'const redLooseProbeCenter = new THREE.Vector3(-1.10, -1.42, 2.34);',
  'red-probe-start',
);

block(
  'function redLooseCablePoints(end = movedCablePoint(redLooseProbeJoin, redProbeDrag)) {',
  'function redContactCablePoints(end) {',
  `function redLooseCablePoints(end = movedCablePoint(redLooseProbeJoin, redProbeDrag)) {
    return [
      redConnectedEnd,
      redConnectedEnd.clone().add(new THREE.Vector3(0.12,0,0.12)),
      new THREE.Vector3(-2.20,-1.38,1.10),
      new THREE.Vector3(-1.45,-1.40,1.58),
      end.clone().add(new THREE.Vector3(-0.24,-0.02,0.02)),
      end
    ];
  }
  function blackLooseCablePoints(end = movedCablePoint(blackLooseProbeJoin, blackProbeDrag)) {
    return [
      blackConnectedEnd,
      blackConnectedEnd.clone().add(new THREE.Vector3(-0.10,0,0.18)),
      new THREE.Vector3(-2.85,-1.06,2.48),
      new THREE.Vector3(-1.35,-1.06,2.52),
      end.clone().add(new THREE.Vector3(-0.18,0,0.05)),
      end
    ];
  }
  `,
  'clean-probe-cables',
);

req(
  'function setDiagnosticLamp(id,state){',
  `statusPanel.visible=false;
ayniStatus.visible=false;
ayniLabel.visible=false;
Object.values(diagnosticLights).forEach(({lamp,label})=>{lamp.visible=false;label.visible=false;});
const ayniDestinationHaloMat = new THREE.MeshBasicMaterial({
  color:0x49C9D7,transparent:true,opacity:0.18,depthTest:false,depthWrite:false,
  blending:THREE.AdditiveBlending,toneMapped:false
});
const ayniDestinationHalo = new THREE.Mesh(new THREE.TorusGeometry(0.86,0.042,14,56),ayniDestinationHaloMat);
ayniDestinationHalo.rotation.x=Math.PI/2;
ayniDestinationHalo.position.set(0,0.02,0.08);
ayniDestinationHalo.renderOrder=55;
ayniGroup.add(ayniDestinationHalo);
const ayniDestinationLight = new THREE.PointLight(0x49C9D7,0.24,2.7,2);
ayniDestinationLight.position.set(0,0.5,0.4);
ayniGroup.add(ayniDestinationLight);
function setDiagnosticLamp(id,state){`,
  'ayni-real-destination',
);

req(
  'updateLooseCableDuringDrag("black", true);',
  `updateLooseCableDuringDrag("black", true);
blackLooseCableGroup.userData.dragRecord=null;
blackProbeDrag.group.traverse((node)=>{ if(node.userData) node.userData.dragRecord=null; });

const blackFixedLabel=makeSpriteLabel("PUNTA NEGRA · REFERENCIA FIJA",760,90,"#A8EDF1","rgba(20,25,56,.92)");
blackFixedLabel.position.copy(commonRefWorld).add(new THREE.Vector3(0,0.58,0.12));
blackFixedLabel.scale.set(1.46,0.20,1);
blackFixedLabel.visible=false;
scene.add(blackFixedLabel);

const redTraceLabel=makeSpriteLabel("PUNTA ROJA · RASTREA",620,90,"#FFF7E8","rgba(62,31,68,.92)");
redTraceLabel.position.copy(redLooseProbeJoin).add(new THREE.Vector3(0,0.55,0.10));
redTraceLabel.scale.set(1.12,0.20,1);
redTraceLabel.visible=false;
redProbeDrag.group.add(redTraceLabel);

const redToolHaloMat=new THREE.MeshBasicMaterial({
  color:0xFF78B7,transparent:true,opacity:0.52,depthTest:false,depthWrite:false,
  blending:THREE.AdditiveBlending,toneMapped:false
});
const redToolHalo=new THREE.Mesh(new THREE.TorusGeometry(0.28,0.032,12,52),redToolHaloMat);
redToolHalo.rotation.x=Math.PI/2;
redToolHalo.position.copy(redProbeDrag.snapPoint).add(new THREE.Vector3(0,0.10,0));
redToolHalo.renderOrder=59;
redToolHalo.visible=false;
redProbeDrag.group.add(redToolHalo);
redToolHalo.onBeforeRender=()=>{
  const t=performance.now()/1400*Math.PI*2;
  const s=1.0+(Math.sin(t)+1)*0.035;
  redToolHalo.scale.setScalar(s);
  redToolHaloMat.opacity=0.46+(Math.sin(t)+1)*0.07;
};`,
  'fixed-black-mobile-red',
);

block(
  'function showGuide(title,text,hint="") {',
  'guideButton.disabled=false;',
  `function showGuide(title,text,hint=""){ liveStatus.textContent=hint||text||title; }
let guide3RenderedCount=-1;
function renderGuideChecklist3(){
  const count=Math.min(3,measuredTP.size);
  const justCompleted=count>guide3RenderedCount?count-1:-1;
  const labels=[
    "1 · LLEVA LA PUNTA ROJA A TP1",
    "2 · CONTINÚA HASTA TP2",
    "3 · TERMINA EN TP3"
  ];
  const activeCopies=[
    "Arrastra la punta roja hasta el aro rosado de TP1.",
    "Lleva la misma punta roja a TP2.",
    "Ahora revisa TP3."
  ];
  conceptPanel.hidden=false;
  conceptPanel.classList.add("is-guide","apulab-l3-guide");
  conceptTitle.textContent="GUÍA · 3 PASOS";
  const list=labels.map((label,index)=>{
    const done=index<count;
    const active=index===count&&count<3;
    const state=done ? " is-complete"+(index===justCompleted?" is-new":"") : (active?" is-active":"");
    return '<span class="apulab-l3-guide-step'+state+'">'+label+'</span>';
  }).join("");
  const activeCopy=count<3
    ? '<span class="apulab-l3-active-copy">'+activeCopies[count]+'</span>'
    : '<span class="apulab-l3-conclusion"><strong>CONCLUSIÓN:</strong> TP1 = 28.0 V, TP2 = 28.0 V y TP3 = 0.0 V. La interrupción está entre TP2 y TP3.</span>';
  conceptText.innerHTML=
    '<span class="apulab-l3-guide-list">'+list+'</span>'+activeCopy+
    '<span class="apulab-l3-guide-reminder"><strong>RECUERDA:</strong> La punta negra se queda fija y la roja es la que se mueve.</span>';
  sceneHint.hidden=true;
  guide3RenderedCount=count;
}
function updateGuide3(){ if(guideVisible) renderGuideChecklist3(); }
`,
  'single-dynamic-guide',
);

block(
  'function setGuideTPHalos(visible){',
  'guideButton.addEventListener("click",(event)=>{',
  `function setGuideTPHalos(visible){
  const expected=nextExpectedTP();
  ["TP1","TP2","TP3"].forEach((id)=>{
    const obj=tpMeshes[id];
    if(!obj)return;
    const measured=measuredTP.has(id);
    const active=visible&&!level3Completed&&id===expected;
    obj.ring.material.color.setHex(measured?tpGuideCyan:0x4D4288);
    obj.ring.material.emissive.setHex(measured?tpGuideCyan:0x000000);
    obj.ring.material.emissiveIntensity=measured?0.28:0.04;
    obj.guideHaloMat.color.setHex(tpGuidePink);
    obj.guideHaloMat.userData.active=active;
    obj.guideHaloMat.userData.baseOpacity=active?0.78:0;
    obj.guideHaloMat.opacity=active?0.78:0;
    obj.guideHalo.onBeforeRender=()=>{
      if(!obj.guideHaloMat.userData.active){obj.guideHalo.scale.setScalar(1);return;}
      const t=performance.now()/1400*Math.PI*2;
      const s=1.0+(Math.sin(t)+1)*0.035;
      obj.guideHalo.scale.setScalar(s);
      obj.guideHaloMat.opacity=0.66+(Math.sin(t)+1)*0.08;
    };
  });
  connectorHaloMat.userData.baseOpacity=0;
  connectorHaloMat.opacity=0;
  connectorArrow.visible=false;
  energyDashGroup.visible=false;
  ayniInputLabel.visible=false;
  redToolHalo.visible=level3GameplayReady&&!level3Completed;
  blackFixedLabel.visible=level3GameplayReady;
  redTraceLabel.visible=level3GameplayReady;
  ayniDestinationHaloMat.opacity=level3Completed?0.42:(expected==="TP3"?0.30:0.18);
  ayniDestinationLight.intensity=level3Completed?0.48:(expected==="TP3"?0.34:0.24);
}
`,
  'tp-state-machine',
);

block(
  'guideButton.addEventListener("click",(event)=>{',
  '// EXPLORAR · Nivel 3 de 8:',
  `guideButton.addEventListener("click",(event)=>{
  event.preventDefault();
  if(!level3ExploreCompleted)return;
  guideVisible=!guideVisible;
  conceptPanel.hidden=!guideVisible;
  guideButton.classList.toggle("is-active",guideVisible);
  guideButton.classList.remove("is-recommended");
  guideButton.setAttribute("aria-pressed",String(guideVisible));
  level3GuideOpened=true;
  level3GameplayReady=true;
  controls.enabled=true;
  controls.enableZoom=true;
  controls.enablePan=false;
  controls.enableRotate=false;
  controls.minDistance=3.2;
  controls.maxDistance=13.4;
  if(guideVisible){
    moveExplore3(guide3CameraPos.toArray(),guide3CameraTarget.toArray());
    renderGuideChecklist3();
  }else{
    moveExplore3(explore3OverviewPos.toArray(),explore3OverviewTarget.toArray());
  }
  setGuideTPHalos(guideVisible);
},true);
// EXPLORAR · Nivel 3 de 8:`,
  'guide-toggle',
);

block(
  'const level3ExploreSteps = [',
  '// Halo simple para EXPLORAR:',
  `const level3ExploreSteps = [
  {
    title:"BATERÍA VERDE SELECCIONADA",
    text:"La batería verde tiene 28.0 V. Ahora será la fuente de energía del recorrido de AYNI.",
    pos:[1.05,6.15,-1.55], target:[1.05,-0.70,-1.55]
  },
  {
    title:"SIGUE EL RECORRIDO",
    text:"La energía viaja desde la fuente hasta AYNI.",
    pos:[1.05,5.70,1.15], target:[1.05,-0.94,1.15]
  },
  {
    title:"TP1, TP2 Y TP3",
    text:"Los puntos TP nos permiten revisar si el voltaje sigue presente a lo largo del recorrido.",
    pos:[1.05,5.15,1.25], target:[1.05,-0.94,1.25]
  },
  {
    title:"UNA PUNTA FIJA, OTRA RASTREA",
    text:"La punta negra se queda fija como referencia. La punta roja es la que moverás por TP1, TP2 y TP3.",
    pos:[-0.20,5.20,1.58], target:[-0.20,-1.08,1.58]
  }
];
// Halo simple para EXPLORAR:`,
  'explore-four-steps',
);
html=html.replace(/const exploreHaloScale=\[[^\]]+\];/,'const exploreHaloScale=[3.0,3.3,1.35,1.15];');

req(
  'scene.add(exploreHalo);',
  `scene.add(exploreHalo);
const roleHaloMatBlack=new THREE.MeshBasicMaterial({color:0x49C9D7,transparent:true,opacity:.55,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
const roleHaloMatRed=new THREE.MeshBasicMaterial({color:0xFF78B7,transparent:true,opacity:.62,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
const blackRoleHalo=new THREE.Mesh(new THREE.TorusGeometry(.30,.032,12,52),roleHaloMatBlack);
const redRoleHalo=new THREE.Mesh(new THREE.TorusGeometry(.30,.032,12,52),roleHaloMatRed);
[blackRoleHalo,redRoleHalo].forEach((halo)=>{halo.rotation.x=Math.PI/2;halo.renderOrder=61;halo.visible=false;scene.add(halo);});
const pulseRoleHalo=(halo,base=1)=>{const t=performance.now()/1400*Math.PI*2;const s=base+(Math.sin(t)+1)*.035;halo.scale.setScalar(s);};
blackRoleHalo.onBeforeRender=()=>pulseRoleHalo(blackRoleHalo);
redRoleHalo.onBeforeRender=()=>pulseRoleHalo(redRoleHalo);
let exploreTpSequenceToken=0;`,
  'explore-role-halos',
);

block(
  'function showExplore3(){',
  'function finishExplore3(){',
  `function showExplore3(){
  const step=level3ExploreSteps[explore3Index];
  if(!step)return;
  controls.enabled=true;
  controls.enableZoom=true;
  controls.enablePan=false;
  controls.enableRotate=false;
  controls.minDistance=3.8;
  controls.maxDistance=13.4;
  conceptPanel.hidden=false;
  conceptPanel.classList.remove("is-guide","apulab-l3-guide");
  conceptTitle.textContent=step.title+" · "+(explore3Index+1)+" / 4";
  conceptText.textContent=step.text;
  sceneHint.hidden=true;
  blackRoleHalo.visible=false;
  redRoleHalo.visible=false;
  blackFixedLabel.visible=false;
  redTraceLabel.visible=false;
  exploreHalo.visible=true;
  exploreTpSequenceToken++;
  const sequenceToken=exploreTpSequenceToken;

  if(explore3Index===2){
    const all=worldTPPositions();
    const ids=["TP1","TP2","TP3"];
    const showTp=(index)=>{
      if(sequenceToken!==exploreTpSequenceToken||explore3Index!==2)return;
      const p=all[ids[index]];
      if(p){exploreHalo.position.copy(p).add(new THREE.Vector3(0,0.20,0));exploreHalo.scale.set(1.28,1.28,1);}
    };
    showTp(0);
    window.setTimeout(()=>showTp(1),650);
    window.setTimeout(()=>showTp(2),1300);
  }else if(explore3Index===3){
    exploreHalo.visible=false;
    blackRoleHalo.visible=true;
    redRoleHalo.visible=true;
    blackFixedLabel.visible=true;
    redTraceLabel.visible=true;
    blackRoleHalo.position.copy(movedCablePoint(blackLooseProbeJoin,blackProbeDrag)).add(new THREE.Vector3(0,0.18,0));
    redRoleHalo.position.copy(movedCablePoint(redLooseProbeJoin,redProbeDrag)).add(new THREE.Vector3(0,0.18,0));
  }else{
    const haloSize=exploreHaloScale[explore3Index]||1.5;
    exploreHalo.position.set(step.target[0],0.80,step.target[2]);
    exploreHalo.scale.set(haloSize,haloSize,1);
  }

  ayniInputLabel.visible=false;
  explanationButton.textContent=explore3Index===3?"COMENZAR RETO":"CONTINUAR";
  explanationButton.classList.add("is-active");
  guideButton.disabled=true;
  moveExplore3(step.pos,step.target);
}
`,
  'explore-visual-sequence',
);

block(
  'function finishExplore3(){',
  'explanationButton.addEventListener("click",(event)=>{',
  `function finishExplore3(){
  explore3Active=false;
  explore3Index=-1;
  exploreTpSequenceToken++;
  level3ExploreCompleted=true;
  explanationButton.textContent="EXPLORAR";
  explanationButton.classList.remove("is-active","is-recommended");
  exploreHalo.visible=false;
  blackRoleHalo.visible=false;
  redRoleHalo.visible=false;
  ayniInputLabel.visible=false;
  guideButton.disabled=false;
  guideButton.classList.remove("is-recommended");
  guideVisible=true;
  level3GuideOpened=true;
  level3GameplayReady=true;
  guideButton.classList.add("is-active");
  guideButton.setAttribute("aria-pressed","true");
  controls.enabled=true;
  controls.enableZoom=true;
  controls.enablePan=false;
  controls.enableRotate=false;
  controls.minDistance=3.2;
  controls.maxDistance=13.4;
  moveExplore3(guide3CameraPos.toArray(),guide3CameraTarget.toArray());
  renderGuideChecklist3();
  setGuideTPHalos(true);
}
`,
  'finish-explore-auto-guide',
);

req(
  'function resetTP3Slot(){readingValueEls.TP3.textContent="—";',
  'function resetTP3Slot(){readingValueEls.TP3.textContent="--.- V";',
  'reset-tp3',
);

block(
  'function measureTP(tp){',
  'function pointerRay(event){',
  `function measureTP(tp){
  const expected=nextExpectedTP();
  if(!expected||level3Completed)return;
  if(tp!==expected){
    liveStatus.textContent="Ahora corresponde medir "+expected+". Lleva la punta roja al TP rosado.";
    updateGuide3();
    setGuideTPHalos(guideVisible);
    return;
  }
  const value=voltageAt(tp);
  level3Reading=value;
  redAtTP=tp;
  drawLevel3Multimeter(value);
  setReadingSlot(tp,value,tp==="TP3"&&value===0);
  measuredTP.set(tp,value);
  liveStatus.textContent=tp+" registrado: "+value.toFixed(1)+" V.";
  syncDiagnosticLights();
  updateGuide3();
  setGuideTPHalos(guideVisible);
  if(measuredTP.size===3){
    window.setTimeout(()=>completeLevel3(),430);
  }
}
`,
  'measurement-sequence',
);

block(
  'function completeLevel3(){',
  '// BITÁCORA disponible desde el inicio del Nivel 3.',
  `function completeLevel3(){
  if(level3Completed)return;
  level3Completed=true;
  updateGuide3();
  setGuideTPHalos(guideVisible);
  redToolHalo.visible=false;
  ayniDestinationHaloMat.opacity=.42;
  ayniDestinationLight.intensity=.48;
  ayniInputRing.material.color.setHex(0x49C9D7);
  ayniInputRing.material.emissive.setHex(0x49C9D7);
  ayniInputRing.material.emissiveIntensity=.55;

  journalButton.hidden=false;
  journalButton.classList.add("is-unlocked");
  journalFinalResult.hidden=false;
  journalFinalResult.querySelector(".kawsay-journal-meta").textContent="MISIÓN 01 · NIVEL 3";
  journalFinalResult.querySelector(".kawsay-journal-discovery-label").textContent="RASTREO COMPLETADO";
  journalFinalResult.querySelector(".kawsay-journal-answer-voltage").innerHTML="0.0 <span>V</span>";
  journalFinalResult.querySelector("p").innerHTML="TP1 = <b>28.0 V</b>, TP2 = <b>28.0 V</b> y TP3 = <b>0.0 V</b>. La interrupción está entre <b>TP2 y TP3</b>.";
  journalFinalResult.querySelector(".kawsay-journal-answer-note").textContent="RASTREAR = DEJAR UNA REFERENCIA FIJA Y MOVER LA OTRA PUNTA PARA VER HASTA DÓNDE LLEGA EL VOLTAJE.";

  successPopup.querySelector("#kawsay-success-title").textContent="¡RASTREO COMPLETADO!";
  successPopup.querySelector("p").innerHTML="Seguiste TP1 → TP2 → TP3 con la punta negra fija. <strong>El voltaje llega hasta TP2, pero en TP3 cae a 0.0 V.</strong>";
  const unlock=successPopup.querySelector(".kawsay-unlock-copy");
  unlock.querySelector("small").textContent="CONCLUSIÓN";
  unlock.querySelector("strong").textContent="INTERRUPCIÓN ENTRE TP2 Y TP3";
  unlock.querySelector("span").textContent="La diferencia entre las lecturas muestra hasta dónde está llegando el voltaje.";
  openJournalButton.textContent="VER BITÁCORA";
  continueLevel3Button.hidden=false;
  continueLevel3Button.textContent="CONTINUAR AL NIVEL 4";
  continueLevel3Button.disabled=false;
  continueLevel3Button.removeAttribute("aria-disabled");
  successOverlay.classList.add("is-visible");
  successOverlay.setAttribute("aria-hidden","false");
  requestAnimationFrame(()=>launchCompletionConfetti3());
}
`,
  'diagnostic-conclusion',
);

if(!html.includes('BATERÍA VERDE SELECCIONADA') ||
   !html.includes('UNA PUNTA FIJA, OTRA RASTREA') ||
   !html.includes('INTERRUPCIÓN ENTRE TP2 Y TP3') ||
   !html.includes('PUNTA NEGRA · REFERENCIA FIJA') ||
   !html.includes('PUNTA ROJA · RASTREA')){
  throw new Error('l3_redesign_acceptance_markers_missing');
}

await writeFile(path,html,'utf8');
console.info('[mission01] Level 3 FINAL · negra fija + roja única draggable · TP1→TP2→TP3 · TP3=0.0 V · interrupción TP2–TP3');
