import { GameState } from './GameState';
import { TelemetryService } from './TelemetryService';

const LEVEL6_EVENT_TYPES = new Set([
  'level_started',
  'level_completed',
  'help_requested',
  'program_started',
  'program_modified',
  'science_action',
  'science_zone_reached',
  'communication_point_reached',
  'explore_opened',
  'bitacora_opened',
  'data_sent',
  'premature_action',
  'scan_started',
  'scan_completed',
  'analyze_started',
  'analyze_completed',
]);

type Level6TelemetryMessage = {
  type?: unknown;
  event?: unknown;
  payload?: unknown;
};

let installed = false;

export function installLevel6TelemetryBridge(): void {
  if (installed) return;
  installed = true;

  window.addEventListener('message', (message: MessageEvent<Level6TelemetryMessage>) => {
    if (message.origin !== window.location.origin) return;
    const data = message.data;
    if (!data || data.type !== 'apulab-level6-telemetry') return;

    const fromMissionFrame = [...document.querySelectorAll<HTMLIFrameElement>('.mission01-frame')]
      .some((frame) => frame.contentWindow === message.source);
    if (!fromMissionFrame) return;

    const eventType = typeof data.event === 'string' ? data.event : '';
    if (!LEVEL6_EVENT_TYPES.has(eventType)) return;

    const rawPayload = data.payload && typeof data.payload === 'object' && !Array.isArray(data.payload)
      ? data.payload as Record<string, unknown>
      : {};
    const state = GameState.getInstance();

    // The parent owns authoritative study/session identity. Never trust IDs sent
    // by the level iframe, and never add names, emails, credentials, or other PII.
    const { participant_id: _ignoredParticipant, session_id: _ignoredSession, ...safePayload } = rawPayload;
    TelemetryService.getInstance().recordEvent(eventType, {
      ...safePayload,
      participant_id: state.participantId,
      session_id: state.sessionId,
      level: 6,
    });
  });
}
