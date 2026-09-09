import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const LEVEL7 = resolve(ROOT, 'public/missions/mission01/level7.html');
const BRIDGE = resolve(ROOT, 'src/systems/Level7TelemetryBridge.ts');
const SCREEN = resolve(ROOT, 'src/ui/Mission01Screen.ts');
const SESSION = resolve(ROOT, 'src/systems/SessionService.ts');
const fail = (code) => { throw new Error(`mission01_level7_completion_handoff_audit:${code}`); };

const [html, bridge, screen, session] = await Promise.all([
  readFile(LEVEL7, 'utf8'),
  readFile(BRIDGE, 'utf8'),
  readFile(SCREEN, 'utf8'),
  readFile(SESSION, 'utf8'),
]);

for (const token of [
  'APULAB_LEVEL7_COMPLETION_HANDOFF_V1',
  "recordLevel7Event('final_point_reached'",
  "recordLevel7Event('level_completed'",
  "parent.postMessage({type:'apulab-level-complete',level:7},location.origin)",
]) if (!html.includes(token)) fail(`html_missing:${token}`);

if (html.split('APULAB_LEVEL7_COMPLETION_HANDOFF_V1').length - 1 !== 1) fail('handoff_marker_not_unique');
if (html.includes('nextLevel:8') || html.includes('level8.html') || html.includes('mission01-level8')) fail('level8_route_present');

// Child N7 may keep its local diagnostic level_completed entry, but it must not
// be forwarded into Research as a second lifecycle event. Mission01Screen owns
// the one canonical level_completed row.
if (bridge.includes("  'level_completed',")) fail('child_level_completed_still_forwarded');
if (!bridge.includes('Canonical level completion is parent-owned')) fail('bridge_ownership_comment_missing');

for (const token of [
  'private readonly completedLevels = new Set<number>();',
  'if (this.completedLevels.has(level)) return;',
  "'level_completed'",
  'if (level === TOTAL_LEVELS) void new SessionService().complete();',
]) if (!screen.includes(token)) fail(`parent_lifecycle_missing:${token}`);

for (const token of [
  "recordEvent('session_completed', {})",
  'completed_pending_sync',
  'await SyncService.processQueue();',
]) if (!session.includes(token)) fail(`session_completion_missing:${token}`);

console.info('[mission01] N7 completion ownership audit OK · child handoff → one parent level_completed → one session_completed');
