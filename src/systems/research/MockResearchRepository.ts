import type { SessionData } from '../GameState';
import type { QueueEvent } from '../LocalQueueService';
import { STUDY_IDS, type StudyCondition } from '../../config/researchConfig';
import type { ResearchRepository, RepositoryResult, AuthenticatedParticipant } from './ResearchRepository';

const SESSION_KEY = 'apulab_mock_sessions_v2';
const EVENT_KEY = 'apulab_mock_events_v2';
const PARTICIPANT_KEY = 'apulab_mock_participants_v2';
const TOKEN_KEY = 'apulab_mock_session_tokens_v2';

export class MockResearchRepository implements ResearchRepository {
  readonly mode = 'mock' as const;

  async authenticateParticipant(input: { studyCode: string; credential: string }): Promise<RepositoryResult<AuthenticatedParticipant>> {
    const code = normalizeCode(input.studyCode);
    if (!code || !input.credential.trim()) return { success: false, error: 'mock_auth_invalid' };
    const kind = code.startsWith('QT-') ? 'qa' : 'official';
    const condition = getMockCondition(code, kind);
    if (!condition) return { success: false, error: 'mock_assignment_missing' };
    const participants = readObject<Record<string,string>>(PARTICIPANT_KEY, {});
    const participantId = participants[code] ?? crypto.randomUUID();
    participants[code] = participantId;
    localStorage.setItem(PARTICIPANT_KEY, JSON.stringify(participants));
    return {
      success: true,
      data: {
        participant_id: participantId,
        study_id: kind === 'qa' ? STUDY_IDS.qa : STUDY_IDS.official,
        study_condition: condition,
        session_proof: `mock-only:${crypto.randomUUID()}`,
      },
    };
  }

  async createSession(session: SessionData, _sessionProof: string | null, sessionSyncToken: string): Promise<RepositoryResult> {
    try {
      const rows = readArray<SessionData>(SESSION_KEY);
      const existing = rows.find((row) => row.session_id === session.session_id);
      if (existing && !sameImmutableSession(existing, session)) return { success: false, error: 'session_identity_conflict' };
      const tokens = readObject<Record<string,string>>(TOKEN_KEY, {});
      if (tokens[session.session_id] && tokens[session.session_id] !== sessionSyncToken) return { success: false, error: 'session_sync_token_conflict' };
      tokens[session.session_id] = sessionSyncToken;
      localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
      if (!existing) localStorage.setItem(SESSION_KEY, JSON.stringify([...rows, session]));
      return { success: true };
    } catch { return { success: false, error: 'mock_storage_unavailable' }; }
  }

  async saveEvents(events: QueueEvent[], sessionSyncToken: string): Promise<RepositoryResult<{ accepted: number }>> {
    try {
      const ids = [...new Set(events.map((event) => event.session_id))];
      if (ids.length !== 1) return { success: false, error: 'events_must_share_session' };
      const tokens = readObject<Record<string,string>>(TOKEN_KEY, {});
      if (!tokens[ids[0]] || tokens[ids[0]] !== sessionSyncToken) return { success: false, error: 'session_sync_token_invalid' };
      const rows = readArray<QueueEvent>(EVENT_KEY);
      const byId = new Map(rows.map((event) => [event.event_id, event]));
      for (const event of events) byId.set(event.event_id, event);
      localStorage.setItem(EVENT_KEY, JSON.stringify([...byId.values()].sort((a,b) => a.session_id.localeCompare(b.session_id) || a.event_seq-b.event_seq)));
      return { success: true, data: { accepted: events.length } };
    } catch { return { success: false, error: 'mock_storage_unavailable' }; }
  }

  async completeSession(sessionId: string, sessionSyncToken: string): Promise<RepositoryResult> {
    try {
      const tokens = readObject<Record<string,string>>(TOKEN_KEY, {});
      if (!tokens[sessionId] || tokens[sessionId] !== sessionSyncToken) return { success: false, error: 'session_sync_token_invalid' };
      const rows = readArray<SessionData>(SESSION_KEY).map((row) => row.session_id === sessionId
        ? { ...row, status: 'completed' as const, completed_at: new Date().toISOString(), last_level: 7 }
        : row);
      localStorage.setItem(SESSION_KEY, JSON.stringify(rows));
      return { success: true };
    } catch { return { success: false, error: 'mock_storage_unavailable' }; }
  }
}

function sameImmutableSession(a: SessionData, b: SessionData): boolean {
  return a.participant_id === b.participant_id
    && a.study_id === b.study_id
    && a.study_condition === b.study_condition
    && a.session_mode === b.session_mode
    && a.environment === b.environment
    && a.build_version === b.build_version
    && a.git_commit_sha === b.git_commit_sha
    && a.schema_version === b.schema_version
    && a.protocol_version === b.protocol_version;
}
function normalizeCode(raw: string): string | null {
  const code = raw.trim().toUpperCase();
  const match = code.match(/^(QT|AP)-(\d{3})$/);
  if (!match) return null;
  const n = Number(match[2]);
  if (match[1] === 'QT' && (n < 1 || n > 10)) return null;
  if (match[1] === 'AP' && (n < 1 || n > 50)) return null;
  return code;
}
function getMockCondition(code: string, kind: 'qa'|'official'): StudyCondition | null {
  if (kind === 'qa') return 'game';
  const stored = localStorage.getItem(`apulab_mock_assignment:${code}`);
  return stored === 'game' || stored === 'static_control' ? stored : null;
}
function readArray<T>(key: string): T[] { try { const v=JSON.parse(localStorage.getItem(key)??'[]'); return Array.isArray(v)?v as T[]:[]; } catch { return []; } }
function readObject<T extends object>(key: string, fallback: T): T { try { const v=JSON.parse(localStorage.getItem(key)??'null'); return v&&typeof v==='object'&&!Array.isArray(v)?v as T:fallback; } catch { return fallback; } }
