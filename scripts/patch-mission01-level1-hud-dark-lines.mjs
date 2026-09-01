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
  GUÍA vuelve a lavanda para recuperar la jerarquía visual original.
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

/* GUÍA · lavanda. Solo Nivel 1. */
#kawsay-hud-container > #kawsay-guide,
#kawsay-hud-container > #kawsay-guide:disabled,
#kawsay-hud-container > #kawsay-guide.is-active {
  background: #8E7DCE !important;
  border: 2px solid #B8A9F0 !important;
  color: #FFFFFF !important;
  box-shadow:
    0 4px 0 #5E52A3,
    0 7px 12px rgba(0, 0, 0, 0.18) !important;
  filter: none !important;
}

#kawsay-hud-container > #kawsay-guide:hover,
#kawsay-hud-container > #kawsay-guide:focus-visible {
  background: #9B8BDD !important;
  border-color: #B8A9F0 !important;
  color: #FFFFFF !important;
  box-shadow:
    0 4px 0 #5E52A3,
    0 7px 12px rgba(0, 0, 0, 0.18) !important;
}

#kawsay-hud-container > #kawsay-guide:disabled {
  opacity: 0.76 !important;
}

/*
  No se redefine .level1-guide-attention aquí.
  Su aro pedagógico rosado conserva el estado específico definido
  en level1-pedagogy-final-patch, evitando que GUÍA vuelva a amarillo.
*/
</style>`;

if (!html.includes('</head>')) {
  throw new Error('mission01_level1_hud_dark_lines_invalid_html');
}

html = html.replace('</head>', `${stylePatch}\n</head>`);
await writeFile(LEVEL1_PATH, html, 'utf8');
console.info('[mission01] level 1 Explore yellow + Guide lavender styles applied');
