import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const LEVEL2_PATH = resolve(OUT, 'level2.html');
const MANIFEST_PATH = resolve(OUT, 'manifest.json');

let html = await readFile(LEVEL2_PATH, 'utf8');

const oldStart = `  // === INICIO NIVEL 2 · EXPLORAR → GUÍA → JUGAR ===
  explanationButton.hidden = false;
  explanationButton.removeAttribute("aria-hidden");
  explanationButton.removeAttribute("tabindex");
  explanationButton.textContent = "EXPLORAR";
  explanationButton.classList.add("is-recommended");
  guideButton.disabled = true;
  guideButton.classList.remove("is-recommended", "is-active");
  journalUnlocked = false;
  journalButton.hidden = true;
  gameplayUnlocked = false;
  explanationCompleted = false;
  guideOpenedOnce = false;
  setChoiceMode(false);
  updateMeasurementUI();
  setHudNormal();
  liveStatus.textContent = "Nivel 2: pulsa EXPLORAR. Al terminar, la GUÍA se abrirá automáticamente.";
  drawBatteryScreen();
  updateLeadVisuals();
  setActiveBattery(0, { force: true, releaseProbes: false });
  updateChallengeState();`;

const newStart = `  // === INICIO NIVEL 2 · JUGAR DIRECTAMENTE · EXPLORAR/GUÍA OPCIONALES ===
  explanationButton.hidden = false;
  explanationButton.removeAttribute("aria-hidden");
  explanationButton.removeAttribute("tabindex");
  explanationButton.textContent = "EXPLORAR";
  explanationButton.classList.remove("is-recommended");
  guideButton.disabled = false;
  guideButton.classList.remove("is-recommended", "is-active");
  journalUnlocked = false;
  journalButton.hidden = true;
  gameplayUnlocked = true;
  explanationCompleted = true;
  guideOpenedOnce = true;
  setChoiceMode(false);
  updateMeasurementUI();
  setHudNormal();
  liveStatus.textContent = "Nivel 2: puedes empezar a medir inmediatamente. EXPLORAR y GUÍA están disponibles como ayudas opcionales.";
  drawBatteryScreen();
  updateLeadVisuals();
  setActiveBattery(0, { force: true, releaseProbes: false });
  updateChallengeState();`;

if (!html.includes(oldStart)) {
  throw new Error('mission01_level2_optional_explore_missing_start_gate');
}
html = html.replace(oldStart, newStart);

const oldFinish = `    // EXPLORAR 4/4 termina directamente en GUÍA: no pedimos "abre GUÍA".
    guideButton.classList.remove("is-recommended");
    guideButton.setAttribute("aria-label", "Cerrar GUÍA");
    setGuideMode(true);`;

const newFinish = `    // EXPLORAR es una ayuda opcional: al terminar regresamos al juego.
    guideButton.classList.remove("is-recommended");
    guideButton.setAttribute("aria-label", "Abrir GUÍA");
    setGuideMode(false);
    liveStatus.textContent = "EXPLORAR completado. Puedes seguir midiendo; GUÍA es opcional.";`;

if (!html.includes(oldFinish)) {
  throw new Error('mission01_level2_optional_explore_missing_finish_flow');
}
html = html.replace(oldFinish, newFinish);

// Comentarios históricos que ya no describen el flujo real del Nivel 2.
html = html.replaceAll(
  'Cuando termina EXPLORAR, GUÍA pasa a ser el siguiente paso obligatorio.',
  'EXPLORAR y GUÍA son ayudas opcionales en este nivel.',
);
html = html.replaceAll(
  'Nivel 2: mismo estándar de botones. EXPLORAR primero, luego GUÍA.',
  'Nivel 2: mismo estándar de botones. EXPLORAR y GUÍA opcionales.',
);

// QA: el gameplay debe estar habilitado desde el primer frame.
if (html.includes('gameplayUnlocked = false;')) {
  throw new Error('mission01_level2_optional_explore_gameplay_still_locked');
}
if (!html.includes('gameplayUnlocked = true;')) {
  throw new Error('mission01_level2_optional_explore_gameplay_not_unlocked');
}
if (html.includes('Nivel 2: pulsa EXPLORAR')) {
  throw new Error('mission01_level2_optional_explore_old_prompt_remains');
}
if (!html.includes('EXPLORAR y GUÍA están disponibles como ayudas opcionales')) {
  throw new Error('mission01_level2_optional_explore_status_missing');
}
if (!html.includes('guideButton.disabled = false;')) {
  throw new Error('mission01_level2_optional_explore_guide_not_available');
}
if (!html.includes('EXPLORAR completado. Puedes seguir midiendo; GUÍA es opcional.')) {
  throw new Error('mission01_level2_optional_explore_finish_missing');
}

await writeFile(LEVEL2_PATH, html, 'utf8');

// El manifiesto se genera antes de este parche; mantener su hash/bytes sincronizados.
const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
const entry = (manifest.levels || []).find((item) => Number(item.level) === 2);
if (!entry) throw new Error('mission01_level2_optional_explore_manifest_entry_missing');
entry.bytes = Buffer.byteLength(html, 'utf8');
entry.sha256 = createHash('sha256').update(Buffer.from(html, 'utf8')).digest('hex');
await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.info('[mission01] Nivel 2 · juego inmediato · EXPLORAR/GUÍA opcionales · medición desbloqueada desde el inicio');
