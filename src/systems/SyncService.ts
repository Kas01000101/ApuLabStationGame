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
  private static rerunRequested = false;
  private static readonly retryBySession = new Map<string, RetryState>();
  private static listenersBound = false;

  /**
   * Drain semantics:
   * - only one sync operation may own the queue at a time;
   * - events recorded while a sync is already active request another drain;
   * - callers awaiting the active promise also wait for that follow-up drain.
   *
   * This prevents the classic race where event 1 starts sync, events 2..N are
   * appended after the pending-session snapshot was taken, and no later
   * lifecycle trigger arrives to flush them.
   */
  static processQueue(): Promise<void> {
    this.bindRetryListeners();

    if (this.activePromise) {
      this.rerunRequested = true;
      return this.activePromise;
    }
    if (!this.isOnline()) return Promise.resolve();

    this.rerunRequested = false;
    const operation = this.drainUntilStable();
    const wrapped = operation.finally(async () => {
      // A recordEvent() can race with the last loop check. Release ownership,
      // then honor that late request before resolving the promise seen by the
      // original caller.
      const rerun = this.rerunRequested;
      this.activePromise = null;
      if (rerun && this.isOnline()) {
        this.rerunRequested = false;
        await this.processQueue();
      }
    });
    this.activePromise = wrapped;
    return wrapped;
  }

  /** Test/lifecycle-safe explicit flush. It exposes no credentials and simply
   * waits for the same serialized drain used in production. */
  static async flush(): Promise<void> {
    await this.processQueue();
    while (this.activePromise) await this.activePromise;
  }

  static async syncSession(sessionId: string): Promise<void> {
    if (!this.isOnline()) return;
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
        // Completion is the lifecycle boundary at which the per-session sync
        // capability may be released. Never remove it after an intermediate
        // empty drain: more events from the same in-progress session can arrive
        // milliseconds later and still require the same token.
        LocalQueueService.markCompletionSynced(sessionId);
        const state = GameState.getInstance();
        if (state.sessionId === sessionId && state.status === 'completed_pending_sync') state.status = 'completed';
      }

      this.clearRetry(sessionId);
    } catch (error) {
      this.scheduleRetry(sessionId);
      console.warn('[ApuLab] Telemetry sync failed for one session.', sessionId, error);
    }
  }

  private static async drainUntilStable(): Promise<void> {
    do {
      this.rerunRequested = false;
      await this.runAllPendingSessions();
      // Let recordEvent() microtasks queued by completion/bridge callbacks run
      // before deciding that the drain is stable.
      await Promise.resolve();
    } while (this.rerunRequested && this.isOnline());
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

  private static isOnline(): boolean {
    return typeof navigator === 'undefined' || navigator.onLine !== false;
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
