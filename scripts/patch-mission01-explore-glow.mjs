import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const MANIFEST = resolve(OUT, 'manifest.json');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

const targets = new Map([
  [1, 'kawsay-explanation'],
  [3, 'explore-btn'],
  [5, 'explore-btn'],
]);

const style = `<style id="apulab-explore-glow-style">
@keyframes apulab-explore-glow-pulse{
  0%,100%{filter:drop-shadow(0 0 2px rgba(244,199,94,.25))}
  50%{filter:drop-shadow(0 0 9px rgba(244,199,94,.72)) drop-shadow(0 0 3px rgba(255,229,163,.5))}
}
.apulab-explore-glow{animation:apulab-explore-glow-pulse 1.7s ease-in-out infinite!important;will-change:filter}
@media(prefers-reduced-motion:reduce){.apulab-explore-glow{animation:none!important;filter:drop-shadow(0 0 7px rgba(244,199,94,.48))}}
</style>`;

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));

for (const [level, buttonId] of targets) {
  const path = resolve(OUT, `level${level}.html`);
  let html = await readFile(path, 'utf8');

  if (!html.includes(`id="${buttonId}"`)) throw new Error(`mission01_explore_glow_button_missing:l${level}`);

  // N1 conserva residuos históricos de una animación con scale(). Los anulamos
  // para que el nuevo brillo no cambie el tamaño del botón.
  if (level === 1) {
    html = html.replaceAll(' is-explore-attention', '');
    html = html.replace(/\s*<div id="kawsay-explore-attention"[^>]*><\/div>/g, '');
  }

  if (!html.includes('apulab-explore-glow-style')) {
    html = html.replace('</head>', `${style}\n</head>`);
  }

  const runtime = `<script id="apulab-explore-glow-runtime-l${level}">(()=>{const btn=document.getElementById('${buttonId}');if(!btn)return;btn.classList.add('apulab-explore-glow');const stop=()=>btn.classList.remove('apulab-explore-glow');btn.addEventListener('click',stop,{once:true});window.addEventListener('pagehide',stop,{once:true});window.addEventListener('beforeunload',stop,{once:true})})();</script>`;
  html = html.replace('</body>', `${runtime}\n</body>`);

  if (!html.includes(`apulab-explore-glow-runtime-l${level}`)) throw new Error(`mission01_explore_glow_runtime_missing:l${level}`);
  await writeFile(path, html, 'utf8');

  const entry = (manifest.levels || []).find((x) => Number(x.level) === level);
  if (!entry) throw new Error(`mission01_explore_glow_manifest_missing:l${level}`);
  entry.bytes = Buffer.byteLength(html, 'utf8');
  entry.sha256 = hash(html);

  console.info(`[mission01] Nivel ${level} · EXPLORAR brillo suave hasta primer click`);
}

for (const level of [2,4,6,7]) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  if (html.includes('apulab-explore-glow-runtime')) throw new Error(`mission01_explore_glow_leaked:l${level}`);
}

await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.info('[mission01] EXPLORE GLOW OK · solo N1/N3/N5 · sin scale · se apaga al primer click');
