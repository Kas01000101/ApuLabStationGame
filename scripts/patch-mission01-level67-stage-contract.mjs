import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const MANIFEST = resolve(OUT, 'manifest.json');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

function fail(code, detail = '') {
  throw new Error(`mission01_stage_contract_patch:${code}${detail ? `:${detail}` : ''}`);
}

const oldCss = '*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:var(--bg);font-family:Poppins,Arial,sans-serif;color:var(--white)}button{font:inherit}.stage{position:relative;width:100%;height:100%;min-height:720px;background:';
const newCss = '*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:var(--bg);font-family:Poppins,Arial,sans-serif;color:var(--white)}body{display:flex;align-items:center;justify-content:center}button{font:inherit}.stage{--apulab-stage-scale:1;position:relative;flex:0 0 auto;width:1672px;height:941px;min-height:0;overflow:hidden;transform:scale(var(--apulab-stage-scale));transform-origin:center center;background:';

const fitScript = `<script id="apulab-stage-fit-1672x941">
(() => {
  const DESIGN_WIDTH = 1672;
  const DESIGN_HEIGHT = 941;
  const stage = document.querySelector('.stage');
  if (!stage) return;
  const fit = () => {
    const viewportWidth = Math.max(1, window.innerWidth);
    const viewportHeight = Math.max(1, window.innerHeight);
    const scale = Math.min(viewportWidth / DESIGN_WIDTH, viewportHeight / DESIGN_HEIGHT);
    stage.style.setProperty('--apulab-stage-scale', String(scale));
  };
  fit();
  window.addEventListener('resize', fit, { passive: true });
  window.addEventListener('orientationchange', fit, { passive: true });
})();
</script>`;

const outputs = new Map();
for (const level of [6, 7]) {
  const path = resolve(OUT, `level${level}.html`);
  let html = await readFile(path, 'utf8');

  if (html.includes('id="apulab-stage-fit-1672x941"')) fail('already_applied', `l${level}`);
  if (!html.includes(oldCss)) fail('css_anchor_missing', `l${level}`);
  html = html.replace(oldCss, newCss);

  const moduleAnchor = '<script type="module">';
  if (!html.includes(moduleAnchor)) fail('module_anchor_missing', `l${level}`);
  html = html.replace(moduleAnchor, `${fitScript}\n${moduleAnchor}`);

  if (!html.includes('width:1672px;height:941px')) fail('fixed_stage_missing', `l${level}`);
  if (!html.includes("--apulab-stage-scale")) fail('scale_token_missing', `l${level}`);
  if (!html.includes('DESIGN_WIDTH = 1672') || !html.includes('DESIGN_HEIGHT = 941')) fail('fit_script_missing', `l${level}`);

  await writeFile(path, html, 'utf8');
  outputs.set(level, html);
  console.info(`[mission01] Nivel ${level} · lienzo lógico 1672×941 + escala uniforme aplicado`);
}

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
for (const entry of manifest.levels || []) {
  const level = Number(entry.level);
  const html = outputs.get(level);
  if (!html) continue;
  entry.bytes = Buffer.byteLength(html, 'utf8');
  entry.sha256 = hash(html);
}
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.info('[mission01] STAGE PATCH OK · N6–N7 alineados al contrato 1672×941');
