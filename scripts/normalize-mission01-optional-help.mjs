import { createHash } from 'node:crypto';
import { access, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const MANIFEST = resolve(OUT, 'manifest.json');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

function fail(code, detail='') { throw new Error(`mission01_optional_help:${code}${detail ? `:${detail}` : ''}`); }
function required(source, before, after, label) {
  if (!source.includes(before)) fail('missing', label);
  return source.replace(before, after);
}
function balancedFunctionRange(source, signature, label) {
  const start = source.indexOf(signature);
  if (start < 0) fail('function_start', label);
  const brace = source.indexOf('{', start + signature.length);
  if (brace < 0) fail('function_brace', label);
  let depth = 0, quote = null, escaped = false, templateDepth = 0;
  for (let i=brace; i<source.length; i+=1) {
    const ch=source[i], next=source[i+1];
    if (quote) {
      if (escaped) { escaped=false; continue; }
      if (ch==='\\') { escaped=true; continue; }
      if (quote==='`' && ch==='$' && next==='{') { templateDepth+=1; i+=1; continue; }
      if (quote==='`' && ch==='}' && templateDepth>0) { templateDepth-=1; continue; }
      if (ch===quote && templateDepth===0) quote=null;
      continue;
    }
    if (ch==='"' || ch==="'" || ch==='`') { quote=ch; continue; }
    if (ch==='/' && next==='/') { const nl=source.indexOf('\n',i+2); if(nl<0) break; i=nl; continue; }
    if (ch==='/' && next==='*') { const end=source.indexOf('*/',i+2); if(end<0) fail('comment',label); i=end+1; continue; }
    if (ch==='{') depth+=1;
    else if (ch==='}' && --depth===0) return [start,i+1];
  }
  fail('function_unbalanced', label);
}
function replaceFunction(source, signature, replacement, label) {
  const [start,end]=balancedFunctionRange(source,signature,label);
  return source.slice(0,start)+replacement+source.slice(end);
}
function arrayBody(source, marker, label) {
  const start = source.indexOf(marker);
  if (start < 0) fail('array_start', label);
  const bracket = source.indexOf('[', start);
  if (bracket < 0) fail('array_bracket', label);
  let depth=0, quote=null, escaped=false;
  for(let i=bracket;i<source.length;i+=1){
    const ch=source[i];
    if(quote){ if(escaped){escaped=false;continue;} if(ch==='\\'){escaped=true;continue;} if(ch===quote)quote=null; continue; }
    if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;}
    if(ch==='[')depth+=1; else if(ch===']'&&--depth===0)return source.slice(bracket+1,i);
  }
  fail('array_unbalanced',label);
}
function exploreCount(level, html) {
  const marker = level <= 2 ? 'const guidedExplanation = [' : 'const exploreSteps=[';
  const body = arrayBody(html, marker, `l${level}:explore`);
  return (body.match(/\btitle\s*:/g)||[]).length;
}
function removeOptionalGates(html) {
  html = html.replace(/if\s*\(\s*!exploreDone\s*\)\s*\{\s*showStatus\([^;]*\);\s*return\s*;?\s*\}/g, '');
  html = html.replace(/if\s*\(\s*!exploreDone\s*\)\s*return\s*;/g, '');
  html = html.replace(/if\s*\(\s*!guideOpened\s*\)\s*\{[^{}]*\}/g, '');
  html = html.replace(/if\s*\(\s*!guideOpened\s*\)\s*return\s*;/g, '');
  return html;
}

const outputs = new Map();

// Nivel 1: JUGAR desde el primer frame. EXPLORAR/GUÍA quedan como ayudas opcionales.
{
  const level=1, path=resolve(OUT,'level1.html');
  let html=await readFile(path,'utf8');
  html=required(html,
    '<button id="kawsay-explanation" class="kawsay-hud-button is-recommended" type="button">EXPLORAR</button>',
    '<button id="kawsay-explanation" class="kawsay-hud-button" type="button" aria-label="Abrir EXPLORAR (opcional)">EXPLORAR</button>',
    'l1:explore-button-optional');
  html=required(html,
    '<button id="kawsay-guide" class="kawsay-hud-button" type="button" aria-pressed="false" aria-label="GUÍA bloqueada hasta terminar EXPLORAR" disabled>GUÍA</button>',
    '<button id="kawsay-guide" class="kawsay-hud-button" type="button" aria-pressed="false" aria-label="Abrir GUÍA (opcional)">GUÍA</button>',
    'l1:guide-button-optional');
  html=required(html,'let explanationCompleted = false;','let explanationCompleted = true; // APULAB_HELP_OPTIONAL_GLOBAL','l1:explanation-initial');
  html=required(html,'let guideOpenedOnce = false;','let guideOpenedOnce = true; // APULAB_HELP_OPTIONAL_GLOBAL','l1:guide-prerequisite-bypass');
  html=required(html,'let gameplayUnlocked = false;','let gameplayUnlocked = true; // APULAB_HELP_OPTIONAL_GLOBAL','l1:gameplay-initial');
  html=html.replace('if (enabled && !explanationCompleted) return;','// APULAB_HELP_OPTIONAL_GLOBAL · GUÍA no depende de EXPLORAR.');
  html=html.replace('/* Sigue bloqueada funcionalmente al inicio, pero conserva claramente el color lavanda. */','/* GUÍA disponible desde el inicio; el estilo :disabled queda solo como fallback durante EXPLORAR. */');
  html=html.replace('RETO 1 · FLUJO OBLIGATORIO: EXPLORAR → GUÍA → JUGAR','RETO 1 · JUGAR DIRECTAMENTE · EXPLORAR/GUÍA OPCIONALES');
  html=html.replace('Ahora abre la GUÍA','GUÍA opcional');
  html=html.replace('Ya terminaste de explorar. Abre GUÍA para ver qué debes hacer antes de comenzar.','Puedes seguir jugando o abrir GUÍA si quieres consultar los pasos.');
  html=html.replace('Terminaste Explorar. Ahora abre la Guía para conocer los pasos antes de comenzar.','EXPLORAR completado. Puedes seguir jugando; GUÍA es opcional.');
  if (!html.includes('APULAB_NATIVE_GUIDE_CHECKLIST_V4')) fail('l1_checklist_missing');
  outputs.set(level,html); await writeFile(path,html,'utf8');
}

// Nivel 2: conserva juego inmediato y obtiene el mismo patrón visual de checklist.
{
  const level=2, path=resolve(OUT,'level2.html');
  let html=await readFile(path,'utf8');
  html=html.replace('RETO 1 · FLUJO OBLIGATORIO: EXPLORAR → GUÍA → JUGAR','RETO 2 · JUGAR DIRECTAMENTE · EXPLORAR/GUÍA OPCIONALES');
  html=html.replace('class="kawsay-hud-button is-recommended" type="button" aria-pressed="false" aria-label="Abrir GUÍA">GUÍA</button>','class="kawsay-hud-button" type="button" aria-pressed="false" aria-label="Abrir GUÍA (opcional)">GUÍA</button>');
  const style=`\n<style id="apulab-level2-native-guide-checklist-style">\n/* APULAB_NATIVE_GUIDE_CHECKLIST_L2 · renderer único dentro de updateGuide(). */\n#kawsay-guide-container > #kawsay-concept-panel.is-guide.apulab-native-guide-checklist{min-height:228px!important}\n#kawsay-guide-container > #kawsay-concept-panel.is-guide.apulab-native-guide-checklist > #kawsay-concept-title{margin:0 0 9px!important;color:#fff!important;font-size:15px!important;font-weight:800!important;line-height:1.15!important}\n#kawsay-guide-container > #kawsay-concept-panel.is-guide.apulab-native-guide-checklist > #kawsay-concept-text{display:block!important;margin:0!important}\n.apulab-native-guide-list{display:grid!important;gap:5px!important;margin:0!important}\n.apulab-native-guide-task{position:relative;display:block!important;min-height:29px;padding:5px 8px!important;border-left:3px solid transparent;border-radius:3px;background:transparent;color:#F8F9FA;opacity:.84}\n.apulab-native-guide-task.is-active{border-left-color:#49C9D7;background:rgba(73,201,215,.11);color:#fff;opacity:1}\n.apulab-native-guide-task.is-complete{color:#fff;opacity:.58}\n.apulab-native-guide-label{position:relative;display:inline-block!important;color:inherit!important;font-family:"Poppins",sans-serif!important;font-style:normal!important;font-size:13px!important;font-weight:700!important;line-height:1.28!important}\n.apulab-native-guide-task.is-complete .apulab-native-guide-label::after{content:"";position:absolute;left:0;top:50%;width:100%;height:3px;transform:translateY(-50%);border-radius:999px;background:#FF78B7;box-shadow:0 0 6px rgba(255,120,183,.65),0 0 12px rgba(255,120,183,.30);animation:apulab-l2-guide-strike .42s ease-out both;pointer-events:none}\n.apulab-native-guide-task.is-complete.is-settled .apulab-native-guide-label::after{animation:none}\n#kawsay-guide-container > #kawsay-concept-panel.is-guide.apulab-native-guide-checklist > #kawsay-hint{margin-top:8px!important;padding-top:7px!important;border-top:1px solid rgba(255,255,255,.14)!important;color:#DCD7F3!important;opacity:1!important}\n@keyframes apulab-l2-guide-strike{from{transform:translateY(-50%) scaleX(0)}to{transform:translateY(-50%) scaleX(1)}}\n@media(prefers-reduced-motion:reduce){.apulab-native-guide-task.is-complete .apulab-native-guide-label::after{animation:none!important}}\n</style>`;
  if (!html.includes('id="apulab-level2-native-guide-checklist-style"')) html=required(html,'</head>',`${style}\n</head>`,'l2:head');
  const updateGuide=`  function updateGuide() {\n    if (!guideActive || explanationMode) return;\n\n    // APULAB_NATIVE_GUIDE_CHECKLIST_L2\n    conceptPanel.classList.remove("is-compact");\n    conceptPanel.classList.add("is-guide", "apulab-native-guide-checklist");\n\n    const tasks = [\n      "1 · MIDE LAS 3 BATERÍAS",\n      "2 · COMPARA CON LA PISTA",\n      "3 · ELIGE LA CANDIDATA",\n    ];\n    const count = measuredValues.size;\n    const kind = measurementKind();\n    let completedCount = 0;\n    let activeIndex = 0;\n    let detail = "Mide cualquiera de las tres baterías. El orden es libre.";\n\n    if (count >= 3) { completedCount = hasCompleted ? 3 : 2; activeIndex = hasCompleted ? -1 : 2; }\n    if (count > 0 && count < 3) detail = "Ya registraste " + count + " / 3. Te faltan " + (3-count) + " " + ((3-count)===1?"medición":"mediciones") + ".";\n    if (count >= 3 && !hasCompleted) detail = "Compara 24.0 V, 28.0 V y 32.0 V con la pista y elige el valor que queda dentro del rango.";\n    if (hasCompleted) detail = "¡Comparación completada! La candidata correcta quedó registrada.";\n    if (wrongChoiceFeedback) { completedCount = Math.max(completedCount, 2); activeIndex = 2; detail = wrongChoiceFeedback + " Vuelve a comparar con la pista."; }\n    if (kind === "different-batteries") detail = "Las dos puntas deben estar en los terminales de la misma batería.";\n    else if (kind === "reversed") detail = "El signo − indica polaridad invertida: roja en + y negra en −.";\n    else if (kind === "one") detail = "Ya conectaste una punta. Coloca la otra en el terminal libre de esa misma batería.";\n\n    const previousCompleted = Number(conceptPanel.dataset.guideCompletedCount || "0");\n    const rows = tasks.map((label,index)=>{\n      let stateClass = "is-pending";\n      if (index < completedCount) {\n        const justCompleted = completedCount > previousCompleted && index === completedCount - 1;\n        stateClass = justCompleted ? "is-complete" : "is-complete is-settled";\n      } else if (index === activeIndex) stateClass = "is-active";\n      return '<span class="apulab-native-guide-task '+stateClass+'"><span class="apulab-native-guide-label">'+label+'</span></span>';\n    }).join("");\n    conceptTitle.textContent = "GUÍA · 3 PASOS";\n    conceptText.innerHTML = '<span class="apulab-native-guide-list">'+rows+'</span>';\n    sceneHint.textContent = detail;\n    sceneHint.hidden = false;\n    conceptPanel.dataset.guideCompletedCount = String(completedCount);\n  }`;
  html=replaceFunction(html,'  function updateGuide() {',updateGuide,'l2:updateGuide');
  outputs.set(level,html); await writeFile(path,html,'utf8');
}

// Nivel 3: elimina el último gate heredado de EXPLORAR/GUÍA.
{
  const level=3, path=resolve(OUT,'level3.html');
  let html=await readFile(path,'utf8');
  html=html.replace('<button id="explore-btn" class="btn btn-yellow btn-explore is-recommended">▶ EXPLORAR</button>','<button id="explore-btn" class="btn btn-yellow btn-explore">▶ EXPLORAR</button>');
  html=html.replace('<button id="guide-btn" class="btn btn-purple btn-guide" disabled>▶ GUÍA</button>','<button id="guide-btn" class="btn btn-purple btn-guide">▶ GUÍA</button>');
  html=removeOptionalGates(html);
  html=html.replace('Cuando termines este paso podrás empezar a programar.','Puedes programar desde el inicio; este paso solo resume el objetivo.');
  html=html.replace('EXPLORAR completado. Ya puedes programar a AYNI; GUÍA es opcional.','EXPLORAR completado. Puedes seguir programando; GUÍA es opcional.');
  outputs.set(level,html); await writeFile(path,html,'utf8');
}

for (const level of [4,5]) {
  const path=resolve(OUT,`level${level}.html`); const html=await readFile(path,'utf8'); outputs.set(level,html);
}

// Contrato final de los niveles que hoy existen. Si 6–7 aparecen, quedan sujetos al mismo máximo 4.
for (const [level,html] of outputs) {
  const steps=exploreCount(level,html);
  if (steps < 1 || steps > 4) fail('explore_max4',`l${level}:${steps}`);
  if (level===1 && !html.includes('APULAB_NATIVE_GUIDE_CHECKLIST_V4')) fail('guide_checklist',`l${level}`);
  if (level===2 && !html.includes('APULAB_NATIVE_GUIDE_CHECKLIST_L2')) fail('guide_checklist',`l${level}`);
  if (level>=3 && !html.includes('apulab-guide-strike')) fail('guide_checklist',`l${level}`);
}
for (const level of [3,4,5]) {
  const html=outputs.get(level);
  if (/if\s*\(\s*!exploreDone\s*\)/.test(html)) fail('explore_gate',`l${level}`);
  if (/if\s*\(\s*!guideOpened\s*\)/.test(html)) fail('guide_gate',`l${level}`);
  if (/id="guide-btn"[^>]*disabled/.test(html)) fail('guide_disabled',`l${level}`);
}
for (const level of [6,7]) {
  try { await access(resolve(OUT,`level${level}.html`)); const html=await readFile(resolve(OUT,`level${level}.html`),'utf8'); const steps=exploreCount(level,html); if(steps<1||steps>4)fail('explore_max4',`l${level}:${steps}`); }
  catch (error) { if (error?.code !== 'ENOENT') throw error; console.info(`[mission01] Nivel ${level} aún no tiene fuente activa; contrato MAX 4 se aplicará al incorporarlo.`); }
}

const manifest=JSON.parse(await readFile(MANIFEST,'utf8'));
for(const entry of manifest.levels||[]){const level=Number(entry.level);if(!outputs.has(level))continue;const html=outputs.get(level);entry.bytes=Buffer.byteLength(html,'utf8');entry.sha256=hash(html)}
await writeFile(MANIFEST,`${JSON.stringify(manifest,null,2)}\n`,'utf8');
console.info('[mission01] OPTIONAL HELP GLOBAL OK · L1–L5 juegan sin abrir ayudas · EXPLORAR <=4 · GUÍA checklist/tachado');
