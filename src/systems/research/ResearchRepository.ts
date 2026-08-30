import { SessionData } from '../GameState';
export type RepositoryResult<T = void> = { success: boolean; data?: T; error?: string };
export type AuthenticatedParticipant = { participant_id: string; session_mode: 'study' };
export interface ResearchRepository {
  readonly mode: 'mock' | 'supabase';
  authenticateParticipant(input: { participantCode: string; credential: string }): Promise<RepositoryResult<AuthenticatedParticipant>>;
  createSession(session: SessionData): Promise<RepositoryResult>;
  saveEvents(events: unknown[]): Promise<RepositoryResult<{ accepted: number }>>;
}
