import { TelemetryService } from './TelemetryService';
import { SessionService } from './SessionService';
import { canonicalizeEventType } from '../research/telemetry/eventRegistry';

type MissionTelemetryMessage = {
  type?: unknown;
  source?: unknown;
  level?: unknown;
  event?: unknown;
  event_type?: unknown;
  payload?: unknown;
  elapsed_ms?: unknown;
  attempt_number?: unknown;
};

const ACCEPTED_MESSAGE_TYPES = new Set([
  'apulab-telemetry',
  'apulab-study-event',
  'apulab-level6-telemetry',
  'apulab-level7-telemetry',
]);

let installed = false;
let completing = false;

export function installMission01TelemetryBridge(): void {
  if (installed) return;
  installed = true;

  window.addEventListener('message', (message: MessageEvent<MissionTelemetryMessage>) => {
    if (message.origin !== window.location.origin) return;

    const frame = findMissionFrameForSource(message.source);
    if (!frame) return;

    const data = message.data;
    if (!data || typeof data !== 'object' || !ACCEPTED_MESSAGE_TYPES.has(String(data.type ?? ''))) return;

    const rawPayload = data.payload && typeof data.payload === 'object' && !Array.isArray(data.payload)
      ? data.payload as Record<string, unknown>
      : {};

    const levelNumber = resolveLevelNumber(data.level, rawPayload, frame);
    const rawEvent = typeof data.event === 'string'
      ? data.event
      : typeof data.event_type === 'string' ? data.event_type : '';
    const canonical = canonicalizeEventType(rawEvent, levelNumber);
    if (!canonical) return;

    // The parent owns research identity. Ignore any identity values coming from
    // Mission01 so iframe code can never impersonate another session/build.
    const {
      participant_id: _participant,
      participantId: _participantCamel,
      participant_code: _participantCode,
      session_id: _session,
      sessionId: _sessionCamel,
      study_id: _study,
      studyId: _studyCamel,
      study_condition: _condition,
      condition: _conditionAlias,
      build_version: _build,
      buildVersion: _buildCamel,
      ...behaviorPayload
    } = rawPayload;

    const telemetry = TelemetryService.getInstance();
    if (canonical === 'level_started' && levelNumber) telemetry.markLevelStarted(levelNumber);

    telemetry.recordEvent(canonical, behaviorPayload, {
      levelNumber,
      elapsedMs: Number.isFinite(Number(data.elapsed_ms))
        ? Math.max(0, Math.round(Number(data.elapsed_ms)))
        : undefined,
      attemptNumber: Number.isInteger(Number(data.attempt_number)) && Number(data.attempt_number) >= 1
        ? Number(data.attempt_number)
        : undefined,
    });

    // Session completion is an outer research lifecycle effect only. It never
    // changes Mission01 state and is requested exclusively after canonical N7
    // level completion.
    if (canonical === 'level_completed' && levelNumber === 7 && !completing) {
      completing = true;
      void new SessionService().complete().finally(() => { completing = false; });
    }
  });
}

function findMissionFrameForSource(source: MessageEventSource | null): HTMLIFrameElement | null {
  for (const frame of document.querySelectorAll<HTMLIFrameElement>('.mission01-frame')) {
    if (frame.contentWindow === source) return frame;
  }
  return null;
}

function resolveLevelNumber(
  rawLevel: unknown,
  payload: Record<string, unknown>,
  frame: HTMLIFrameElement,
): number | null {
  const candidates = [rawLevel, payload.level, payload.level_number];
  for (const candidate of candidates) {
    const level = Number(candidate);
    if (Number.isInteger(level) && level >= 1 && level <= 7) return level;
  }

  const match = frame.getAttribute('src')?.match(/level(\d+)\.html/);
  const inferred = Number(match?.[1]);
  return Number.isInteger(inferred) && inferred >= 1 && inferred <= 7 ? inferred : null;
}
