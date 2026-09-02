import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const LEVEL3_PATH = resolve(process.cwd(), 'public/missions/mission01/level3.html');
let html = await readFile(LEVEL3_PATH, 'utf8');

if (html.includes('id="apulab-level3-redesign-style"')) {
  throw new Error('mission01_level3_redesign_already_present');
}
if (!html.includes('data-mission-level="3"') || !html.includes('const level3ExploreSteps = [')) {
  throw new Error('mission01_level3_redesign_wrong_output');
}

function replaceRequired(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`mission01_level3_redesign_missing:${label}`);
  return source.replace(before, after);
}

function replaceBetween(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`mission01_level3_redesign_missing:${label}:start`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`mission01_level3_redesign_missing:${label}:end`);
  return source.slice(0, start) + replacement + source.slice(end);
}

const css = `
<style id="apulab-level3-redesign-style">
/* ==========================================================
   NIVEL 3 ÚNICAMENTE · RASTREO CLARO
   Negra = referencia fija · Roja = rastrea · TP1 → TP2 → TP3
   ========================================================== */
#kawsay-guide {
  background: #8E7DCE !important;
  color: #FFFFFF !important;
  border-color: #B8A9F0 !important;
  box-shadow: 5px 5px 0 #4D4288 !important;
}
#kawsay-guide:hover:not(:disabled) { background: #9B8BDD !important; }
#kawsay-guide:active:not(:disabled) {
  background: #8072C4 !important;
  box-shadow: 3px 3px 0 #4D4288 !important;
}

#kawsay-concept-panel.apulab-l3-guide {
  background: linear-gradient(180deg,#3B326B 0%,#2D2654 100%) !important;
  border-color: #8E7DCE !important;
  color: #FFFFFF !important;
  box-shadow: 5px 5px 0 #241E4A !important;
}
#kawsay-concept-panel.apulab-l3-guide #kawsay-concept-title {
  display:block !important;
  margin:0 0 9px !important;
  color:#FFFFFF !important;
  font:800 13px/1.15 "Poppins",sans-serif !important;
}
#kawsay-concept-panel.apulab-l3-guide #kawsay-concept-text {
  display:block !important;
  margin:0 !important;
  color:#FFFFFF !important;
}
.apulab-l3-guide-list {
  display:flex;
  flex-direction:column;
  gap:6px;
}
.apulab-l3-guide-step {
  position:relative;
  display:block;
  min-height:27px;
  padding:6px 8px;
  overflow:hidden;
  border-left:3px solid transparent;
  border-radius:3px;
  color:#D8D4EA;
  font:800 12px/1.25 "Poppins",sans-serif;
}
.apulab-l3-guide-step.is-active {
  border-left-color:#49C9D7;
  background:rgba(73,201,215,.11);
  color:#FFFFFF;
}
.apulab-l3-guide-step.is-complete { color:#CFC9E3; opacity:.72; }
.apulab-l3-guide-step.is-complete::after {
  content:"";
  position:absolute;
  left:7px;
  top:50%;
  width:calc(100% - 14px);
  height:3px;
  border-radius:999px;
  background:#FF78B7;
  box-shadow:0 0 6px rgba(255,120,183,.55);
  transform:translateY(-50%) scaleX(1);
  transform-origin:left center;
}
.apulab-l3-guide-step.is-complete.is-new::after {
  animation:apulabL3Strike .42s ease-out both;
}
.apulab-l3-guide-reminder {
  display:block;
  margin-top:9px;
  padding-top:8px;
  border-top:1px solid rgba(255,255,255,.14);
  color:#DCD7F3;
  font:600 10.5px/1.35 "Poppins",sans-serif;
}
.apulab-l3-guide-reminder strong { color:#A8EDF1; font-weight:800; }
@keyframes apulabL3Strike {
  from { transform:translateY(-50%) scaleX(0); }
  to { transform:translateY(-50%) scaleX(1); }
}
@media(prefers-reduced-motion:reduce){
  .apulab-l3-guide-step.is-complete.is-new::after{animation:none}
}
</style>`;

html = replaceRequired(html, '</head>', `${css}\n</head>`, 'style-injection');

// Lecturas superiores: empiezan sin valor medido.
html = html.replace('<b id="measure-pink">—</b>', '<b id="measure-pink">--.- V</b>');
html = html.replace('<b id="measure-green">—</b>', '<b id="measure-green">--.- V</b>');
html = html.replace('<b id="measure-coral">—</b>', '<b id="measure-coral">--.- V</b>');

// El tablero se lee como una ruta, no como un panel de diagnóstico.
html = replaceRequired(
  html,
  'const moduleLabel = makeSpriteLabel("RASTREO DE ENERGÍA", 760, 100);',
  'const moduleLabel = makeSpriteLabel("RECORRIDO DE ENERGÍA", 760, 100);',
  'route-title',
);

// Todos los TP usan rosado únicamente cuando son el objetivo ACTIVO.
html = replaceRequired(
  html,
  'color: id === "TP2" ? tpGuidePink : tpGuideCyan,',
  'color: tpGuidePink,',
  'tp-active-halo-color',
);

// Ruta fija claramente distinta de los cables del multímetro + flecha hacia AYNI.
html = replaceRequired(
  html,
  'const trackToAyni = addTrackSegment(2.45, 3.10, level3TrackMat);',
  `const trackToAyni = addTrackSegment(2.45, 3.10, level3TrackMat);
  const routeFixedMat = new THREE.MeshStandardMaterial({
    color:0x8E7DCE,
    emissive:0x49C9D7,
    emissiveIntensity:0.18,
    metalness:0.18,
    roughness:0.48
  });
  [track1,track2,track3,trackToAyni].forEach((track)=>{ track.material = routeFixedMat; });
  const routeArrowMat = new THREE.MeshBasicMaterial({color:0xA8EDF1,toneMapped:false});
  const routeArrow = new THREE.Mesh(new THREE.ConeGeometry(0.16,0.38,24), routeArrowMat);
  routeArrow.rotation.z = -Math.PI / 2;
  routeArrow.position.set(3.22, trackY, trackZ);
  routeArrow.renderOrder = 30;
  diagnosticGroup.add(routeArrow);`,
  'route-arrow',
);

// Cables más simples: menos bucles, menos cruces y separados de la ruta impresa.
html = replaceBetween(
  html,
  'function redLooseCablePoints(end = movedCablePoint(redLooseProbeJoin, redProbeDrag)) {',
  'function redContactCablePoints(end) {',
  `function redLooseCablePoints(end = movedCablePoint(redLooseProbeJoin, redProbeDrag)) {
    return [
      redConnectedEnd,
      redConnectedEnd.clone().add(new THREE.Vector3(0.12, 0, 0.12)),
      new THREE.Vector3(-2.18, -1.38, 1.10),
      new THREE.Vector3(-1.05, -1.40, 1.42),
      end.clone().add(new THREE.Vector3(-0.28, -0.02, 0.02)),
      end
    ];
  }
  function blackLooseCablePoints(end = movedCablePoint(blackLooseProbeJoin, blackProbeDrag)) {
    return [
      blackConnectedEnd,
      blackConnectedEnd.clone().add(new THREE.Vector3(-0.10, 0, 0.15)),
      new THREE.Vector3(-2.55, -1.07, 1.76),
      new THREE.Vector3(-1.22, -1.08, 1.90),
      end.clone().add(new THREE.Vector3(-0.22, 0, 0.04)),
      end
    ];
  }
  `,
  'clean-loose-cables',
);

// AYNI del lado derecho queda como destino real: se elimina su mini-panel diagnóstico interno.
html = replaceRequired(
  html,
  'statusIds.forEach((id,index)=>{ const x=-0.30+index*0.20; const mat=new THREE.MeshBasicMaterial({color:0x59647f,toneMapped:false}); const lamp=new THREE.Mesh(new THREE.CircleGeometry(0.072,28),mat); lamp.rotation.x=-Math.PI/2; lamp.position.set(x,0.70,0.39); lamp.renderOrder=31; ayniGroup.add(lamp); const lampLabel=makeSpriteLabel(id,180,70,"#DFF8FA","rgba(36,33,74,.92)"); lampLabel.position.set(x,0.91,0.40); lampLabel.scale.set(0.20,0.075,1); ayniGroup.add(lampLabel); diagnosticLights[id]={lamp,mat,label:lampLabel}; });',
  `statusIds.forEach((id,index)=>{ const x=-0.30+index*0.20; const mat=new THREE.MeshBasicMaterial({color:0x59647f,toneMapped:false}); const lamp=new THREE.Mesh(new THREE.CircleGeometry(0.072,28),mat); lamp.rotation.x=-Math.PI/2; lamp.position.set(x,0.70,0.39); lamp.renderOrder=31; ayniGroup.add(lamp); const lampLabel=makeSpriteLabel(id,180,70,"#DFF8FA","rgba(36,33,74,.92)"); lampLabel.position.set(x,0.91,0.40); lampLabel.scale.set(0.20,0.075,1); ayniGroup.add(lampLabel); diagnosticLights[id]={lamp,mat,label:lampLabel}; });
  // Nivel 3 V2: no duplicamos AYNI con un semáforo/estado interno.
  statusPanel.visible = false;
  ayniStatus.visible = false;
  ayniLabel.visible = false;
  Object.values(diagnosticLights).forEach(({lamp,label})=>{ lamp.visible=false; label.visible=false; });
  const ayniDestinationHaloMat = new THREE.MeshBasicMaterial({
    color:0x49C9D7, transparent:true, opacity:0.30,
    depthTest:false, depthWrite:false, blending:THREE.AdditiveBlending, toneMapped:false
  });
  const ayniDestinationHalo = new THREE.Mesh(new THREE.TorusGeometry(0.86,0.045,14,56),ayniDestinationHaloMat);
  ayniDestinationHalo.rotation.x = Math.PI / 2;
  ayniDestinationHalo.position.set(0,0.02,0.08);
  ayniDestinationHalo.renderOrder = 55;
  ayniGroup.add(ayniDestinationHalo);
  const ayniDestinationLight = new THREE.PointLight(0x49C9D7,0.46,3.0,2);
  ayniDestinationLight.position.set(0,0.5,0.4);
  ayniGroup.add(ayniDestinationLight);`,
  'remove-ayni-diagnostic-box',
);

// La negra ya está fijada por la lógica original. Añadimos etiquetas breves y prioridad a la roja.
html = replaceRequired(
  html,
  'updateLooseCableDuringDrag("black", true);',
  `updateLooseCableDuringDrag("black", true);
  const blackFixedLabel = makeSpriteLabel("PUNTA NEGRA · REFERENCIA FIJA",760,90,"#A8EDF1","rgba(20,25,56,.92)");
  blackFixedLabel.position.copy(commonRefWorld).add(new THREE.Vector3(0,0.58,0.12));
  blackFixedLabel.scale.set(1.48,0.20,1);
  scene.add(blackFixedLabel);
  const redTraceLabel = makeSpriteLabel("PUNTA ROJA · RASTREA",620,90,"#FFF7E8","rgba(62,31,68,.92)");
  redTraceLabel.position.copy(redLooseProbeJoin).add(new THREE.Vector3(0,0.58,0.10));
  redTraceLabel.scale.set(1.18,0.20,1);
  redProbeDrag.group.add(redTraceLabel);
  const redToolHaloMat = new THREE.MeshBasicMaterial({
    color:0xFF78B7, transparent:true, opacity:0.48,
    depthTest:false, depthWrite:false, blending:THREE.AdditiveBlending, toneMapped:false
  });
  const redToolHalo = new THREE.Mesh(new THREE.TorusGeometry(0.23,0.028,12,48),redToolHaloMat);
  redToolHalo.rotation.x=Math.PI/2;
  redToolHalo.position.copy(redProbeDrag.snapPoint).add(new THREE.Vector3(0,0.10,0));
  redToolHalo.renderOrder=59;
  redToolHalo.visible=false;
  redProbeDrag.group.add(redToolHalo);
  redToolHalo.onBeforeRender=()=>{
    redToolHaloMat.opacity=0.40+Math.sin(performance.now()*0.0032)*0.10;
  };`,
  'probe-role-labels',
);

// GUÍA: un único checklist dinámico de tres pasos. Los feedbacks ya no sustituyen la caja.
html = replaceBetween(
  html,
  'function showGuide(title,text,hint="") {',
  'guideButton.disabled=false;',
  `function showGuide(title,text,hint="") {
    liveStatus.textContent = hint || text || title;
  }
  let guide3RenderedCount = -1;
  function renderGuideChecklist3() {
    const count = Math.min(3, measuredTP.size);
    const justCompleted = count > guide3RenderedCount ? count - 1 : -1;
    const labels = [
      "1 · LLEVA LA PUNTA ROJA A TP1",
      "2 · CONTINÚA HASTA TP2",
      "3 · TERMINA EN TP3"
    ];
    conceptPanel.hidden=false;
    conceptPanel.classList.add("is-guide","apulab-l3-guide");
    conceptTitle.textContent="GUÍA · 3 PASOS";
    conceptText.innerHTML='<span class="apulab-l3-guide-list">'+labels.map((label,index)=>{
      const complete=index<count;
      const active=index===count && count<3;
      const state=complete ? ' is-complete'+(index===justCompleted?' is-new':'') : (active?' is-active':'');
      return '<span class="apulab-l3-guide-step'+state+'">'+label+'</span>';
    }).join('')+'</span>';
    sceneHint.hidden=false;
    sceneHint.innerHTML='<span class="apulab-l3-guide-reminder"><strong>RECUERDA:</strong> La punta negra se queda fija y la roja es la que se mueve.</span>';
    guide3RenderedCount=count;
  }
  function updateGuide3() {
    if (guideVisible) renderGuideChecklist3();
  }
  `,
  'dynamic-guide',
);

// Solo un TP activo a la vez. Medidos = cyan tenue; objetivo = aro rosado.
html = replaceBetween(
  html,
  'function setGuideTPHalos(visible){',
  'guideButton.addEventListener("click",(event)=>{',
  `function setGuideTPHalos(visible){
    const expected=nextExpectedTP();
    ["TP1","TP2","TP3"].forEach((id)=>{
      const obj=tpMeshes[id];
      if(!obj)return;
      const active=visible && !level3Completed && id===expected;
      obj.guideHaloMat.color.setHex(tpGuidePink);
      obj.guideHaloMat.userData.baseOpacity=active?0.76:0;
      obj.guideHaloMat.opacity=active?0.76:0;
    });
    connectorHaloMat.userData.baseOpacity=0;
    connectorHaloMat.opacity=0;
    connectorArrow.visible=false;
    energyDashGroup.visible=false;
    ayniInputLabel.visible=visible && expected===null;
    redToolHalo.visible=level3GameplayReady && !level3Completed;
    ayniDestinationHaloMat.opacity=level3Completed?0.58:(expected==="TP3"?0.40:0.30);
    ayniDestinationLight.intensity=level3Completed?0.92:(expected==="TP3"?0.62:0.46);
  }
  `,
  'single-active-tp',
);

// Botón GUÍA mantiene una sola caja morada y no habilita mecánicas adicionales.
html = replaceBetween(
  html,
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
  'guide-handler',
);

// EXPLORAR se reduce exactamente a 4 pasos y solo enseña conceptos nuevos.
html = replaceBetween(
  html,
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
      text:"Los puntos TP nos ayudan a revisar si el voltaje sigue presente a lo largo del recorrido.",
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

html = html.replace(
  /const exploreHaloScale=\[[^\]]+\];/,
  'const exploreHaloScale=[3.0,3.3,3.2,2.35];',
);

// Dos halos de rol para el paso 4/4: negra fija y roja móvil.
html = replaceRequired(
  html,
  'scene.add(exploreHalo);',
  `scene.add(exploreHalo);
  const makeProbeRoleHalo=()=>{
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({
      map:exploreHaloTexture,transparent:true,depthTest:false,depthWrite:false,
      blending:THREE.AdditiveBlending,toneMapped:false
    }));
    sprite.visible=false; sprite.renderOrder=61; sprite.scale.set(1.15,1.15,1); scene.add(sprite); return sprite;
  };
  const blackRoleHalo=makeProbeRoleHalo();
  const redRoleHalo=makeProbeRoleHalo();`,
  'probe-role-halos',
);

html = replaceRequired(
  html,
  'ayniInputLabel.visible=explore3Index===level3ExploreSteps.length-1;',
  `ayniInputLabel.visible=false;
  const roleStep=explore3Index===3;
  blackRoleHalo.visible=roleStep;
  redRoleHalo.visible=roleStep;
  if(roleStep){
    const blackRolePos=movedCablePoint(blackLooseProbeJoin,blackProbeDrag).clone().add(new THREE.Vector3(0,.18,0));
    const redRolePos=movedCablePoint(redLooseProbeJoin,redProbeDrag).clone().add(new THREE.Vector3(0,.18,0));
    blackRoleHalo.position.copy(blackRolePos);
    redRoleHalo.position.copy(redRolePos);
  }`,
  'explore-role-focus',
);

// Al terminar 4/4 la GUÍA se abre sola; no aparece "abre la guía".
html = replaceBetween(
  html,
  'function finishExplore3(){',
  'explanationButton.addEventListener("click",(event)=>{',
  `function finishExplore3(){
    explore3Active=false;
    explore3Index=-1;
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

// Reset visual coherente con --.- V.
html = replaceRequired(
  html,
  'function resetTP3Slot(){readingValueEls.TP3.textContent="—";',
  'function resetTP3Slot(){readingValueEls.TP3.textContent="--.- V";',
  'reset-tp3-reading',
);

// Reto principal: rastrear, no diagnosticar/reparar. Termina al medir TP3 en orden.
html = replaceBetween(
  html,
  'function measureTP(tp){',
  'function pointerRay(event){',
  `function measureTP(tp){
    const expected=nextExpectedTP();
    if(!expected || level3Completed)return;
    if(tp!==expected){
      liveStatus.textContent=\`Ahora corresponde medir \${expected}. Sigue TP1 → TP2 → TP3.\`;
      updateGuide3();
      setGuideTPHalos(guideVisible);
      return;
    }
    const value=voltageAt(tp);
    level3Reading=value;
    redAtTP=tp;
    drawLevel3Multimeter(value);
    setReadingSlot(tp,value,tp==="TP3"&&value===0);
    const mat=tpGlows[tp];
    mat.color.setHex(tpGuideCyan);
    mat.emissive.setHex(tpGuideCyan);
    mat.emissiveIntensity=0.34;
    measuredTP.set(tp,value);
    liveStatus.textContent=\`\${tp} registrado: \${value.toFixed(1)} V.\`;
    if(measuredTP.size===3){
      completeLevel3();
      return;
    }
    updateGuide3();
    setGuideTPHalos(guideVisible);
  }
  `,
  'simple-measure-flow',
);

// El conector queda como componente visual neutro y ya no participa en la interacción.
html = replaceRequired(
  html,
  'if(connectorReady&&!connectorFixed){const hit=ray3.intersectObject(connectorPlug,true).find(h=>objectHasLevel3Connector(h.object));if(hit){connectorDragging=true;canvas.setPointerCapture?.(event.pointerId);event.preventDefault();return;}}',
  '/* Nivel 3 V2: el conector es contexto visual, no una tarea interactiva. */',
  'disable-connector-drag-start',
);

// Final: conserva la evidencia medida; no inventa una reparación ni fuerza TP3 a 28 V.
html = replaceBetween(
  html,
  'function completeLevel3(){',
  '// BITÁCORA disponible desde el inicio del Nivel 3.',
  `function completeLevel3(){
    if(level3Completed)return;
    level3Completed=true;
    updateGuide3();
    setGuideTPHalos(guideVisible);
    [track1,track2,track3,trackToAyni].forEach((track)=>{ track.material=routeFixedMat; });
    ayniDestinationHaloMat.opacity=0.58;
    ayniDestinationLight.intensity=0.92;
    ayniInputRing.material.color.setHex(0x49C9D7);
    ayniInputRing.material.emissive.setHex(0x49C9D7);
    ayniInputRing.material.emissiveIntensity=1.08;
    eyeMatL.color.setHex(0x49C9D7);
    eyeMatR.color.setHex(0x49C9D7);

    journalButton.hidden=false;
    journalButton.classList.add("is-unlocked");
    journalFinalResult.hidden=false;
    journalFinalResult.querySelector(".kawsay-journal-meta").textContent="MISIÓN 01 · NIVEL 3";
    journalFinalResult.querySelector(".kawsay-journal-discovery-label").textContent="RECORRIDO RASTREADO";
    journalFinalResult.querySelector(".kawsay-journal-answer-voltage").innerHTML="0.0 <span>V</span>";
    journalFinalResult.querySelector("p").innerHTML="TP1 = <b>28.0 V</b>, TP2 = <b>28.0 V</b> y TP3 = <b>0.0 V</b>. El cambio aparece entre TP2 y TP3.";
    journalFinalResult.querySelector(".kawsay-journal-answer-note").textContent="RASTREAR = MANTENER UNA REFERENCIA FIJA Y MOVER LA OTRA PUNTA POR VARIOS PUNTOS.";

    successPopup.querySelector("#kawsay-success-title").textContent="¡RASTREO COMPLETADO!";
    successPopup.querySelector("p").innerHTML="Seguiste el recorrido con una referencia fija y mediste TP1, TP2 y TP3. <strong>Encontraste dónde cambia el voltaje antes de llegar a AYNI.</strong>";
    const unlock=successPopup.querySelector(".kawsay-unlock-copy");
    unlock.querySelector("small").textContent="RECORRIDO COMPLETADO";
    unlock.querySelector("strong").textContent="TP1 → TP2 → TP3";
    unlock.querySelector("span").textContent="La punta negra permaneció fija y la roja rastreó los tres puntos en orden.";
    openJournalButton.textContent="VER BITÁCORA";
    continueLevel3Button.hidden=false;
    continueLevel3Button.textContent="CONTINUAR AL NIVEL 4";
    continueLevel3Button.disabled=false;
    continueLevel3Button.removeAttribute("aria-disabled");
    successOverlay.classList.add("is-visible");
    successOverlay.setAttribute("aria-hidden","false");
    requestAnimationFrame(()=>launchCompletionConfetti3());
  }
  // BITÁCORA disponible desde el inicio del Nivel 3.`,
  'simple-completion',
);

// Semántica final exigida por el rediseño.
for (const marker of [
  'RECORRIDO DE ENERGÍA',
  'BATERÍA VERDE SELECCIONADA',
  'UNA PUNTA FIJA, OTRA RASTREA',
  'LLEVA LA PUNTA ROJA A TP1',
  'REFERENCIA FIJA',
  '--.- V',
]) {
  if (!html.includes(marker)) throw new Error(`mission01_level3_redesign_validation_missing:${marker}`);
}

await writeFile(LEVEL3_PATH, html, 'utf8');
console.info('[mission01] Level 3 · RECORRIDO TP1→TP2→TP3 · negra fija + roja rastrea · EXPLORAR 1/4 · GUÍA 3 pasos');
