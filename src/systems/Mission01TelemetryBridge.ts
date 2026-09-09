import { TelemetryService } from './TelemetryService';
import { canonicalizeEventType } from '../research/telemetry/eventRegistry';
import { Mission01TelemetryDiagnostics } from './Mission01TelemetryDiagnostics';

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

const PARENT_OWNED_LIFECYCLE = new Set(['level_started', 'level_completed']);
let installed = false;

export function installMission01TelemetryBridge(): void {
  if (installed) return;
  installed = true;

  window.addEventListener('message', (message: MessageEvent<MissionTelemetryMessage>) => {
    Mission01TelemetryDiagnostics.increment('received');

    if (message.origin !== window.location.origin) {
      Mission01TelemetryDiagnostics.increment('rejected_origin');
      return;
    }

    const frame = findMissionFrameForSource(message.source);
    if (!frame) {
      Mission01TelemetryDiagnostics.increment('rejected_source');
      return;
    }

    const data = message.data;
    if (!data || typeof data !== 'object' || !ACCEPTED_MESSAGE_TYPES.has(String(data.type ?? ''))) {
      Mission01TelemetryDiagnostics.increment('rejected_message_type');
      return;
    }

    const rawPayload = data.payload && typeof data.payload === 'object' && !Array.isArray(data.payload)
      ? data.payload as Record<string, unknown>
      : {};

    const levelNumber = resolveLevelNumber(data.level, rawPayload, frame);
    const rawEvent = typeof data.event === 'string'
      ? data.event
      : typeof data.event_type === 'string' ? data.event_type : '';
    const canonical = canonicalizeEventType(rawEvent, levelNumber);
    if (!canonical) {
      if (levelNumber == null) Mission01TelemetryDiagnostics.increment('rejected_level');
      else Mission01TelemetryDiagnostics.increment('rejected_event_type');
      return;
    }

    // Mission01Screen owns lifecycle events for every level. Inner documents may
    // keep emitting legacy level_started/level_completed messages, but accepting
    // them into Research would create duplicate lifecycle rows.
    if (PARENT_OWNED_LIFECYCLE.has(canonical)) {
      Mission01TelemetryDiagnostics.increment('accepted');
      return;
    }

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

    TelemetryService.getInstance().recordEvent(canonical, behaviorPayload, {
      levelNumber,
      elapsedMs: Number.isFinite(Number(data.elapsed_ms))
        ? Math.max(0, Math.round(Number(data.elapsed_ms)))
        : undefined,
      attemptNumber: Number.isInteger(Number(data.attempt_number)) && Number(data.attempt_number) >= 1
        ? Number(data.attempt_number)
        : undefined,
    });
    Mission01TelemetryDiagnostics.increment('accepted');
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
