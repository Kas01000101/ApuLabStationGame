import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const LEVEL6 = resolve(process.cwd(), 'public/missions/mission01/level6.html');
const html = await readFile(LEVEL6, 'utf8');
const fail = (code) => { throw new Error(`mission01_level6_contract_hardening_audit:${code}`); };

for (const token of [
  'APULAB_LEVEL6_FROM_LEVEL5_V1',
  'APULAB_LEVEL6_TWO_CHECKPOINTS_V1',
  'repeatUnlocked=true',
  "phase='science'",
  'data-command="scan" data-testid="block-scan"',
  'data-command="analyze" data-testid="block-analyze"',
  'data-command="send" data-testid="block-send"',
  "el.onkeydown=e=>{if(e.key==='Enter'||e.key===' ')",
  "rp.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&repeatUnlocked)",
  "recordLevel6ProgramEdit('clear','all')",
  'scienceZoneReached=false',
  'communicationPointReached=false',
  'window.apulabLevel6QA=',
  'used_repeat_n6',
  'repeat_instances_n6',
  'repeat_commands_executed',
  'blocks_without_repeat',
  'blocks_final',
]) {
  if (!html.includes(token)) fail(`missing:${token}`);
}

for (const forbidden of [
  'function unlockRepeat()',
  'function handleRunSuccess()',
  'function usesSequenceRepeat(',
  'id="unlock-overlay"',
  'id="unlock-btn"',
  'DESBLOQUEAR REPETIR',
  'Usa REPETIR para',
  'al zona de interés',
  'Ahora usa REPETIR para organizar la ruta.',
  'REPETIR desbloqueado · úsalo para completar el nivel.',
  'if(!usesRepeat())',
  'if(!usesSequenceRepeat())',
]) {
  if (html.includes(forbidden)) fail(`forbidden:${forbidden}`);
}

const runStart = html.indexOf('async function runProgram()');
const runEnd = html.indexOf('function completeLevel()', runStart);
if (runStart < 0 || runEnd < 0) fail('run_program_bounds');
const runProgram = html.slice(runStart, runEnd);
if (runProgram.includes('resetScienceState()')) fail('run_must_preserve_valid_science_progress');
if (!runProgram.includes("if(!scienceScanned||!scienceAnalyzed||!scienceSent||!atCommunicationPoint())")) fail('science_completion_contract_missing_final_position');
if (!runProgram.includes('AYNI debe finalizar en el punto de comunicación.')) fail('final_position_feedback_missing');

const clearStart = html.indexOf("document.getElementById('clear-btn').onclick=");
if (clearStart < 0) fail('clear_handler_missing');
const clearSnippet = html.slice(clearStart, clearStart + 700);
for (const token of ['program=[]', 'resetScienceState()', 'resetRover()', "recordLevel6ProgramEdit('clear','all')"]) {
  if (!clearSnippet.includes(token)) fail(`clear_contract:${token}`);
}

console.info('[mission01] LEVEL 6 CONTRACT HARDENING OK · click/drag/keyboard · REPETIR optional · N5 tutorial removed · graceful failure/reset · final communication position · spontaneous reuse telemetry');
