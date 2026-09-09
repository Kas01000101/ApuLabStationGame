import type { ResearchEventType } from './events';

export type AnalyticNormalization = {
  source_event: ResearchEventType;
  normalized_event: string;
  level_number: number | null;
};

const NORMALIZATION_RULES: Readonly<Record<string, string>> = {
  '7:final_point_reached': 'scientific_task_terminal_reached',
};

/**
 * Analytics-only normalization. Raw telemetry must keep source_event unchanged.
 * A normalization describes an analytic concept; it never pretends a different
 * gameplay event occurred.
 */
export function normalizeEventForAnalytics(
  event: ResearchEventType,
  levelNumber: number | null,
): AnalyticNormalization | null {
  if (levelNumber == null) return null;
  const normalized = NORMALIZATION_RULES[`${levelNumber}:${event}`];
  if (!normalized) return null;
  return {
    source_event: event,
    normalized_event: normalized,
    level_number: levelNumber,
  };
}
