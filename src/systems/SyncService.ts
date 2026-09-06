import { LocalQueueService } from './LocalQueueService';
import { GameState } from './GameState';
import { getResearchRepository } from './research/ResearchRepositoryProvider';
import { RESEARCH_CONFIG } from '../config/researchConfig';

const BATCH_SIZE = RESEARCH_CONFIG.maxBatchEvents;
const BASE_RETRY_MS = 5_000;
const MAX_RETRY_MS = 60_000;

export class SyncService {
  private static activePromise: Promise<void> | null = null;
  private static nextAttemptAt = 0;
  private static consecutiveFailures = 0;
  private static onlineListenerBound = false;

  static processQueue(): Promise<void> {
    this.bindOnlineRetry();
    // Callers that need a flush (notably session completion) must await the
    // same in-flight synchronization instead of returning early and racing it.
    if (this.activePromise) return this.activePromise;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return Promise.resolve();
    if (Date.now() < this.nextAttemptAt) return Promise.resolve();

    const operation = this.runQueue();
    this.activePromise = operation.finally(() => {
      if (this.activePromise === operation || this.activePromise != null) this.activePromise = null;
    });
    return this.activePromise;
  }

  private static async runQueue(): Promise<void> {
    try {
      const repository = getResearchRepository();
      const state = GameState.getInstance();

      // Re-read after each batch so events enqueued while a sync is running
      // (for example session_completed immediately after level_completed)
      // are included before an awaited flush resolves.
      while (true) {
        const pending = LocalQueueService.getEvents().filter((event) => event.sync_status !== 'synced');
        if (pending.length === 0) return;
        const batch = pending.slice(0, BATCH_SIZE);
        const result = await repository.saveEvents(batch, state.sessionProof);
        if (!result.success) {
          batch.forEach((event) => LocalQueueService.updateStatus(event.event_id, 'failed'));
          this.scheduleRetry();
          return;
        }
        LocalQueueService.removeEvents(batch.map((event) => event.event_id));
        this.consecutiveFailures = 0;
        this.nextAttemptAt = 0;
      }
    } catch (error) {
      this.scheduleRetry();
      console.warn('[ApuLab] Telemetry sync failed.', error);
    }
  }

  private static scheduleRetry(): void {
    this.consecutiveFailures += 1;
    this.nextAttemptAt = Date.now() + Math.min(MAX_RETRY_MS, BASE_RETRY_MS * (2 ** Math.min(4, this.consecutiveFailures - 1)));
  }

  private static bindOnlineRetry(): void {
    if (this.onlineListenerBound || typeof window === 'undefined') return;
    this.onlineListenerBound = true;
    window.addEventListener('online', () => {
      this.nextAttemptAt = 0;
      void this.processQueue();
    });
  }
}
