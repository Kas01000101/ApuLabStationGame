const { chromium } = require('playwright');
const BASE_URL = process.env.APULAB_BASE_URL || 'http://127.0.0.1:4173';
const assert = (condition, message) => { if (!condition) throw new Error(message); };

(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  const page=await context.newPage();
  await page.goto(BASE_URL,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.apulabResearchQA,{timeout:10000});

  // Session A on a shared laptop. Keep its terminal N7 events offline.
  const a=await page.evaluate(()=>window.apulabResearchQA.startStudy('QT-001','qa-a'));
  assert(a.success,'Session A did not start');
  const aIdentity=await page.evaluate(()=>window.apulabResearchQA.snapshot().state);
  await context.setOffline(true);
  await page.evaluate(()=>{
    const qa=window.apulabResearchQA;
    qa.recordEvent('communication_point_reached',{rover_x:6,rover_y:6},7);
    qa.recordEvent('data_sent',{used_repeat_n7:false},7);
    qa.recordEvent('level_completed',{result:'success'},7);
  });
  const aCompleted=await page.evaluate(()=>window.apulabResearchQA.complete());
  assert(aCompleted===false,'Offline completion must remain pending locally');
  const aPending=await page.evaluate(()=>window.apulabResearchQA.snapshot());
  assert(aPending.state.status==='completed_pending_sync','Session A not marked completed_pending_sync');
  assert(aPending.pendingCompletions.some(x=>x.session_id===aPending.state.session_id),'Session A pending completion missing');

  // Start Session B before reconnecting. A's context must not be replaced or block B.
  const b=await page.evaluate(()=>window.apulabResearchQA.startStudy('QT-002','qa-b'));
  assert(b.success,'Session B did not start while A was pending');
  const bIdentity=await page.evaluate(()=>window.apulabResearchQA.snapshot().state);
  assert(aIdentity.session_id!==bIdentity.session_id,'Shared device reused session_id');
  assert(aIdentity.participant_id!==bIdentity.participant_id,'QT identities collapsed on shared device');
  await page.evaluate(()=>{
    const qa=window.apulabResearchQA;
    qa.recordEvent('level_started',{source:'shared-device-b'},1);
    qa.recordEvent('level_completed',{result:'success'},1);
  });
  const bCompleted=await page.evaluate(()=>window.apulabResearchQA.complete());
  assert(bCompleted===false,'Session B should also be pending while offline');

  await context.setOffline(false);
  await page.evaluate(()=>window.apulabResearchQA.flush());
  await page.waitForFunction(()=>{
    const pending=JSON.parse(localStorage.getItem('apulab_telemetry_events_v2')||'[]');
    const completions=JSON.parse(localStorage.getItem('apulab_telemetry_completion_v2')||'{}');
    const sessions=JSON.parse(localStorage.getItem('apulab_mock_sessions_v2')||'[]');
    return pending.length===0 && Object.keys(completions).length===0 && sessions.filter(s=>s.status==='completed').length>=2;
  },null,{timeout:15000});

  const result=await page.evaluate(()=>({
    events:JSON.parse(localStorage.getItem('apulab_mock_events_v2')||'[]'),
    sessions:JSON.parse(localStorage.getItem('apulab_mock_sessions_v2')||'[]'),
    pending:JSON.parse(localStorage.getItem('apulab_telemetry_events_v2')||'[]'),
    contexts:JSON.parse(localStorage.getItem('apulab_telemetry_session_context_v2')||'{}'),
  }));
  const aSession=result.sessions.find(s=>s.session_id===aIdentity.session_id);
  const bSession=result.sessions.find(s=>s.session_id===bIdentity.session_id);
  assert(aSession?.participant_id===aIdentity.participant_id,'Session A participant identity changed');
  assert(bSession?.participant_id===bIdentity.participant_id,'Session B participant identity changed');
  assert(aSession?.status==='completed'&&bSession?.status==='completed','Both sessions must complete after reconnect');
  const aEvents=result.events.filter(e=>e.session_id===aIdentity.session_id);
  const bEvents=result.events.filter(e=>e.session_id===bIdentity.session_id);
  for(const event of ['communication_point_reached','data_sent','level_completed','session_completed'])assert(aEvents.some(e=>e.event_type===event),`Session A lost ${event}`);
  assert(bEvents.some(e=>e.event_type==='level_started')&&bEvents.some(e=>e.event_type==='session_completed'),'Session B events missing');
  assert(result.pending.length===0,'Shared-device queue still pending');
  assert(!(aIdentity.session_id in result.contexts)&&!(bIdentity.session_id in result.contexts),'Settled session contexts were not released');

  await browser.close();
  console.log('[e2e] Research resilience OK · offline N7 completion · shared-device A→B isolation · reconnect drain');
})().catch(async(error)=>{console.error(error);process.exitCode=1;});
