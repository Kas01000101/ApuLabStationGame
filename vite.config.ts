import { defineConfig } from 'vite';

const SUPABASE_INGEST_URL = 'https://dkvxbvacsegneszuopwy.supabase.co/functions/v1/ingest-telemetry';

export default defineConfig(() => {
  const define: Record<string, string> = {};
  const vercelEnvironment = String(process.env.VERCEL_ENV ?? '').trim().toLowerCase();

  if (vercelEnvironment) {
    const dataMode = String(process.env.VITE_DATA_MODE ?? '').trim() || 'supabase';
    const ingestUrl = String(process.env.VITE_SUPABASE_INGEST_URL ?? '').trim() || SUPABASE_INGEST_URL;
    const researchEnvironment = String(process.env.VITE_RESEARCH_ENVIRONMENT ?? '').trim()
      || (vercelEnvironment === 'production' ? 'study' : 'preview');
    const gitCommitSha = String(process.env.VITE_GIT_COMMIT_SHA ?? '').trim()
      || String(process.env.VERCEL_GIT_COMMIT_SHA ?? '').trim()
      || 'UNSET';

    define['import.meta.env.VITE_DATA_MODE'] = JSON.stringify(dataMode);
    define['import.meta.env.VITE_SUPABASE_INGEST_URL'] = JSON.stringify(ingestUrl);
    define['import.meta.env.VITE_RESEARCH_ENVIRONMENT'] = JSON.stringify(researchEnvironment);
    define['import.meta.env.VITE_GIT_COMMIT_SHA'] = JSON.stringify(gitCommitSha);
  }

  return {
    define,
    server: { port: 3000 },
    build: {
      target: 'es2022',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/three')) return 'three-vendor';
          }
        }
      }
    }
  };
});
