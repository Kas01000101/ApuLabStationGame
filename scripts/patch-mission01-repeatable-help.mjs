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

const outputs = new Map();

// Niveles 1–2 YA poseen lifecycle reutilizable en su módulo original.
// No agregamos listeners de captura ni listeners globales de document: esos
// interceptores podían resetear el estado justo después de un click válido.
for (const level of [1, 2]) {
  const path = resolve(OUT, `level${level}.html`);
  const html = await readFile(path, 'utf8');
  if (html.includes('APULAB_HELP_LIFECYCLE_START') || html.includes('apulabHelpPanelClosed')) {
    throw new Error(`mission01_repeatable_help_forbidden_interceptor:l${level}`);
  }
  if (!html.includes('explanationButton.addEventListener("click", advanceExplanation)')) {
    throw new Error(`mission01_repeatable_help_explore_handler:l${level}`);
  }
  if (!html.includes('setGuideMode(!guideActive)')) {
    throw new Error(`mission01_repeatable_help_guide_toggle:l${level}`);
  }
  if (!html.includes('explanationMode = false;') || !html.includes('explanationIndex = -1;')) {
    throw new Error(`mission01_repeatable_help_native_explore_reset:l${level}`);
  }
  if (!html.includes('guideActive = enabled;')) {
    throw new Error(`mission01_repeatable_help_native_guide_state:l${level}`);
  }
  console.info(`[mission01] Nivel ${level} · handlers nativos EXPLORAR/GUÍA preservados sin interceptores globales`);
}

// N3: cerrar EXPLORAR a mitad del recorrido permite abrirlo otra vez desde 1/4.
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
  console.info('[mission01] Nivel 3 · closeInfo reinicia EXPLORAR internamente');
}

// N4: cerrar EXPLORAR o GUÍA reinicia solo la ayuda correspondiente.
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
  console.info('[mission01] Nivel 4 · closeInfo reinicia EXPLORAR/GUÍA internamente');
}

// N5: completar/cerrar EXPLORAR vuelve a -1; GUÍA vuelve a etapa 0.
{
  const level = 5;
  const path = resolve(OUT, `level${level}.html`);
  let html = await readFile(path, 'utf8');
  const oldExplore = "document.getElementById('explore-btn').onclick=()=>{exploreIndex++;if(exploreIndex>=exploreSteps.length){exploreDone=true;exploreIndex=exploreSteps.length-1;info.classList.remove('visible');clearFocus();document.getElementById('explore-btn').classList.remove('is-recommended');document.getElementById('guide-btn').disabled=false;document.getElementById('guide-btn').classList.add('is-recommended');showStatus('EXPLORAR completado · ahora abre GUÍA.');return}const s=exploreSteps[exploreIndex];showInfo('EXPLORAR',s.title,s.text,s.hint,`${exploreIndex+1} / 5`);focusStep(s.focus)};";
  const newExplore = "document.getElementById('explore-btn').onclick=()=>{exploreIndex++;if(exploreIndex>=exploreSteps.length){exploreDone=true;exploreIndex=-1;info.classList.remove('visible');infoProgress.classList.remove('visible');clearFocus();document.getElementById('explore-btn').classList.remove('is-recommended');document.getElementById('guide-btn').disabled=false;document.getElementById('guide-btn').classList.remove('is-recommended');showStatus('EXPLORAR completado. Puedes volver a abrirlo cuando quieras.');return}const s=exploreSteps[exploreIndex];showInfo('EXPLORAR',s.title,s.text,s.hint,`${exploreIndex+1} / ${exploreSteps.length}`);focusStep(s.focus)};";
  html = required(html, oldExplore, newExplore, 'l5-explore-cycle');
  html = required(
    html,
    "document.getElementById('info-close').onclick=()=>{info.classList.remove('visible');clearFocus()};",
    "document.getElementById('info-close').onclick=()=>{const kind=String(document.getElementById('info-kicker')?.textContent||'').trim().toUpperCase();info.classList.remove('visible');infoProgress.classList.remove('visible');if(kind==='EXPLORAR')exploreIndex=-1;else if(kind==='GUÍA')guideStage=0;clearFocus()};",
    'l5-close-reset',
  );
  await writeFile(path, html, 'utf8');
  outputs.set(level, html);
  console.info('[mission01] Nivel 5 · cierre reinicia EXPLORAR/GUÍA internamente');
}

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
for (const entry of manifest.levels || []) {
  const level = Number(entry.level);
  if (!outputs.has(level)) continue;
  const html = outputs.get(level);
  entry.bytes = Buffer.byteLength(html, 'utf8');
  entry.sha256 = hash(html);
}
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.info('[mission01] HELP PATCH OK · L1–L2 nativos intactos · L3–L5 resets internos');
