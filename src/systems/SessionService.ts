import { GameState } from './GameState';
import { TelemetryService } from './TelemetryService';
import { getResearchRepository } from './research/ResearchRepositoryProvider';

export class SessionService {
  async startDemo(): Promise<boolean> {
    const state = GameState.getInstance();
    state.startNewSession('demo', null);
    const repo = getResearchRepository();
    const created = await repo.createSession(state.getSessionData());
    if (!created.success) return false;
    TelemetryService.getInstance().recordEvent('session_started', { session_mode: 'demo' });
    return true;
  }
  async startStudy(code: string, credential: string): Promise<{ success: boolean; error?: string }> {
    const repo = getResearchRepository();
    if (repo.mode === 'mock') return { success: false, error: 'El modo de investigación no está activo. Usa Modo demo.' };
    if (!code || !credential) return { success: false, error: 'Completa código y contraseña.' };
    const auth = await repo.authenticateParticipant({ participantCode: code, credential });
    if (!auth.success || !auth.data) return { success: false, error: 'El código o la contraseña no son correctos.' };
    const state = GameState.getInstance();
    state.startNewSession('study', auth.data.participant_id);
    const created = await repo.createSession(state.getSessionData());
    if (!created.success) return { success: false, error: 'No se pudo iniciar la sesión de estudio.' };
    TelemetryService.getInstance().recordEvent('session_started', { session_mode: 'study' });
    return { success: true };
  }
}
