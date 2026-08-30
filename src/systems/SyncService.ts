import { LocalQueueService } from './LocalQueueService';
import { getResearchRepository } from './research/ResearchRepositoryProvider';

const BATCH_SIZE = 20;
const BASE_RETRY_MS = 5_000;
const MAX_RETRY_MS = 60_000;

export class SyncService {
  private static syncing = false;
  private static nextAttemptAt = 0;
  private static consecutiveFailures = 0;
  private static onlineListenerBound = false;

  static async processQueue(): Promise<void> {
    this.bindOnlineRetry();

    if (this.syncing) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    if (Date.now() < this.nextAttemptAt) return;

    this.syncing = true;
    try {
      const repository = getResearchRepository();
      const pending = LocalQueueService.getEvents().filter((event) => event.sync_status !== 'synced');
      if (pending.length === 0) return;

      for (let index = 0; index < pending.length; index += BATCH_SIZE) {
        const batch = pending.slice(index, index + BATCH_SIZE);
        const result = await repository.saveEvents(batch);

        if (!result.success) {
          batch.forEach((event) => LocalQueueService.updateStatus(event.event_id, 'failed'));
          this.consecutiveFailures += 1;
          const retryMs = Math.min(MAX_RETRY_MS, BASE_RETRY_MS * (2 ** Math.min(4, this.consecutiveFailures - 1)));
          this.nextAttemptAt = Date.now() + retryMs;
          return;
        }

        // Once the backend has acknowledged the idempotent event IDs, remove the local copy.
        // This minimizes local retention while keeping offline-first behavior for unsynced data.
        LocalQueueService.removeEvents(batch.map((event) => event.event_id));
        this.consecutiveFailures = 0;
        this.nextAttemptAt = 0;
      }
    } catch (error) {
      this.consecutiveFailures += 1;
      this.nextAttemptAt = Date.now() + Math.min(MAX_RETRY_MS, BASE_RETRY_MS * (2 ** Math.min(4, this.consecutiveFailures - 1)));
      console.warn('[ApuLab] Telemetry sync failed.', error);
    } finally {
      this.syncing = false;
    }
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
