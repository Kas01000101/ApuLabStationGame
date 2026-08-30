import { LocalQueueService } from './LocalQueueService';
import { getResearchRepository } from './research/ResearchRepositoryProvider';
export class SyncService {
  private static syncing = false;
  static async processQueue(): Promise<void> {
    if (this.syncing) return;
    this.syncing = true;
    try {
      const pending = LocalQueueService.getEvents().filter(e => e.sync_status !== 'synced');
      if (!pending.length) return;
      const result = await getResearchRepository().saveEvents(pending);
      pending.forEach(e => LocalQueueService.updateStatus(e.event_id, result.success ? 'synced' : 'failed'));
    } finally { this.syncing = false; }
  }
}
