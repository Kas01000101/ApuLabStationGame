import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const fail = (code) => { throw new Error(`mission01_explore_glow:${code}`); };

for (const level of [1,3,5]) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  if (!html.includes('apulab-explore-glow-style')) fail(`style_l${level}`);
  if (!html.includes(`apulab-explore-glow-runtime-l${level}`)) fail(`runtime_l${level}`);
  if (!html.includes("btn.addEventListener('click',stop,{once:true})")) fail(`first_click_stop_l${level}`);
  if (!html.includes("btn.dataset.apulabAttention='explore'")) fail(`explore_target_marker_l${level}`);

  const styleStart = html.indexOf('<style id="apulab-explore-glow-style">');
  const styleEnd = html.indexOf('</style>', styleStart);
  const glowStyle = html.slice(styleStart, styleEnd);
  if (/transform\s*:\s*scale/i.test(glowStyle)) fail(`glow_scales_l${level}`);
  if (!glowStyle.includes('0 0 30px rgba(244,199,94,1)')) fail(`visible_halo_l${level}`);
  if (!glowStyle.includes('0 0 52px rgba(244,199,94,.62)')) fail(`outer_halo_l${level}`);
  if (!glowStyle.includes('outline-offset:7px')) fail(`pulse_ring_l${level}`);
  if (!glowStyle.includes('z-index:40!important')) fail(`foreground_l${level}`);
}

const level1 = await readFile(resolve(OUT, 'level1.html'), 'utf8');
if (level1.includes('guideButton.classList.add("is-recommended");')) fail('guide_attention_present_l1');
if (!level1.includes('guideButton.classList.remove("is-recommended");')) fail('guide_attention_guard_missing_l1');

const level5 = await readFile(resolve(OUT, 'level5.html'), 'utf8');
const repeatTag = level5.match(/<div id="repeat-palette"[^>]*>/)?.[0] || '';
if (!repeatTag) fail('repeat_palette_missing_l5');
if (/\bis-new\b|apulab-explore-glow|apulabAttention/i.test(repeatTag)) fail('repeat_attention_present_l5');
if (!/class="command-block block-repeat"/.test(repeatTag)) fail('repeat_palette_class_l5');

for (const level of [2,4,6,7]) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  if (html.includes('apulab-explore-glow-runtime')) fail(`leak_l${level}`);
}

console.info('[mission01] EXPLORE GLOW CONTRACT OK · N1/N3/N5 solamente · REPETIR N5 sin atención · aro+halo visible · sin scale · stop en primer click');
