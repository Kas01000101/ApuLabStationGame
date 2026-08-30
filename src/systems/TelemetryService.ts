import { GameState } from './GameState';
import { LocalQueueService } from './LocalQueueService';
import { SyncService } from './SyncService';

const EVENT_TYPE_PATTERN = /^[a-z0-9_]{3,64}$/;

export class TelemetryService {
  private static instance?: TelemetryService;

  static getInstance(): TelemetryService {
    return this.instance ??= new TelemetryService();
  }

  recordEvent(eventType: string, payload: Record<string, unknown> = {}): void {
    if (!EVENT_TYPE_PATTERN.test(eventType)) throw new Error('telemetry_event_type_invalid');

    const state = GameState.getInstance();
    LocalQueueService.addEvent({
      event_id: crypto.randomUUID(),
      session_id: state.sessionId,
      scene_id: state.currentScene,
      event_type: eventType,
      payload,
      sync_status: 'pending',
      timestamp: new Date().toISOString(),
    });

    void SyncService.processQueue();
  }
}
