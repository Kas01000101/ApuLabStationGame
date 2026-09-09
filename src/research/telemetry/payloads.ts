export type TelemetryPayload = Record<string, unknown>;

const FORBIDDEN_KEYS = new Set([
  'name','first_name','last_name','email','phone','address','dni','document_id',
  'birth_date','school','parent_name','credential','password','participant_code',
  'study_code','credential_hash','audio','video','image','screenshot','html',
  '__proto__','prototype','constructor',
]);

export function sanitizeTelemetryPayload(payload: TelemetryPayload, maxBytes = 8192): TelemetryPayload {
  const bytes = new TextEncoder().encode(JSON.stringify(payload ?? {})).length;
  if (bytes > maxBytes) throw new Error('telemetry_payload_too_large');
  const stack: unknown[] = [payload];
  while (stack.length) {
    const current = stack.pop();
    if (Array.isArray(current)) { stack.push(...current); continue; }
    if (!current || typeof current !== 'object') continue;
    for (const [key,value] of Object.entries(current as Record<string,unknown>)) {
      if (FORBIDDEN_KEYS.has(key.toLowerCase())) throw new Error('telemetry_payload_forbidden_field');
      if (value && typeof value === 'object') stack.push(value);
    }
  }
  return payload;
}
