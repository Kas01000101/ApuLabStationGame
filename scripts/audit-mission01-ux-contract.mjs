import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');

function fail(code, detail = '') {
  throw new Error(`mission01_ux_contract:${code}${detail ? `:${detail}` : ''}`);
}

function countExploreSteps(html) {
  const start = html.indexOf('const exploreSteps=');
  if (start < 0) return null;
  const end = html.indexOf('];', start);
  if (end < 0) return null;
  return (html.slice(start, end).match(/\{title:/g) || []).length;
}

const levels = new Map();
for (let level = 1; level <= 5; level += 1) {
  levels.set(level, await readFile(resolve(OUT, `level${level}.html`), 'utf8'));
}

// Contrato global: numeración activa 1–5 sobre 7 y sin residuos /8 en el HUD final.
for (const [level, html] of levels) {
  if (!html.includes(`${level} / 7`)) fail('progress', `l${level}`);
  if (html.includes(`${level} / 8`) || html.includes(`${level}/8`)) fail('legacy_progress', `l${level}`);
}

// Nivel 2: se juega inmediatamente. EXPLORAR y GUÍA son ayudas opcionales y reutilizables.
{
  const html = levels.get(2);
  if (!html.includes('gameplayUnlocked = true;')) fail('l2_gameplay_locked');
  if (!html.includes('guideButton.disabled = false;')) fail('l2_guide_disabled');
  if (!html.includes('EXPLORAR y GUÍA están disponibles como ayudas opcionales')) fail('l2_optional_copy');
  if (!html.includes('explanationButton.addEventListener("click", advanceExplanation)')) fail('l2_explore_handler');
  if (!html.includes('setGuideMode(!guideActive)')) fail('l2_guide_toggle');
  if (html.includes('Nivel 2: pulsa EXPLORAR')) fail('l2_old_gate_copy');
}

// Niveles de programación: EXPLORAR siempre 4/4, amarillo y AYNI conserva frente/ojos.
for (const level of [3, 4, 5]) {
  const html = levels.get(level);
  const steps = countExploreSteps(html);
  if (steps !== 4) fail('explore_steps', `l${level}:${steps}`);
  if (!html.includes(`id="apulab-l${level}-explore-yellow-style"`)) fail('explore_yellow', `l${level}`);
  if (!html.includes('AYNI_FRONT_ORIENTATION')) fail('ayni_front', `l${level}`);
  if (!html.includes(`id="apulab-l${level}-guide-structure"`)) fail('guide_structure', `l${level}`);
  if (!html.includes("textContent='GUÍA · 3 PASOS'")) fail('guide_title', `l${level}`);
  if (!html.includes('apulab-guide-strike')) fail('guide_strike', `l${level}`);
  if (!html.includes("?'completed':index===active?'active':'pending'")) fail('guide_states', `l${level}`);
}

// Nivel 3: EXPLORAR obligatorio una sola vez para desbloquear gameplay; GUÍA no es requisito de ejecución.
{
  const html = levels.get(3);
  if (html.includes('<div class="level-badge">')) fail('l3_legacy_badge');
  if (html.includes('¡NIVEL 2 COMPLETADO!')) fail('l3_old_success');
  if (!html.includes('¡NIVEL 3 COMPLETADO!')) fail('l3_success');
  if (!html.includes('CONTINUAR AL NIVEL 4')) fail('l3_continue');
  if (!html.includes("if(!exploreDone){showStatus('Primero completa EXPLORAR.');return}")) fail('l3_explore_required');
  if (/if\s*\(\s*!guideOpened\s*\)/.test(html)) fail('l3_guide_execution_gate');
  if (!html.includes("if(kind==='EXPLORAR'){exploreActive=false;exploreIndex=0")) fail('l3_explore_reopen');
}

// Niveles 4–5: entrar y programar directamente; EXPLORAR/GUÍA son solo ayudas.
for (const level of [4, 5]) {
  const html = levels.get(level);
  if (/if\s*\(\s*!exploreDone\s*\)/.test(html)) fail('optional_explore_gate', `l${level}`);
  if (/if\s*\(\s*!guideOpened\s*\)/.test(html)) fail('optional_guide_gate', `l${level}`);
  if (/id="guide-btn"[^>]*disabled/.test(html)) fail('optional_guide_disabled', `l${level}`);
}

// Reapertura: cerrar una ayuda nunca debe consumirla ni dejar índices pegados al final.
{
  const l4 = levels.get(4);
  const l5 = levels.get(5);
  if (!l4.includes("if(kind==='EXPLORAR'){exploreActive=false;exploreIndex=0")) fail('l4_explore_reopen');
  if (!l4.includes("else if(kind==='GUÍA'){guideStage=0}")) fail('l4_guide_reopen');
  if (l5.includes('exploreIndex=exploreSteps.length-1')) fail('l5_stuck_explore');
  if (!l5.includes("if(kind==='EXPLORAR')exploreIndex=-1")) fail('l5_explore_reopen');
  if (!l5.includes("else if(kind==='GUÍA')guideStage=0")) fail('l5_guide_reopen');
}

// Navegación y rótulos de los escenarios activos.
const expected = [
  [1, 2, 'Nivel 1'],
  [2, 3, 'Nivel 2'],
  [3, 4, 'Nivel 3'],
  [4, 5, 'Nivel 4'],
  [5, 6, 'Nivel 5'],
];
for (const [level, next, label] of expected) {
  const html = levels.get(level);
  if (!html.includes(label)) fail('level_label', `l${level}`);
  if (!html.includes(`nextLevel: ${next}`) && !html.includes(`nextLevel:${next}`) && !html.includes(`CONTINUAR AL NIVEL ${next}`)) {
    fail('next_level', `l${level}->${next}`);
  }
}

console.info('[mission01] UX CONTRACT QA OK · niveles 1–5 · numeración, ayudas, 4/4, AYNI y navegación coherentes');
