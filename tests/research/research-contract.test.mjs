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

test('Mission01 bridge accepts behavior only and parent owns lifecycle', async () => {
  const bridge = await read('src/systems/Mission01TelemetryBridge.ts');
  const screen = await read('src/ui/Mission01Screen.ts');
  assert.match(bridge, /message\.origin !== window\.location\.origin/);
  assert.match(bridge, /frame\.contentWindow === source/);
  assert.match(bridge, /canonicalizeEventType/);
  assert.match(bridge, /PARENT_OWNED_LIFECYCLE/);
  assert.equal(bridge.includes('SessionService'), false);
  assert.match(screen, /recordEvent\('level_started'/);
  assert.match(screen, /recordEvent\(\s*'level_completed'/);
  assert.match(screen, /level === TOTAL_LEVELS/);
  assert.match(screen, /new SessionService\(\)\.complete\(\)/);
  assert.match(screen, /attachMission01BehaviorTelemetry/);
});

test('N1-N4 behavioral instrumentation stays in parent shell and does not rewrite level HTML', async () => {
  const behavior = await read('src/systems/Mission01BehaviorTelemetry.ts');
  assert.match(behavior, /battery_power_changed/);
  assert.match(behavior, /valid_measurement/);
  assert.match(behavior, /battery_measured/);
  assert.match(behavior, /all_batteries_measured/);
  assert.match(behavior, /command_added/);
  assert.match(behavior, /collision_detected/);
  assert.equal(behavior.includes('innerHTML ='), false);
});

test('QA bridge diagnostics are local-only counters', async () => {
  const diagnostics = await read('src/systems/Mission01TelemetryDiagnostics.ts');
  for (const key of ['received','rejected_origin','rejected_source','rejected_message_type','rejected_event_type','rejected_level','accepted']) {
    assert.match(diagnostics, new RegExp(key));
  }
  assert.match(diagnostics, /sessionStorage/);
  assert.equal(diagnostics.includes('TelemetryService'), false);
  assert.equal(diagnostics.includes('SupabaseClient'), false);
});

test('study session recovery never clears Research storage wholesale', async () => {
  const session = await read('src/systems/SessionService.ts');
  const queue = await read('src/systems/LocalQueueService.ts');
  assert.match(session, /findRecoverableStudyContext/);
  assert.match(session, /resumeSession/);
  assert.match(session, /active_session_exists/);
  assert.match(session, /\^apulab\\\.level\[1-7\]\\\./);
  assert.equal(session.includes('localStorage.clear()'), false);
  assert.match(queue, /participant_id\?: string \| null/);
  assert.match(queue, /event_seq_last\?: number/);
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
  const end = edge.indexOf("if (url.pathname.endsWith('/session/resume'))", start + 1);
  const completion = edge.slice(start, end);
  assert.match(completion, /level_completed/); assert.match(completion, /session_completed/); assert.equal(completion.includes("'data_sent'"), false);
});

test('Edge and DB enforce single active study session with same-browser resume', async () => {
  const edge = await read('supabase/functions/ingest-telemetry/index.ts');
  const m12 = await read('supabase/migrations/20260909101000_station_single_active_study_session.sql');
  assert.match(edge, /ACTIVE_STUDY_STATUSES/);
  assert.match(edge, /findActiveStudySession/);
  assert.match(edge, /active_session_exists/);
  assert.match(edge, /\/session\/resume/);
  assert.match(m12, /CREATE UNIQUE INDEX IF NOT EXISTS uq_apulab_sessions_one_active_study/);
  assert.match(m12, /session_mode='study'/);
  assert.match(m12, /completed_pending_sync/);
});

test('M11 QA analytics are isolated from official analytics', async () => {
  const m11 = await read('supabase/migrations/20260909100000_station_research_qa_analytics.sql');
  for (const view of ['v_qa_level_outcomes','v_qa_level5_loop_metrics','v_qa_level6_science_metrics','v_qa_level7_instrument_metrics','v_qa_session_quality']) {
    assert.match(m11, new RegExp(view));
  }
  assert.match(m11, /FROM public\.v_qa_events/);
  assert.match(m11, /loop_flow_correct/);
  assert.match(m11, /security_invoker=true/);
  assert.equal(m11.includes('CREATE OR REPLACE VIEW public.v_official_study_events'), false);
});
