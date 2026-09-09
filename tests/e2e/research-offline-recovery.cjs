const { chromium } = require('playwright');

const BASE_URL = process.env.APULAB_BASE_URL || 'http://127.0.0.1:4174';
const assert = (condition, message) => { if (!condition) throw new Error(message); };

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

    // Close the document while it is still offline so the existing SyncService
    // online listener cannot drain the queue before the restart assertion.
    await page.close();
    await context.setOffline(false);
    page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    const persistedBeforeRecovery = await page.evaluate(async (sessionId) => {
      const { LocalQueueService } = await import('/src/systems/LocalQueueService.ts');
      return {
        queued: LocalQueueService.getEventsBySession(sessionId).map((event) => ({ event_id: event.event_id, event_seq: event.event_seq })),
        completion: LocalQueueService.getPendingCompletion(sessionId),
        context: LocalQueueService.getSessionContext(sessionId),
      };
    }, offline.sessionId);

    assert(persistedBeforeRecovery.queued.length === offline.queued.length, 'document restart must preserve every pending offline event');
    assert(persistedBeforeRecovery.completion, 'document restart must preserve pending completion');
    assert(persistedBeforeRecovery.context, 'document restart must preserve session sync context');
    for (let i = 0; i < offline.queued.length; i += 1) {
      assert(persistedBeforeRecovery.queued[i].event_id === offline.queued[i].event_id, 'event_id changed across document restart');
      assert(persistedBeforeRecovery.queued[i].event_seq === offline.queued[i].event_seq, 'event_seq changed across document restart');
    }

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
