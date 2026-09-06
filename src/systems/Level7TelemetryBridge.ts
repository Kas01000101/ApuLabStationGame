import { GameState } from './GameState';
import { TelemetryService } from './TelemetryService';

const LEVEL7_EVENT_TYPES = new Set([
  'level_started',
  'program_started',
  'program_modified',
  'sample_checkpoint_reached',
  'sample_analyze_requested',
  'instrument_modal_opened',
  'instrument_selected',
  'sample_analyzed',
  'instrument_changed',
  'relevant_instrument_selected',
  'help_requested',
  'final_checkpoint_reached',
  'mission_completed',
]);

type Level7TelemetryMessage = {
  type?: unknown;
  event?: unknown;
  payload?: unknown;
};

let installed = false;

export function installLevel7TelemetryBridge(): void {
  if (installed) return;
  installed = true;

  window.addEventListener('message', (message: MessageEvent<Level7TelemetryMessage>) => {
    if (message.origin !== window.location.origin) return;
    const data = message.data;
    if (!data || data.type !== 'apulab-level7-telemetry') return;

    const fromMissionFrame = [...document.querySelectorAll<HTMLIFrameElement>('.mission01-frame')]
      .some((frame) => frame.contentWindow === message.source);
    if (!fromMissionFrame) return;

    const eventType = typeof data.event === 'string' ? data.event : '';
    if (!LEVEL7_EVENT_TYPES.has(eventType)) return;

    const rawPayload = data.payload && typeof data.payload === 'object' && !Array.isArray(data.payload)
      ? data.payload as Record<string, unknown>
      : {};
    const state = GameState.getInstance();

    // Study/session identity is authoritative in the parent application.
    // Do not accept iframe-supplied IDs and do not add names, email or other PII.
    const { participant_id: _ignoredParticipant, session_id: _ignoredSession, ...safePayload } = rawPayload;
    TelemetryService.getInstance().recordEvent(eventType, {
      ...safePayload,
      participant_id: state.participantId,
      session_id: state.sessionId,
      level: 7,
    });
  });
}
