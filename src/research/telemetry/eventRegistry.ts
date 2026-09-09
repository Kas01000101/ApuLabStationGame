import {
  COMMON_EVENT_TYPES,
  COMPATIBILITY_EVENT_ALIASES,
  LEVEL_EVENT_TYPES,
  OFFICIAL_EVENT_TYPES,
  type ResearchEventType,
} from './events';

export function canonicalizeEventType(event: string, levelNumber?: number | null): ResearchEventType | null {
  const canonical = OFFICIAL_EVENT_TYPES.has(event)
    ? event as ResearchEventType
    : COMPATIBILITY_EVENT_ALIASES[event] ?? null;

  if (!canonical) return null;
  if (COMMON_EVENT_TYPES.has(canonical)) return canonical;
  if (levelNumber == null) return canonical;

  return LEVEL_EVENT_TYPES[levelNumber]?.has(canonical) ? canonical : null;
}

export function isOfficialEventType(event: string): event is ResearchEventType {
  return OFFICIAL_EVENT_TYPES.has(event);
}

export function isEventAllowedForLevel(event: ResearchEventType, levelNumber: number | null): boolean {
  if (COMMON_EVENT_TYPES.has(event)) return true;
  if (levelNumber == null) return false;
  return LEVEL_EVENT_TYPES[levelNumber]?.has(event) ?? false;
}
