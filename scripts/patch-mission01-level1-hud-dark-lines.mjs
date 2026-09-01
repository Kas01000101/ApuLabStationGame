import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const LEVEL1_PATH = resolve(process.cwd(), 'public/missions/mission01/level1.html');
let html = await readFile(LEVEL1_PATH, 'utf8');

if (!html.includes('id="level1-pedagogy-final-patch"')) {
  throw new Error('mission01_level1_hud_dark_lines_missing_pedagogy_patch');
}
if (html.includes('id="level1-hud-dark-lines-patch"')) {
  throw new Error('mission01_level1_hud_dark_lines_patch_already_present');
}

const stylePatch = `
<style id="level1-hud-dark-lines-patch">
/*
  NIVEL 1 · EXPLORAR / GUÍA
  Conserva geometría y posición.
  EXPLORAR permanece amarillo ApuLab.
  GUÍA permanece lavanda, pero usa el mismo lenguaje de líneas oscuras.
*/

/* EXPLORAR · amarillo ApuLab. */
#kawsay-hud-container > #kawsay-explanation {
  background: #F4C75E !important;
  border: 2px solid #17133A !important;
  color: #17133A !important;
  box-shadow:
    5px 5px 0 #D5A43D,
    inset 0 0 0 1px rgba(23, 19, 58, 0.30) !important;
  filter: none !important;
}

#kawsay-hud-container > #kawsay-explanation:hover,
#kawsay-hud-container > #kawsay-explanation:focus-visible {
  background: #F7D06F !important;
  border-color: #17133A !important;
  color: #17133A !important;
  box-shadow:
    5px 5px 0 #D5A43D,
    inset 0 0 0 1px rgba(23, 19, 58, 0.34) !important;
}

/* GUÍA · lavanda con borde e interior oscuros como EXPLORAR. Solo Nivel 1. */
#kawsay-hud-container > #kawsay-guide,
#kawsay-hud-container > #kawsay-guide:disabled,
#kawsay-hud-container > #kawsay-guide.is-active {
  background: #8E7DCE !important;
  border: 2px solid #17133A !important;
  color: #FFFFFF !important;
  box-shadow:
    0 4px 0 #5E52A3,
    0 7px 12px rgba(0, 0, 0, 0.18),
    inset 0 0 0 1px rgba(23, 19, 58, 0.30) !important;
  filter: none !important;
}

#kawsay-hud-container > #kawsay-guide:hover,
#kawsay-hud-container > #kawsay-guide:focus-visible {
  background: #9B8BDD !important;
  border-color: #17133A !important;
  color: #FFFFFF !important;
  box-shadow:
    0 4px 0 #5E52A3,
    0 7px 12px rgba(0, 0, 0, 0.18),
    inset 0 0 0 1px rgba(23, 19, 58, 0.34) !important;
}

#kawsay-hud-container > #kawsay-guide:disabled {
  opacity: 0.76 !important;
}

/* GUÍA usa el mismo triángulo oscuro de EXPLORAR, ligeramente más pequeño. */
#kawsay-hud-container > #kawsay-guide::before,
#kawsay-hud-container > #kawsay-guide:disabled::before,
#kawsay-hud-container > #kawsay-guide.is-active::before {
  content: "" !important;
  display: block !important;
  position: absolute !important;
  left: 12px !important;
  top: 50% !important;
  right: auto !important;
  width: 0 !important;
  height: 0 !important;
  border-top: 6px solid transparent !important;
  border-bottom: 6px solid transparent !important;
  border-left: 9px solid #17133A !important;
  background: transparent !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  transform: translateY(-50%) !important;
  pointer-events: none !important;
}

/* La atención pedagógica puede conservar su aro rosado exterior,
   pero el borde físico del botón siempre sigue siendo negro. */
#kawsay-hud-container > #kawsay-guide.level1-guide-attention {
  background: #8E7DCE !important;
  border-color: #17133A !important;
  color: #FFFFFF !important;
  box-shadow:
    0 4px 0 #5E52A3,
    0 7px 12px rgba(0, 0, 0, 0.18),
    inset 0 0 0 1px rgba(23, 19, 58, 0.30),
    0 0 12px rgba(142, 125, 206, 0.48),
    0 0 0 2px rgba(255, 120, 183, 0.16) !important;
}
</style>`;

if (!html.includes('</head>')) {
  throw new Error('mission01_level1_hud_dark_lines_invalid_html');
}

html = html.replace('</head>', `${stylePatch}\n</head>`);
await writeFile(LEVEL1_PATH, html, 'utf8');
console.info('[mission01] level 1 Guide dark lines + black triangle applied');
