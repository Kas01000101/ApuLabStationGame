import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const html = await readFile(resolve(process.cwd(), 'public/missions/mission01/level5.html'), 'utf8');
const fail = (code) => { throw new Error(`mission01_level5_repeat_attention:${code}`); };

const repeatTag = html.match(/<div id="repeat-palette"[^>]*>/)?.[0] || '';
if (!repeatTag) fail('repeat_palette_missing');
if (!/\shidden(?:\s|>)/.test(repeatTag)) fail('repeat_must_start_hidden');
if (/\bis-new\b|level5-repeat-ready|apulabAttention/i.test(repeatTag)) fail('repeat_must_not_start_highlighted');

if (!html.includes('#repeat-palette.level5-repeat-ready')) fail('contextual_focus_selector_missing');
if (!html.includes('@keyframes level5RepeatReady')) fail('contextual_focus_pulse_missing');
if (!html.includes("document.getElementById('repeat-palette').classList.add('level5-repeat-ready')")) fail('unlock_focus_missing');
if (!html.includes("rp.classList.remove('level5-repeat-ready')")) fail('focus_clear_on_use_missing');
if (html.includes('apulab-repeat-arrow') || html.includes('#apulab-repeat-arrow')) fail('legacy_arrow_returned');
if (html.includes('apulab-repeat-focus-runtime') || html.includes('apulab-repeat-focus-style')) fail('legacy_focus_runtime_returned');

console.info('[mission01] LEVEL 5 REPEAT ATTENTION OK · oculto al inicio · glow suave solo tras detectar patrón · sin flecha · se apaga al usar REPETIR');
