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

export type SessionSyncContext = {
  session_id: string;
  sync_token: string;
  study_id: string | null;
  saved_at: string;
};

export type PendingCompletion = {
  session_id: string;
  status: 'pending' | 'failed';
  updated_at: string;
};

export type StorageHealth = {
  degraded: boolean;
  reason: string | null;
  updated_at: string | null;
};

const EVENT_KEY = 'apulab_telemetry_events_v2';
const CONTEXT_KEY = 'apulab_telemetry_session_context_v2';
const COMPLETION_KEY = 'apulab_telemetry_completion_v2';
const HEALTH_KEY = 'apulab_telemetry_storage_health_v2';
const MAX_QUEUE_EVENTS = 2000;

export class LocalQueueService {
  static getEvents(): QueueEvent[] {
    const parsed = this.readJson<unknown>(EVENT_KEY, []);
    return Array.isArray(parsed)
      ? parsed.filter(isQueueEvent).sort((a,b) => a.session_id.localeCompare(b.session_id) || a.event_seq-b.event_seq)
      : [];
  }

  static getEventsBySession(sessionId: string): QueueEvent[] {
    return this.getEvents().filter((event) => event.session_id === sessionId && event.sync_status !== 'synced');
  }

  static getPendingSessions(): string[] {
    const ids = new Set<string>();
    for (const event of this.getEvents()) if (event.sync_status !== 'synced') ids.add(event.session_id);
    for (const completion of this.getPendingCompletions()) ids.add(completion.session_id);
    return [...ids].sort();
  }

  static addEvent(event: QueueEvent): void {
    const safeEvent: QueueEvent = { ...event, payload: sanitizeTelemetryPayload(event.payload, RESEARCH_CONFIG.maxPayloadBytes) };
    const byId = new Map(this.getEvents().map((item) => [item.event_id, item]));
    byId.set(safeEvent.event_id, safeEvent);
    let next = [...byId.values()].sort((a,b) => a.session_id.localeCompare(b.session_id) || a.event_seq-b.event_seq);

    if (next.length > MAX_QUEUE_EVENTS) {
      const unsynced = next.filter((item) => item.sync_status !== 'synced');
      const synced = next.filter((item) => item.sync_status === 'synced');
      const syncedAllowance = Math.max(0, MAX_QUEUE_EVENTS - unsynced.length);
      next = [...synced.slice(-syncedAllowance), ...unsynced]
        .sort((a,b) => a.session_id.localeCompare(b.session_id) || a.event_seq-b.event_seq);
    }
    this.writeJson(EVENT_KEY, next);
  }

  static updateStatus(id: string, status: QueueEvent['sync_status']): void {
    this.writeJson(EVENT_KEY, this.getEvents().map((event) => event.event_id === id ? { ...event, sync_status: status } : event));
  }

  static removeEvents(ids: Iterable<string>): void {
    const idSet = new Set(ids);
    this.writeJson(EVENT_KEY, this.getEvents().filter((event) => !idSet.has(event.event_id)));
  }

  static registerSessionContext(context: SessionSyncContext): void {
    const contexts = this.getSessionContexts();
    contexts[context.session_id] = context;
    this.writeJson(CONTEXT_KEY, contexts);
  }

  static getSessionContext(sessionId: string): SessionSyncContext | null {
    return this.getSessionContexts()[sessionId] ?? null;
  }

  static removeSessionContextIfSettled(sessionId: string): void {
    if (this.getEventsBySession(sessionId).length || this.getPendingCompletion(sessionId)) return;
    const contexts = this.getSessionContexts();
    if (!(sessionId in contexts)) return;
    delete contexts[sessionId];
    this.writeJson(CONTEXT_KEY, contexts);
  }

  static markCompletionPending(sessionId: string): void {
    const completions = this.getCompletionMap();
    completions[sessionId] = { session_id: sessionId, status: 'pending', updated_at: new Date().toISOString() };
    this.writeJson(COMPLETION_KEY, completions);
  }

  static markCompletionFailed(sessionId: string): void {
    const completions = this.getCompletionMap();
    completions[sessionId] = { session_id: sessionId, status: 'failed', updated_at: new Date().toISOString() };
    this.writeJson(COMPLETION_KEY, completions);
  }

  static markCompletionSynced(sessionId: string): void {
    const completions = this.getCompletionMap();
    delete completions[sessionId];
    this.writeJson(COMPLETION_KEY, completions);
    this.removeSessionContextIfSettled(sessionId);
  }

  static getPendingCompletion(sessionId: string): PendingCompletion | null {
    return this.getCompletionMap()[sessionId] ?? null;
  }

  static getPendingCompletions(): PendingCompletion[] {
    return Object.values(this.getCompletionMap());
  }

  static hasUnrecoverablePendingSession(currentSessionId?: string): boolean {
    return this.getPendingSessions().some((sessionId) => sessionId !== currentSessionId && !this.getSessionContext(sessionId));
  }

  static getStorageHealth(): StorageHealth {
    const value = this.readJson<StorageHealth | null>(HEALTH_KEY, null);
    return value && typeof value === 'object'
      ? value
      : { degraded: false, reason: null, updated_at: null };
  }

  static clearStorageDegraded(): void {
    try { localStorage.removeItem(HEALTH_KEY); } catch { /* diagnostics only */ }
    if (typeof document !== 'undefined') delete document.documentElement.dataset.apulabResearchStorage;
  }

  private static getSessionContexts(): Record<string, SessionSyncContext> {
    const value = this.readJson<unknown>(CONTEXT_KEY, {});
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string,SessionSyncContext> : {};
  }

  private static getCompletionMap(): Record<string, PendingCompletion> {
    const value = this.readJson<unknown>(COMPLETION_KEY, {});
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string,PendingCompletion> : {};
  }

  private static readJson<T>(key: string, fallback: T): T {
    try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; }
    catch { return fallback; }
  }

  private static writeJson(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      const quota = error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');
      const reason = quota ? 'quota_exceeded' : 'storage_write_failed';
      try { localStorage.setItem(HEALTH_KEY, JSON.stringify({ degraded: true, reason, updated_at: new Date().toISOString() })); } catch { /* best effort */ }
      if (typeof document !== 'undefined') document.documentElement.dataset.apulabResearchStorage = 'degraded';
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('apulab-research-storage-degraded', { detail: { reason } }));
      throw new Error(`research_storage_${reason}`, { cause: error });
    }
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
