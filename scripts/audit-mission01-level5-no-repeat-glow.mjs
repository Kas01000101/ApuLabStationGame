import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const html = await readFile(resolve(process.cwd(), 'public/missions/mission01/level5.html'), 'utf8');
const fail = (code) => { throw new Error(`mission01_level5_no_repeat_glow:${code}`); };

const repeatTag = html.match(/<div id="repeat-palette"[^>]*>/)?.[0] || '';
if (!repeatTag) fail('repeat_palette_missing');
if (/\bis-new\b|apulab-explore-glow|apulabAttention/i.test(repeatTag)) fail('attention_class_present');
if (/\.block-repeat\.is-new/i.test(html)) fail('legacy_selector_present');
if (/@keyframes\s+repeatUnlock/i.test(html)) fail('legacy_keyframes_present');
if (/animation\s*:\s*repeatUnlock/i.test(html)) fail('legacy_animation_present');
if (/repeat-palette[^\n]{0,180}classList\.(?:add|toggle)\((['"])is-new\1/i.test(html)) fail('runtime_attention_present');
if (!html.includes('apulab-explore-glow')) fail('explore_glow_missing');

console.info('[mission01] LEVEL 5 NO-REPEAT-GLOW OK · REPETIR estático · EXPLORAR único foco de atención');
