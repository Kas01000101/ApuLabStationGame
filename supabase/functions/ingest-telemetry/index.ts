import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MAX_BATCH_SIZE = 20;
const MAX_PAYLOAD_BYTES = 8192;
const MAX_REQUEST_BYTES = 128 * 1024;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SCENE_PATTERN = /^[a-z0-9_-]{2,64}$/;

const allowedEventTypes = new Set([
  'session_started',
  'checkpoint_reached',
  'measurement_taken',
  'answer_submitted',
  'hint_requested',
  'challenge_completed',
  'challenge_failed',
  'sync_success',
  'sync_failed',
  'game_completed',
]);

const forbiddenPayloadKeys = new Set([
  'name', 'first_name', 'last_name', 'email', 'phone', 'address',
  'document_id', 'birth_date', 'school', 'credential', 'password',
  'credential_hash', 'participant_code', 'audio', 'video', 'image',
  'screenshot', 'html', '__proto__', 'prototype', 'constructor',
]);

class PublicError extends Error {
  constructor(readonly code: string, readonly status = 400) {
    super(code);
  }
}

function allowedOrigins(): string[] {
  return (Deno.env.get('APULAB_ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true;
  return allowedOrigins().includes(origin);
}

function corsHeaders(origin: string | null): HeadersInit {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'content-type, authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '600',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Vary': 'Origin',
  };

  if (origin && isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function jsonResponse(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function byteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value ?? {})).length;
}

async function readJsonObject(req: Request): Promise<Record<string, unknown>> {
  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new PublicError('content_type_invalid', 415);
  }

  const declaredLength = Number(req.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    throw new PublicError('request_too_large', 413);
  }

  const text = await req.text();
  if (new TextEncoder().encode(text).length > MAX_REQUEST_BYTES) {
    throw new PublicError('request_too_large', 413);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new PublicError('json_invalid');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new PublicError('body_invalid');
  }
  return parsed as Record<string, unknown>;
}

function assertString(value: unknown, field: string, max: number, pattern?: RegExp): string {
  if (typeof value !== 'string') throw new PublicError(`${field}_invalid`);
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max || (pattern && !pattern.test(trimmed))) {
    throw new PublicError(`${field}_invalid`);
  }
  return trimmed;
}

function assertInteger(value: unknown, field: string, min: number, max: number): number {
  if (!Number.isInteger(value) || Number(value) < min || Number(value) > max) {
    throw new PublicError(`${field}_invalid`);
  }
  return Number(value);
}

function assertIsoTimestamp(value: unknown, field: string): string {
  const text = assertString(value, field, 64);
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) throw new PublicError(`${field}_invalid`);
  return new Date(parsed).toISOString();
}

function safePayload(payload: unknown): Record<string, unknown> {
  if (payload == null) return {};
  if (typeof payload !== 'object' || Array.isArray(payload)) throw new PublicError('payload_invalid');
  if (byteLength(payload) > MAX_PAYLOAD_BYTES) throw new PublicError('payload_too_large', 413);

  const stack: unknown[] = [payload];
  while (stack.length > 0) {
    const current = stack.pop();
    if (Array.isArray(current)) {
      stack.push(...current);
      continue;
    }
    if (!current || typeof current !== 'object') continue;

    for (const [key, value] of Object.entries(current as Record<string, unknown>)) {
      if (forbiddenPayloadKeys.has(key.toLowerCase())) throw new PublicError('payload_forbidden_field');
      if (value && typeof value === 'object') stack.push(value);
    }
  }
  return payload as Record<string, unknown>;
}

function normalizeDemoSession(input: Record<string, unknown>): Record<string, unknown> {
  const mode = assertString(input.session_mode, 'session_mode', 16);
  if (mode !== 'demo') {
    // STUDY remains unavailable until /authenticate issues a verifiable server-side session proof.
    throw new PublicError('study_session_not_authorized', 403);
  }

  const status = input.status == null ? 'in_progress' : assertString(input.status, 'status', 32);
  if (status !== 'in_progress') throw new PublicError('status_invalid');

  return {
    session_id: assertString(input.session_id, 'session_id', 128, UUID_PATTERN),
    participant_id: null,
    participant_code: null,
    session_mode: 'demo',
    build_version: assertString(input.build_version, 'build_version', 32),
    game_version: assertString(input.build_version, 'build_version', 32),
    schema_version: assertString(input.schema_version, 'schema_version', 32),
    started_at: assertIsoTimestamp(input.started_at, 'started_at'),
    completed_at: null,
    status: 'in_progress',
    screen_width: assertInteger(input.screen_width, 'screen_width', 200, 10000),
    screen_height: assertInteger(input.screen_height, 'screen_height', 200, 10000),
    user_agent: 'web',
  };
}

type StoredSession = {
  session_id: string;
  participant_id: string | null;
  session_mode: 'study' | 'demo';
  build_version: string;
  schema_version: string;
};

function getAdminClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRole) throw new Error('supabase_server_configuration_missing');
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

serve(async (req) => {
  const origin = req.headers.get('origin');

  if (!isOriginAllowed(origin)) {
    return jsonResponse({ error: 'origin_not_allowed' }, 403, origin);
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, origin);
  }

  try {
    const url = new URL(req.url);

    if (url.pathname.endsWith('/authenticate')) {
      // Deliberately fail closed. Never implement participant auth in the browser.
      return jsonResponse({ success: false, error: 'participant_auth_not_configured' }, 503, origin);
    }

    const client = getAdminClient();

    if (url.pathname.endsWith('/session')) {
      const input = await readJsonObject(req);
      const session = normalizeDemoSession(input);
      const { error } = await client
        .from('apulab_sessions')
        .upsert(session, { onConflict: 'session_id' });

      if (error) {
        console.error('[ApuLab ingest] session upsert failed', error.code);
        throw new Error('session_upsert_failed');
      }
      return jsonResponse({ success: true }, 200, origin);
    }

    if (url.pathname.endsWith('/events')) {
      const body = await readJsonObject(req);
      if (!Array.isArray(body.events) || body.events.length === 0 || body.events.length > MAX_BATCH_SIZE) {
        throw new PublicError('events_batch_invalid');
      }

      const inputEvents = body.events.map((value) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
          throw new PublicError('event_invalid');
        }
        return value as Record<string, unknown>;
      });

      const sessionIds = [...new Set(inputEvents.map((event) =>
        assertString(event.session_id, 'session_id', 128, UUID_PATTERN)
      ))];

      const { data: sessionRows, error: sessionError } = await client
        .from('apulab_sessions')
        .select('session_id,participant_id,session_mode,build_version,schema_version')
        .in('session_id', sessionIds);

      if (sessionError) {
        console.error('[ApuLab ingest] session lookup failed', sessionError.code);
        throw new Error('session_lookup_failed');
      }

      const sessionMap = new Map(
        ((sessionRows ?? []) as StoredSession[]).map((session) => [session.session_id, session]),
      );
      if (sessionMap.size !== sessionIds.length) throw new PublicError('session_not_found', 404);

      const receivedAt = new Date().toISOString();
      const events = inputEvents.map((event) => {
        const eventType = assertString(event.event_type, 'event_type', 64, /^[a-z0-9_]{3,64}$/);
        if (!allowedEventTypes.has(eventType)) throw new PublicError('event_type_not_allowed');

        const sessionId = assertString(event.session_id, 'session_id', 128, UUID_PATTERN);
        const session = sessionMap.get(sessionId);
        if (!session) throw new PublicError('session_not_found', 404);

        return {
          event_id: assertString(event.event_id, 'event_id', 128, UUID_PATTERN),
          session_id: sessionId,
          participant_id: session.participant_id,
          participant_code: null,
          session_mode: session.session_mode,
          build_version: session.build_version,
          schema_version: session.schema_version,
          scene_id: assertString(event.scene_id, 'scene_id', 64, SCENE_PATTERN),
          challenge_id: null,
          event_type: eventType,
          attempt_number: null,
          payload: safePayload(event.payload),
          result: null,
          error_code: null,
          hint_used: false,
          duration_seconds: null,
          timestamp: assertIsoTimestamp(event.timestamp, 'timestamp'),
          client_timestamp: assertIsoTimestamp(event.timestamp, 'timestamp'),
          received_at: receivedAt,
          sync_status: 'synced',
        };
      });

      const { error } = await client
        .from('apulab_events')
        .upsert(events, { onConflict: 'event_id' });

      if (error) {
        console.error('[ApuLab ingest] event upsert failed', error.code);
        throw new Error('event_upsert_failed');
      }
      return jsonResponse({ success: true, accepted: events.length }, 200, origin);
    }

    return jsonResponse({ error: 'endpoint_not_found' }, 404, origin);
  } catch (error) {
    if (error instanceof PublicError) {
      return jsonResponse({ error: error.code }, error.status, origin);
    }

    console.error('[ApuLab ingest] internal error', error instanceof Error ? error.message : 'unknown_error');
    return jsonResponse({ error: 'internal_error' }, 500, origin);
  }
});
