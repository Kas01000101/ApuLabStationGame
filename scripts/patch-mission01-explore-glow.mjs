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
  0%,100%{
    box-shadow:4px 4px 0 #17133A,0 0 0 2px rgba(255,229,163,.42),0 0 14px rgba(244,199,94,.56),0 0 26px rgba(244,199,94,.22)!important;
    filter:brightness(1);
  }
  50%{
    box-shadow:4px 4px 0 #17133A,0 0 0 4px rgba(255,229,163,.82),0 0 24px rgba(244,199,94,.96),0 0 42px rgba(244,199,94,.50)!important;
    filter:brightness(1.08);
  }
}
.apulab-explore-glow{
  position:relative!important;
  z-index:40!important;
  animation:apulab-explore-glow-pulse 1.45s ease-in-out infinite!important;
  will-change:box-shadow,filter;
}
@media(prefers-reduced-motion:reduce){
  .apulab-explore-glow{
    animation:none!important;
    box-shadow:4px 4px 0 #17133A,0 0 0 4px rgba(255,229,163,.76),0 0 24px rgba(244,199,94,.88),0 0 38px rgba(244,199,94,.42)!important;
    filter:brightness(1.06)!important;
  }
}
</style>`;

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));

for (const [level, buttonId] of targets) {
  const path = resolve(OUT, `level${level}.html`);
  let html = await readFile(path, 'utf8');

  if (!html.includes(`id="${buttonId}"`)) throw new Error(`mission01_explore_glow_button_missing:l${level}`);

  // N1 conserva residuos históricos de una animación con scale() y una flecha.
  // Los anulamos para que la única señal sea el halo del propio botón.
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

  console.info(`[mission01] Nivel ${level} · EXPLORAR halo visible hasta primer click`);
}

for (const level of [2,4,6,7]) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  if (html.includes('apulab-explore-glow-runtime')) throw new Error(`mission01_explore_glow_leaked:l${level}`);
}

await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.info('[mission01] EXPLORE GLOW OK · solo N1/N3/N5 · halo exterior visible · sin scale · se apaga al primer click');
