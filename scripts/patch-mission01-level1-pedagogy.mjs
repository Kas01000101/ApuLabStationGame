import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const LEVEL1_PATH = resolve(process.cwd(), 'public/missions/mission01/level1.html');

let html = await readFile(LEVEL1_PATH, 'utf8');

const requiredMarkers = [
  'NIVEL 1 · EXPLORAR 4 PASOS',
  '¿QUÉ VAMOS A MEDIR?',
  'EL MULTÍMETRO',
  'DOS PUNTAS, DOS PUNTOS',
  'AHORA PRUÉBALO',
  'kawsay-explore-attention',
  'MULTÍMETRO',
  'PRACTICE_BATTERY_VOLTAGE = 28.0',
];

for (const marker of requiredMarkers) {
  if (!html.includes(marker)) {
    throw new Error(`mission01_level1_pedagogy_missing_base:${marker}`);
  }
}

if (html.includes('La reserva de energía · 1 / 11')) {
  throw new Error('mission01_level1_pedagogy_old_explore_flow_present');
}

const stylePatch = `
<style id="level1-pedagogy-final-patch">
/* ==========================================================
   NIVEL 1 · EXPLORAR / GUÍA · COLORES FINALES
   Mantiene exactamente posición, dimensiones y geometría del HUD.
   Solo corrige color/jerarquía visual y la señal de siguiente paso.
   ========================================================== */

/* EXPLORAR · amarillo principal ApuLab. */
#kawsay-hud-container > #kawsay-explanation {
  background: #F4C75E !important;
  border-color: #FFE5A3 !important;
  color: #17133A !important;
}

#kawsay-hud-container > #kawsay-explanation:hover,
#kawsay-hud-container > #kawsay-explanation:focus-visible {
  background: #F7D06F !important;
  border-color: #FFE5A3 !important;
}

/* GUÍA · lavanda claro para que no se confunda con EXPLORAR ni con el morado oscuro del panel. */
#kawsay-hud-container > #kawsay-guide {
  background: #8E7DCE !important;
  border-color: #B8A9F0 !important;
  color: #FFFFFF !important;
  box-shadow: 5px 5px 0 #4D4288 !important;
  filter: none !important;
}

#kawsay-hud-container > #kawsay-guide:hover,
#kawsay-hud-container > #kawsay-guide:focus-visible {
  background: #9B8BDD !important;
  border-color: #B8A9F0 !important;
  color: #FFFFFF !important;
  filter: none !important;
}

#kawsay-hud-container > #kawsay-guide.is-active {
  background: #9284D2 !important;
  border-color: #D7CDF8 !important;
  color: #FFFFFF !important;
  box-shadow: 5px 5px 0 #4D4288 !important;
}

/* Sigue bloqueada funcionalmente al inicio, pero conserva claramente el color lavanda. */
#kawsay-hud-container > #kawsay-guide:disabled {
  background: #8E7DCE !important;
  border-color: #B8A9F0 !important;
  color: #FFFFFF !important;
  opacity: 0.76 !important;
  filter: none !important;
}

/* Jerarquía de lectura dentro de la GUÍA existente; no crea otra caja. */
#kawsay-guide-container > #kawsay-concept-panel.level1-guide-panel.is-guide #kawsay-concept-title.level1-guide-title {
  color: #FFFFFF !important;
  font-weight: 900 !important;
}

#kawsay-guide-container > #kawsay-concept-panel.level1-guide-panel.is-guide .level1-guide-highlight {
  color: #FFF3C8 !important;
  font-weight: 900 !important;
}

/* Después de EXPLORAR 4/4: brillo lavanda + aro rosado exterior. */
#kawsay-hud-container > #kawsay-guide.level1-guide-attention {
  background: #8E7DCE !important;
  border-color: #B8A9F0 !important;
  color: #FFFFFF !important;
  opacity: 1 !important;
  outline: 2px solid #FF78B7 !important;
  outline-offset: 1px;
  box-shadow:
    5px 5px 0 #4D4288,
    0 0 12px rgba(142, 125, 206, 0.62),
    0 0 0 2px rgba(255, 120, 183, 0.16) !important;
  filter: brightness(1.05) !important;
  animation: level1-guide-ring 1.45s ease-out infinite !important;
}

@keyframes level1-guide-ring {
  0% {
    outline-color: rgba(255, 120, 183, 0.98);
    outline-offset: 1px;
    box-shadow:
      5px 5px 0 #4D4288,
      0 0 14px rgba(142, 125, 206, 0.70),
      0 0 0 2px rgba(255, 120, 183, 0.22);
  }
  100% {
    outline-color: rgba(255, 120, 183, 0);
    outline-offset: 9px;
    box-shadow:
      5px 5px 0 #4D4288,
      0 0 9px rgba(142, 125, 206, 0.38),
      0 0 0 1px rgba(255, 120, 183, 0.04);
  }
}

@media (prefers-reduced-motion: reduce) {
  #kawsay-hud-container > #kawsay-guide.level1-guide-attention {
    animation: none !important;
    outline: 2px solid #FF78B7 !important;
    outline-offset: 4px;
    box-shadow:
      5px 5px 0 #4D4288,
      0 0 12px rgba(142, 125, 206, 0.58),
      0 0 0 2px rgba(255, 120, 183, 0.18) !important;
  }
}
</style>`;

const runtimePatch = `
<script id="level1-pedagogy-final-runtime">
(() => {
  const exploreButton = document.getElementById('kawsay-explanation');
  const guideButton = document.getElementById('kawsay-guide');
  const exploreArrow = document.getElementById('kawsay-explore-attention');
  const conceptPanel = document.getElementById('kawsay-concept-panel');
  const conceptTitle = document.getElementById('kawsay-concept-title');

  if (!exploreButton || !guideButton || !conceptPanel) return;

  let finalExploreSeen = false;
  let guideOpened = false;
  let guideAttentionActive = false;
  let guidePanelObserver = null;
  let highlighting = false;

  const hideExploreAttention = () => {
    exploreButton.classList.remove('is-explore-attention', 'is-recommended');
    if (exploreArrow) exploreArrow.hidden = true;
  };

  const deactivateGuideAttention = () => {
    guideAttentionActive = false;
    guideButton.classList.remove('level1-guide-attention', 'is-recommended');
  };

  const activateGuideAttention = () => {
    if (guideOpened || guideAttentionActive) return;
    hideExploreAttention();
    guideAttentionActive = true;
    guideButton.classList.add('level1-guide-attention', 'is-recommended');
  };

  const keywordPattern = /(POWER|V⎓|COM|VΩ|PUNTA ROJA|PUNTA NEGRA|TERMINAL \\+|TERMINAL −|presiónalo|presiona|selecciona|arrastra|conecta|coloca|mide|enciende|acerca|intercámbialas)/giu;

  const emphasizeGuidePanel = () => {
    if (highlighting || !conceptPanel.classList.contains('is-guide')) return;
    highlighting = true;

    try {
      conceptPanel.classList.add('level1-guide-panel');
      conceptTitle?.classList.add('level1-guide-title');

      let highlightedCount = conceptPanel.querySelectorAll('.level1-guide-highlight').length;
      if (highlightedCount >= 4) return;

      const walker = document.createTreeWalker(conceptPanel, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      let node;
      while ((node = walker.nextNode())) {
        const parent = node.parentElement;
        if (!parent || parent.closest('.level1-guide-highlight')) continue;
        if (!(node.nodeValue || '').trim()) continue;
        textNodes.push(node);
      }

      for (const textNode of textNodes) {
        if (highlightedCount >= 4) break;
        const source = textNode.nodeValue || '';
        keywordPattern.lastIndex = 0;
        const matches = Array.from(source.matchAll(keywordPattern));
        if (!matches.length) continue;

        const fragment = document.createDocumentFragment();
        let cursor = 0;
        let changed = false;
        for (const match of matches) {
          if (highlightedCount >= 4) break;
          const index = match.index ?? 0;
          if (index > cursor) fragment.append(document.createTextNode(source.slice(cursor, index)));
          const strong = document.createElement('strong');
          strong.className = 'level1-guide-highlight';
          strong.textContent = match[0];
          fragment.append(strong);
          cursor = index + match[0].length;
          highlightedCount += 1;
          changed = true;
        }
        if (!changed) continue;
        if (cursor < source.length) fragment.append(document.createTextNode(source.slice(cursor)));
        textNode.replaceWith(fragment);
      }
    } finally {
      highlighting = false;
    }
  };

  const bindGuidePanel = () => {
    if (!conceptPanel.classList.contains('is-guide')) return;

    if (!guidePanelObserver) {
      guidePanelObserver = new MutationObserver(emphasizeGuidePanel);
      guidePanelObserver.observe(conceptPanel, { childList: true, subtree: true, characterData: true });
    }
    emphasizeGuidePanel();
  };

  const syncFlow = () => {
    const titleText = conceptTitle?.textContent || '';
    const finalStepVisible = !conceptPanel.hidden && titleText.includes('AHORA PRUÉBALO · 4 / 4');

    if (finalStepVisible) finalExploreSeen = true;
    if (finalExploreSeen && !finalStepVisible && !guideOpened) activateGuideAttention();

    if (guideOpened) bindGuidePanel();
  };

  exploreButton.addEventListener('click', () => {
    hideExploreAttention();
    requestAnimationFrame(syncFlow);
  }, { passive: true });

  guideButton.addEventListener('click', () => {
    guideOpened = true;
    deactivateGuideAttention();
    requestAnimationFrame(() => {
      bindGuidePanel();
      syncFlow();
    });
  }, { passive: true });

  // Antes se observaba document.body completo. La señal pedagógica depende
  // únicamente del panel/título contextual, así que acotamos el observer aquí.
  const flowObserver = new MutationObserver(syncFlow);
  flowObserver.observe(conceptPanel, {
    attributes: true,
    attributeFilter: ['class', 'hidden'],
    childList: true,
    subtree: true,
    characterData: true,
  });
  syncFlow();

  const cleanup = () => {
    flowObserver.disconnect();
    guidePanelObserver?.disconnect();
  };
  window.addEventListener('pagehide', cleanup, { once: true });
  window.addEventListener('beforeunload', cleanup, { once: true });
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'apulab-dispose') cleanup();
  });
})();
</script>`;

if (html.includes('id="level1-pedagogy-final-patch"') || html.includes('id="level1-pedagogy-final-runtime"')) {
  throw new Error('mission01_level1_pedagogy_patch_already_present');
}

if (!html.includes('</head>') || !html.includes('</body>')) {
  throw new Error('mission01_level1_pedagogy_invalid_html');
}

html = html.replace('</head>', `${stylePatch}\n</head>`);
html = html.replace('</body>', `${runtimePatch}\n</body>`);

await writeFile(LEVEL1_PATH, html, 'utf8');
console.info('[mission01] level 1 pedagogical guidance patch applied with scoped observer');
