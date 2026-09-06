import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const path = resolve(process.cwd(), 'public/missions/mission01/level6.html');
let html = await readFile(path, 'utf8');
const fail = (code) => { throw new Error(`mission01_level6_final_ux_fit:${code}`); };

if (!html.includes('APULAB_LEVEL6_FINAL_UX_V1')) fail('final_ux_missing');

const replacements = [
  ['.apulab-science-palette{margin-top:5px!important}', '.apulab-science-palette{margin-top:0!important;padding-top:6px!important}'],
  ['padding:7px 7px 2px;margin-bottom:9px', 'padding:5px 7px 1px;margin-bottom:6px'],
  ['.level6-investigate-head{height:25px;', '.level6-investigate-head{height:22px;'],
  ['padding:0 3px 5px;font:800 11px/1 Poppins', 'padding:0 3px 3px;font:800 11px/1 Poppins'],
  ['.apulab-science-palette .command-block{height:43px!important;margin-bottom:6px!important', '.apulab-science-palette .command-block{height:40px!important;margin-bottom:4px!important'],
  ['.apulab-science-palette .level6-investigate-actions .command-block:last-child{margin-bottom:4px!important}', '.apulab-science-palette .level6-investigate-actions .command-block:last-child{margin-bottom:2px!important}'],
  ['.apulab-science-palette>.block-send{height:49px!important', '.apulab-science-palette>.block-send{height:45px!important'],
];

for (const [before, after] of replacements) {
  if (!html.includes(before)) fail(`missing:${before}`);
  html = html.replace(before, after);
}

html = html.replace('</head>', '<style id="apulab-level6-final-ux-fit">.editor-body{min-height:0;overflow:hidden}.palette{min-height:0;overflow:hidden}</style>\n</head>');
await writeFile(path, html, 'utf8');
console.info('[mission01] N6 FINAL UX FIT OK · science palette compacted above editor footer');
