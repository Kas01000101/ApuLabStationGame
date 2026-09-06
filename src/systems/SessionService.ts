import { GameState } from './GameState';
import { TelemetryService } from './TelemetryService';
import { getResearchRepository } from './research/ResearchRepositoryProvider';
import { getResearchEnvironment } from '../config/researchConfig';

export class SessionService {
  async startDemo(): Promise<boolean> {
    const state = GameState.getInstance();
    state.startNewSession({ mode: 'demo', environment: getResearchEnvironment() });
    const repo = getResearchRepository();
    const created = await repo.createSession(state.getSessionData());
    if (!created.success) return false;
    TelemetryService.getInstance().recordEvent('session_started', { session_mode: 'demo' });
    return true;
  }

  async startStudy(code: string, credential: string): Promise<{ success: boolean; error?: string }> {
    const repo = getResearchRepository();
    if (!code || !credential) return { success: false, error: 'Completa código y contraseña.' };
    const auth = await repo.authenticateParticipant({ studyCode: code, credential });
    if (!auth.success || !auth.data) return { success: false, error: 'El código, credencial o asignación no son válidos.' };

    const state = GameState.getInstance();
    state.startNewSession({
      mode: 'study',
      participantId: auth.data.participant_id,
      studyId: auth.data.study_id,
      studyCondition: auth.data.study_condition,
      sessionProof: auth.data.session_proof,
      environment: getResearchEnvironment(),
    });
    const created = await repo.createSession(state.getSessionData(), state.sessionProof);
    if (!created.success) return { success: false, error: 'No se pudo iniciar la sesión de estudio.' };
    TelemetryService.getInstance().recordEvent('session_started', { session_mode: 'study' });
    return { success: true };
  }

  async complete(): Promise<boolean> {
    const state = GameState.getInstance();
    state.status = 'completed';
    TelemetryService.getInstance().recordEvent('session_completed', {});
    const repo = getResearchRepository();
    if (!repo.completeSession) return true;
    const result = await repo.completeSession(state.sessionId, state.sessionProof);
    return result.success;
  }
}
