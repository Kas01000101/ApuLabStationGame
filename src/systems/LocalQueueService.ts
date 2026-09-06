import { RESEARCH_CONFIG } from '../config/researchConfig';
import type { ResearchEventType } from '../research/telemetry/events';
import { sanitizeTelemetryPayload, type TelemetryPayload } from '../research/telemetry/payloads';

export type QueueEvent = {
  event_id: string;
  session_id: string;
  event_seq: number;
  scene_id: string;
  level_number: number | null;
  task_id: string | null;
  event_type: ResearchEventType;
  attempt_number: number | null;
  elapsed_ms: number | null;
  payload: TelemetryPayload;
  result: string | null;
  error_code: string | null;
  hint_used: boolean;
  timestamp: string;
  sync_status: 'pending' | 'synced' | 'failed';
};

const KEY = 'apulab_telemetry_events_v2';
const MAX_QUEUE_EVENTS = 2000;

export class LocalQueueService {
  static getEvents(): QueueEvent[] {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
      return Array.isArray(parsed) ? parsed.filter(isQueueEvent) : [];
    } catch { return []; }
  }

  static addEvent(event: QueueEvent): void {
    const safeEvent: QueueEvent = { ...event, payload: sanitizeTelemetryPayload(event.payload, RESEARCH_CONFIG.maxPayloadBytes) };
    const byId = new Map(this.getEvents().map((item) => [item.event_id, item]));
    byId.set(safeEvent.event_id, safeEvent);
    let next = [...byId.values()].sort((a,b) => a.event_seq - b.event_seq);

    if (next.length > MAX_QUEUE_EVENTS) {
      const unsynced = next.filter((item) => item.sync_status !== 'synced');
      const synced = next.filter((item) => item.sync_status === 'synced');
      const syncedAllowance = Math.max(0, MAX_QUEUE_EVENTS - unsynced.length);
      next = [...synced.slice(-syncedAllowance), ...unsynced].sort((a,b) => a.event_seq - b.event_seq);
      // Research events are never silently discarded merely to satisfy the soft queue cap.
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
    try { localStorage.setItem(KEY, JSON.stringify(events)); }
    catch (error) { console.warn('[ApuLab] Could not persist telemetry queue.', error); }
  }
}

function isQueueEvent(value: unknown): value is QueueEvent {
  if (!value || typeof value !== 'object') return false;
  const e = value as Partial<QueueEvent>;
  return typeof e.event_id === 'string' && typeof e.session_id === 'string'
    && Number.isInteger(e.event_seq) && Number(e.event_seq) >= 1
    && typeof e.scene_id === 'string' && typeof e.event_type === 'string'
    && !!e.payload && typeof e.payload === 'object' && !Array.isArray(e.payload)
    && (e.sync_status === 'pending' || e.sync_status === 'synced' || e.sync_status === 'failed')
    && typeof e.timestamp === 'string';
}
