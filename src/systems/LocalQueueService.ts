export type QueueEvent = { event_id: string; session_id: string; event_type: string; payload: Record<string, unknown>; sync_status: 'pending' | 'synced' | 'failed'; timestamp: string };
const KEY = 'apulab_telemetry_events';
export class LocalQueueService {
  static getEvents(): QueueEvent[] { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; } }
  static addEvent(event: QueueEvent): void { localStorage.setItem(KEY, JSON.stringify([...this.getEvents(), event])); }
  static updateStatus(id: string, status: QueueEvent['sync_status']): void { localStorage.setItem(KEY, JSON.stringify(this.getEvents().map(e => e.event_id === id ? { ...e, sync_status: status } : e))); }
}
