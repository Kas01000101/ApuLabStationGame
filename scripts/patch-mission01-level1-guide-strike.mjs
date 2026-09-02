import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const LEVEL1_PATH = resolve(process.cwd(), 'public/missions/mission01/level1.html');
let html = await readFile(LEVEL1_PATH, 'utf8');

if (!html.includes('id="level1-hud-dark-lines-patch"')) {
  throw new Error('mission01_level1_guide_strike_missing_dark_lines_patch');
}
if (html.includes('id="level1-guide-strike-patch"')) {
  throw new Error('mission01_level1_guide_strike_patch_already_present');
}

const stylePatch = `
<style id="level1-guide-strike-patch">
/* ==========================================================
   NIVEL 1 · GUÍA · TACHADO ANIMADO DE TAREAS
   Misma caja existente. Sin check, checkbox ni subrayado.
   Caja más alta, más estrecha y situada más arriba.
   ========================================================== */
#kawsay-guide-container > #kawsay-concept-panel.level1-guide-task-panel.is-guide {
  top: 32px !important;
  left: 76px !important;
  right: auto !important;
  bottom: auto !important;
  width: 286px !important;
  min-width: 286px !important;
  max-width: 286px !important;
  min-height: 228px !important;
  height: auto !important;
  padding: 14px 14px 12px !important;
  border-radius: 10px !important;
  box-sizing: border-box !important;
}

#kawsay-guide-container > #kawsay-concept-panel.level1-guide-task-panel.is-guide > #kawsay-concept-title {
  margin: 0 0 10px 0 !important;
  color: #FFFFFF !important;
  font-size: 15px !important;
  font-weight: 800 !important;
  line-height: 1.15 !important;
}

#kawsay-guide-container > #kawsay-concept-panel.level1-guide-task-panel.is-guide > #kawsay-concept-text {
  display: block !important;
  margin: 0 !important;
  color: #FFFFFF !important;
}

.guide-task-list {
  display: grid !important;
  gap: 8px !important;
  margin: 0 0 12px 0 !important;
}

.guide-task {
  position: relative;
  display: block !important;
  min-height: 24px;
  padding: 5px 8px !important;
  border-left: 3px solid transparent;
  border-radius: 3px;
  background: transparent;
  transition: background-color 160ms ease, border-color 160ms ease, opacity 160ms ease;
}

.guide-task.active {
  border-left-color: #49C9D7;
  background: rgba(73, 201, 215, 0.11);
}

.guide-task-title {
  position: relative;
  display: inline-block !important;
  width: auto !important;
  margin: 0 !important;
  color: #FFFFFF !important;
  font-family: "Poppins", sans-serif !important;
  font-style: normal !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  line-height: 1.2 !important;
  letter-spacing: 0 !important;
}

/* El resaltador pedagógico existente puede envolver palabras en <strong>.
   Debe seguir siendo texto en línea y nunca romper el tachado. */
.guide-task-title strong,
.guide-task-title .level1-guide-highlight {
  display: inline !important;
  margin: 0 !important;
  padding: 0 !important;
  color: inherit !important;
  font: inherit !important;
}

.guide-strike {
  position: absolute;
  left: 0;
  top: 50%;
  width: 0%;
  height: 3px;
  transform: translateY(-50%);
  background: #FF78B7;
  border-radius: 999px;
  box-shadow:
    0 0 6px rgba(255, 120, 183, 0.65),
    0 0 12px rgba(255, 120, 183, 0.30);
  pointer-events: none;
  z-index: 3;
}

.guide-task.completed .guide-strike {
  animation: strikeThroughTask 0.42s ease-out forwards;
}

.guide-task.completed.settled .guide-strike {
  width: 100%;
  animation: none;
}

.guide-task.completed .guide-task-title {
  opacity: 0.58;
}

@keyframes strikeThroughTask {
  from { width: 0%; }
  to { width: 100%; }
}

/* La pista inferior conserva el detalle de la tarea activa dentro de LA MISMA caja. */
#kawsay-guide-container > #kawsay-concept-panel.level1-guide-task-panel.is-guide > #kawsay-hint {
  margin-top: 0 !important;
  padding-top: 10px !important;
  border-top: 1px solid rgba(255,255,255,0.14) !important;
  color: #DCD7F3 !important;
  opacity: 1 !important;
  line-height: 1.35 !important;
}

@media (prefers-reduced-motion: reduce) {
  .guide-task.completed .guide-strike {
    width: 100%;
    animation: none;
  }
}
</style>`;

const runtimePatch = `
<script id="level1-guide-strike-runtime">
(() => {
  const panel = document.getElementById('kawsay-concept-panel');
  const title = document.getElementById('kawsay-concept-title');
  const text = document.getElementById('kawsay-concept-text');
  const hint = document.getElementById('kawsay-hint');
  if (!panel || !title || !text || !hint) return;

  const tasks = [
    '1 · ENCIENDE LA BATERÍA',
    '2 · ENCIENDE EL MULTÍMETRO',
    '3 · MIDE CON LAS DOS PUNTAS',
  ];

  const animatedCompleted = new Set();
  let lastPhase = -1;

  const phaseFromSourceTitle = (value) => {
    const source = String(value || '').trim();
    if (source.startsWith('1 · ENCIENDE LA BATERÍA')) return 0;
    if (source.startsWith('2 · PREPARA EL MULTÍMETRO')) return 1;
    if (source.startsWith('3 · USA LAS DOS PUNTAS')) return 2;
    if (source.startsWith('4 · FALTA UN SEGUNDO PUNTO')) return 2;
    if (source.startsWith('EL SIGNO − ES UNA PISTA')) return 2;
    if (source.startsWith('¡MEDICIÓN COMPLETADA!')) return 3;
    return -1;
  };

  const defaultDetail = (phase) => {
    if (phase === 0) return 'Busca POWER en la batería y presiónalo.';
    if (phase === 1) return 'Ahora presiona POWER en el multímetro.';
    if (phase === 2) return 'Lleva una punta a cada terminal y observa la lectura.';
    return 'Medición completada.';
  };

  const renderGuideTasks = (phase, sourceText, sourceHint) => {
    title.textContent = 'GUÍA · 3 PASOS';

    text.innerHTML = '<span class="guide-task-list">' + tasks.map((label, index) => {
      const completed = index < phase;
      const active = phase < tasks.length && index === phase;
      let stateClass = '';

      if (completed) {
        if (animatedCompleted.has(index)) {
          stateClass = ' completed settled';
        } else {
          animatedCompleted.add(index);
          stateClass = ' completed';
        }
      } else if (active) {
        stateClass = ' active';
      }

      return '<span class="guide-task' + stateClass + '" data-guide-task="' + (index + 1) + '">' +
        '<span class="guide-task-title">' + label + '<span class="guide-strike" aria-hidden="true"></span></span>' +
      '</span>';
    }).join('') + '</span>';

    const detail = sourceText || sourceHint || defaultDetail(phase);
    hint.textContent = detail;
    hint.hidden = false;
    panel.classList.add('level1-guide-task-panel');
    lastPhase = Math.max(lastPhase, phase);
  };

  const sync = () => {
    if (panel.hidden || !panel.classList.contains('is-guide')) return;

    const sourceTitle = title.textContent || '';
    const phase = phaseFromSourceTitle(sourceTitle);
    if (phase < 0) return;

    const sourceText = (text.textContent || '').trim();
    const sourceHint = (hint.textContent || '').trim();
    renderGuideTasks(phase, sourceText, sourceHint);
  };

  const observer = new MutationObserver(sync);
  observer.observe(panel, {
    attributes: true,
    attributeFilter: ['class', 'hidden'],
    childList: true,
    subtree: true,
    characterData: true,
  });

  sync();

  const cleanup = () => observer.disconnect();
  window.addEventListener('pagehide', cleanup, { once: true });
  window.addEventListener('beforeunload', cleanup, { once: true });
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'apulab-dispose') cleanup();
  });
})();
</script>`;

if (!html.includes('</head>') || !html.includes('</body>')) {
  throw new Error('mission01_level1_guide_strike_invalid_html');
}

html = html.replace('</head>', `${stylePatch}\n</head>`);
html = html.replace('</body>', `${runtimePatch}\n</body>`);

await writeFile(LEVEL1_PATH, html, 'utf8');
console.info('[mission01] level 1 guide animated strike-through applied · vertical 286×228 @ 76,32');
