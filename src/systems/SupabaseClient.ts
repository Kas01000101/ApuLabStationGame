import { RepositoryResult, AuthenticatedParticipant } from './research/ResearchRepository';
export class SupabaseClient {
  static getBaseUrl(): string | undefined { return import.meta.env.VITE_DATA_MODE === 'supabase' ? import.meta.env.VITE_SUPABASE_INGEST_URL : undefined; }
  static authenticateParticipant(code: string, credential: string): Promise<RepositoryResult<AuthenticatedParticipant>> { return this.post('/authenticate', { participant_code: code, credential }); }
  static async post<T = void>(path: string, body: unknown): Promise<RepositoryResult<T>> {
    const base = this.getBaseUrl();
    if (!base) return { success: false, error: 'supabase_not_configured' };
    try {
      const response = await fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) return { success: false, error: data.error ?? `HTTP_${response.status}` };
      return { success: true, data };
    } catch { return { success: false, error: 'network_error' }; }
  }
}
