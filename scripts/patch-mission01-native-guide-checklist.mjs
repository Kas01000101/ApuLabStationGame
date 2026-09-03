import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const LEVEL1 = resolve(OUT, 'level1.html');
const MANIFEST = resolve(OUT, 'manifest.json');

const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

function fail(code) {
  throw new Error(`mission01_native_guide_checklist:${code}`);
}

function replaceFunctionBefore(source, functionName, nextFunctionName, replacement, label) {
  const startMarker = `  function ${functionName}`;
  const endMarker = `  function ${nextFunctionName}`;
  const start = source.indexOf(startMarker);
  if (start < 0) fail(`${label}:start`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) fail(`${label}:end`);
  return source.slice(0, start) + replacement + '\n\n' + source.slice(end);
}

let html = await readFile(LEVEL1, 'utf8');

if (!html.includes('APULAB_GUIDE_UI_ONLY_V3')) fail('guide_v3_missing');
if (!html.includes('APULAB_GUIDE_RENDER_DECOUPLED_V3')) fail('render_decoupling_missing');
if (html.includes('id="apulab-native-guide-checklist-style"')) fail('already_applied');
if (!html.includes('</head>')) fail('head_missing');

const style = `
<style id="apulab-native-guide-checklist-style">
/* APULAB_NATIVE_GUIDE_CHECKLIST_V4
   Lista visual integrada al updateGuide() nativo. Sin observer, polling ni listener extra. */
#kawsay-guide-container > #kawsay-concept-panel.is-guide.apulab-native-guide-checklist {
  min-height: 228px !important;
}
#kawsay-guide-container > #kawsay-concept-panel.is-guide.apulab-native-guide-checklist > #kawsay-concept-title {
  margin: 0 0 9px !important;
  color: #FFFFFF !important;
  font-size: 15px !important;
  font-weight: 800 !important;
  line-height: 1.15 !important;
}
#kawsay-guide-container > #kawsay-concept-panel.is-guide.apulab-native-guide-checklist > #kawsay-concept-text {
  display: block !important;
  margin: 0 !important;
}
.apulab-native-guide-list {
  display: grid !important;
  gap: 5px !important;
  margin: 0 !important;
}
.apulab-native-guide-task {
  position: relative;
  display: block !important;
  min-height: 29px;
  padding: 5px 8px !important;
  border-left: 3px solid transparent;
  border-radius: 3px;
  background: transparent;
  color: #F8F9FA;
  opacity: .84;
  transition: background-color 160ms ease, border-color 160ms ease, opacity 160ms ease;
}
.apulab-native-guide-task.is-active {
  border-left-color: #49C9D7;
  background: rgba(73, 201, 215, 0.11);
  color: #FFFFFF;
  opacity: 1;
}
.apulab-native-guide-task.is-complete {
  color: #FFFFFF;
  opacity: .58;
}
.apulab-native-guide-label {
  position: relative;
  display: inline-block !important;
  width: auto !important;
  color: inherit !important;
  font-family: "Poppins", sans-serif !important;
  font-style: normal !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  line-height: 1.28 !important;
}
.apulab-native-guide-task.is-complete .apulab-native-guide-label::after {
  content: "";
  position: absolute;
  left: 0;
  top: 50%;
  width: 100%;
  height: 3px;
  transform: translateY(-50%);
  transform-origin: left center;
  border-radius: 999px;
  background: #FF78B7;
  box-shadow: 0 0 6px rgba(255,120,183,.65), 0 0 12px rgba(255,120,183,.30);
  animation: apulab-native-guide-strike .42s ease-out both;
  pointer-events: none;
}
.apulab-native-guide-task.is-complete.is-settled .apulab-native-guide-label::after {
  animation: none;
}
#kawsay-guide-container > #kawsay-concept-panel.is-guide.apulab-native-guide-checklist > #kawsay-hint {
  margin-top: 8px !important;
  padding-top: 7px !important;
  border-top: 1px solid rgba(255,255,255,.14) !important;
  color: #DCD7F3 !important;
  opacity: 1 !important;
}
@keyframes apulab-native-guide-strike {
  from { transform: translateY(-50%) scaleX(0); }
  to { transform: translateY(-50%) scaleX(1); }
}
@media (prefers-reduced-motion: reduce) {
  .apulab-native-guide-task.is-complete .apulab-native-guide-label::after {
    animation: none !important;
  }
}
</style>`;

html = html.replace('</head>', `${style}\n</head>`);

const updateGuide = `  function updateGuide() {
    if (!guideActive || explanationMode) return;

    // APULAB_NATIVE_GUIDE_CHECKLIST_V4
    // Un único renderer: esta misma función nativa pinta estado + checklist.
    conceptPanel.classList.remove("is-compact", "level1-explore-panel");
    conceptPanel.classList.add("is-guide", "apulab-native-guide-checklist");

    const tasks = [
      "1 · ENCIENDE LA BATERÍA",
      "2 · ENCIENDE EL MULTÍMETRO",
      "3 · MIDE CON LAS DOS PUNTAS",
    ];

    let completedCount = 0;
    let activeIndex = 0;
    let detail = "Busca POWER en la batería y presiónalo.";

    if (challengeState === CHALLENGE_STATE.AWAITING_BATTERY_POWER) {
      completedCount = 0;
      activeIndex = 0;
      detail = "Busca POWER en la batería y presiónalo.";
    } else if (challengeState === CHALLENGE_STATE.AWAITING_METER_POWER) {
      completedCount = 1;
      activeIndex = 1;
      detail = "Presiona POWER en el multímetro. Ya está preparado en V⎓; negro en COM y rojo en VΩ.";
    } else if (challengeState === CHALLENGE_STATE.READY) {
      completedCount = 2;
      activeIndex = 2;
      detail = "Acerca una punta a cada terminal para comparar los dos puntos.";
    } else if (challengeState === CHALLENGE_STATE.ONE_PROBE) {
      completedCount = 2;
      activeIndex = 2;
      detail = "Ya conectaste una punta. Lleva la otra al terminal libre.";
    } else if (challengeState === CHALLENGE_STATE.REVERSED) {
      completedCount = 2;
      activeIndex = 2;
      detail = "La medición funciona. El signo − indica que las puntas están invertidas; intercámbialas.";
    } else if (challengeState === CHALLENGE_STATE.COMPLETED || challengeState === CHALLENGE_STATE.CORRECT) {
      completedCount = 3;
      activeIndex = -1;
      detail = "¡MEDICIÓN COMPLETADA! · 28.0 V es la diferencia de voltaje entre los dos puntos que medimos.";
    }

    const previousCompleted = Number(conceptPanel.dataset.guideCompletedCount || "0");
    const rows = tasks.map((label, index) => {
      let stateClass = "is-pending";
      if (index < completedCount) {
        const justCompleted = completedCount > previousCompleted && index === completedCount - 1;
        stateClass = justCompleted ? "is-complete" : "is-complete is-settled";
      } else if (index === activeIndex) {
        stateClass = "is-active";
      }
      return '<span class="apulab-native-guide-task ' + stateClass + '">' +
        '<span class="apulab-native-guide-label">' + label + '</span>' +
      '</span>';
    }).join("");

    conceptTitle.textContent = "GUÍA · 3 PASOS";
    conceptText.innerHTML = '<span class="apulab-native-guide-list">' + rows + '</span>';
    sceneHint.textContent = detail;
    sceneHint.hidden = false;
    conceptPanel.dataset.guideCompletedCount = String(completedCount);
  }`;

html = replaceFunctionBefore(html, 'updateGuide() {', 'announceStatus(title, text) {', updateGuide, 'replace-updateGuide');

const forbiddenInPatch = [
  'new MutationObserver(',
  'setInterval(',
  'requestAnimationFrame(',
  'addEventListener(',
  'renderer.render(',
];
const functionStart = html.indexOf('  function updateGuide() {');
const functionEnd = html.indexOf('  function announceStatus(title, text) {', functionStart);
const guideBody = html.slice(functionStart, functionEnd);
for (const marker of forbiddenInPatch) {
  if (guideBody.includes(marker)) fail(`updateGuide_forbidden:${marker}`);
}

if (!guideBody.includes('APULAB_NATIVE_GUIDE_CHECKLIST_V4')) fail('marker_missing');
if (!guideBody.includes('apulab-native-guide-list')) fail('list_missing');
if (!guideBody.includes('is-complete')) fail('completed_state_missing');
if (!guideBody.includes('is-active')) fail('active_state_missing');
if (!html.includes('APULAB_GUIDE_RENDER_DECOUPLED_V3')) fail('render_decoupling_lost');

await writeFile(LEVEL1, html, 'utf8');

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
const entry = (manifest.levels || []).find((item) => Number(item.level) === 1);
if (!entry) fail('manifest_level1_missing');
entry.bytes = Buffer.byteLength(html, 'utf8');
entry.sha256 = hash(html);
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.info('[mission01] Nivel 1 · GUÍA lista/tachado restaurada dentro de updateGuide nativo · sin listener/observer extra');
