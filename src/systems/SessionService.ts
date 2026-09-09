import { GameState } from './GameState';
import { TelemetryService } from './TelemetryService';
import { SyncService } from './SyncService';
import { LocalQueueService } from './LocalQueueService';
import { getResearchRepository } from './research/ResearchRepositoryProvider';
import { getResearchEnvironment } from '../config/researchConfig';

export class SessionService {
  async startDemo(): Promise<boolean> {
    const state = GameState.getInstance();
    const syncToken = createSessionSyncToken();
    state.startNewSession({ mode: 'demo', environment: getResearchEnvironment(), sessionSyncToken: syncToken });
    const repo = getResearchRepository();
    const created = await repo.createSession(state.getSessionData(), null, syncToken);
    if (!created.success) return false;
    LocalQueueService.registerSessionContext({
      session_id: state.sessionId,
      sync_token: syncToken,
      study_id: null,
      participant_id: null,
      event_seq_last: 0,
      saved_at: new Date().toISOString(),
    });
    TelemetryService.getInstance().recordEvent('session_started', { session_mode: 'demo' });
    return true;
  }

  async startStudy(code: string, credential: string): Promise<{ success: boolean; error?: string }> {
    const health = LocalQueueService.getStorageHealth();
    if (health.degraded) return { success: false, error: 'El dispositivo necesita revisión antes de iniciar una sesión de estudio.' };
    if (LocalQueueService.hasUnrecoverablePendingSession()) {
      return { success: false, error: 'Hay datos pendientes de una sesión anterior que requieren revisión antes de continuar.' };
    }

    const repo = getResearchRepository();
    if (!code || !credential) return { success: false, error: 'Completa código y contraseña.' };
    const auth = await repo.authenticateParticipant({ studyCode: code, credential });
    if (!auth.success || !auth.data) return { success: false, error: mapStudyAuthError(auth.error) };
    if (String(auth.data.study_condition) !== 'game') {
      return { success: false, error: 'Esta asignación no corresponde a ApuLab Station.' };
    }

    const recoverable = LocalQueueService.findRecoverableStudyContext(auth.data.participant_id, auth.data.study_id);
    if (recoverable) {
      const resumed = await repo.resumeSession(recoverable.session_id, recoverable.sync_token);
      if (resumed.success && resumed.data
        && resumed.data.participant_id === auth.data.participant_id
        && resumed.data.study_id === auth.data.study_id
        && resumed.data.study_condition === 'game') {
        const state = GameState.getInstance();
        const eventSeqLast = Math.max(resumed.data.event_seq_last, recoverable.event_seq_last ?? 0);
        state.resumeStudySession({
          sessionId: resumed.data.session_id,
          participantId: auth.data.participant_id,
          studyId: auth.data.study_id,
          studyCondition: auth.data.study_condition,
          sessionProof: auth.data.session_proof,
          sessionSyncToken: recoverable.sync_token,
          environment: getResearchEnvironment(),
          eventSeqLast,
        });
        LocalQueueService.registerSessionContext({
          ...recoverable,
          participant_id: auth.data.participant_id,
          study_id: auth.data.study_id,
          event_seq_last: eventSeqLast,
          saved_at: new Date().toISOString(),
        });
        await SyncService.processQueue();
        return { success: true };
      }

      // A recoverable context with pending telemetry must never be discarded
      // silently. Only settled contexts may be removed before a fresh session.
      LocalQueueService.removeSessionContextIfSettled(recoverable.session_id);
      if (LocalQueueService.getSessionContext(recoverable.session_id)) {
        return { success: false, error: 'Hay una sesión anterior con datos pendientes que no pudo recuperarse. No inicies otra sesión.' };
      }
    }

    resetMissionGameplayStorageForNewStudySession();

    const state = GameState.getInstance();
    const syncToken = createSessionSyncToken();
    state.startNewSession({
      mode: 'study',
      participantId: auth.data.participant_id,
      studyId: auth.data.study_id,
      studyCondition: auth.data.study_condition,
      sessionProof: auth.data.session_proof,
      sessionSyncToken: syncToken,
      environment: getResearchEnvironment(),
    });
    const created = await repo.createSession(state.getSessionData(), state.sessionProof, syncToken);
    if (!created.success) return { success: false, error: mapStudySessionError(created.error) };
    LocalQueueService.registerSessionContext({
      session_id: state.sessionId,
      sync_token: syncToken,
      study_id: state.studyId,
      participant_id: state.participantId,
      event_seq_last: 0,
      saved_at: new Date().toISOString(),
    });
    TelemetryService.getInstance().recordEvent('session_started', { session_mode: 'study' });
    return { success: true };
  }

  async complete(): Promise<boolean> {
    const state = GameState.getInstance();
    if (state.status === 'completed') return true;
    if (state.status === 'in_progress') {
      state.status = 'completed_pending_sync';
      TelemetryService.getInstance().recordEvent('session_completed', {});
      LocalQueueService.markCompletionPending(state.sessionId);
    }
    await SyncService.processQueue();
    return GameState.getInstance().status === 'completed';
  }
}

function createSessionSyncToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let raw = '';
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function resetMissionGameplayStorageForNewStudySession(): void {
  try {
    const removals: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key) continue;
      if (/^apulab\.level[1-7]\./.test(key) || key === 'apulab.mission01.completed') removals.push(key);
    }
    for (const key of removals) localStorage.removeItem(key);
  } catch {
    // Gameplay persistence is optional. Research queue/session keys use a
    // different namespace and are deliberately never cleared here.
  }
}

function mapStudyAuthError(error?: string): string {
  if (error === 'study_not_active') return 'El estudio todavía no está habilitado para iniciar sesiones.';
  if (error === 'authentication_cooldown') return 'Espera unos minutos antes de volver a intentar el acceso.';
  if (error === 'station_condition_mismatch') return 'Esta asignación no corresponde a ApuLab Station.';
  return 'El código, credencial o asignación no son válidos.';
}
function mapStudySessionError(error?: string): string {
  if (error === 'active_session_exists') return 'Ya existe una sesión activa para este código. Continúa en el navegador donde comenzaste la misión.';
  if (error === 'study_build_mismatch' || error === 'study_commit_mismatch') return 'Esta versión del juego no corresponde al build autorizado para el estudio.';
  if (error === 'study_environment_mismatch') return 'Este entorno no está habilitado para la sesión de estudio.';
  if (error === 'station_condition_mismatch') return 'Esta asignación no corresponde a ApuLab Station.';
  if (error === 'session_identity_conflict') return 'La sesión no pudo validarse de forma segura.';
  return 'No se pudo iniciar la sesión de estudio.';
}
