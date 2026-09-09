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

export type ResumedSession = {
  session_id: string;
  participant_id: string;
  study_id: string;
  study_condition: StudyCondition;
  status: 'in_progress' | 'active' | 'completed_pending_sync';
  event_seq_last: number;
};

export interface ResearchRepository {
  readonly mode: 'mock' | 'supabase';
  authenticateParticipant(input: { studyCode: string; credential: string }): Promise<RepositoryResult<AuthenticatedParticipant>>;
  createSession(session: SessionData, sessionProof: string | null, sessionSyncToken: string): Promise<RepositoryResult>;
  resumeSession(sessionId: string, sessionSyncToken: string): Promise<RepositoryResult<ResumedSession>>;
  saveEvents(events: QueueEvent[], sessionSyncToken: string): Promise<RepositoryResult<{ accepted: number }>>;
  completeSession?(sessionId: string, sessionSyncToken: string): Promise<RepositoryResult>;
}
