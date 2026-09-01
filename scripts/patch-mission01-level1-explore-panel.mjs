import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const LEVEL1_PATH = resolve(process.cwd(), 'public/missions/mission01/level1.html');
let html = await readFile(LEVEL1_PATH, 'utf8');

if (!html.includes('id="level1-pedagogy-final-patch"')) {
  throw new Error('mission01_level1_explore_panel_missing_pedagogy_patch');
}
if (html.includes('id="level1-explore-panel-correction"')) {
  throw new Error('mission01_level1_explore_panel_patch_already_present');
}

const stylePatch = `
<style id="level1-explore-panel-correction">
/*
  EXPLORAR · caja contextual amarilla.
  Recupera el bloque amarillo con borde oscuro fino y línea interior fina.
  No cambia posición, tamaño, cámara ni estructura del HUD.
*/
#kawsay-guide-container > #kawsay-concept-panel.level1-explore-panel {
  background: #F4C75E !important;
  border: 2px solid #17133A !important;
  border-radius: 4px !important;
  color: #17133A !important;
  box-shadow:
    6px 6px 0 #D5A43D,
    inset 0 0 0 1px rgba(23, 19, 58, 0.20) !important;
}

#kawsay-guide-container > #kawsay-concept-panel.level1-explore-panel #kawsay-concept-title,
#kawsay-guide-container > #kawsay-concept-panel.level1-explore-panel #kawsay-concept-text,
#kawsay-guide-container > #kawsay-concept-panel.level1-explore-panel #kawsay-hint {
  color: #17133A !important;
}

#kawsay-guide-container > #kawsay-concept-panel.level1-explore-panel #kawsay-concept-title {
  font-weight: 800 !important;
}

#kawsay-guide-container > #kawsay-concept-panel.level1-explore-panel #kawsay-hint {
  opacity: 0.86 !important;
}
</style>`;

const runtimePatch = `
<script id="level1-explore-panel-correction-runtime">
(() => {
  const panel = document.getElementById('kawsay-concept-panel');
  const title = document.getElementById('kawsay-concept-title');
  if (!panel || !title) return;

  const exploreSuffixes = [' · 1 / 4', ' · 2 / 4', ' · 3 / 4', ' · 4 / 4'];

  const syncExplorePanel = () => {
    const text = title.textContent || '';
    const isExploreStep = !panel.hidden
      && !panel.classList.contains('is-guide')
      && exploreSuffixes.some((suffix) => text.endsWith(suffix));

    panel.classList.toggle('level1-explore-panel', isExploreStep);
  };

  const observer = new MutationObserver(syncExplorePanel);
  observer.observe(panel, {
    attributes: true,
    attributeFilter: ['class', 'hidden'],
    childList: true,
    subtree: true,
    characterData: true,
  });

  syncExplorePanel();

  const cleanup = () => observer.disconnect();
  window.addEventListener('pagehide', cleanup, { once: true });
  window.addEventListener('beforeunload', cleanup, { once: true });
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'apulab-dispose') cleanup();
  });
})();
</script>`;

if (!html.includes('</head>') || !html.includes('</body>')) {
  throw new Error('mission01_level1_explore_panel_invalid_html');
}

html = html.replace('</head>', `${stylePatch}\n</head>`);
html = html.replace('</body>', `${runtimePatch}\n</body>`);

await writeFile(LEVEL1_PATH, html, 'utf8');
console.info('[mission01] level 1 Explore panel restored to yellow');
