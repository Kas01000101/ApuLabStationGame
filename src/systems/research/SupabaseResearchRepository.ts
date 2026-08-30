import { SessionData } from '../GameState';
import { SupabaseClient } from '../SupabaseClient';
import { ResearchRepository, RepositoryResult, AuthenticatedParticipant } from './ResearchRepository';

export class SupabaseResearchRepository implements ResearchRepository {
  readonly mode = 'supabase' as const;
  authenticateParticipant(input: { participantCode: string; credential: string }): Promise<RepositoryResult<AuthenticatedParticipant>> { return SupabaseClient.authenticateParticipant(input.participantCode, input.credential); }
  createSession(session: SessionData): Promise<RepositoryResult> { return SupabaseClient.post('/session', session); }
  saveEvents(events: unknown[]): Promise<RepositoryResult<{ accepted: number }>> { return SupabaseClient.post('/events', { events }); }
}
