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
  NIVEL 1 · GUÍA / EXPLORAR
  Conserva geometría y posición. Solo corrige la jerarquía cromática:
  amarillo ApuLab + borde oscuro + línea interior oscura.
*/
#kawsay-hud-container > #kawsay-explanation,
#kawsay-hud-container > #kawsay-guide,
#kawsay-hud-container > #kawsay-guide:disabled,
#kawsay-hud-container > #kawsay-guide.is-active {
  background: #F4C75E !important;
  border: 2px solid #17133A !important;
  color: #17133A !important;
  box-shadow:
    5px 5px 0 #D5A43D,
    inset 0 0 0 1px rgba(23, 19, 58, 0.30) !important;
  filter: none !important;
}

#kawsay-hud-container > #kawsay-explanation:hover,
#kawsay-hud-container > #kawsay-explanation:focus-visible,
#kawsay-hud-container > #kawsay-guide:hover,
#kawsay-hud-container > #kawsay-guide:focus-visible {
  background: #F7D06F !important;
  border-color: #17133A !important;
  color: #17133A !important;
  box-shadow:
    5px 5px 0 #D5A43D,
    inset 0 0 0 1px rgba(23, 19, 58, 0.34) !important;
}

#kawsay-hud-container > #kawsay-guide:disabled {
  opacity: 0.76 !important;
}

/* La señal pedagógica de GUÍA conserva su aro rosado, pero nunca un borde claro. */
#kawsay-hud-container > #kawsay-guide.level1-guide-attention {
  background: #F4C75E !important;
  border-color: #17133A !important;
  color: #17133A !important;
  box-shadow:
    5px 5px 0 #D5A43D,
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
console.info('[mission01] level 1 Guide/Explore dark inner lines applied');
