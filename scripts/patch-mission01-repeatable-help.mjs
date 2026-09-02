import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const MANIFEST = resolve(OUT, 'manifest.json');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

function required(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`mission01_repeatable_help_missing:${label}`);
  return source.replace(before, after);
}

function patchOwningModule(html, level) {
  const startMarker = '/* APULAB_HELP_LIFECYCLE_START */';
  const endMarker = '/* APULAB_HELP_LIFECYCLE_END */';
  if (html.includes(startMarker) || html.includes(endMarker)) {
    throw new Error(`mission01_repeatable_help_duplicate_module_patch:l${level}`);
  }

  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  let target = null;
  while ((match = scriptPattern.exec(html))) {
    const attrs = match[1] || '';
    const code = match[2] || '';
    if (!/\btype\s*=\s*["']module["']/i.test(attrs)) continue;
    if (!code.includes('explanationButton.addEventListener("click", advanceExplanation)')) continue;
    if (!code.includes('setGuideMode(!guideActive)')) continue;
    target = { full: match[0], attrs, code };
    break;
  }
  if (!target) throw new Error(`mission01_repeatable_help_owner_module_missing:l${level}`);

  const anchor = 'explanationButton.addEventListener("click", advanceExplanation)';
  const anchorIndex = target.code.indexOf(anchor);
  if (anchorIndex < 0) throw new Error(`mission01_repeatable_help_owner_anchor_missing:l${level}`);

  const lifecycle = `
  ${startMarker}
  const apulabHelpPanelClosed = () => {
    if (conceptPanel.hidden) return true;
    if (conceptPanel.getAttribute("aria-hidden") === "true") return true;
    const style = getComputedStyle(conceptPanel);
    return style.display === "none"
      || style.visibility === "hidden"
      || style.pointerEvents === "none"
      || Number(style.opacity || 1) === 0;
  };
  const apulabResetExploreLifecycle = () => {
    explanationMode = false;
    explanationIndex = -1;
  };
  const apulabResetGuideLifecycle = () => {
    guideActive = false;
    guideButton.classList.remove("is-active");
    guideButton.setAttribute("aria-label", "Abrir GUÍA");
  };
  explanationButton.addEventListener("click", () => {
    if (!apulabHelpPanelClosed()) return;
    apulabResetGuideLifecycle();
    apulabResetExploreLifecycle();
  }, { capture: true });
  guideButton.addEventListener("click", () => {
    if (!apulabHelpPanelClosed()) return;
    apulabResetExploreLifecycle();
    apulabResetGuideLifecycle();
  }, { capture: true });
  document.addEventListener("click", () => {
    queueMicrotask(() => {
      if (!apulabHelpPanelClosed()) return;
      apulabResetExploreLifecycle();
      apulabResetGuideLifecycle();
    });
  });
  ${endMarker}

  `;

  const patchedCode = target.code.slice(0, anchorIndex) + lifecycle + target.code.slice(anchorIndex);
  const patchedScript = `<script${target.attrs}>${patchedCode}</script>`;
  return html.replace(target.full, patchedScript);
}

const outputs = new Map();

// Niveles 1–2: el reset vive dentro del MISMO type="module" que posee
// explanationMode/explanationIndex/guideActive. Así modifica el estado léxico real
// en vez de intentar alcanzarlo desde un <script> global separado.
for (const level of [1, 2]) {
  const path = resolve(OUT, `level${level}.html`);
  let html = await readFile(path, 'utf8');
  html = patchOwningModule(html, level);
  await writeFile(path, html, 'utf8');
  outputs.set(level, html);
  console.info(`[mission01] Nivel ${level} · lifecycle EXPLORAR/GUÍA integrado en su módulo propietario`);
}

// N3: cerrar EXPLORAR a mitad del recorrido debe permitir abrirlo otra vez desde 1/4.
{
  const level = 3;
  const path = resolve(OUT, `level${level}.html`);
  let html = await readFile(path, 'utf8');
  html = required(
    html,
    "function closeInfo(){info.classList.remove('visible');infoProgress.classList.remove('visible');clearFocus()}",
    "function closeInfo(){const kind=String(document.getElementById('info-kicker')?.textContent||'').trim().toUpperCase();info.classList.remove('visible');infoProgress.classList.remove('visible');if(kind==='EXPLORAR'){exploreActive=false;exploreIndex=0;exploreBtn.textContent='▶ EXPLORAR'}clearFocus()}",
    'l3-close-reset',
  );
  await writeFile(path, html, 'utf8');
  outputs.set(level, html);
  console.info('[mission01] Nivel 3 · closeInfo conserva reset interno de EXPLORAR');
}

// N4: misma regla; además GUÍA vuelve a empezar por su primera pista al cerrarla.
{
  const level = 4;
  const path = resolve(OUT, `level${level}.html`);
  let html = await readFile(path, 'utf8');
  html = required(
    html,
    "function closeInfo(){info.classList.remove('visible');infoProgress.classList.remove('visible');clearFocus()}",
    "function closeInfo(){const kind=String(document.getElementById('info-kicker')?.textContent||'').trim().toUpperCase();info.classList.remove('visible');infoProgress.classList.remove('visible');if(kind==='EXPLORAR'){exploreActive=false;exploreIndex=0;exploreBtn.textContent='▶ EXPLORAR'}else if(kind==='GUÍA'){guideStage=0}clearFocus()}",
    'l4-close-reset',
  );
  await writeFile(path, html, 'utf8');
  outputs.set(level, html);
  console.info('[mission01] Nivel 4 · closeInfo conserva resets internos de EXPLORAR/GUÍA');
}

// N5: al completar o cerrar EXPLORAR vuelve a -1; GUÍA vuelve a etapa 0.
{
  const level = 5;
  const path = resolve(OUT, `level${level}.html`);
  let html = await readFile(path, 'utf8');
  const oldExplore = "document.getElementById('explore-btn').onclick=()=>{exploreIndex++;if(exploreIndex>=exploreSteps.length){exploreDone=true;exploreIndex=exploreSteps.length-1;info.classList.remove('visible');clearFocus();document.getElementById('explore-btn').classList.remove('is-recommended');document.getElementById('guide-btn').disabled=false;document.getElementById('guide-btn').classList.add('is-recommended');showStatus('EXPLORAR completado · ahora abre GUÍA.');return}const s=exploreSteps[exploreIndex];showInfo('EXPLORAR',s.title,s.text,s.hint,`${exploreIndex+1} / 5`);focusStep(s.focus)};";
  const newExplore = "document.getElementById('explore-btn').onclick=()=>{exploreIndex++;if(exploreIndex>=exploreSteps.length){exploreDone=true;exploreIndex=-1;info.classList.remove('visible');infoProgress.classList.remove('visible');clearFocus();document.getElementById('explore-btn').classList.remove('is-recommended');document.getElementById('guide-btn').disabled=false;document.getElementById('guide-btn').classList.remove('is-recommended');showStatus('EXPLORAR completado. Puedes volver a abrirlo cuando quieras.');return}const s=exploreSteps[exploreIndex];info.classList.remove('apulab-guide-structured');showInfo('EXPLORAR',s.title,s.text,s.hint,`${exploreIndex+1} / ${exploreSteps.length}`);focusStep(s.focus)};";
  html = required(html, oldExplore, newExplore, 'l5-explore-cycle');
  html = required(
    html,
    "document.getElementById('info-close').onclick=()=>{info.classList.remove('visible');clearFocus()};",
    "document.getElementById('info-close').onclick=()=>{const kind=String(document.getElementById('info-kicker')?.textContent||'').trim().toUpperCase();info.classList.remove('visible');infoProgress.classList.remove('visible');if(kind==='EXPLORAR')exploreIndex=-1;else if(kind==='GUÍA')guideStage=0;clearFocus()};",
    'l5-close-reset',
  );
  await writeFile(path, html, 'utf8');
  outputs.set(level, html);
  console.info('[mission01] Nivel 5 · cierre conserva resets internos de EXPLORAR/GUÍA');
}

// Mantener hashes del manifest sincronizados con los HTML post-build.
const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
for (const entry of manifest.levels || []) {
  const level = Number(entry.level);
  if (!outputs.has(level)) continue;
  const html = outputs.get(level);
  entry.bytes = Buffer.byteLength(html, 'utf8');
  entry.sha256 = hash(html);
}
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.info('[mission01] HELP PATCH OK · resets ubicados en el scope propietario o closeInfo interno');
