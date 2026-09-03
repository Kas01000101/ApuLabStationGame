import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
function fail(code, detail = '') {
  throw new Error(`mission01_stage_contract:${code}${detail ? `:${detail}` : ''}`);
}

for (const level of [1, 2, 3, 4, 5, 6, 7]) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  const hasWidth = /(?:width\s*:\s*1672px|DESIGN_(?:WIDTH|W)\s*=\s*1672|DESIGN_W\s*=\s*1672)/.test(html);
  const hasHeight = /(?:height\s*:\s*941px|DESIGN_(?:HEIGHT|H)\s*=\s*941|DESIGN_H\s*=\s*941)/.test(html);
  if (!hasWidth || !hasHeight) fail('logical_canvas_missing', `l${level}`);

  if (level >= 6) {
    if (!html.includes('id="apulab-stage-fit-1672x941"')) fail('fit_script_missing', `l${level}`);
    if (!html.includes('width:1672px;height:941px')) fail('fixed_stage_missing', `l${level}`);
    if (!html.includes("stage.style.setProperty('--apulab-stage-scale'")) fail('scale_application_missing', `l${level}`);
    if (/\.stage\{[^}]*width:100%;height:100%/.test(html)) fail('responsive_free_stage_forbidden', `l${level}`);
  }

  console.info(`[mission01] STAGE 1672×941 OK · Nivel ${level}`);
}

console.info('[mission01] STAGE CONTRACT OK · N1–N7 comparten lienzo lógico 1672×941');
