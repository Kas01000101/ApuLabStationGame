import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const html = await readFile(resolve(process.cwd(), 'public/missions/mission01/level5.html'), 'utf8');
const fail = (code) => { throw new Error(`mission01_level5_repeat_attention:${code}`); };

const repeatTag = html.match(/<div id="repeat-palette"[^>]*>/)?.[0] || '';
if (!repeatTag) fail('repeat_palette_missing');
if (!/\shidden(?:\s|>)/.test(repeatTag)) fail('repeat_must_start_hidden');
if (/\bis-new\b|apulab-repeat-focus|apulabAttention/i.test(repeatTag)) fail('repeat_must_not_start_highlighted');

if (!html.includes('id="apulab-repeat-focus-style"')) fail('focus_style_missing');
if (!html.includes('id="apulab-repeat-focus-runtime"')) fail('focus_runtime_missing');
if (!html.includes('#repeat-palette.apulab-repeat-focus')) fail('focus_selector_missing');
if (!html.includes('@keyframes apulab-repeat-focus-pulse')) fail('focus_pulse_missing');
if (!html.includes('0 0 30px rgba(255,99,184,.96)')) fail('pink_halo_missing');
if (!html.includes("arrow.id='apulab-repeat-arrow'")) fail('arrow_runtime_missing');
if (!html.includes('#apulab-repeat-arrow::before')) fail('arrow_shaft_missing');
if (!html.includes('#apulab-repeat-arrow::after')) fail('arrow_head_missing');
if (!html.includes('height:10px')) fail('arrow_shaft_not_thick');
if (!html.includes('border-top:13px solid transparent')) fail('arrow_head_not_thick');
if (!html.includes('border-right:24px solid #ff63b8')) fail('arrow_head_not_pink');
if (!html.includes('background:#ff63b8')) fail('arrow_shaft_not_pink');

if (!html.includes('window.apulabRepeatFocus?.start?.();')) fail('unlock_trigger_missing');
if (!html.includes("palette.classList.add('apulab-repeat-focus')")) fail('focus_start_missing');
if (!html.includes("palette.classList.remove('apulab-repeat-focus')")) fail('focus_stop_missing');
if (!html.includes("palette.dataset.apulabAttention='repeat-after-discovery'")) fail('attention_marker_missing');
if (!html.includes("palette.addEventListener('pointerdown',stop")) fail('pointer_consumes_attention_missing');
if (!html.includes("event.key==='Enter'||event.key===' '")) fail('keyboard_consumes_attention_missing');
if (!html.includes("arrow.style.left=(r.right+10)+'px'")) fail('arrow_not_anchored_to_repeat');

console.info('[mission01] LEVEL 5 REPEAT ATTENTION OK · oculto al inicio · tras ruta larga halo rosa + flecha gruesa · se apaga al usar REPETIR');
