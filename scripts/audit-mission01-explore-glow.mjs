import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const fail = (code) => { throw new Error(`mission01_explore_glow:${code}`); };

for (const level of [1,3,5]) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  if (!html.includes('apulab-explore-glow-style')) fail(`style_l${level}`);
  if (!html.includes(`apulab-explore-glow-runtime-l${level}`)) fail(`runtime_l${level}`);
  if (!html.includes("btn.addEventListener('click',stop,{once:true})")) fail(`first_click_stop_l${level}`);
  if (html.includes('transform:scale') || html.includes('transform: scale')) {
    // No bloqueamos otras animaciones del nivel: solo verificamos que el keyframe
    // nuevo de brillo no use scale.
    const styleStart = html.indexOf('<style id="apulab-explore-glow-style">');
    const styleEnd = html.indexOf('</style>', styleStart);
    const glowStyle = html.slice(styleStart, styleEnd);
    if (/transform\s*:\s*scale/i.test(glowStyle)) fail(`glow_scales_l${level}`);
  }
}

for (const level of [2,4,6,7]) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  if (html.includes('apulab-explore-glow-runtime')) fail(`leak_l${level}`);
}

console.info('[mission01] EXPLORE GLOW CONTRACT OK · N1/N3/N5 solamente · brillo sin scale · stop en primer click');
