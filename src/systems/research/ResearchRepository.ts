import type { SessionData } from '../GameState';
import type { QueueEvent } from '../LocalQueueService';
import type { StudyCondition } from '../../config/researchConfig';

export type RepositoryResult<T = void> = { success: boolean; data?: T; error?: string };

export type AuthenticatedParticipant = {
  participant_id: string;
  study_id: string;
  study_condition: StudyCondition;
  session_proof: string;
};

export interface ResearchRepository {
  readonly mode: 'mock' | 'supabase';
  authenticateParticipant(input: { studyCode: string; credential: string }): Promise<RepositoryResult<AuthenticatedParticipant>>;
  createSession(session: SessionData, sessionProof?: string | null): Promise<RepositoryResult>;
  saveEvents(events: QueueEvent[], sessionProof?: string | null): Promise<RepositoryResult<{ accepted: number }>>;
  completeSession?(sessionId: string, sessionProof?: string | null): Promise<RepositoryResult>;
}
