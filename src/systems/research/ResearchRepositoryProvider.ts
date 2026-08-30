import { MockResearchRepository } from './MockResearchRepository';
import { SupabaseResearchRepository } from './SupabaseResearchRepository';
import { ResearchRepository } from './ResearchRepository';
let repository: ResearchRepository | undefined;
export function getResearchRepository(): ResearchRepository {
  if (!repository) repository = import.meta.env.VITE_DATA_MODE === 'supabase' ? new SupabaseResearchRepository() : new MockResearchRepository();
  return repository;
}
