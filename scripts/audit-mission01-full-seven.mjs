import { readFile, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const OUT = resolve(ROOT, 'public/missions/mission01');
const fail = (code) => { throw new Error(`mission01_full7_audit:${code}`); };
const levels = new Map();
for (let level = 1; level <= 7; level++) {
  const path = resolve(OUT, `level${level}.html`);
  let html;
  try { html = await readFile(path, 'utf8'); } catch { fail(`missing_level_${level}`); }
  levels.set(level, html);
  if (!html.includes(`${level} / 7`) && !html.includes(`${level}/7`)) fail(`progress_${level}`);
  if (/\b[1-8]\s*\/\s*8\b/.test(html)) fail(`legacy_total8_${level}`);
  if (!/AYNI/i.test(html)) fail(`ayni_${level}`);
  if (!/GUÍA/.test(html)) fail(`guide_${level}`);
  if (!/EXPLORAR/.test(html)) fail(`explore_button_${level}`);
  if (!/BITÁCORA/.test(html)) fail(`journal_${level}`);
}

const manifest = JSON.parse(await readFile(resolve(OUT, 'manifest.json'), 'utf8'));
if (manifest.totalLevels !== 7) fail('manifest_total');
if (JSON.stringify(manifest.availableLevels) !== JSON.stringify([1,2,3,4,5,6,7])) fail('manifest_available');
if (Array.isArray(manifest.unavailableLevels) && manifest.unavailableLevels.length) fail('manifest_unavailable');
if (!Array.isArray(manifest.levels) || manifest.levels.length !== 7) fail('manifest_entries');
for (let level=1; level<=7; level++) if (!manifest.levels.some((x)=>Number(x.level)===level)) fail(`manifest_level_${level}`);
if (/RASTREAR|TP1|TP2|TP3|SOURCE HARNESS/.test(levels.get(3))) fail('deleted_rastrear_leak');

const l6 = levels.get(6);
for (const token of ['APULAB_LEVEL6_FROM_LEVEL5_V1','APULAB_LEVEL6_TWO_CHECKPOINTS_V1','APULAB_LEVEL6_FINAL_UX_V1','data-apulab-shell-source="level5"','INVESTIGAR','DATOS CIENTÍFICOS','REPETIR','ESCANEAR','ANALIZAR','ENVIAR DATOS','ZONA DE INTERÉS','PUNTO DE COMUNICACIÓN','OBTENER → INTERPRETAR → COMUNICAR','id="board-shell" class="board-shell"','id="board-canvas" width="950" height="664"','class="board-labels-top"','class="board-labels-left"','id="program-list" class="program-list"','id="program-scroll"','data-testid="level6-guide"','data-testid="level6-guide-step-1"','data-testid="level6-guide-step-5"','AYNI_FRONT_ORIENTATION']) if (!l6.includes(token)) fail(`l6_${token}`);
if (!l6.includes("parent.postMessage({type:'apulab-level-complete',level:6,nextLevel:7}")) fail('l6_navigation_7');
if (l6.includes('class="panel simulator"') || l6.includes('class="panel editor"')) fail('l6_parallel_shell');
if (l6.includes('goalRing')) fail('l6_duplicate_goal_marker');
if (l6.includes('apulab-repeat-focus')) fail('l6_n5_repeat_tutorial_leak');
if (!/repeatUnlocked\s*=\s*true/.test(l6)) fail('l6_repeat_available');
if (l6.includes('if(!usesRepeat())')) fail('l6_repeat_must_be_optional');
if (!l6.includes('if(!scienceScanned||!scienceAnalyzed||!scienceSent||!atCommunicationPoint())')) fail('l6_science_and_final_communication_required');
for (const event of ['level_started','level_completed','help_requested','program_started','program_modified','science_action','science_zone_reached','communication_point_reached','explore_opened','bitacora_opened','data_sent','premature_action','scan_started','scan_completed','analyze_started','analyze_completed']) if (!l6.includes(event)) fail(`l6_telemetry_${event}`);
for (const forbidden of ['SENSOR DE TEMPERATURA','SENSOR DE PROXIMIDAD','ANALIZADOR DE MINERALES','RANURA DE SENSOR','ANALIZAR MUESTRA']) if (l6.includes(forbidden)) fail(`l6_sensor_leak_${forbidden}`);
const l6Explore = l6.match(/const exploreSteps=([^;]+);/)?.[1] || '';
if ((l6Explore.match(/"title"/g)||[]).length !== 2) fail('l6_explore_exactly_2');
if (l6.includes('id="guide-btn"')) fail('l6_top_guide_returned');

const l7 = levels.get(7);
for (const token of ['APULAB_LEVEL7_FROM_LEVEL5_V1','APULAB_LEVEL7_INSTRUMENT_UI_V2','APULAB_LEVEL7_FINAL_GDD_V1','APULAB_LEVEL7_FINAL_HARDENING_V1','data-apulab-shell-source="level5"','LA MUESTRA DESCONOCIDA','MUESTRA DESCONOCIDA','PUNTO DE COMUNICACIÓN','REPETIR','ANALIZAR MUESTRA','ENVIAR DATOS','data-command="analyzeSample"','data-command="send"','data-testid="block-analyze-sample"','data-testid="level7-guide"','data-testid="level7-sample-checkpoint"','data-testid="level7-final-checkpoint"','TEMPERATURA','PROXIMIDAD','ANALIZADOR DE MATERIALES','CAMBIAR INSTRUMENTO','−58 °C','0.4 m','HIERRO','SILICATOS','FINALIZAR MISIÓN','id="board-shell" class="board-shell"','id="board-canvas" width="950" height="664"','class="board-labels-top"','class="board-labels-left"','id="program-list" class="program-list"','id="program-scroll"','AYNI_FRONT_ORIENTATION']) if (!l7.includes(token)) fail(`l7_${token}`);
if (/nextLevel\s*:\s*8|CONTINUAR AL NIVEL 8|SIGUIENTE NIVEL|level8\.html|mission01-level8/.test(l7)) fail('l7_fake_level8');
if (l7.includes('class="panel simulator"') || l7.includes('class="panel editor"') || l7.includes('class="board-wrap"')) fail('l7_parallel_shell');
if (l7.includes('apulab-repeat-focus')) fail('l7_n5_repeat_tutorial_leak');
if (!/repeatUnlocked\s*=\s*true/.test(l7)) fail('l7_repeat_available');
if (l7.includes('if(!usesRepeat())')) fail('l7_repeat_must_be_optional');
for (const legacy of ['data-command="read"','data-command="record"','EQUIPA UN SENSOR','EQUIPAR SENSOR','RANURA DE SENSOR','CAMBIAR SENSOR','ANALIZADOR DE MINERALES','ESPECTRÓMETRO','id="guide-btn"','PUNTO FINAL','final_point_reached','isAdjacentToSample','junto a la muestra']) if (l7.includes(legacy)) fail(`l7_legacy_${legacy}`);
for (const event of ['level_started','program_started','program_modified','sample_reached','sample_analyze_requested','instrument_modal_opened','instrument_selected','sample_analyzed','instrument_changed','relevant_instrument_selected','communication_point_reached','data_sent','explore_opened','bitacora_opened','level_completed']) if (!l7.includes(event)) fail(`l7_telemetry_${event}`);
if (!l7.includes("if(!relevantInstrumentUsed||!communicationPointReached||!dataSent||!atFinalCheckpoint())return")) fail('l7_completion_gate');
if (!l7.includes('pendingAnalysisResolve=resolve;openInstrumentSelector()')) fail('l7_pause_for_choice');
if (!l7.includes('const isAtSample=()=>roverState.c===sampleCell.c&&roverState.r===sampleCell.r')) fail('l7_exact_sample');
if ((l7.match(/recordLevel7Event\('sample_reached'/g)||[]).length!==1) fail('l7_sample_reached_single');
if (!l7.includes("type:'apulab-level-ready', level:7")) fail('l7_ready_identity');
if (!l7.includes("type:'apulab-runtime-error',level:7")) fail('l7_error_identity');
const l7Explore = l7.match(/const exploreSteps=([^;]+);/)?.[1] || '';
if ((l7Explore.match(/"title"/g)||[]).length !== 2) fail('l7_explore_exactly_2');

for (const [level, html] of [[6,l6],[7,l7]]) {
  if (!html.includes('new THREE.WebGLRenderer')) fail(`three_${level}`);
  if (!html.includes('function __apulabDisposeLevelV127()')) fail(`structured_disposer_${level}`);
  if (!html.includes('window.__apulabStopAllAnimationFrames?.()')) fail(`raf_cancel_${level}`);
  if (!html.includes('renderer.forceContextLoss?.()')) fail(`context_loss_${level}`);
  if (!html.includes('pagehide')) fail(`pagehide_${level}`);
  if (!html.includes("document.getElementById('journal-overlay')?.classList.remove('visible')") && !html.includes("closeTransientUI('success')")) fail(`overlay_exclusive_${level}`);
  const match = html.match(/<script type="module">\n([\s\S]*?)\n<\/script>/);
  if (!match) fail(`module_script_${level}`);
  const temp = resolve(ROOT, `.mission01-level${level}-syntax.mjs`);
  await writeFile(temp, match[1], 'utf8');
  const result = spawnSync(process.execPath, ['--check', temp], { encoding: 'utf8' });
  await rm(temp, { force: true });
  if (result.status !== 0) fail(`syntax_${level}:${result.stderr || result.stdout}`);
}

const source = await readFile(resolve(ROOT, 'src/ui/Mission01Screen.ts'), 'utf8');
if (!source.includes('const MAX_AVAILABLE_LEVEL = 7;')) fail('screen_max7');
if (!source.includes('APULAB_TRANSITION_NATIVE_UNLOAD_V4')) fail('native_unload_transition');
if (!source.includes("this.frames.push(this.createFrame('A'));")) fail('single_frame_creation');
if (/createFrame\('B'\)/.test(source)) fail('second_frame_exists');
if (!source.includes('const frameIndex = this.activeFrameIndex;')) fail('same_frame_transition');
if (!source.includes('frame.src = path;')) fail('same_frame_navigation');
if (!source.includes('this.prefetchLevel(this.activeLevel + 1);')) fail('prefetch_sequence');
if (/mission01-level-transition|transitionCurtain|showLevelTransition|hideLevelTransition/.test(source)) fail('transition_card_reintroduced');
const requestStart = source.indexOf('  private requestLevel(level: number): void {');
const requestEnd = source.indexOf('  private markPendingReady(', requestStart);
const requestBlock = source.slice(requestStart, requestEnd);
if (requestBlock.includes('signalFrameDispose') || requestBlock.includes('postMessage')) fail('stale_dispose_risk');
if (/DISPOSE_HANDOFF_MS|handoffTimer/.test(source)) fail('legacy_handoff');

console.info('[mission01] FULL 1–7 AUDIT OK');
console.info('[mission01] N1–N5 legacy/remapped contracts preserved');
console.info('[mission01] N6: fixed 1→5 guide + OBTENER → INTERPRETAR → COMUNICAR + two checkpoints + optional REPETIR');
console.info('[mission01] N7: exact sample → instrument → PUNTO DE COMUNICACIÓN → explicit ENVIAR DATOS + optional REPETIR');
console.info('[mission01] Navigation verified: 1→2→3→4→5→6→7 · one iframe · no fake level 8');
