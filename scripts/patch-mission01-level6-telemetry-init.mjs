import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const LEVEL6 = resolve(process.cwd(), 'public/missions/mission01/level6.html');
const fail = (code) => { throw new Error(`mission01_level6_telemetry_init:${code}`); };
let html = await readFile(LEVEL6, 'utf8');

const old = "window.addEventListener('load',()=>{emitLevel6Event('level_started',{elapsed_ms:0});document.getElementById('guide-btn')?.addEventListener('click',()=>{level6HelpCount+=1;emitLevel6Event('help_requested',{source:'guide',help_count:level6HelpCount,elapsed_ms:level6Elapsed()})});document.getElementById('explore-btn')?.addEventListener('click',()=>{level6HelpCount+=1;emitLevel6Event('help_requested',{source:'explore',help_count:level6HelpCount,elapsed_ms:level6Elapsed()})})},{once:true})";
const replacement = "let __apulabLevel6TelemetryInitialized=false;function __apulabInitLevel6Telemetry(){if(__apulabLevel6TelemetryInitialized)return;__apulabLevel6TelemetryInitialized=true;emitLevel6Event('level_started',{elapsed_ms:0});document.getElementById('guide-btn')?.addEventListener('click',()=>{level6HelpCount+=1;emitLevel6Event('help_requested',{source:'guide',help_count:level6HelpCount,elapsed_ms:level6Elapsed()})});document.getElementById('explore-btn')?.addEventListener('click',()=>{level6HelpCount+=1;emitLevel6Event('help_requested',{source:'explore',help_count:level6HelpCount,elapsed_ms:level6Elapsed()})})}if(document.readyState==='complete')__apulabInitLevel6Telemetry();else window.addEventListener('load',__apulabInitLevel6Telemetry,{once:true})";

if (!html.includes(old)) fail('legacy_load_listener_missing');
html = html.replace(old, replacement);

for (const token of [
  '__apulabLevel6TelemetryInitialized=false',
  "if(document.readyState==='complete')__apulabInitLevel6Telemetry()",
  "emitLevel6Event('level_started',{elapsed_ms:0})",
]) if (!html.includes(token)) fail(`missing:${token}`);
if (html.includes("window.addEventListener('load',()=>{emitLevel6Event('level_started'")) fail('fragile_load_listener_remaining');

await writeFile(LEVEL6, html, 'utf8');
console.info('[mission01] N6 telemetry init OK · level_started emitted whether load already fired or not');
