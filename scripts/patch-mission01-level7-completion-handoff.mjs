import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const LEVEL7 = resolve(OUT, 'level7.html');
const MANIFEST = resolve(OUT, 'manifest.json');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
const fail = (code) => { throw new Error(`mission01_level7_completion_handoff:${code}`); };

let html = await readFile(LEVEL7, 'utf8');

if (!html.includes('APULAB_LEVEL7_FINAL_GDD_V1')) fail('final_gdd_missing');
if (!html.includes("recordLevel7Event('final_point_reached'")) fail('final_point_telemetry_missing');
if (!html.includes("recordLevel7Event('level_completed'")) fail('child_completion_diagnostic_missing');
if (html.includes('APULAB_LEVEL7_COMPLETION_HANDOFF_V1')) fail('already_applied');

// N7 behavioral telemetry is posted from the iframe. The canonical lifecycle is
// owned by Mission01Screen in the parent. Use postMessage for the terminal
// handoff so final_point_reached and the completion signal preserve child→parent
// message order. Do not call parent.apulabCompleteLevel synchronously here: that
// could overtake the already queued final_point_reached telemetry.
const successMarker = "document.getElementById('success-overlay').classList.add('visible')";
const occurrences = html.split(successMarker).length - 1;
if (occurrences !== 1) fail(`success_marker_count:${occurrences}`);

const handoff = `${successMarker};/* APULAB_LEVEL7_COMPLETION_HANDOFF_V1 · canonical level_completed is parent-owned */if(!window.__apulabLevel7CompletionHandoffSent){window.__apulabLevel7CompletionHandoffSent=true;try{parent.postMessage({type:'apulab-level-complete',level:7},location.origin)}catch{}}`;
html = html.replace(successMarker, handoff);

if (!html.includes('APULAB_LEVEL7_COMPLETION_HANDOFF_V1')) fail('marker_missing_after_patch');
if (!html.includes("parent.postMessage({type:'apulab-level-complete',level:7},location.origin)")) fail('parent_handoff_missing');
if (html.includes('nextLevel:8') || html.includes('level8.html') || html.includes('mission01-level8')) fail('level8_route_forbidden');

await writeFile(LEVEL7, html, 'utf8');

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
const entry = (manifest.levels || []).find((row) => Number(row.level) === 7);
if (!entry) fail('manifest_entry_missing');
entry.bytes = Buffer.byteLength(html, 'utf8');
entry.sha256 = hash(html);
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.info('[mission01] N7 completion handoff OK · final_point → parent lifecycle · no N8');
