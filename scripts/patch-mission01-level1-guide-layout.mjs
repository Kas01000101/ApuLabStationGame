import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const LEVEL1_PATH = resolve(process.cwd(), 'public/missions/mission01/level1.html');
let html = await readFile(LEVEL1_PATH, 'utf8');

if (!html.includes('id="level1-guide-strike-patch"')) {
  throw new Error('mission01_level1_guide_layout_missing_guide_patch');
}
if (html.includes('id="level1-guide-vertical-layout-patch"')) {
  throw new Error('mission01_level1_guide_layout_already_present');
}

const stylePatch = `
<style id="level1-guide-vertical-layout-patch">
/* NIVEL 1 ÚNICAMENTE · GUÍA más alta, estrecha y elevada.
   Se aplica después del verificador de integridad; no cambia gameplay. */
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
  margin-bottom: 10px !important;
}

#kawsay-guide-container > #kawsay-concept-panel.level1-guide-task-panel.is-guide .guide-task-list {
  gap: 8px !important;
  margin: 0 0 12px 0 !important;
}

#kawsay-guide-container > #kawsay-concept-panel.level1-guide-task-panel.is-guide .guide-task {
  min-height: 24px !important;
  padding: 5px 8px !important;
}

#kawsay-guide-container > #kawsay-concept-panel.level1-guide-task-panel.is-guide .guide-task-title {
  line-height: 1.2 !important;
}

#kawsay-guide-container > #kawsay-concept-panel.level1-guide-task-panel.is-guide > #kawsay-hint {
  margin-top: 0 !important;
  padding-top: 10px !important;
  line-height: 1.35 !important;
}
</style>`;

if (!html.includes('</head>')) {
  throw new Error('mission01_level1_guide_layout_invalid_html');
}

html = html.replace('</head>', `${stylePatch}\n</head>`);
await writeFile(LEVEL1_PATH, html, 'utf8');
console.info('[mission01] Level 1 · GUÍA vertical 286×228 @ left 76 / top 32');
