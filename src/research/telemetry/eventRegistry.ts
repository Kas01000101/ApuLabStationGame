import { COMPATIBILITY_EVENT_ALIASES, OFFICIAL_EVENT_TYPES, type ResearchEventType } from './events';

export function canonicalizeEventType(event: string): ResearchEventType | null {
  if (OFFICIAL_EVENT_TYPES.has(event)) return event as ResearchEventType;
  return COMPATIBILITY_EVENT_ALIASES[event] ?? null;
}

export function isOfficialEventType(event: string): event is ResearchEventType {
  return OFFICIAL_EVENT_TYPES.has(event);
}
