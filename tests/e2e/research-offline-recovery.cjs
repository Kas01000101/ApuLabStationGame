const { chromium } = require('playwright');

const BASE_URL = process.env.APULAB_BASE_URL || 'http://127.0.0.1:4174';
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const EVENT_KEY = 'apulab_telemetry_events_v2';
const CONTEXT_KEY = 'apulab_telemetry_session_context_v2';
const COMPLETION_KEY = 'apulab_telemetry_completion_v2';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  let page = await context.newPage();

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    const initial = await page.evaluate(async () => {
      localStorage.clear();
      const { SessionService } = await import('/src/systems/SessionService.ts');
      const { TelemetryService } = await import('/src/systems/TelemetryService.ts');
      const { SyncService } = await import('/src/systems/SyncService.ts');
      const { LocalQueueService } = await import('/src/systems/LocalQueueService.ts');
      const { GameState } = await import('/src/systems/GameState.ts');

      const sessions = new SessionService();
      const started = await sessions.startDemo();
      if (!started) throw new Error('demo session did not start');
      await SyncService.flush();

      window.__apulabOfflineHarness = { sessions, TelemetryService, SyncService, LocalQueueService, GameState };
      return {
        sessionId: GameState.getInstance().sessionId,
        queueAfterStart: LocalQueueService.getEventsBySession(GameState.getInstance().sessionId).length,
      };
    });

    assert(initial.queueAfterStart === 0, 'online session_started should be synced before offline phase');

    await context.setOffline(true);
    const offline = await page.evaluate(async () => {
      const h = window.__apulabOfflineHarness;
      const telemetry = h.TelemetryService.getInstance();
      telemetry.markLevelStarted(5);
      for (let i = 1; i <= 20; i += 1) {
        telemetry.recordEvent('program_modified', { iteration: i }, { levelNumber: 5 });
      }
      const completed = await h.sessions.complete();
      const sessionId = h.GameState.getInstance().sessionId;
      const queued = h.LocalQueueService.getEventsBySession(sessionId);
      const completion = h.LocalQueueService.getPendingCompletion(sessionId);
      return {
        completed,
        status: h.GameState.getInstance().status,
        sessionId,
        queued: queued.map((event) => ({ event_id: event.event_id, event_seq: event.event_seq, event_type: event.event_type })),
        completion,
        context: h.LocalQueueService.getSessionContext(sessionId),
      };
    });

    assert(offline.completed === false, 'offline completion must not report synced completion');
    assert(offline.status === 'completed_pending_sync', 'offline session must remain completed_pending_sync');
    assert(offline.queued.length === 21, `expected 21 offline events, got ${offline.queued.length}`);
    assert(offline.completion && offline.completion.status === 'pending', 'completion must be pending while offline');
    assert(offline.context && offline.context.session_id === offline.sessionId, 'session sync context must survive offline');
    assert(new Set(offline.queued.map((event) => event.event_id)).size === offline.queued.length, 'offline event IDs must be unique');
    for (let i = 1; i < offline.queued.length; i += 1) {
      assert(offline.queued[i].event_seq === offline.queued[i - 1].event_seq + 1, 'offline event_seq must remain contiguous');
    }

    // Close the document while still offline, then inspect the browser context's
    // persisted localStorage directly. No application document is allowed to
    // bootstrap between persistence capture and these assertions.
    await page.close();
    const storageState = await context.storageState();
    const origin = new URL(BASE_URL).origin;
    const originState = storageState.origins.find((entry) => entry.origin === origin);
    assert(originState, `storageState missing origin ${origin}`);
    const local = new Map(originState.localStorage.map((entry) => [entry.name, entry.value]));
    const storedEvents = JSON.parse(local.get(EVENT_KEY) || '[]');
    const storedCompletions = JSON.parse(local.get(COMPLETION_KEY) || '{}');
    const storedContexts = JSON.parse(local.get(CONTEXT_KEY) || '{}');
    const persistedEvents = storedEvents
      .filter((event) => event.session_id === offline.sessionId && event.sync_status !== 'synced')
      .sort((a, b) => a.event_seq - b.event_seq)
      .map((event) => ({ event_id: event.event_id, event_seq: event.event_seq }));
    const persistedCompletion = storedCompletions[offline.sessionId] || null;
    const persistedContext = storedContexts[offline.sessionId] || null;

    assert(persistedEvents.length === offline.queued.length, 'document close must preserve every pending offline event');
    assert(persistedCompletion && persistedCompletion.status === 'pending', 'document close must preserve pending completion');
    assert(persistedContext && persistedContext.session_id === offline.sessionId, 'document close must preserve session sync context');
    for (let i = 0; i < offline.queued.length; i += 1) {
      assert(persistedEvents[i].event_id === offline.queued[i].event_id, 'event_id changed in persisted storage');
      assert(persistedEvents[i].event_seq === offline.queued[i].event_seq, 'event_seq changed in persisted storage');
    }

    // Only after persistence has been proven do we restore connectivity and
    // reopen the runtime. The normal online listener may start recovery before
    // this explicit flush; SyncService.flush() must remain reentrant/idempotent.
    await context.setOffline(false);
    page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    const recovered = await page.evaluate(async ({ sessionId, expected }) => {
      const { SyncService } = await import('/src/systems/SyncService.ts');
      const { LocalQueueService } = await import('/src/systems/LocalQueueService.ts');
      await SyncService.flush();
      const afterFlush = LocalQueueService.getEventsBySession(sessionId);
      const completionAfter = LocalQueueService.getPendingCompletion(sessionId);
      const contextAfter = LocalQueueService.getSessionContext(sessionId);
      const mockEvents = JSON.parse(localStorage.getItem('apulab_mock_events_v2') || '[]');
      const mockSessions = JSON.parse(localStorage.getItem('apulab_mock_sessions_v2') || '[]');
      const persistedById = new Map(mockEvents.map((event) => [event.event_id, event]));
      return {
        afterFlushCount: afterFlush.length,
        completionAfter,
        contextAfter,
        recoveredEvents: expected.map((event) => {
          const row = persistedById.get(event.event_id);
          return row ? { event_id: row.event_id, event_seq: row.event_seq } : null;
        }),
        session: mockSessions.find((session) => session.session_id === sessionId) || null,
      };
    }, { sessionId: offline.sessionId, expected: offline.queued });

    assert(recovered.afterFlushCount === 0, 'successful recovery flush must empty pending queue');
    assert(recovered.completionAfter === null, 'successful completion ACK must clear pending completion');
    assert(recovered.contextAfter === null, 'settled session must release sync context');
    assert(recovered.recoveredEvents.every(Boolean), 'every offline event_id must reach repository after recovery');
    for (let i = 0; i < offline.queued.length; i += 1) {
      assert(recovered.recoveredEvents[i].event_seq === offline.queued[i].event_seq, 'event_seq changed during recovery');
    }
    assert(recovered.session && recovered.session.status === 'completed', 'recovered mock session must be completed');

    console.log(`Research offline recovery PASS · session=${offline.sessionId} · events=${offline.queued.length}`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
