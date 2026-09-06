export type DataMode = 'mock' | 'supabase';
export type SessionMode = 'demo' | 'study';
export type StudyCondition = 'game' | 'static_control';
export type StudyKind = 'qa' | 'official';
export type ResearchEnvironment = 'development' | 'preview' | 'study';

export const STUDY_IDS = {
  qa: 'APULAB-QA-2026',
  official: 'APULAB-STUDY-2026',
} as const;

export const RESEARCH_CONFIG = {
  telemetrySchemaVersion: 'apulab-telemetry-v2',
  protocolVersion: 'apulab-protocol-2026-v1',
  // Increment for every research hardening candidate. Freeze assigns 1.0.0.
  studyBuildId: 'APULAB-STUDY-RC.1',
  maxPayloadBytes: 8192,
  maxBatchEvents: 20,
} as const;

export function getGitCommitSha(): string {
  const value = String(import.meta.env.VITE_GIT_COMMIT_SHA ?? '').trim();
  return value || 'UNSET';
}

export function getDataMode(): DataMode {
  return import.meta.env.VITE_DATA_MODE === 'supabase' ? 'supabase' : 'mock';
}

export function getResearchEnvironment(): ResearchEnvironment {
  const configured = String(import.meta.env.VITE_RESEARCH_ENVIRONMENT ?? '').trim().toLowerCase();
  if (configured === 'study' || configured === 'preview' || configured === 'development') return configured;
  return import.meta.env.DEV ? 'development' : 'preview';
}

export function isStudyEnvironment(): boolean {
  return getResearchEnvironment() === 'study';
}
