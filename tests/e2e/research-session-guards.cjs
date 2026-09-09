const { chromium } = require('playwright');

const BASE_URL = process.env.APULAB_GUARD_BASE_URL || 'http://127.0.0.1:4175';
const EDGE_PREFIX = `${BASE_URL}/fake-edge`;
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const PARTICIPANT_ID = '22222222-2222-4222-8222-222222222222';
const STUDY_ID = 'APULAB-QA-2026';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const server = { active: null, events: [] };

  const installFakeEdge = async (context) => {
    await context.route(`${EDGE_PREFIX}/**`, async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname.replace('/fake-edge', '');
      const body = request.method() === 'POST' ? JSON.parse(request.postData() || '{}') : {};
      const reply = (status, payload) => route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      });

      if (path === '/authenticate') {
        return reply(200, { success: true, data: {
          participant_id: PARTICIPANT_ID,
          study_id: STUDY_ID,
          study_condition: 'game',
          session_proof: 'fake-proof-for-browser-regression',
        } });
      }

      if (path === '/session') {
        const session = body.session;
        if (!session || !body.session_sync_token) return reply(400, { success: false, error: 'body_invalid' });
        if (server.active && server.active.status !== 'completed' && server.active.session_id !== session.session_id) {
          return reply(409, { success: false, error: 'active_session_exists' });
        }
        if (!server.active || server.active.status === 'completed') {
          server.active = {
            ...session,
            sync_token: body.session_sync_token,
            status: 'in_progress',
            event_seq_last: 0,
          };
        }
        return reply(200, { success: true });
      }

      if (path === '/session/resume') {
        if (!server.active
          || server.active.session_id !== body.session_id
          || server.active.sync_token !== body.session_sync_token
          || server.active.status === 'completed') {
          return reply(403, { success: false, error: 'session_sync_token_invalid' });
        }
        return reply(200, { success: true, data: {
          session_id: server.active.session_id,
          participant_id: PARTICIPANT_ID,
          study_id: STUDY_ID,
          study_condition: 'game',
          status: server.active.status,
          event_seq_last: server.active.event_seq_last,
        } });
      }

      if (path === '/events') {
        const incoming = Array.isArray(body.events) ? body.events : [];
        for (const event of incoming) {
          if (!server.events.some((row) => row.event_id === event.event_id)) server.events.push(event);
          if (server.active && event.session_id === server.active.session_id) {
            server.active.event_seq_last = Math.max(server.active.event_seq_last, Number(event.event_seq) || 0);
          }
        }
        return reply(200, { success: true, accepted: incoming.length });
      }

      if (path === '/session/complete') {
        if (!server.active || server.active.session_id !== body.session_id || server.active.sync_token !== body.session_sync_token) {
          return reply(403, { success: false, error: 'session_sync_token_invalid' });
        }
        server.active.status = 'completed';
        return reply(200, { success: true });
      }

      return reply(404, { success: false, error: 'endpoint_not_found' });
    });
  };

  let context1;
  let context2;
  let lifecycleContext;
  try {
    context1 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    context2 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await installFakeEdge(context1);
    await installFakeEdge(context2);
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    await Promise.all([
      page1.goto(BASE_URL, { waitUntil: 'domcontentloaded' }),
      page2.goto(BASE_URL, { waitUntil: 'domcontentloaded' }),
    ]);

    const first = await page1.evaluate(async () => {
      localStorage.clear();
      const { SessionService } = await import('/src/systems/SessionService.ts');
      const { GameState } = await import('/src/systems/GameState.ts');
      const result = await new SessionService().startStudy('QT-001', 'browser-test-credential');
      return { result, sessionId: GameState.getInstance().sessionId };
    });
    assert(first.result.success === true, `first browser could not start study: ${JSON.stringify(first.result)}`);
    assert(server.active && server.active.session_id === first.sessionId, 'fake Edge did not retain first active session');

    const second = await page2.evaluate(async () => {
      localStorage.clear();
      const { SessionService } = await import('/src/systems/SessionService.ts');
      return new SessionService().startStudy('QT-001', 'browser-test-credential');
    });
    assert(second.success === false, 'second browser unexpectedly started a parallel study session');
    assert(/Ya existe una sesión activa/.test(second.error || ''), `second browser did not surface active-session message: ${second.error}`);
    assert(server.active.session_id === first.sessionId, 'parallel-browser rejection changed active session identity');

    // Same browser reload must re-authenticate and resume the server session with
    // the durable session_id + sync_token context instead of creating a new UUID.
    await page1.reload({ waitUntil: 'domcontentloaded' });
    const resumed = await page1.evaluate(async () => {
      const { SessionService } = await import('/src/systems/SessionService.ts');
      const { GameState } = await import('/src/systems/GameState.ts');
      const result = await new SessionService().startStudy('QT-001', 'browser-test-credential');
      return { result, sessionId: GameState.getInstance().sessionId, eventSeqLast: GameState.getInstance().eventSeqLast };
    });
    assert(resumed.result.success === true, `same-browser resume failed: ${JSON.stringify(resumed.result)}`);
    assert(resumed.sessionId === first.sessionId, 'same-browser reload created a different session_id');
    assert(resumed.eventSeqLast === server.active.event_seq_last, 'same-browser resume did not restore event_seq_last');

    await context1.close(); context1 = null;
    await context2.close(); context2 = null;

    // Start a fresh synthetic QA session for the parent-owned seven-level
    // lifecycle regression. This drives the real same-origin Mission01 iframes
    // from level1.html through level7.html and validates the Research events.
    server.active = null;
    server.events = [];
    lifecycleContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await installFakeEdge(lifecycleContext);
    const page = await lifecycleContext.newPage();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    const lifecycleStart = await page.evaluate(async () => {
      localStorage.clear();
      const { SessionService } = await import('/src/systems/SessionService.ts');
      const { GameState } = await import('/src/systems/GameState.ts');
      const { Mission01Screen } = await import('/src/ui/Mission01Screen.ts');
      const result = await new SessionService().startStudy('QT-001', 'browser-test-credential');
      if (!result.success) return { result };
      GameState.getInstance().setScene('mission01');
      const root = document.createElement('div');
      root.id = 'research-lifecycle-root';
      document.body.appendChild(root);
      const screen = new Mission01Screen(root);
      window.__researchLifecycleScreen = screen;
      screen.start(1);
      return { result, sessionId: GameState.getInstance().sessionId };
    });
    assert(lifecycleStart.result.success === true, `lifecycle session failed to start: ${JSON.stringify(lifecycleStart.result)}`);

    const selector = '#research-lifecycle-root iframe.mission01-frame';
    for (let level = 1; level <= 7; level += 1) {
      const expectedPath = `/missions/mission01/level${level}.html`;
      console.log(`[R5] waiting N${level}`);

      const locator = page.locator(selector);
      await locator.waitFor({ state: 'attached', timeout: 15000 });
      await page.waitForFunction(({ selector: frameSelector, expectedPath: path }) => {
        const node = document.querySelector(frameSelector);
        if (!node) return false;
        const src = node.getAttribute('src') || '';
        try { return new URL(src, window.location.href).pathname.endsWith(path); }
        catch { return false; }
      }, { selector, expectedPath }, { timeout: 15000 });

      const handle = await locator.elementHandle();
      assert(handle, `[R5] iframe handle missing for N${level}`);
      const frame = await handle.contentFrame();
      assert(frame, `[R5] contentFrame missing for N${level}`);
      await frame.waitForLoadState('domcontentloaded', { timeout: 15000 });
      await frame.waitForFunction(() => document.readyState === 'interactive' || document.readyState === 'complete', null, { timeout: 15000 });

      const actualPath = new URL(frame.url()).pathname;
      assert(actualPath.endsWith(expectedPath), `[R5] N${level} frame URL mismatch: ${frame.url()}`);

      // requestLevel() changes iframe.src before Mission01Screen commits the
      // transition on the next animation frames. Do not emit completion until
      // the parent has promoted this document to the active level.
      await page.waitForFunction(({ selector: frameSelector, expectedPath: path }) => {
        const node = document.querySelector(frameSelector);
        if (!node) return false;
        const src = node.getAttribute('src') || '';
        let pathMatches = false;
        try { pathMatches = new URL(src, window.location.href).pathname.endsWith(path); }
        catch { return false; }
        return pathMatches
          && node.classList.contains('is-active')
          && !node.classList.contains('is-loading')
          && node.getAttribute('aria-hidden') === 'false';
      }, { selector, expectedPath }, { timeout: 15000 });

      console.log(`[R5] N${level} ready`);

      await frame.evaluate((currentLevel) => {
        window.parent.postMessage({
          type: 'apulab-level-complete',
          level: currentLevel,
          nextLevel: currentLevel < 7 ? currentLevel + 1 : undefined,
        }, window.location.origin);
      }, level);

      if (level < 7) {
        const nextPath = `/missions/mission01/level${level + 1}.html`;
        await page.waitForFunction(({ selector: frameSelector, nextPath: path }) => {
          const node = document.querySelector(frameSelector);
          if (!node) return false;
          const src = node.getAttribute('src') || '';
          try { return new URL(src, window.location.href).pathname.endsWith(path); }
          catch { return false; }
        }, { selector, nextPath }, { timeout: 15000 });
      }
      console.log(`[R5] N${level} completed`);
    }

    await page.waitForFunction(() => {
      const raw = localStorage.getItem('apulab_telemetry_completion_v2');
      return !raw || Object.keys(JSON.parse(raw)).length === 0;
    }, null, { timeout: 15000 });
    await page.waitForTimeout(500);

    const lifecycleEvents = server.events
      .filter((event) => event.session_id === lifecycleStart.sessionId)
      .sort((a, b) => a.event_seq - b.event_seq);
    const starts = lifecycleEvents.filter((event) => event.event_type === 'level_started');
    const completes = lifecycleEvents.filter((event) => event.event_type === 'level_completed');
    const sessionCompletes = lifecycleEvents.filter((event) => event.event_type === 'session_completed');
    const levelsStarted = starts.map((event) => event.level_number);
    const levelsCompleted = completes.map((event) => event.level_number);

    assert(starts.length === 7, `expected 7 parent-owned level_started events, got ${starts.length}: ${JSON.stringify(levelsStarted)}`);
    assert(completes.length === 7, `expected 7 parent-owned level_completed events, got ${completes.length}: ${JSON.stringify(levelsCompleted)}`);
    assert(JSON.stringify(levelsStarted) === JSON.stringify([1,2,3,4,5,6,7]), `level_started order invalid: ${JSON.stringify(levelsStarted)}`);
    assert(JSON.stringify(levelsCompleted) === JSON.stringify([1,2,3,4,5,6,7]), `level_completed order invalid: ${JSON.stringify(levelsCompleted)}`);
    assert(sessionCompletes.length === 1, `expected one session_completed, got ${sessionCompletes.length}`);
    assert(server.active && server.active.status === 'completed', 'seven-level lifecycle did not complete the server session');

    const sequences = lifecycleEvents.map((event) => event.event_seq);
    assert(new Set(lifecycleEvents.map((event) => event.event_id)).size === lifecycleEvents.length, 'lifecycle event_id duplicate detected');
    assert(new Set(sequences).size === sequences.length, 'lifecycle event_seq duplicate detected');
    for (let i = 1; i < sequences.length; i += 1) assert(sequences[i] === sequences[i - 1] + 1, `lifecycle event_seq gap at ${sequences[i - 1]}→${sequences[i]}`);

    console.log(`Research session guard PASS · parallel browser blocked · resume=${first.sessionId}`);
    console.log(`Research lifecycle PASS · N1→N7 · starts=7 · completes=7 · session_completed=1 · events=${lifecycleEvents.length}`);
  } finally {
    if (context1) await context1.close().catch(() => {});
    if (context2) await context2.close().catch(() => {});
    if (lifecycleContext) await lifecycleContext.close().catch(() => {});
    await browser.close();
  }
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
