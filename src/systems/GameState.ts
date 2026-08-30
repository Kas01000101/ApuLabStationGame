export type SessionMode = 'study' | 'demo';
export type SceneId = 'main-menu' | 'intro' | 'mission01' | 'final';

export type SessionData = {
  session_id: string;
  participant_id: string | null;
  session_mode: SessionMode;
  build_version: string;
  schema_version: string;
  started_at: string;
  status: 'in_progress' | 'completed';
  screen_width: number;
  screen_height: number;
  user_agent: string;
};

export class GameState {
  private static instance?: GameState;

  static getInstance(): GameState {
    return this.instance ??= new GameState();
  }

  participantId: string | null = null;
  sessionMode: SessionMode = 'demo';
  sessionId = crypto.randomUUID();
  currentScene: SceneId = 'main-menu';
  readonly buildVersion = '0.1.0-three-migration';
  readonly schemaVersion = '2026-08-three-v1';
  startedAt = new Date().toISOString();
  status: 'in_progress' | 'completed' = 'in_progress';

  startNewSession(mode: SessionMode, participantId: string | null): void {
    if (mode === 'study' && !participantId) {
      throw new Error('study_requires_participant_id');
    }

    this.sessionId = crypto.randomUUID();
    this.sessionMode = mode;
    this.participantId = mode === 'study' ? participantId : null;
    this.currentScene = 'main-menu';
    this.startedAt = new Date().toISOString();
    this.status = 'in_progress';
  }

  setScene(scene: SceneId): void {
    this.currentScene = scene;
  }

  getSessionData(): SessionData {
    return {
      session_id: this.sessionId,
      participant_id: this.participantId,
      session_mode: this.sessionMode,
      build_version: this.buildVersion,
      schema_version: this.schemaVersion,
      started_at: this.startedAt,
      status: this.status,
      screen_width: window.innerWidth,
      screen_height: window.innerHeight,
      // Data minimization: do not persist the browser's full User-Agent fingerprint.
      user_agent: 'web',
    };
  }
}
