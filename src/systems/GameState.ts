export type SessionMode = 'study' | 'demo';
export type SessionData = { session_id: string; participant_id: string | null; session_mode: SessionMode; build_version: string; schema_version: string; started_at: string; status: 'in_progress' | 'completed'; screen_width: number; screen_height: number; user_agent: string };

export class GameState {
  private static instance?: GameState;
  static getInstance(): GameState { return this.instance ??= new GameState(); }
  participantId: string | null = null;
  sessionMode: SessionMode = 'demo';
  sessionId = crypto.randomUUID();
  readonly buildVersion = '0.1.0-three-migration';
  readonly schemaVersion = '2026-08-three-v1';
  startedAt = new Date().toISOString();
  status: 'in_progress' | 'completed' = 'in_progress';
  startNewSession(mode: SessionMode, participantId: string | null): void {
    this.sessionId = crypto.randomUUID();
    this.sessionMode = mode;
    this.participantId = mode === 'study' ? participantId : null;
    this.startedAt = new Date().toISOString();
    this.status = 'in_progress';
  }
  getSessionData(): SessionData { return { session_id: this.sessionId, participant_id: this.participantId, session_mode: this.sessionMode, build_version: this.buildVersion, schema_version: this.schemaVersion, started_at: this.startedAt, status: this.status, screen_width: innerWidth, screen_height: innerHeight, user_agent: navigator.userAgent }; }
}
