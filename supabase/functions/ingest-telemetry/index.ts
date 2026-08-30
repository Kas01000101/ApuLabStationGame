import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MAX_BATCH_SIZE = 20;
const MAX_PAYLOAD_BYTES = 8192;

const allowedEventTypes = new Set([
  'session_started', 'checkpoint_reached', 'measurement_taken',
  'answer_submitted', 'hint_requested', 'challenge_completed',
  'challenge_failed', 'sync_success', 'sync_failed', 'game_completed'
]);

const forbiddenPayloadKeys = new Set([
  'name','first_name','last_name','email','phone','address','document_id',
  'birth_date','school','credential','password','credential_hash','audio',
  'video','image','screenshot','html'
]);

function cors(origin: string | null): HeadersInit {
  const allowed = (Deno.env.get('APULAB_ALLOWED_ORIGINS') ?? '').split(',').map(v => v.trim()).filter(Boolean);
  const resolved = origin && allowed.includes(origin) ? origin : allowed[0] ?? '';
  return {
    'Access-Control-Allow-Origin': resolved,
    'Access-Control-Allow-Headers': 'content-type, authorization',
    'Vary': 'Origin'
  };
}

function response(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(origin), 'Content-Type': 'application/json' } });
}

function byteLength(value: unknown): number { return new TextEncoder().encode(JSON.stringify(value ?? {})).length; }

function safePayload(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {};
  if (byteLength(payload) > MAX_PAYLOAD_BYTES) throw new Error('payload_too_large');
  const stack = [payload as Record<string, unknown>];
  while (stack.length) {
    const current = stack.pop()!;
    for (const [key, value] of Object.entries(current)) {
      if (forbiddenPayloadKeys.has(key.toLowerCase())) throw new Error('payload_forbidden_field');
      if (value && typeof value === 'object' && !Array.isArray(value)) stack.push(value as Record<string, unknown>);
    }
  }
  return payload as Record<string, unknown>;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) });
  if (req.method !== 'POST') return response({ error: 'method_not_allowed' }, 405, origin);

  try {
    const url = new URL(req.url);
    const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    if (url.pathname.endsWith('/authenticate')) {
      // Fail closed until server-side hashing + rate limiting + participant lookup is implemented.
      return response({ success: false, error: 'participant_auth_not_configured' }, 503, origin);
    }

    if (url.pathname.endsWith('/session')) {
      const body = await req.json();
      if (body.session_mode === 'demo') body.participant_id = null;
      if (body.session_mode === 'study' && !body.participant_id) throw new Error('study_requires_participant_id');
      delete body.participant_code;
      const { error } = await client.from('apulab_sessions').upsert(body, { onConflict: 'session_id' });
      if (error) throw error;
      return response({ success: true }, 200, origin);
    }

    if (url.pathname.endsWith('/events')) {
      const body = await req.json();
      if (!Array.isArray(body.events) || body.events.length > MAX_BATCH_SIZE) throw new Error('events_batch_invalid');
      const events = body.events.map((e: Record<string, unknown>) => {
        if (!allowedEventTypes.has(String(e.event_type))) throw new Error('event_type_not_allowed');
        return { ...e, participant_code: null, payload: safePayload(e.payload), sync_status: 'synced', received_at: new Date().toISOString() };
      });
      const { error } = await client.from('apulab_events').upsert(events, { onConflict: 'event_id' });
      if (error) throw error;
      return response({ success: true, accepted: events.length }, 200, origin);
    }

    return response({ error: 'endpoint_not_found' }, 404, origin);
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : 'unknown_error' }, 400, origin);
  }
});
