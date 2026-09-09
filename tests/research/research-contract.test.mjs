import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('Station Research is game-only', async () => {
  const config = await read('src/config/researchConfig.ts');
  assert.match(config, /type StudyCondition\s*=\s*'game'/);
  for (const forbidden of ["'control'", "'gc'", "'static_control'"]) assert.equal(config.includes(forbidden), false);
});

test('frontend authentication payload matches frozen Edge contract', async () => {
  const client = await read('src/systems/SupabaseClient.ts');
  assert.match(client, /post\('\/authenticate',\s*\{\s*study_code:\s*code,\s*credential\s*\}\)/);
  assert.equal(client.includes('{ participant_code: code, credential }'), false);
});

test('frontend unwraps successful Edge data envelope before SessionService consumes it', async () => {
  const client = await read('src/systems/SupabaseClient.ts');
  const session = await read('src/systems/SessionService.ts');
  assert.match(client, /Object\.prototype\.hasOwnProperty\.call\(data, 'data'\) \? data\.data : data/);
  assert.match(client, /return \{ success: true, data: responseData as T \}/);
  assert.match(session, /auth\.data\.study_condition/);
});

test('canonical event registry separates N6 communication from N7 final point', async () => {
  const events = await read('src/research/telemetry/events.ts');
  const n6 = events.match(/6:\s*\[([\s\S]*?)\],\s*7:/)?.[1] ?? '';
  const n7 = events.match(/7:\s*\[([\s\S]*?)\],\s*}\s*as const/)?.[1] ?? '';
  assert.match(n6, /'communication_point_reached'/); assert.match(n6, /'data_sent'/);
  assert.match(n7, /'final_point_reached'/); assert.equal(n7.includes("'communication_point_reached'"), false); assert.equal(n7.includes("'data_sent'"), false);
});

test('normalizer derives analytics without falsifying N7 raw event', async () => {
  const normalizer = await read('src/research/telemetry/EventNormalizer.ts');
  assert.match(normalizer, /final_point_reached/); assert.match(normalizer, /scientific_task_terminal_reached/);
  assert.equal(/final_point_reached[\s\S]{0,120}communication_point_reached/.test(normalizer), false);
});

test('Mission01 bridge is passive and completion is N7 level_completed only', async () => {
  const bridge = await read('src/systems/Mission01TelemetryBridge.ts');
  assert.match(bridge, /message\.origin !== window\.location\.origin/); assert.match(bridge, /frame\.contentWindow === source/);
  assert.match(bridge, /canonicalizeEventType/); assert.match(bridge, /canonical === 'level_completed' && levelNumber === 7/);
  assert.equal(/final_point_reached[\s\S]{0,160}SessionService/.test(bridge), false);
  assert.equal(/contentDocument|contentWindow\?\.document|\.innerHTML\s*=/.test(bridge), false);
});

test('Edge server contract is game-only, privacy-safe and canonical for N6/N7', async () => {
  const edge = await read('supabase/functions/ingest-telemetry/index.ts');
  assert.match(edge, /type StudyCondition = 'game'/); assert.match(edge, /HMAC/); assert.match(edge, /PBKDF2/);
  assert.match(edge, /APULAB_SESSION_PROOF_SECRET/); assert.match(edge, /session_sync_token/); assert.match(edge, /payload_forbidden_field/); assert.match(edge, /event_id_conflict/);
  const n6 = edge.match(/6:\s*new Set\(\[([\s\S]*?)\]\),\s*7:/)?.[1] ?? '';
  const n7 = edge.match(/7:\s*new Set\(\[([\s\S]*?)\]\),\s*};/)?.[1] ?? '';
  assert.match(n6, /communication_point_reached/); assert.match(n6, /data_sent/); assert.match(n7, /final_point_reached/);
  assert.equal(n7.includes('communication_point_reached'), false); assert.equal(n7.includes('data_sent'), false);
  const start = edge.indexOf("if (url.pathname.endsWith('/session/complete'))");
  const end = edge.indexOf("if (url.pathname.endsWith('/session'))", start + 1);
  const completion = edge.slice(start, end);
  assert.match(completion, /level_completed/); assert.match(completion, /session_completed/); assert.equal(completion.includes("'data_sent'"), false);
});
