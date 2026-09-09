import { getResearchEnvironment } from '../config/researchConfig';

export type Mission01TelemetryDiagnosticKey =
  | 'received'
  | 'rejected_origin'
  | 'rejected_source'
  | 'rejected_message_type'
  | 'rejected_event_type'
  | 'rejected_level'
  | 'accepted';

export type Mission01TelemetryDiagnosticsSnapshot = Record<Mission01TelemetryDiagnosticKey, number>;

const STORAGE_KEY = 'apulab_qa_telemetry_bridge_diagnostics_v1';
const EMPTY: Mission01TelemetryDiagnosticsSnapshot = {
  received: 0,
  rejected_origin: 0,
  rejected_source: 0,
  rejected_message_type: 0,
  rejected_event_type: 0,
  rejected_level: 0,
  accepted: 0,
};

function isQaRuntime(): boolean {
  return getResearchEnvironment() === 'preview';
}

function read(): Mission01TelemetryDiagnosticsSnapshot {
  if (!isQaRuntime()) return { ...EMPTY };
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ...EMPTY };
    return {
      received: Number(parsed.received) || 0,
      rejected_origin: Number(parsed.rejected_origin) || 0,
      rejected_source: Number(parsed.rejected_source) || 0,
      rejected_message_type: Number(parsed.rejected_message_type) || 0,
      rejected_event_type: Number(parsed.rejected_event_type) || 0,
      rejected_level: Number(parsed.rejected_level) || 0,
      accepted: Number(parsed.accepted) || 0,
    };
  } catch {
    return { ...EMPTY };
  }
}

function write(snapshot: Mission01TelemetryDiagnosticsSnapshot): void {
  if (!isQaRuntime()) return;
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)); } catch { /* diagnostics are best effort */ }
}

export const Mission01TelemetryDiagnostics = {
  increment(key: Mission01TelemetryDiagnosticKey): void {
    if (!isQaRuntime()) return;
    const snapshot = read();
    snapshot[key] += 1;
    write(snapshot);
  },

  snapshot(): Mission01TelemetryDiagnosticsSnapshot {
    return read();
  },

  reset(): void {
    if (!isQaRuntime()) return;
    write({ ...EMPTY });
  },
};

if (typeof window !== 'undefined' && isQaRuntime()) {
  Object.defineProperty(window, 'apulabTelemetryDiagnostics', {
    configurable: true,
    enumerable: false,
    value: () => Mission01TelemetryDiagnostics.snapshot(),
  });
}

declare global {
  interface Window {
    apulabTelemetryDiagnostics?: () => Mission01TelemetryDiagnosticsSnapshot;
  }
}
