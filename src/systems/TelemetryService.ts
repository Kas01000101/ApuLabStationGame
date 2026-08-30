import { GameState } from './GameState';
import { LocalQueueService } from './LocalQueueService';
import { SyncService } from './SyncService';
export class TelemetryService {
  private static instance?: TelemetryService;
  static getInstance(): TelemetryService { return this.instance ??= new TelemetryService(); }
  recordEvent(eventType: string, payload: Record<string, unknown> = {}): void {
    const state = GameState.getInstance();
    LocalQueueService.addEvent({ event_id: crypto.randomUUID(), session_id: state.sessionId, event_type: eventType, payload, sync_status: 'pending', timestamp: new Date().toISOString() });
    void SyncService.processQueue();
  }
}
