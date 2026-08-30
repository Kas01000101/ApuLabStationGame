import { RepositoryResult, AuthenticatedParticipant } from './research/ResearchRepository';

const REQUEST_TIMEOUT_MS = 10_000;

export class SupabaseClient {
  static getBaseUrl(): string | undefined {
    if (import.meta.env.VITE_DATA_MODE !== 'supabase') return undefined;

    const configured = String(import.meta.env.VITE_SUPABASE_INGEST_URL ?? '').trim();
    if (!configured) return undefined;

    try {
      const url = new URL(configured);
      const localhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1';
      if (url.protocol !== 'https:' && !(localhost && url.protocol === 'http:')) return undefined;
      if (url.username || url.password) return undefined;
      return url.toString().replace(/\/$/, '');
    } catch {
      return undefined;
    }
  }

  static authenticateParticipant(code: string, credential: string): Promise<RepositoryResult<AuthenticatedParticipant>> {
    return this.post('/authenticate', { participant_code: code, credential });
  }

  static async post<T = void>(path: string, body: unknown): Promise<RepositoryResult<T>> {
    const base = this.getBaseUrl();
    if (!base || !path.startsWith('/')) return { success: false, error: 'supabase_not_configured' };

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${base}${path}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success === false) {
        return { success: false, error: typeof data?.error === 'string' ? data.error : `HTTP_${response.status}` };
      }
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof DOMException && error.name === 'AbortError' ? 'request_timeout' : 'network_error',
      };
    } finally {
      window.clearTimeout(timeout);
    }
  }
}
