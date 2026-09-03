import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const OUT = resolve(ROOT, 'public/missions/mission01');
const LEVEL2 = resolve(OUT, 'level2.html');
const MANIFEST = resolve(OUT, 'manifest.json');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

function fail(code) {
  throw new Error(`mission01_level2_guide_repair:${code}`);
}

let html = await readFile(LEVEL2, 'utf8');
const startMarker = '  function updateGuide() {';
const endMarker = '  function announceStatus(title, text) {';
const start = html.indexOf(startMarker);
const end = html.indexOf(endMarker, start + startMarker.length);
if (start < 0) fail('updateGuide_start');
if (end < 0) fail('announceStatus_start');

const updateGuide = `  function updateGuide() {
    if (!guideActive || explanationMode) return;

    // APULAB_NATIVE_GUIDE_CHECKLIST_L2
    // APULAB_GUIDE_VISIBLE_PANEL · abrir GUÍA siempre hace visible su caja.
    conceptPanel.hidden = false;
    conceptPanel.classList.remove("is-compact");
    conceptPanel.classList.add("is-guide", "apulab-native-guide-checklist");

    const tasks = [
      "1 · MIDE LAS 3 BATERÍAS",
      "2 · COMPARA CON LA PISTA",
      "3 · ELIGE LA CANDIDATA",
    ];
    const count = measuredValues.size;
    const kind = measurementKind();
    let completedCount = 0;
    let activeIndex = 0;
    let detail = "Mide cualquiera de las tres baterías. El orden es libre.";

    if (count >= 3) {
      completedCount = hasCompleted ? 3 : 2;
      activeIndex = hasCompleted ? -1 : 2;
    }
    if (count > 0 && count < 3) {
      detail = "Ya registraste " + count + " / 3. Te faltan " + (3 - count) + " " + ((3 - count) === 1 ? "medición" : "mediciones") + ".";
    }
    if (count >= 3 && !hasCompleted) {
      detail = "Compara 24.0 V, 28.0 V y 32.0 V con la pista y elige el valor que queda dentro del rango.";
    }
    if (hasCompleted) detail = "¡Comparación completada! La candidata correcta quedó registrada.";
    if (wrongChoiceFeedback) {
      completedCount = Math.max(completedCount, 2);
      activeIndex = 2;
      detail = wrongChoiceFeedback + " Vuelve a comparar con la pista.";
    }
    if (kind === "different-batteries") detail = "Las dos puntas deben estar en los terminales de la misma batería.";
    else if (kind === "reversed") detail = "El signo − indica polaridad invertida: roja en + y negra en −.";
    else if (kind === "one") detail = "Ya conectaste una punta. Coloca la otra en el terminal libre de esa misma batería.";

    const previousCompleted = Number(conceptPanel.dataset.guideCompletedCount || "0");
    const rows = tasks.map((label, index) => {
      let stateClass = "is-pending";
      if (index < completedCount) {
        const justCompleted = completedCount > previousCompleted && index === completedCount - 1;
        stateClass = justCompleted ? "is-complete" : "is-complete is-settled";
      } else if (index === activeIndex) {
        stateClass = "is-active";
      }
      return '<span class="apulab-native-guide-task ' + stateClass + '"><span class="apulab-native-guide-label">' + label + '</span></span>';
    }).join("");

    conceptTitle.textContent = "GUÍA · 3 PASOS";
    conceptText.innerHTML = '<span class="apulab-native-guide-list">' + rows + '</span>';
    sceneHint.textContent = detail;
    sceneHint.hidden = false;
    conceptPanel.dataset.guideCompletedCount = String(completedCount);
  }`;

// Sustituimos TODO el tramo hasta announceStatus. Esto elimina cualquier cola
// legacy que haya quedado fuera de updateGuide() por parches anteriores.
html = html.slice(0, start) + updateGuide + '\n\n' + html.slice(end);

const repairedStart = html.indexOf(startMarker);
const repairedEnd = html.indexOf(endMarker, repairedStart);
const repairedRegion = html.slice(repairedStart, repairedEnd);
if ((repairedRegion.match(/function updateGuide\s*\(/g) || []).length !== 1) fail('duplicate_updateGuide');
if (repairedRegion.includes('const active = getActiveBatteryConfig();')) fail('legacy_tail_still_present');
if (!repairedRegion.includes('conceptPanel.hidden = false;')) fail('panel_visibility_missing');
if (!repairedRegion.includes('GUÍA · 3 PASOS')) fail('checklist_missing');

await writeFile(LEVEL2, html, 'utf8');

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
const entry = (manifest.levels || []).find((item) => Number(item.level) === 2);
if (!entry) fail('manifest_level2_missing');
entry.bytes = Buffer.byteLength(html, 'utf8');
entry.sha256 = hash(html);
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.info('[mission01] Nivel 2 · bloque GUÍA reparado · cola legacy eliminada · panel visible');
