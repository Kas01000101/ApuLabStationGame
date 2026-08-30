export type QueueEvent = {
  event_id: string;
  session_id: string;
  scene_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  sync_status: 'pending' | 'synced' | 'failed';
  timestamp: string;
};

const KEY = 'apulab_telemetry_events';
const MAX_PAYLOAD_BYTES = 8192;
const MAX_QUEUE_EVENTS = 500;

const FORBIDDEN_KEYS = new Set([
  'name', 'first_name', 'last_name', 'email', 'phone', 'address',
  'document_id', 'birth_date', 'school', 'credential', 'password',
  'credential_hash', 'participant_code', 'audio', 'video', 'image',
  'screenshot', 'html', '__proto__', 'prototype', 'constructor',
]);

export class LocalQueueService {
  static getEvents(): QueueEvent[] {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isQueueEvent);
    } catch {
      return [];
    }
  }

  static addEvent(event: QueueEvent): void {
    const safeEvent: QueueEvent = {
      ...event,
      payload: validateSafePayload(event.payload),
    };

    const current = this.getEvents();
    const withoutDuplicate = current.filter((item) => item.event_id !== safeEvent.event_id);
    let next = [...withoutDuplicate, safeEvent];

    if (next.length > MAX_QUEUE_EVENTS) {
      // Prefer removing old, already-synced events. Never silently discard pending research data.
      const pending = next.filter((item) => item.sync_status !== 'synced');
      const synced = next.filter((item) => item.sync_status === 'synced');
      const roomForSynced = Math.max(0, MAX_QUEUE_EVENTS - pending.length);
      next = [...synced.slice(-roomForSynced), ...pending].slice(-Math.max(MAX_QUEUE_EVENTS, pending.length));
    }

    this.write(next);
  }

  static updateStatus(id: string, status: QueueEvent['sync_status']): void {
    this.write(this.getEvents().map((event) => event.event_id === id ? { ...event, sync_status: status } : event));
  }

  static removeEvents(ids: Iterable<string>): void {
    const idSet = new Set(ids);
    this.write(this.getEvents().filter((event) => !idSet.has(event.event_id)));
  }

  private static write(events: QueueEvent[]): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(events));
    } catch (error) {
      console.warn('[ApuLab] Could not persist the local telemetry queue.', error);
    }
  }
}

function validateSafePayload(payload: Record<string, unknown>): Record<string, unknown> {
  if (byteLength(payload) > MAX_PAYLOAD_BYTES) throw new Error('telemetry_payload_too_large');

  const stack: unknown[] = [payload];
  while (stack.length > 0) {
    const current = stack.pop();
    if (Array.isArray(current)) {
      stack.push(...current);
      continue;
    }
    if (!current || typeof current !== 'object') continue;

    for (const [key, value] of Object.entries(current as Record<string, unknown>)) {
      if (FORBIDDEN_KEYS.has(key.toLowerCase())) throw new Error('telemetry_payload_forbidden_field');
      if (value && typeof value === 'object') stack.push(value);
    }
  }

  return payload;
}

function byteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value ?? {})).length;
}

function isQueueEvent(value: unknown): value is QueueEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Partial<QueueEvent>;
  return typeof event.event_id === 'string'
    && typeof event.session_id === 'string'
    && typeof event.scene_id === 'string'
    && typeof event.event_type === 'string'
    && !!event.payload
    && typeof event.payload === 'object'
    && !Array.isArray(event.payload)
    && (event.sync_status === 'pending' || event.sync_status === 'synced' || event.sync_status === 'failed')
    && typeof event.timestamp === 'string';
}
