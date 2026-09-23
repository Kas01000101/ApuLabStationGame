import { MockResearchRepository } from './MockResearchRepository';
import { SupabaseResearchRepository } from './SupabaseResearchRepository';
import type { ResearchRepository } from './ResearchRepository';
import { getDataMode, type DataMode } from '../../config/researchConfig';

const repositories: Partial<Record<DataMode, ResearchRepository>> = {};

export function getResearchRepository(mode: DataMode = getDataMode()): ResearchRepository {
  if (!repositories[mode]) {
    repositories[mode] = mode === 'supabase'
      ? new SupabaseResearchRepository()
      : new MockResearchRepository();
  }
  return repositories[mode]!;
}
