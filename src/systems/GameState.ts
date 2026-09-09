import { RESEARCH_CONFIG, getGitCommitSha, type ResearchEnvironment, type SessionMode, type StudyCondition } from '../config/researchConfig';

export type SceneId = 'main-menu' | 'intro' | 'mission01' | 'final';
export type SessionStatus = 'in_progress' | 'completed_pending_sync' | 'completed';

export type SessionData = {
  session_id: string;
  participant_id: string | null;
  study_id: string | null;
  study_condition: StudyCondition | null;
  session_mode: SessionMode;
  environment: ResearchEnvironment;
  build_version: string;
  git_commit_sha: string;
  schema_version: string;
  protocol_version: string;
  started_at: string;
  completed_at?: string | null;
  status: SessionStatus;
  last_level?: number | null;
  last_checkpoint?: string | null;
  event_seq_last: number;
  screen_width: number;
  screen_height: number;
  input_mode?: string | null;
  user_agent: 'web';
};

export class GameState {
  private static instance?: GameState;
  static getInstance(): GameState { return this.instance ??= new GameState(); }

  participantId: string | null = null;
  studyId: string | null = null;
  studyCondition: StudyCondition | null = null;
  sessionProof: string | null = null;
  sessionSyncToken: string | null = null;
  sessionMode: SessionMode = 'demo';
  environment: ResearchEnvironment = 'preview';
  sessionId = crypto.randomUUID();
  currentScene: SceneId = 'main-menu';
  readonly buildVersion = RESEARCH_CONFIG.studyBuildId;
  readonly gitCommitSha = getGitCommitSha();
  readonly schemaVersion = RESEARCH_CONFIG.telemetrySchemaVersion;
  readonly protocolVersion = RESEARCH_CONFIG.protocolVersion;
  startedAt = new Date().toISOString();
  status: SessionStatus = 'in_progress';
  eventSeqLast = 0;
  lastLevel: number | null = null;
  lastCheckpoint: string | null = null;
  researchStorageDegraded = false;

  startNewSession(input: {
    mode: SessionMode;
    participantId?: string | null;
    studyId?: string | null;
    studyCondition?: StudyCondition | null;
    sessionProof?: string | null;
    sessionSyncToken: string;
    environment: ResearchEnvironment;
  }): void {
    if (input.mode === 'study' && (!input.participantId || !input.studyId || !input.studyCondition || !input.sessionProof)) {
      throw new Error('study_requires_server_identity');
    }
    if (!input.sessionSyncToken) throw new Error('session_sync_token_required');
    this.sessionId = crypto.randomUUID();
    this.sessionMode = input.mode;
    this.environment = input.environment;
    this.participantId = input.mode === 'study' ? input.participantId ?? null : null;
    this.studyId = input.mode === 'study' ? input.studyId ?? null : null;
    this.studyCondition = input.mode === 'study' ? input.studyCondition ?? null : null;
    this.sessionProof = input.mode === 'study' ? input.sessionProof ?? null : null;
    this.sessionSyncToken = input.sessionSyncToken;
    this.currentScene = 'main-menu';
    this.startedAt = new Date().toISOString();
    this.status = 'in_progress';
    this.eventSeqLast = 0;
    this.lastLevel = null;
    this.lastCheckpoint = null;
    this.researchStorageDegraded = false;
  }

  nextEventSeq(): number { this.eventSeqLast += 1; return this.eventSeqLast; }
  setScene(scene: SceneId): void { this.currentScene = scene; }

  getSessionData(): SessionData {
    return {
      session_id: this.sessionId,
      participant_id: this.participantId,
      study_id: this.studyId,
      study_condition: this.studyCondition,
      session_mode: this.sessionMode,
      environment: this.environment,
      build_version: this.buildVersion,
      git_commit_sha: this.gitCommitSha,
      schema_version: this.schemaVersion,
      protocol_version: this.protocolVersion,
      started_at: this.startedAt,
      completed_at: this.status === 'completed' ? new Date().toISOString() : null,
      status: this.status,
      last_level: this.lastLevel,
      last_checkpoint: this.lastCheckpoint,
      event_seq_last: this.eventSeqLast,
      screen_width: window.innerWidth,
      screen_height: window.innerHeight,
      input_mode: null,
      user_agent: 'web',
    };
  }
}
