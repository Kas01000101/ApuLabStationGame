import { LocalQueueService } from './LocalQueueService';
import { GameState } from './GameState';
import { getResearchRepository } from './research/ResearchRepositoryProvider';
import { RESEARCH_CONFIG } from '../config/researchConfig';

const BATCH_SIZE = RESEARCH_CONFIG.maxBatchEvents;
const BASE_RETRY_MS = 5_000;
const MAX_RETRY_MS = 60_000;

type RetryState = { failures: number; nextAttemptAt: number };

export class SyncService {
  private static activePromise: Promise<void> | null = null;
  private static readonly retryBySession = new Map<string, RetryState>();
  private static listenersBound = false;

  static processQueue(): Promise<void> {
    this.bindRetryListeners();
    if (this.activePromise) return this.activePromise;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return Promise.resolve();

    const operation = this.runAllPendingSessions();
    this.activePromise = operation.finally(() => { this.activePromise = null; });
    return this.activePromise;
  }

  static async syncSession(sessionId: string): Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    const retry = this.retryBySession.get(sessionId);
    if (retry && Date.now() < retry.nextAttemptAt) return;

    const context = LocalQueueService.getSessionContext(sessionId);
    if (!context) {
      console.warn('[ApuLab] Pending research data has no recoverable session sync context.', sessionId);
      return;
    }

    const repository = getResearchRepository();
    try {
      while (true) {
        const pending = LocalQueueService.getEventsBySession(sessionId);
        if (!pending.length) break;
        const batch = pending.slice(0, BATCH_SIZE);
        const result = await repository.saveEvents(batch, context.sync_token);
        if (!result.success) {
          for (const event of batch) LocalQueueService.updateStatus(event.event_id, 'failed');
          this.scheduleRetry(sessionId);
          return;
        }
        LocalQueueService.removeEvents(batch.map((event) => event.event_id));
        this.clearRetry(sessionId);
      }

      const completion = LocalQueueService.getPendingCompletion(sessionId);
      if (completion && repository.completeSession) {
        const result = await repository.completeSession(sessionId, context.sync_token);
        if (!result.success) {
          LocalQueueService.markCompletionFailed(sessionId);
          this.scheduleRetry(sessionId);
          return;
        }
        LocalQueueService.markCompletionSynced(sessionId);
        const state = GameState.getInstance();
        if (state.sessionId === sessionId && state.status === 'completed_pending_sync') state.status = 'completed';
      }

      this.clearRetry(sessionId);
      LocalQueueService.removeSessionContextIfSettled(sessionId);
    } catch (error) {
      this.scheduleRetry(sessionId);
      console.warn('[ApuLab] Telemetry sync failed for one session.', sessionId, error);
    }
  }

  private static async runAllPendingSessions(): Promise<void> {
    for (const sessionId of LocalQueueService.getPendingSessions()) {
      await this.syncSession(sessionId);
    }
  }

  private static scheduleRetry(sessionId: string): void {
    const previous = this.retryBySession.get(sessionId) ?? { failures: 0, nextAttemptAt: 0 };
    const failures = previous.failures + 1;
    const delay = Math.min(MAX_RETRY_MS, BASE_RETRY_MS * (2 ** Math.min(4, failures - 1)));
    this.retryBySession.set(sessionId, { failures, nextAttemptAt: Date.now() + delay });
  }

  private static clearRetry(sessionId: string): void {
    this.retryBySession.delete(sessionId);
  }

  private static bindRetryListeners(): void {
    if (this.listenersBound || typeof window === 'undefined') return;
    this.listenersBound = true;
    window.addEventListener('online', () => {
      this.retryBySession.clear();
      void this.processQueue();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void this.processQueue();
    });
  }
}
