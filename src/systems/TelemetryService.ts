import { GameState } from './GameState';
import { LocalQueueService } from './LocalQueueService';
import { SyncService } from './SyncService';
import { canonicalizeEventType } from '../research/telemetry/eventRegistry';
import { sanitizeTelemetryPayload } from '../research/telemetry/payloads';
import { RESEARCH_CONFIG } from '../config/researchConfig';

export type RecordEventOptions = {
  levelNumber?: number | null;
  taskId?: string | null;
  attemptNumber?: number | null;
  elapsedMs?: number | null;
  result?: string | null;
  errorCode?: string | null;
  hintUsed?: boolean;
};

export class TelemetryService {
  private static instance?: TelemetryService;
  private readonly levelStart = new Map<number, number>();

  static getInstance(): TelemetryService { return this.instance ??= new TelemetryService(); }

  markLevelStarted(level: number): void { this.levelStart.set(level, performance.now()); }

  recordEvent(eventType: string, payload: Record<string, unknown> = {}, options: RecordEventOptions = {}): void {
    try {
      const canonical = canonicalizeEventType(eventType);
      if (!canonical) return;
      const state = GameState.getInstance();
      const levelNumber = options.levelNumber ?? inferLevel(payload);
      const levelStartedAt = levelNumber ? this.levelStart.get(levelNumber) : undefined;
      const elapsedMs = options.elapsedMs ?? (levelStartedAt == null ? null : Math.max(0, Math.round(performance.now() - levelStartedAt)));

      // Parent owns all study/session identity. Strip any identity fields emitted by an iframe.
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
      } = payload;

      const safePayload = sanitizeTelemetryPayload(behaviorPayload, RESEARCH_CONFIG.maxPayloadBytes);
      LocalQueueService.addEvent({
        event_id: crypto.randomUUID(),
        session_id: state.sessionId,
        event_seq: state.nextEventSeq(),
        scene_id: state.currentScene,
        level_number: levelNumber,
        task_id: options.taskId ?? readString(safePayload.task_id),
        event_type: canonical,
        attempt_number: options.attemptNumber ?? readPositiveInt(safePayload.attempt_number),
        elapsed_ms: elapsedMs,
        payload: safePayload,
        result: options.result ?? readString(safePayload.result),
        error_code: options.errorCode ?? readString(safePayload.error_code),
        hint_used: options.hintUsed ?? safePayload.hint_used === true,
        timestamp: new Date().toISOString(),
        sync_status: 'pending',
      });
      void SyncService.processQueue();
    } catch (error) {
      // Telemetry must never stop gameplay.
      console.warn('[ApuLab] Telemetry event was not recorded.', error);
    }
  }
}

function inferLevel(payload: Record<string, unknown>): number | null {
  const raw = payload.level_number ?? payload.level;
  return Number.isInteger(raw) && Number(raw) >= 1 && Number(raw) <= 7 ? Number(raw) : null;
}
function readPositiveInt(value: unknown): number | null { return Number.isInteger(value) && Number(value) >= 1 ? Number(value) : null; }
function readString(value: unknown): string | null { return typeof value === 'string' && value.trim() ? value.trim() : null; }
