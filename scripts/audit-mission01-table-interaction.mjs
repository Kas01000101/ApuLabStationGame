import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');

function fail(code, detail = '') {
  throw new Error(`mission01_table_interaction_contract:${code}${detail ? `:${detail}` : ''}`);
}

function balancedBody(source, anchor, label) {
  const anchorIndex = source.indexOf(anchor);
  if (anchorIndex < 0) fail('anchor', label);
  const brace = source.indexOf('{', anchorIndex + anchor.length);
  if (brace < 0) fail('brace', label);

  let depth = 0;
  let quote = null;
  let escaped = false;
  let templateDepth = 0;

  for (let i = brace; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];

    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (quote === '`' && ch === '$' && next === '{') { templateDepth += 1; i += 1; continue; }
      if (quote === '`' && ch === '}' && templateDepth > 0) { templateDepth -= 1; continue; }
      if (ch === quote && templateDepth === 0) quote = null;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '/' && next === '/') {
      const nl = source.indexOf('\n', i + 2);
      if (nl < 0) break;
      i = nl;
      continue;
    }
    if (ch === '/' && next === '*') {
      const close = source.indexOf('*/', i + 2);
      if (close < 0) fail('comment', label);
      i = close + 1;
      continue;
    }

    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(brace + 1, i);
    }
  }

  fail('unbalanced', label);
}

function auditLevel(level, html) {
  if (!html.includes('APULAB_TABLE_INTERACTION_CONTROLLER')) fail('controller_missing', `l${level}`);
  if (!html.includes('APULAB_GUIDE_NONBLOCKING_V2')) fail('guide_nonblocking_v2_missing', `l${level}`);

  const helpMode = balancedBody(html, 'function currentHelpMode()', `l${level}:currentHelpMode`);
  const canInteract = balancedBody(html, 'function canInteractWithTable()', `l${level}:canInteractWithTable`);
  const prepare = balancedBody(html, 'function prepareTableInteraction()', `l${level}:prepareTableInteraction`);
  const guide = balancedBody(html, 'function setGuideMode(enabled)', `l${level}:setGuideMode`);
  const guideClick = balancedBody(html, 'guideButton.addEventListener("click", () =>', `l${level}:guideClick`);
  const pointerDown = balancedBody(html, 'canvas.addEventListener("pointerdown", (event) =>', `l${level}:pointerdown`);
  const pointerUp = balancedBody(html, 'canvas.addEventListener("pointerup", (event) =>', `l${level}:pointerup`);

  if (!helpMode.includes('if (explanationMode) return "explore";')) fail('explore_mode_missing', `l${level}`);
  if (!helpMode.includes('if (guideActive) return "guide";')) fail('guide_mode_missing', `l${level}`);

  if (!canInteract.includes('gameplayUnlocked') || !canInteract.includes('currentHelpMode() !== "explore"')) {
    fail('table_gate_wrong', `l${level}`);
  }
  if (canInteract.includes('guideActive') || canInteract.includes('cameraTween')) {
    fail('table_gate_coupled_to_guide_or_camera', `l${level}`);
  }

  if (!prepare.includes('if (cameraTween) cameraTween = null;')) fail('camera_not_cancelable', `l${level}`);

  for (const [name, body] of [['pointerdown', pointerDown], ['pointerup', pointerUp]]) {
    if (!body.includes('if (!canInteractWithTable()) return;')) fail(`${name}_missing_table_gate`, `l${level}`);
    if (!body.includes('prepareTableInteraction();')) fail(`${name}_missing_camera_cancel`, `l${level}`);
    if (body.includes('!gameplayUnlocked || cameraTween') || body.includes('if (cameraTween) return;')) {
      fail(`${name}_camera_block_regression`, `l${level}`);
    }
  }

  // GUÍA ya no puede ser propietaria de una transición visual.
  if (guide.includes('moveCamera(')) fail('guide_moves_camera', `l${level}`);
  if (!guide.includes('if (cameraTween) cameraTween = null;')) fail('guide_camera_cancel_missing', `l${level}`);
  if (!guide.includes('gameplayUnlocked = true;')) fail('guide_does_not_unlock_gameplay', `l${level}`);
  if (!guideClick.includes('setGuideMode(!guideActive)')) fail('guide_click_missing_toggle', `l${level}`);

  if (level === 2) {
    if (!pointerDown.includes('batterySwapAnimating')) fail('l2_carousel_transition_guard_missing');

    // Regresión crítica: GUÍA no puede volver a abrir el modal de comparación.
    for (const forbidden of ['openCompareOverlay', 'measuredValues', 'compareOverlay', 'hasCompleted']) {
      if (guideClick.includes(forbidden)) fail('l2_guide_hijacks_comparison', forbidden);
    }
    if (!guideClick.includes('APULAB_GUIDE_SINGLE_RESPONSIBILITY')) {
      fail('l2_guide_single_responsibility_marker_missing');
    }

    // La comparación sigue existiendo, pero pertenece al flujo de 3/3 mediciones.
    const unlockReference = balancedBody(html, 'function unlockMissionReference()', 'l2:unlockMissionReference');
    if (!unlockReference.includes('openCompareOverlay();')) {
      fail('l2_comparison_flow_lost');
    }
  }
}

for (const level of [1, 2]) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  auditLevel(level, html);
}

console.info('[mission01] TABLE INTERACTION CONTRACT V2 OK · GUÍA pura · sin cámara/modal · comparación solo tras 3/3');
