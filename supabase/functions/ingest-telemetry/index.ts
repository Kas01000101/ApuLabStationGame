import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.115.0';

const MAX_BATCH_SIZE = 20;
const MAX_PAYLOAD_BYTES = 8192;
const MAX_REQUEST_BYTES = 128 * 1024;
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_COOLDOWN_MS = 10 * 60 * 1000;
const AUTH_FAILURE_LIMIT = 5;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENT_PATTERN = /^[a-z0-9_]{3,64}$/;

const COMMON_EVENTS = new Set([
  'session_started','session_completed','level_started','level_completed','program_started','program_modified',
  'explore_opened','bitacora_opened','help_requested','task_started','task_response_submitted','task_response_changed',
  'task_completed','premature_action','sync_failed','storage_pressure',
]);
const LEVEL_EVENTS: Record<number, Set<string>> = {
  1: new Set(['battery_power_changed','multimeter_power_changed','multimeter_mode_changed','probe_drag_start','probe_snap','measurement_attempt','polarity_state','valid_measurement']),
  2: new Set(['battery_viewed','battery_measured','all_batteries_measured','battery_selected','battery_selection_changed']),
  3: new Set(['command_added','command_removed','command_moved','command_executed','goal_reached']),
  4: new Set(['collision_detected','program_modified_after_failure','goal_reached','command_added','command_removed','command_moved','command_executed']),
  5: new Set(['initial_program_completed','pattern_highlighted','repeat_unlocked','repeat_added','repeat_removed','repeat_count_changed','block_moved_into_repeat','block_removed_from_repeat','program_refactored','goal_reached']),
  6: new Set(['science_zone_reached','scan_started','scan_completed','analyze_started','analyze_completed','communication_point_reached','data_sent']),
  7: new Set(['sample_reached','sample_analyze_requested','instrument_modal_opened','instrument_selected','sample_analyzed','instrument_changed','relevant_instrument_selected','communication_point_reached','data_sent']),
};
const FORBIDDEN = new Set([
  'name','first_name','last_name','email','phone','address','dni','document_id','birth_date','school','parent_name',
  'credential','password','participant_code','study_code','credential_hash','audio','video','image','screenshot','html',
  '__proto__','prototype','constructor',
]);

class PublicError extends Error {
  constructor(readonly code: string, readonly status = 400) { super(code); }
}

type StudyCondition = 'game' | 'static_control';
type Proof = { participant_id: string; study_id: string; study_condition: StudyCondition; exp: number };
type StudyRow = {
  study_id: string;
  study_kind: 'qa' | 'official';
  status: string;
  study_build_version: string;
  expected_commit_sha: string;
  telemetry_schema_version: string;
  protocol_version: string;
};

const enc = new TextEncoder();
const dec = new TextDecoder();

function admin() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('supabase_server_configuration_missing');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
function allowedOrigins() { return (Deno.env.get('APULAB_ALLOWED_ORIGINS') ?? '').split(',').map((x) => x.trim()).filter(Boolean); }
function originAllowed(origin: string | null) { return !origin || allowedOrigins().includes(origin); }
function cors(origin: string | null): HeadersInit {
  const headers: Record<string,string> = {
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '600',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Vary': 'Origin',
  };
  if (origin && originAllowed(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}
function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(origin), 'Content-Type': 'application/json; charset=utf-8' } });
}
function byteLength(value: unknown) { return enc.encode(JSON.stringify(value ?? {})).length; }
async function readBody(req: Request): Promise<Record<string,unknown>> {
  const type = (req.headers.get('content-type') ?? '').toLowerCase();
  if (!type.startsWith('application/json')) throw new PublicError('content_type_invalid', 415);
  const declared = Number(req.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > MAX_REQUEST_BYTES) throw new PublicError('request_too_large', 413);
  const text = await req.text();
  if (enc.encode(text).length > MAX_REQUEST_BYTES) throw new PublicError('request_too_large', 413);
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new PublicError('json_invalid'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new PublicError('body_invalid');
  return parsed as Record<string,unknown>;
}
function stringField(value: unknown, field: string, max = 128): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new PublicError(`${field}_invalid`);
  return value.trim();
}
function integerField(value: unknown, field: string, min: number, max = Number.MAX_SAFE_INTEGER): number {
  if (!Number.isInteger(value) || Number(value) < min || Number(value) > max) throw new PublicError(`${field}_invalid`);
  return Number(value);
}
function isoField(value: unknown, field: string): string {
  const text = stringField(value, field, 64);
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) throw new PublicError(`${field}_invalid`);
  return new Date(parsed).toISOString();
}
function safePayload(value: unknown): Record<string,unknown> {
  if (value == null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) throw new PublicError('payload_invalid');
  if (byteLength(value) > MAX_PAYLOAD_BYTES) throw new PublicError('payload_too_large', 413);
  const stack: unknown[] = [value];
  while (stack.length) {
    const current = stack.pop();
    if (Array.isArray(current)) { stack.push(...current); continue; }
    if (!current || typeof current !== 'object') continue;
    for (const [key, nested] of Object.entries(current as Record<string,unknown>)) {
      if (FORBIDDEN.has(key.toLowerCase())) throw new PublicError('payload_forbidden_field');
      if (nested && typeof nested === 'object') stack.push(nested);
    }
  }
  return value as Record<string,unknown>;
}
function normalizeCode(value: unknown): string {
  const code = stringField(value, 'study_code', 16).toUpperCase();
  const match = code.match(/^(QT|AP)-(\d{3})$/);
  if (!match) throw new PublicError('study_code_invalid');
  const n = Number(match[2]);
  if ((match[1] === 'QT' && (n < 1 || n > 10)) || (match[1] === 'AP' && (n < 1 || n > 50))) throw new PublicError('study_code_invalid');
  return code;
}
function b64url(data: Uint8Array): string { return btoa(String.fromCharCode(...data)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function unb64url(value: string): Uint8Array {
  const padded = value.replace(/-/g,'+').replace(/_/g,'/') + '='.repeat((4-value.length%4)%4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}
async function hmac(text: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(text))));
}
async function sha256(text: string): Promise<string> {
  return b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(text))));
}
async function codeHash(code: string): Promise<string> {
  const pepper = Deno.env.get('APULAB_AUTH_PEPPER');
  if (!pepper) throw new Error('auth_pepper_missing');
  return hmac(code, pepper);
}
async function verifyCredential(credential: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2_sha256') return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 100000) return false;
  const salt = unb64url(parts[2]);
  const expected = unb64url(parts[3]);
  const material = await crypto.subtle.importKey('raw', enc.encode(credential), 'PBKDF2', false, ['deriveBits']);
  const actual = new Uint8Array(await crypto.subtle.deriveBits({ name:'PBKDF2', hash:'SHA-256', salt, iterations }, material, expected.length * 8));
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i=0;i<actual.length;i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}
async function issueProof(input: Omit<Proof,'exp'>): Promise<string> {
  const secret = Deno.env.get('APULAB_SESSION_PROOF_SECRET');
  if (!secret) throw new Error('proof_secret_missing');
  const payload = { ...input, exp: Date.now() + 4*60*60*1000 };
  const raw = b64url(enc.encode(JSON.stringify(payload)));
  return `${raw}.${await hmac(raw, secret)}`;
}
async function readProof(token: unknown): Promise<Proof> {
  const text = stringField(token, 'session_proof', 4096);
  const [raw,sig] = text.split('.');
  if (!raw || !sig) throw new PublicError('session_proof_invalid', 403);
  const secret = Deno.env.get('APULAB_SESSION_PROOF_SECRET');
  if (!secret) throw new Error('proof_secret_missing');
  if (await hmac(raw, secret) !== sig) throw new PublicError('session_proof_invalid', 403);
  let proof: Proof;
  try { proof = JSON.parse(dec.decode(unb64url(raw))); } catch { throw new PublicError('session_proof_invalid', 403); }
  if (!proof || proof.exp < Date.now() || !UUID_PATTERN.test(proof.participant_id) || !proof.study_id || !['game','static_control'].includes(proof.study_condition)) {
    throw new PublicError('session_proof_invalid', 403);
  }
  return proof;
}
function studyStatusAllowed(study: StudyRow): boolean {
  return study.study_kind === 'official' ? study.status === 'active' : study.status === 'pilot' || study.status === 'active';
}
async function fetchStudy(client: ReturnType<typeof admin>, studyId: string): Promise<StudyRow> {
  const { data, error } = await client.from('apulab_studies')
    .select('study_id,study_kind,status,study_build_version,expected_commit_sha,telemetry_schema_version,protocol_version')
    .eq('study_id', studyId).maybeSingle();
  if (error) throw new Error('study_lookup_failed');
  if (!data) throw new PublicError('study_not_found', 404);
  return data as StudyRow;
}
async function authFailureCount(client: ReturnType<typeof admin>, hash: string): Promise<{ count:number; cooldownUntil:string|null }> {
  const since = new Date(Date.now()-AUTH_WINDOW_MS).toISOString();
  const { data, error } = await client.from('apulab_auth_attempts')
    .select('attempted_at,cooldown_until')
    .eq('participant_code_hash', hash).eq('success', false).gte('attempted_at', since)
    .order('attempted_at', { ascending:false }).limit(AUTH_FAILURE_LIMIT);
  if (error) throw new Error('auth_attempt_lookup_failed');
  const rows = data ?? [];
  const cooldownUntil = rows.map((row:any) => row.cooldown_until).filter(Boolean).sort().at(-1) ?? null;
  return { count: rows.length, cooldownUntil };
}
async function recordAuthAttempt(client: ReturnType<typeof admin>, hash: string, success: boolean, priorFailures = 0): Promise<void> {
  const cooldown = !success && priorFailures + 1 >= AUTH_FAILURE_LIMIT ? new Date(Date.now()+AUTH_COOLDOWN_MS).toISOString() : null;
  const { error } = await client.from('apulab_auth_attempts').insert({ participant_code_hash:hash, success, cooldown_until:cooldown, client_context:{} });
  if (error) console.warn('[ApuLab ingest] auth attempt audit failed', error.code);
}
async function requireSyncToken(input: Record<string,unknown>, session: any): Promise<void> {
  const token = stringField(input.session_sync_token, 'session_sync_token', 256);
  if (token.length < 32 || !session.sync_token_hash || await sha256(token) !== session.sync_token_hash) throw new PublicError('session_sync_token_invalid', 403);
}
function validateEventForLevel(eventType: string, level: number | null): void {
  if (!EVENT_PATTERN.test(eventType)) throw new PublicError('event_type_not_allowed');
  if (COMMON_EVENTS.has(eventType)) return;
  if (level == null) throw new PublicError('event_level_required');
  if (!LEVEL_EVENTS[level]?.has(eventType)) throw new PublicError('event_level_mismatch');
}
function sameImmutableSession(existing: any, row: any): boolean {
  return existing.participant_id === row.participant_id
    && existing.study_id === row.study_id
    && existing.study_condition === row.study_condition
    && existing.session_mode === row.session_mode
    && existing.environment === row.environment
    && existing.build_version === row.build_version
    && existing.git_commit_sha === row.git_commit_sha
    && existing.schema_version === row.schema_version
    && existing.protocol_version === row.protocol_version
    && existing.sync_token_hash === row.sync_token_hash;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  if (!originAllowed(origin)) return json({ success:false, error:'origin_not_allowed' }, 403, origin);
  if (req.method === 'OPTIONS') return new Response(null, { status:204, headers:cors(origin) });
  if (req.method !== 'POST') return json({ success:false, error:'method_not_allowed' }, 405, origin);

  try {
    const url = new URL(req.url);
    const client = admin();

    if (url.pathname.endsWith('/authenticate')) {
      const input = await readBody(req);
      const code = normalizeCode(input.study_code);
      const credential = stringField(input.credential, 'credential', 256);
      const hash = await codeHash(code);
      const attempts = await authFailureCount(client, hash);
      if (attempts.cooldownUntil && Date.parse(attempts.cooldownUntil) > Date.now()) throw new PublicError('authentication_cooldown', 429);

      const { data:participant, error:participantError } = await client.from('apulab_participants')
        .select('participant_id,credential_hash,is_active').eq('participant_code_hash', hash).maybeSingle();
      if (participantError) throw new Error('participant_lookup_failed');
      const credentialValid = !!participant?.is_active && await verifyCredential(credential, participant.credential_hash);
      if (!participant || !credentialValid) {
        await recordAuthAttempt(client, hash, false, attempts.count);
        throw new PublicError('authentication_failed', 401);
      }

      const { data:assignment, error:assignmentError } = await client.from('apulab_study_assignments')
        .select('study_id,study_condition,is_active').eq('participant_id', participant.participant_id).eq('is_active', true).maybeSingle();
      if (assignmentError) throw new Error('assignment_lookup_failed');
      if (!assignment) {
        await recordAuthAttempt(client, hash, false, attempts.count);
        throw new PublicError('assignment_not_found', 403);
      }
      const study = await fetchStudy(client, assignment.study_id);
      if ((code.startsWith('QT-') && study.study_kind !== 'qa') || (code.startsWith('AP-') && study.study_kind !== 'official')) throw new PublicError('study_code_kind_mismatch', 403);
      if (!studyStatusAllowed(study)) throw new PublicError('study_not_active', 403);

      await recordAuthAttempt(client, hash, true);
      const proof = await issueProof({ participant_id:participant.participant_id, study_id:assignment.study_id, study_condition:assignment.study_condition });
      return json({ success:true, data:{ participant_id:participant.participant_id, study_id:assignment.study_id, study_condition:assignment.study_condition, session_proof:proof } }, 200, origin);
    }

    if (url.pathname.endsWith('/session/complete')) {
      const input = await readBody(req);
      const sessionId = stringField(input.session_id, 'session_id', 128);
      if (!UUID_PATTERN.test(sessionId)) throw new PublicError('session_id_invalid');
      const { data:session, error } = await client.from('apulab_sessions')
        .select('session_id,sync_token_hash,status').eq('session_id', sessionId).maybeSingle();
      if (error) throw new Error('session_lookup_failed');
      if (!session) throw new PublicError('session_not_found', 404);
      await requireSyncToken(input, session);
      if (session.status === 'completed') return json({ success:true }, 200, origin);

      const { data:events, error:eventError } = await client.from('apulab_events')
        .select('event_type,level_number').eq('session_id', sessionId)
        .in('event_type', ['data_sent','level_completed','session_completed']);
      if (eventError) throw new Error('completion_lookup_failed');
      const rows = events ?? [];
      const hasN7Complete = rows.some((event:any) => event.event_type === 'level_completed' && event.level_number === 7);
      const hasN7Data = rows.some((event:any) => event.event_type === 'data_sent' && event.level_number === 7);
      const hasSessionComplete = rows.some((event:any) => event.event_type === 'session_completed');
      if (!hasN7Complete || !hasN7Data || !hasSessionComplete) throw new PublicError('session_not_complete', 409);
      const { error:updateError } = await client.from('apulab_sessions')
        .update({ status:'completed', completed_at:new Date().toISOString(), last_level:7 })
        .eq('session_id', sessionId);
      if (updateError) throw new Error('session_complete_failed');
      return json({ success:true }, 200, origin);
    }

    if (url.pathname.endsWith('/session')) {
      const input = await readBody(req);
      const raw = (input.session && typeof input.session === 'object' && !Array.isArray(input.session) ? input.session : input) as Record<string,unknown>;
      const mode = stringField(raw.session_mode, 'session_mode', 16);
      if (mode !== 'demo' && mode !== 'study') throw new PublicError('session_mode_invalid');
      const sessionId = stringField(raw.session_id, 'session_id', 128);
      if (!UUID_PATTERN.test(sessionId)) throw new PublicError('session_id_invalid');
      const syncToken = stringField(input.session_sync_token, 'session_sync_token', 256);
      if (syncToken.length < 32) throw new PublicError('session_sync_token_invalid');
      const syncTokenHash = await sha256(syncToken);

      let participantId: string|null = null;
      let studyId: string|null = null;
      let studyCondition: StudyCondition|null = null;
      let environment = stringField(raw.environment, 'environment', 16);
      let buildVersion = stringField(raw.build_version, 'build_version', 64);
      let gitCommitSha = stringField(raw.git_commit_sha, 'git_commit_sha', 64);
      let schemaVersion = stringField(raw.schema_version, 'schema_version', 64);
      let protocolVersion = stringField(raw.protocol_version, 'protocol_version', 64);

      if (!['development','preview','study'].includes(environment)) throw new PublicError('environment_invalid');
      if (mode === 'study') {
        const proof = await readProof(input.session_proof);
        const study = await fetchStudy(client, proof.study_id);
        if (!studyStatusAllowed(study)) throw new PublicError('study_not_active', 403);
        if (study.expected_commit_sha === 'UNFROZEN') throw new PublicError('study_build_not_frozen', 409);
        const expectedEnvironment = study.study_kind === 'official' ? 'study' : 'preview';
        if (environment !== expectedEnvironment) throw new PublicError('study_environment_mismatch', 409);
        if (buildVersion !== study.study_build_version) throw new PublicError('study_build_mismatch', 409);
        if (gitCommitSha !== study.expected_commit_sha) throw new PublicError('study_commit_mismatch', 409);
        if (schemaVersion !== study.telemetry_schema_version) throw new PublicError('study_schema_mismatch', 409);
        if (protocolVersion !== study.protocol_version) throw new PublicError('study_protocol_mismatch', 409);
        participantId = proof.participant_id;
        studyId = proof.study_id;
        studyCondition = proof.study_condition;
        environment = expectedEnvironment;
        buildVersion = study.study_build_version;
        gitCommitSha = study.expected_commit_sha;
        schemaVersion = study.telemetry_schema_version;
        protocolVersion = study.protocol_version;
      }

      const row = {
        session_id:sessionId, participant_id:participantId, participant_code:null, study_id:studyId, study_condition:studyCondition,
        session_mode:mode, environment, build_version:buildVersion, git_commit_sha:gitCommitSha, schema_version:schemaVersion,
        protocol_version:protocolVersion, started_at:isoField(raw.started_at,'started_at'), completed_at:null, status:'in_progress',
        last_level:null, last_checkpoint:null, event_seq_last:0, sync_token_hash:syncTokenHash,
        screen_width:integerField(raw.screen_width,'screen_width',200,10000), screen_height:integerField(raw.screen_height,'screen_height',200,10000),
        input_mode:null, user_agent:'web',
      };
      const { error:insertError } = await client.from('apulab_sessions').insert(row);
      if (insertError) {
        if (insertError.code !== '23505') throw new Error('session_insert_failed');
        const { data:existing, error:existingError } = await client.from('apulab_sessions')
          .select('participant_id,study_id,study_condition,session_mode,environment,build_version,git_commit_sha,schema_version,protocol_version,sync_token_hash')
          .eq('session_id', sessionId).maybeSingle();
        if (existingError || !existing) throw new Error('session_conflict_lookup_failed');
        if (!sameImmutableSession(existing, row)) throw new PublicError('session_identity_conflict', 409);
      }
      return json({ success:true }, 200, origin);
    }

    if (url.pathname.endsWith('/events')) {
      const input = await readBody(req);
      if (!Array.isArray(input.events) || input.events.length < 1 || input.events.length > MAX_BATCH_SIZE) throw new PublicError('events_batch_invalid');
      const rawEvents = input.events as Record<string,unknown>[];
      const sessionIds = [...new Set(rawEvents.map((event) => stringField(event.session_id, 'session_id', 128)))];
      if (sessionIds.length !== 1) throw new PublicError('events_must_share_session');
      const sessionId = sessionIds[0];
      const { data:session, error:sessionError } = await client.from('apulab_sessions')
        .select('session_id,participant_id,study_id,study_condition,session_mode,environment,build_version,git_commit_sha,schema_version,protocol_version,sync_token_hash')
        .eq('session_id', sessionId).maybeSingle();
      if (sessionError) throw new Error('session_lookup_failed');
      if (!session) throw new PublicError('session_not_found', 404);
      await requireSyncToken(input, session);

      const receivedAt = new Date().toISOString();
      const rows = rawEvents.map((event) => {
        const eventType = stringField(event.event_type, 'event_type', 64);
        const eventId = stringField(event.event_id, 'event_id', 64);
        if (!UUID_PATTERN.test(eventId)) throw new PublicError('event_id_invalid');
        const level = event.level_number == null ? null : integerField(event.level_number, 'level_number', 1, 7);
        validateEventForLevel(eventType, level);
        return {
          event_id:eventId, session_id:sessionId, participant_id:session.participant_id, participant_code:null,
          study_id:session.study_id, study_condition:session.study_condition, session_mode:session.session_mode, environment:session.environment,
          build_version:session.build_version, git_commit_sha:session.git_commit_sha, schema_version:session.schema_version, protocol_version:session.protocol_version,
          scene_id:stringField(event.scene_id,'scene_id',64), level_number:level,
          task_id:event.task_id==null?null:stringField(event.task_id,'task_id',64), event_type:eventType,
          event_seq:integerField(event.event_seq,'event_seq',1), attempt_number:event.attempt_number==null?null:integerField(event.attempt_number,'attempt_number',1),
          elapsed_ms:event.elapsed_ms==null?null:integerField(event.elapsed_ms,'elapsed_ms',0), payload:safePayload(event.payload),
          result:event.result==null?null:stringField(event.result,'result',32), error_code:event.error_code==null?null:stringField(event.error_code,'error_code',64),
          hint_used:event.hint_used===true, client_timestamp:isoField(event.timestamp,'timestamp'), received_at:receivedAt, sync_status:'synced',
        };
      });

      const ids = rows.map((row) => row.event_id);
      const { data:existingRows, error:existingError } = await client.from('apulab_events')
        .select('event_id,session_id,event_seq,event_type').in('event_id', ids);
      if (existingError) throw new Error('event_conflict_lookup_failed');
      const existingMap = new Map((existingRows ?? []).map((row:any) => [row.event_id,row]));
      for (const row of rows) {
        const existing:any = existingMap.get(row.event_id);
        if (existing && (existing.session_id !== row.session_id || existing.event_seq !== row.event_seq || existing.event_type !== row.event_type)) {
          throw new PublicError('event_id_conflict', 409);
        }
      }
      const fresh = rows.filter((row) => !existingMap.has(row.event_id));
      if (fresh.length) {
        const { error:insertError } = await client.from('apulab_events').insert(fresh);
        if (insertError) {
          if (insertError.code === '23505') throw new PublicError('event_sequence_conflict', 409);
          throw new Error('event_insert_failed');
        }
      }
      const maxSeq = Math.max(...rows.map((row) => row.event_seq));
      await client.from('apulab_sessions').update({ event_seq_last:maxSeq }).eq('session_id', sessionId).lt('event_seq_last', maxSeq);
      return json({ success:true, accepted:rows.length }, 200, origin);
    }

    return json({ success:false, error:'endpoint_not_found' }, 404, origin);
  } catch (error) {
    if (error instanceof PublicError) return json({ success:false, error:error.code }, error.status, origin);
    console.error('[ApuLab ingest]', error instanceof Error ? error.message : 'internal_error');
    return json({ success:false, error:'internal_error' }, 500, origin);
  }
});
