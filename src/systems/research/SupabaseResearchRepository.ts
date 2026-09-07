import type { SessionData } from '../GameState';
import type { QueueEvent } from '../LocalQueueService';
import { SupabaseClient } from '../SupabaseClient';
import type { ResearchRepository, RepositoryResult, AuthenticatedParticipant } from './ResearchRepository';

export class SupabaseResearchRepository implements ResearchRepository {
  readonly mode = 'supabase' as const;

  authenticateParticipant(input: { studyCode: string; credential: string }): Promise<RepositoryResult<AuthenticatedParticipant>> {
    return SupabaseClient.authenticateParticipant(input.studyCode, input.credential);
  }

  createSession(session: SessionData, sessionProof: string | null, sessionSyncToken: string): Promise<RepositoryResult> {
    return SupabaseClient.post('/session', {
      session,
      session_proof: sessionProof,
      session_sync_token: sessionSyncToken,
    });
  }

  saveEvents(events: QueueEvent[], sessionSyncToken: string): Promise<RepositoryResult<{ accepted: number }>> {
    return SupabaseClient.post('/events', { events, session_sync_token: sessionSyncToken });
  }

  completeSession(sessionId: string, sessionSyncToken: string): Promise<RepositoryResult> {
    return SupabaseClient.post('/session/complete', { session_id: sessionId, session_sync_token: sessionSyncToken });
  }
}
