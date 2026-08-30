import { SessionData } from '../GameState';
import type { QueueEvent } from '../LocalQueueService';
import { ResearchRepository, RepositoryResult, AuthenticatedParticipant } from './ResearchRepository';

const SESSION_KEY = 'apulab_mock_sessions';
const EVENT_KEY = 'apulab_mock_events';

export class MockResearchRepository implements ResearchRepository {
  readonly mode = 'mock' as const;

  async authenticateParticipant(): Promise<RepositoryResult<AuthenticatedParticipant>> {
    return { success: false, error: 'study_requires_supabase_data_mode' };
  }

  async createSession(session: SessionData): Promise<RepositoryResult> {
    if (session.session_mode === 'study') {
      return { success: false, error: 'study_requires_supabase_data_mode' };
    }

    try {
      const rows = readArray<SessionData>(SESSION_KEY);
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify([...rows.filter((row) => row.session_id !== session.session_id), session]),
      );
      return { success: true };
    } catch {
      return { success: false, error: 'mock_storage_unavailable' };
    }
  }

  async saveEvents(events: QueueEvent[]): Promise<RepositoryResult<{ accepted: number }>> {
    try {
      const rows = readArray<QueueEvent>(EVENT_KEY);
      const byId = new Map(rows.map((event) => [event.event_id, event]));
      for (const event of events) byId.set(event.event_id, event);
      localStorage.setItem(EVENT_KEY, JSON.stringify([...byId.values()]));
      return { success: true, data: { accepted: events.length } };
    } catch {
      return { success: false, error: 'mock_storage_unavailable' };
    }
  }
}

function readArray<T>(key: string): T[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}
