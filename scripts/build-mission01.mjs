import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';

const ROOT = process.cwd();
const MISSION_SRC = resolve(ROOT, 'src/missions/mission01/final');
const OUT_DIR = resolve(ROOT, 'public/missions/mission01');

// Nivel 2 conserva verificación exacta. Nivel 1 se fija de nuevo al final de
// esta edición pedagógica después de obtener su hash determinista en CI.
const FINAL_EXPECTED = {
  2: { sha256: 'e6a93e42ddb2d3e561b09d95ae4416f8d9b1dd0e03e77d16b8891e7d2be3f29c', bytes: 206358 },
};

// Fuentes verificadas ANTES de aplicar los parches de integración.
const SOURCE_EXPECTED = {
  3: { sha256: '9ffbca00d019fcad5de92c6b44d8f171cc67c9a7ddc08173a6b98df6d70fc9c8', bytes: 216199 },
  4: { sha256: '6280407de00b0000246f9c867c8afc56aaa6517201d0eed1ef478f92f83c3090', bytes: 65468 },
  5: { sha256: '91e91872fab766d2b9c00b7bb6f660e2eac00a80c71f2e24bf4521e8d905819c', bytes: 73992 },
  6: { sha256: 'cf4ffca1d26291f81f38572142d09153be0d72a0da3aa9bed7da90e23fa93110', bytes: 85709 },
};

function sha256(text) {
  return createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
}

function integrity(level, html, expected, phase) {
  const actualHash = sha256(html);
  const actualBytes = Buffer.byteLength(html, 'utf8');
  if (actualHash !== expected.sha256 || actualBytes !== expected.bytes) {
    throw new Error(
      `mission01_integrity_failed:${phase}:level${level}:sha=${actualHash}:bytes=${actualBytes}`,
    );
  }
}

async function concatParts(directory, pattern) {
  const names = (await readdir(directory))
    .filter((name) => pattern.test(name))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  if (!names.length) throw new Error(`mission01_missing_parts:${directory}`);
  const chunks = await Promise.all(
    names.map(async (name) => (await readFile(resolve(directory, name), 'utf8')).replace(/\s+/g, '')),
  );
  return chunks.join('');
}

function replaceRequired(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`mission01_patch_missing:${label}`);
  return source.replace(before, after);
}

function replaceBlock(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`mission01_patch_missing:${label}:start`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`mission01_patch_missing:${label}:end`);
  return source.slice(0, start) + replacement + source.slice(end);
}

function patchLevel1(source) {
  let html = source;
  html = replaceRequired(
    html,
    '/* El progreso 1/3 queda intacto: el usuario pidió cambiar solo botones y cajas de texto. */',
    '/* El progreso 1/8 queda fijado para Misión 01: el usuario pidió cambiar solo botones y cajas de texto. */',
    'l1-progress-comment',
  );
  html = replaceRequired(
    html,
    'V53 — Ajustes finales: 1/3 estándar + Bitácora más clara',
    'V53 — Ajustes finales: progreso estándar + Bitácora más clara',
    'l1-v53-comment',
  );
  html = replaceRequired(
    html,
    'V54 — Felicitación en crema/amarillo + 1/3 con misma fuente',
    'V54 — Felicitación en crema/amarillo + progreso con misma fuente',
    'l1-v54-comment',
  );
  html = replaceRequired(
    html,
    'aria-label="Nivel 1 de 3: medir el voltaje del módulo de energía de AYNI"',
    'aria-label="Nivel 1 de 8: medir el voltaje del módulo de energía de AYNI"',
    'l1-canvas-aria',
  );
  html = replaceRequired(
    html,
    'aria-label="Nivel 1 de 3">1 / 3</span>',
    'aria-label="Nivel 1 de 8">1 / 8</span>',
    'l1-progress',
  );
  html = html.replaceAll('three@0.160.0', 'three@0.180.0');

  // NIVEL 1 ÚNICAMENTE: señal tutorial temporal. No altera layout ni botones.
  const interactionCss = `
/* ==========================================================
   NIVEL 1 · ATENCIÓN TEMPORAL A EXPLORAR
   Solo flecha/pulse permitidos por el contrato pedagógico.
   ========================================================== */
#kawsay-explore-attention {
  position: absolute;
  left: 1162px;
  top: 48px;
  width: 48px;
  height: 20px;
  z-index: 1002;
  pointer-events: none;
  filter: drop-shadow(0 0 7px rgba(244, 199, 94, 0.62));
  animation: kawsay-explore-arrow-float 1.45s ease-in-out infinite;
}
#kawsay-explore-attention[hidden] { display: none !important; }
#kawsay-explore-attention::before {
  content: "";
  position: absolute;
  left: 0;
  top: 8px;
  width: 34px;
  height: 4px;
  border-radius: 999px;
  background: #F4C75E;
  box-shadow: 0 0 9px rgba(244, 199, 94, 0.5);
}
#kawsay-explore-attention::after {
  content: "";
  position: absolute;
  right: 0;
  top: 2px;
  width: 0;
  height: 0;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  border-left: 14px solid #F4C75E;
}
#kawsay-hud-container > #kawsay-explanation.is-explore-attention {
  animation: kawsay-explore-attention-pulse 1.65s ease-in-out infinite !important;
  will-change: transform, box-shadow;
}
@keyframes kawsay-explore-attention-pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 5px 5px 0 #D5A43D, 0 0 0 0 rgba(244,199,94,0), 0 0 12px rgba(244,199,94,.16) !important;
  }
  50% {
    transform: scale(1.025);
    box-shadow: 5px 5px 0 #D5A43D, 0 0 0 4px rgba(255,229,163,.12), 0 0 19px rgba(244,199,94,.34) !important;
  }
}
@keyframes kawsay-explore-arrow-float {
  0%, 100% { transform: translateY(-2px); }
  50% { transform: translateY(2px); }
}
@media (prefers-reduced-motion: reduce) {
  #kawsay-explore-attention { animation: none; }
  #kawsay-hud-container > #kawsay-explanation.is-explore-attention {
    animation: none !important;
    transform: none !important;
    box-shadow: 5px 5px 0 #D5A43D, 0 0 0 2px rgba(255,229,163,.14), 0 0 14px rgba(244,199,94,.25) !important;
  }
}
`;
  html = replaceRequired(html, '</style>\n</head>', `${interactionCss}</style>\n</head>`, 'l1-attention-css');

  html = replaceRequired(
    html,
    '<button id="kawsay-explanation" class="kawsay-hud-button is-recommended" type="button">EXPLORAR</button>',
    '<button id="kawsay-explanation" class="kawsay-hud-button is-recommended is-explore-attention" type="button">EXPLORAR</button>',
    'l1-explore-attention-class',
  );
  html = replaceRequired(
    html,
    '    </nav>\n\n    <button id="kawsay-journal"',
    '    </nav>\n    <div id="kawsay-explore-attention" aria-hidden="true"></div>\n\n    <button id="kawsay-journal"',
    'l1-explore-arrow-dom',
  );

  html = replaceRequired(
    html,
    '  const guideButton = document.getElementById("kawsay-guide");',
    '  const guideButton = document.getElementById("kawsay-guide");\n  const exploreAttention = document.getElementById("kawsay-explore-attention");',
    'l1-explore-arrow-ref',
  );
  html = replaceRequired(
    html,
    '  let cameraTween = null;',
    '  let cameraTween = null;\n  let exploreAttentionDismissed = false;\n  let exploreCompleted = false;',
    'l1-explore-state',
  );

  // EXPLORAR: 11 pantallas -> exactamente 4 focos conceptuales.
  html = replaceBlock(
    html,
    '  const guidedExplanation = [',
    '  // Halo de enfoque:',
    `  // NIVEL 1 · EXPLORAR 4 PASOS
  const guidedExplanation = [
    {
      focus: "battery-overview",
      title: "¿QUÉ VAMOS A MEDIR?",
      text: "La batería tiene dos terminales: + y −. El voltaje nos ayuda a comparar la energía entre esos dos puntos.",
      view: { position: [2.45, 6.1, -0.25], target: [2.45, -0.55, -0.25] }
    },
    {
      focus: "multimeter",
      title: "EL MULTÍMETRO",
      text: "El multímetro es nuestra herramienta de medición. Para medir voltaje debe estar encendido y preparado en V⎓.",
      view: { position: [-3.25, 6.25, 0.0], target: [-3.25, -0.55, 0.0] }
    },
    {
      focus: "probes",
      title: "DOS PUNTAS, DOS PUNTOS",
      text: "Para medir voltaje necesitamos comparar dos puntos. Por eso usamos dos puntas.",
      view: { position: [0.8, 6.2, 2.1], target: [0.8, -1.0, 2.1] }
    },
    {
      focus: "overview",
      title: "AHORA PRUÉBALO",
      text: "Conecta las puntas y descubre qué lectura obtiene el multímetro.",
      view: { position: [0, 13.1, 0.10], target: [0, -1.02, 0.10] }
    }
  ];

`,
    'l1-guided-explanation-four-steps',
  );

  html = replaceRequired(
    html,
    '  const focusVisualDefinitions = {',
    '  const focusVisualDefinitions = {\n    "battery-overview": { position: [2.45, 0.72, -0.25], scale: [5.35, 2.95], color: 0xffd45a },',
    'l1-battery-overview-focus',
  );

  // Etiqueta MULTÍMETRO: reutiliza exactamente el generador de PUNTA ROJA/NEGRA.
  html = replaceRequired(
    html,
    '  const redConnectedEnd = createPortPlug(',
    '  addLooseLabel(scene, "MULTÍMETRO", new THREE.Vector3(-3.25, 0.34, -2.02), "#ffd43b", null);\n\n  const redConnectedEnd = createPortPlug(',
    'l1-multimeter-label',
  );

  // Durante el paso 2/4 se destaca el multímetro completo junto con POWER,
  // pantalla y V⎓; durante 1/4 se destacan batería y terminales.
  html = replaceRequired(
    html,
    '    const screenHighlighted = explanationMode && ["screen", "voltage"].includes(guideFocus);',
    '    const screenHighlighted = explanationMode && ["screen", "voltage", "multimeter"].includes(guideFocus);',
    'l1-multimeter-screen-focus',
  );
  html = replaceRequired(
    html,
    '    const dcvHighlighted = explanationMode && guideFocus === "dcv";',
    '    const dcvHighlighted = explanationMode && ["dcv", "multimeter"].includes(guideFocus);',
    'l1-multimeter-dcv-focus',
  );
  html = replaceRequired(
    html,
    '    const powerHighlighted = (explanationMode && guideFocus === "multimeter-power")',
    '    const powerHighlighted = (explanationMode && ["multimeter-power", "multimeter"].includes(guideFocus))',
    'l1-multimeter-power-focus',
  );
  html = replaceRequired(
    html,
    '      && ["terminals", "polarity", "voltage"].includes(guideFocus);',
    '      && ["terminals", "polarity", "voltage", "battery-overview"].includes(guideFocus);',
    'l1-battery-terminal-focus',
  );

  // GUÍA conserva el panel y la mecánica existentes; solo concentra el CÓMO.
  html = replaceBlock(
    html,
    '  function updateGuide() {',
    '  function announceStatus(title, text) {',
    `  function updateGuide() {
    if (!guideActive || explanationMode) return;

    conceptPanel.classList.remove("is-compact");
    conceptPanel.classList.add("is-guide");

    if (challengeState === CHALLENGE_STATE.AWAITING_BATTERY_POWER) {
      setHudContent(
        "1 · ENCIENDE LA BATERÍA",
        "Busca el botón POWER de la batería y presiónalo.",
        "La batería debe estar encendida antes de medir."
      );
    } else if (challengeState === CHALLENGE_STATE.AWAITING_METER_POWER) {
      setHudContent(
        "2 · PREPARA EL MULTÍMETRO",
        "Presiona POWER en el multímetro. Ya está preparado en V⎓; el cable negro está en COM y el rojo en VΩ.",
        "Cuando la pantalla se encienda, el instrumento estará listo."
      );
    } else if (challengeState === CHALLENGE_STATE.READY) {
      setHudContent(
        "3 · USA LAS DOS PUNTAS",
        "Acerca una punta a cada terminal para comparar dos puntos.",
        "Observa la lectura: el signo también puede darte una pista."
      );
    } else if (challengeState === CHALLENGE_STATE.ONE_PROBE) {
      setHudContent(
        "4 · FALTA UN SEGUNDO PUNTO",
        "Ya conectaste una punta. Lleva la otra al terminal libre.",
        "Tenemos un punto. Para medir voltaje necesitamos comparar dos."
      );
    } else if (challengeState === CHALLENGE_STATE.REVERSED) {
      setHudContent(
        "EL SIGNO − ES UNA PISTA",
        "La medición funciona. El signo − nos indica que las puntas están invertidas.",
        "Intercámbialas y vuelve a observar la lectura."
      );
    } else if (challengeState === CHALLENGE_STATE.COMPLETED || challengeState === CHALLENGE_STATE.CORRECT) {
      setHudContent(
        "¡MEDICIÓN COMPLETADA!",
        "28.0 V es la diferencia de voltaje entre los dos puntos que medimos."
      );
    }
  }

`,
    'l1-guide-how-to',
  );

  html = replaceRequired(
    html,
    '          "La fuente y el multímetro están encendidos. Ahora compara los dos terminales: roja en + y negra en −."',
    '          "La fuente y el multímetro están encendidos. Usa las dos puntas para comparar los dos terminales."',
    'l1-ready-no-solution',
  );
  html = replaceRequired(
    html,
    '          "Ya tienes un punto",\n          "El voltaje compara dos puntos. Falta llevar la otra punta al terminal libre."',
    '          "Tenemos un punto",\n          "Para medir voltaje necesitamos comparar dos."',
    'l1-one-probe-feedback',
  );
  html = replaceRequired(
    html,
    '          "¡Mira el signo −!",\n          "−15.0 V no significa que la batería esté mal. Es una pista de polaridad: las puntas están invertidas. Cambia roja a + y negra a −."',
    '          "La medición funciona",\n          "El signo − nos indica que las puntas están invertidas. Puedes corregirlas inmediatamente."',
    'l1-reversed-feedback',
  );
  html = replaceRequired(
    html,
    '          "¡15.0 V! Medición correcta",\n          "Roja en + y negra en −. La lectura positiva confirma que mediste correctamente esta batería de práctica."',
    '          "28.0 V",\n          "28.0 V es la diferencia de voltaje entre los dos puntos que medimos."',
    'l1-correct-feedback',
  );

  // Atención inicial: desaparece al primer clic y no vuelve durante la sesión.
  html = replaceBlock(
    html,
    '  function showExplanationStep() {',
    '  function finishExplanation() {',
    `  function dismissExploreAttention() {
    if (exploreAttentionDismissed) return;
    exploreAttentionDismissed = true;
    if (exploreAttention) exploreAttention.hidden = true;
    explanationButton.classList.remove("is-explore-attention", "is-recommended");
  }

  function showExplanationStep() {
    enforceUiAnchors();
    const step = guidedExplanation[explanationIndex];
    explanationButton.textContent = "CONTINUAR";
    explanationButton.setAttribute("aria-label", "Continuar recorrido");
    explanationButton.classList.remove("is-recommended");
    conceptPanel.classList.remove("is-guide");
    sceneHint.textContent = "";
    sceneHint.hidden = true;
    setBatteryXray(Boolean(step.xray));
    setHudContent(\`\${step.title} · \${explanationIndex + 1} / \${guidedExplanation.length}\`, step.text);
    liveStatus.textContent = step.title + ". " + step.text;
    moveCamera(step.view);
  }

`,
    'l1-explore-attention-dismiss',
  );
  html = replaceRequired(
    html,
    '    explanationCompleted = true;\n    explanationIndex = -1;',
    '    explanationCompleted = true;\n    exploreCompleted = true;\n    dismissExploreAttention();\n    explanationIndex = -1;',
    'l1-explore-completed-state',
  );
  html = replaceRequired(
    html,
    '    if (!explanationMode) {\n      if (guideActive) setGuideMode(false);',
    '    if (!explanationMode) {\n      dismissExploreAttention();\n      if (guideActive) setGuideMode(false);',
    'l1-dismiss-on-click',
  );

  // La batería de práctica de esta revisión pedagógica se mide a 28.0 V.
  html = replaceRequired(
    html,
    '  const PRACTICE_BATTERY_VOLTAGE = 15.0;',
    '  const PRACTICE_BATTERY_VOLTAGE = 28.0;',
    'l1-practice-voltage',
  );
  html = html.replaceAll('15.0 V', '28.0 V');
  html = html.replaceAll('15.0 voltios', '28.0 voltios');
  html = replaceRequired(
    html,
    '<div class="kawsay-journal-voltage">15.0 <span>V</span></div>',
    '<div class="kawsay-journal-voltage">28.0 <span>V</span></div>',
    'l1-journal-voltage',
  );

  return html;
}

function patchLevel2(source) {
  let html = source;
  html = replaceRequired(
    html,
    'NIVEL 2 / 3 · COMPARAR — prototipo funcional',
    'NIVEL 2 / 8 · COMPARAR — prototipo funcional',
    'l2-comment',
  );
  html = replaceRequired(
    html,
    'aria-label="Nivel 2: mide tres baterías, desbloquea el dato de misión, compara sus voltajes y elige una candidata"',
    'aria-label="Nivel 2 de 8: mide tres baterías, desbloquea el dato de misión, compara sus voltajes y elige una candidata"',
    'l2-canvas-aria',
  );
  html = replaceRequired(
    html,
    'aria-label="Nivel 2 de 3">2 / 3</span>',
    'aria-label="Nivel 2 de 8">2 / 8</span>',
    'l2-progress',
  );
  return html.replaceAll('three@0.160.0', 'three@0.180.0');
}

function patchLevel3(source) {
  let html = source.replaceAll('NIVEL 4 · PRÓXIMAMENTE', 'CONTINUAR AL NIVEL 4');
  html = html.replaceAll('continueLevel3Button.disabled=true', 'continueLevel3Button.disabled=false');
  html = html.replaceAll(
    'continueLevel3Button.setAttribute("aria-disabled","true")',
    'continueLevel3Button.removeAttribute("aria-disabled")',
  );
  html = replaceRequired(
    html,
    '// ---------- Render y transferencia visual de la batería del Nivel 2 ----------',
    `continueLevel3Button.addEventListener("click",()=>{\n  let handled=false;\n  try{\n    if(parent&&typeof parent.apulabCompleteLevel==="function"){\n      parent.apulabCompleteLevel(3,4);\n      handled=true;\n    }\n  }catch(_){}\n  if(!handled){\n    try{parent.postMessage({type:"apulab-level-complete",level:3,nextLevel:4},"*")}catch(_){}\n  }\n});\n\n// ---------- Render y transferencia visual de la batería del Nivel 2 ----------`,
    'l3-next-level-listener',
  );
  return html;
}

function patchLevel4(source) {
  let html = source.replaceAll('three@0.160.0', 'three@0.180.0');
  const before = "function goToNextLevel(){let handled=false;try{if(parent&&typeof parent.apulabCompleteLevel==='function'){parent.apulabCompleteLevel(4,5);handled=true}}catch(e){console.warn('Direct navigation bridge unavailable',e)}if(!handled){try{parent.postMessage({type:'apulab-level-complete',level:4,nextLevel:5},'*')}catch(e){console.error('Navigation failed',e)}}}";
  const after = "function goToNextLevel(){try{localStorage.setItem('apulab.level4.successProgram',JSON.stringify(program))}catch(_){}let handled=false;try{if(parent&&typeof parent.apulabCompleteLevel==='function'){parent.apulabCompleteLevel(4,5);handled=true}}catch(e){console.warn('Direct navigation bridge unavailable',e)}if(!handled){try{parent.postMessage({type:'apulab-level-complete',level:4,nextLevel:5},'*')}catch(e){console.error('Navigation failed',e)}}}";
  html = replaceRequired(html, before, after, 'l4-program-continuity');
  html = patchSfxAudio45(html, 4);
  return html;
}

function patchSfxAudio45(source, level) {
  return replaceRequired(
    source,
    "function ensureAudio(){\n  const AC=window.AudioContext||window.webkitAudioContext;",
    "function ensureAudio(){\n  try{if(localStorage.getItem('apulab.settings.sfx')==='off')return null}catch(_){}\n  const AC=window.AudioContext||window.webkitAudioContext;",
    `l${level}-sfx-setting`,
  );
}

function patchLevel5(source) {
  return patchSfxAudio45(source.replaceAll('three@0.160.0', 'three@0.180.0'), 5);
}

function patchLevel6(source) {
  let html = source.replaceAll('three@0.160.0', 'three@0.180.0');
  html = replaceRequired(
    html,
    "let audioCtx=null;function ensureAudio(){audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx}function playTone(freq,d=.18,type='sine',gain=.055){const ctx=ensureAudio(),o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime;",
    "let audioCtx=null;function ensureAudio(){try{if(localStorage.getItem('apulab.settings.sfx')==='off')return null}catch(_){}audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx}function playTone(freq,d=.18,type='sine',gain=.055){const ctx=ensureAudio();if(!ctx)return Promise.resolve();const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime;",
    'l6-sfx-setting',
  );
  return html;
}

async function unpackLevel(level) {
  const directory = resolve(MISSION_SRC, `level${level}`);
  const encoded = await concatParts(directory, /^part\d+\.b64$/);
  return gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8');
}

async function unpackLevel3() {
  const directory = resolve(MISSION_SRC, 'level3');
  const exactHead = await concatParts(directory, /^head\d+\.b64$/);
  const exactTail = await concatParts(directory, /^tail\d+\.gz\.b64$/);
  return gunzipSync(Buffer.from(exactHead + exactTail, 'base64')).toString('utf8');
}

function verifySemanticContract(level, html) {
  const baseMarkers = [`${level} / 8`, 'three@0.180.0'];
  for (const marker of baseMarkers) {
    if (!html.includes(marker)) throw new Error(`mission01_semantic_missing:level${level}:${marker}`);
  }
  if (html.includes('three@0.160.0')) throw new Error(`mission01_legacy_three:level${level}`);

  if (level === 1 || level === 2 || level === 3) {
    if (!html.includes(`Nivel ${level} de 8`)) {
      throw new Error(`mission01_semantic_missing:level${level}:Nivel ${level} de 8`);
    }
  } else if (!html.includes(`data-apulab-level="${level}"`)) {
    throw new Error(`mission01_semantic_missing:level${level}:data-apulab-level`);
  }

  if (level === 1) {
    const markers = [
      'NIVEL 1 · EXPLORAR 4 PASOS',
      '¿QUÉ VAMOS A MEDIR?',
      'EL MULTÍMETRO',
      'DOS PUNTAS, DOS PUNTOS',
      'AHORA PRUÉBALO',
      'kawsay-explore-attention',
      'exploreAttentionDismissed',
      'MULTÍMETRO',
      'PRACTICE_BATTERY_VOLTAGE = 28.0',
      'Tenemos un punto',
      'La medición funciona',
      '28.0 V es la diferencia de voltaje entre los dos puntos que medimos.',
    ];
    for (const marker of markers) {
      if (!html.includes(marker)) throw new Error(`mission01_level1_missing:${marker}`);
    }
    if (html.includes('La reserva de energía · 1 / 11')) {
      throw new Error('mission01_level1_old_explore_flow_present');
    }
  }

  const next = level + 1;
  if (level >= 3 && level <= 6 && !html.includes(`nextLevel:${next}`)) {
    throw new Error(`mission01_transition_missing:level${level}:next${next}`);
  }

  if (level === 3) {
    for (const marker of ['Conector de seguridad', 'CONTINUAR AL NIVEL 4', 'TP1', 'TP2', 'TP3']) {
      if (!html.includes(marker)) throw new Error(`mission01_level3_missing:${marker}`);
    }
    if (html.includes('NIVEL 4 · PRÓXIMAMENTE')) {
      throw new Error('mission01_level3_still_blocks_level4');
    }
  }

  if (level === 4 && !html.includes('apulab.level4.successProgram')) {
    throw new Error('mission01_level4_missing_program_persistence');
  }
  if (level === 5) {
    for (const marker of ['apulab.level4.successProgram', 'apulab.level5.finalProgram']) {
      if (!html.includes(marker)) throw new Error(`mission01_level5_missing:${marker}`);
    }
  }
  if (level === 6 && !html.includes('apulab.level5.finalProgram')) {
    throw new Error('mission01_level6_missing_previous_program');
  }
  if (level >= 4 && level <= 6 && !html.includes('apulab.settings.sfx')) {
    throw new Error(`mission01_level${level}_missing_sfx_setting`);
  }
}

async function writeResult(level, html) {
  verifySemanticContract(level, html);
  const actualHash = sha256(html);
  const actualBytes = Buffer.byteLength(html, 'utf8');
  await writeFile(resolve(OUT_DIR, `level${level}.html`), html, 'utf8');
  console.info(`[mission01] level ${level}/8 OK · ${actualBytes} bytes · ${actualHash}`);
  return { level, sha256: actualHash, bytes: actualBytes };
}

async function buildLegacyLevel(level, patch) {
  const html = patch(await unpackLevel(level));
  const expected = FINAL_EXPECTED[level];
  if (expected) integrity(level, html, expected, 'final');
  return writeResult(level, html);
}

async function buildVerifiedSourceLevel(level, source, patch) {
  integrity(level, source, SOURCE_EXPECTED[level], 'source');
  return writeResult(level, patch(source));
}

await mkdir(OUT_DIR, { recursive: true });
const results = [];
results.push(await buildLegacyLevel(1, patchLevel1));
results.push(await buildLegacyLevel(2, patchLevel2));
results.push(await buildVerifiedSourceLevel(3, await unpackLevel3(), patchLevel3));
results.push(await buildVerifiedSourceLevel(4, await unpackLevel(4), patchLevel4));
results.push(await buildVerifiedSourceLevel(5, await unpackLevel(5), patchLevel5));
results.push(await buildVerifiedSourceLevel(6, await unpackLevel(6), patchLevel6));

await writeFile(
  resolve(OUT_DIR, 'manifest.json'),
  `${JSON.stringify({ mission: 1, totalLevels: 8, availableLevels: [1, 2, 3, 4, 5, 6], levels: results }, null, 2)}\n`,
  'utf8',
);
console.info('[mission01] integrity verification complete · levels 1–6 available');
