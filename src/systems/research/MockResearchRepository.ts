import { SessionData } from '../GameState';
import { ResearchRepository, RepositoryResult, AuthenticatedParticipant } from './ResearchRepository';

export class MockResearchRepository implements ResearchRepository {
  readonly mode = 'mock' as const;
  async authenticateParticipant(): Promise<RepositoryResult<AuthenticatedParticipant>> { return { success: false, error: 'study_requires_supabase_data_mode' }; }
  async createSession(session: SessionData): Promise<RepositoryResult> {
    if (session.session_mode === 'study') return { success: false, error: 'study_requires_supabase_data_mode' };
    const rows = JSON.parse(localStorage.getItem('apulab_mock_sessions') ?? '[]') as SessionData[];
    localStorage.setItem('apulab_mock_sessions', JSON.stringify([...rows.filter(r => r.session_id !== session.session_id), session]));
    return { success: true };
  }
  async saveEvents(events: unknown[]): Promise<RepositoryResult<{ accepted: number }>> {
    const rows = JSON.parse(localStorage.getItem('apulab_mock_events') ?? '[]') as unknown[];
    localStorage.setItem('apulab_mock_events', JSON.stringify([...rows, ...events]));
    return { success: true, data: { accepted: events.length } };
  }
}
