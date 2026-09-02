import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const LEVEL2_PATH = resolve(process.cwd(), 'public/missions/mission01/level2.html');
let html = await readFile(LEVEL2_PATH, 'utf8');

if (html.includes('id="apulab-level2-explore-yellow-final-runtime"')) {
  throw new Error('mission01_level2_explore_yellow_final_already_present');
}
if (!html.includes('id="kawsay-concept-panel"') || !html.includes('id="kawsay-concept-title"')) {
  throw new Error('mission01_level2_explore_yellow_final_missing_panel');
}

const runtime = `
<script id="apulab-level2-explore-yellow-final-runtime">
(() => {
  // NIVEL 2 ÚNICAMENTE · EXPLORAR 1/4–4/4 amarillo estable.
  // Estilos inline !important para vencer los selectores originales del panel.
  const panel = document.getElementById('kawsay-concept-panel');
  const title = document.getElementById('kawsay-concept-title');
  const text = document.getElementById('kawsay-concept-text');
  const hint = document.getElementById('kawsay-hint');
  if (!panel || !title) return;

  const stepPattern = /(?:^|\\s)[1-4]\\s*\\/\\s*4(?:\\s|$)/;
  const targets = [title, text, hint].filter(Boolean);
  let yellowApplied = false;

  const setYellow = () => {
    if (yellowApplied) return;
    panel.style.setProperty('background', 'linear-gradient(180deg, #F7D06F 0%, #F4C75E 100%)', 'important');
    panel.style.setProperty('color', '#17133A', 'important');
    panel.style.setProperty('border-color', '#D8A64C', 'important');
    panel.style.setProperty('box-shadow', '5px 5px 0 #D5A43D', 'important');
    targets.forEach((node) => node.style.setProperty('color', '#17133A', 'important'));
    yellowApplied = true;
  };

  const clearYellow = () => {
    if (!yellowApplied) return;
    panel.style.removeProperty('background');
    panel.style.removeProperty('color');
    panel.style.removeProperty('border-color');
    panel.style.removeProperty('box-shadow');
    targets.forEach((node) => node.style.removeProperty('color'));
    yellowApplied = false;
  };

  const sync = () => {
    const label = String(title.textContent || '').replace(/\\s+/g, ' ').trim();
    const shouldBeYellow = !panel.hidden
      && !panel.classList.contains('is-guide')
      && stepPattern.test(label);
    if (shouldBeYellow) setYellow();
    else clearYellow();
  };

  sync();

  // Observación acotada al panel/título: no existe observer global del body.
  const panelObserver = new MutationObserver(sync);
  panelObserver.observe(panel, {
    attributes: true,
    attributeFilter: ['class', 'hidden'],
  });

  const titleObserver = new MutationObserver(sync);
  titleObserver.observe(title, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  const cleanup = () => {
    panelObserver.disconnect();
    titleObserver.disconnect();
  };
  window.addEventListener('pagehide', cleanup, { once: true });
  window.addEventListener('beforeunload', cleanup, { once: true });
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'apulab-dispose') cleanup();
  });
})();
</script>`;

if (!html.includes('</body>')) {
  throw new Error('mission01_level2_explore_yellow_final_invalid_html');
}

html = html.replace('</body>', `${runtime}\n</body>`);
await writeFile(LEVEL2_PATH, html, 'utf8');
console.info('[mission01] Level 2 · EXPLORAR 1/4–4/4 amarillo forzado con prioridad inline');

await import('./patch-mission01-level3-pre-normalize.mjs');
await import('./patch-mission01-level3-redesign.mjs');
await import('./patch-mission01-level3-approved-reference.mjs');
