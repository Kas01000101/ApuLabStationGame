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

let installed = false;
let completing = false;

export function installMission01TelemetryBridge(): void {
  if (installed) return;
  installed = true;

  window.addEventListener('message', (message: MessageEvent<MissionTelemetryMessage>) => {
    if (message.origin !== window.location.origin) return;
    const frame = document.querySelector<HTMLIFrameElement>('.mission01-frame');
    if (!frame || message.source !== frame.contentWindow) return;

    const data = message.data;
    if (!data || typeof data !== 'object') return;
    const acceptedType = data.type === 'apulab-telemetry'
      || data.type === 'apulab-study-event'
      || data.type === 'apulab-level6-telemetry'
      || data.type === 'apulab-level7-telemetry';
    if (!acceptedType) return;

    const rawEvent = typeof data.event === 'string'
      ? data.event
      : typeof data.event_type === 'string' ? data.event_type : '';
    const canonical = canonicalizeEventType(rawEvent);
    if (!canonical) return;

    const payload = data.payload && typeof data.payload === 'object' && !Array.isArray(data.payload)
      ? data.payload as Record<string, unknown>
      : {};
    const level = Number(data.level ?? payload.level ?? payload.level_number);
    const levelNumber = Number.isInteger(level) && level >= 1 && level <= 7 ? level : inferLevelFromFrame(frame);
    const telemetry = TelemetryService.getInstance();
    if (canonical === 'level_started' && levelNumber) telemetry.markLevelStarted(levelNumber);

    telemetry.recordEvent(canonical, payload, {
      levelNumber,
      elapsedMs: Number.isFinite(Number(data.elapsed_ms)) ? Math.max(0, Math.round(Number(data.elapsed_ms))) : undefined,
      attemptNumber: Number.isInteger(Number(data.attempt_number)) && Number(data.attempt_number) >= 1 ? Number(data.attempt_number) : undefined,
    });

    if (canonical === 'level_completed' && levelNumber === 7 && !completing) {
      completing = true;
      void new SessionService().complete().finally(() => { completing = false; });
    }
  });
}

function inferLevelFromFrame(frame: HTMLIFrameElement): number | null {
  const match = frame.getAttribute('src')?.match(/level(\d+)\.html/);
  const level = Number(match?.[1]);
  return Number.isInteger(level) && level >= 1 && level <= 7 ? level : null;
}
