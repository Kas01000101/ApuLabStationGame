const { chromium } = require('playwright');
const BASE_URL = process.env.APULAB_BASE_URL || 'http://127.0.0.1:4173';
const assert = (condition, message) => { if (!condition) throw new Error(message); };

(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];
  page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
  page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('Failed to load resource'))errors.push(`console: ${m.text()}`)});
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());
  await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  await page.goto(BASE_URL,{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'INICIAR MISIÓN'}).click();
  await page.getByRole('button',{name:'MODO DEMO'}).click();
  await page.getByRole('button',{name:'OMITIR INTRO'}).waitFor({state:'visible',timeout:20000});
  await page.getByRole('button',{name:'OMITIR INTRO'}).click();
  await page.locator('.mission01-frame').waitFor({state:'visible',timeout:15000});
  const frame=page.frames().find(f=>f.url().includes('/missions/mission01/level1.html'));
  assert(frame,'Mission iframe missing');

  // Protocol-only test: burst synthetic messages through the real parent bridge.
  // Physical gameplay telemetry is tested separately by mission01-research-physical.cjs.
  for(let level=1;level<=7;level++){
    await frame.evaluate(({level})=>parent.postMessage({type:'apulab-telemetry',level,event:'level_started',payload:{participant_id:'FORGED',session_id:'FORGED',study_id:'FORGED',study_condition:'FORGED',build_version:'FORGED'}},location.origin),{level});
    if(level===5)await frame.evaluate(()=>parent.postMessage({type:'apulab-telemetry',level:5,event:'program_refactored',payload:{blocks_before:10,blocks_after:6,repeat_instances:1,reduction_pct:40}},location.origin));
    if(level===6)await frame.evaluate(()=>parent.postMessage({type:'apulab-telemetry',level:6,event:'scan_completed',payload:{used_repeat_n6:false}},location.origin));
    if(level===7){
      await frame.evaluate(()=>parent.postMessage({type:'apulab-telemetry',level:7,event:'sample_reached',payload:{rover_x:5,rover_y:2,sample_x:5,sample_y:2,exact_cell:true}},location.origin));
      await frame.evaluate(()=>parent.postMessage({type:'apulab-telemetry',level:7,event:'communication_point_reached',payload:{rover_x:6,rover_y:6}},location.origin));
      await frame.evaluate(()=>parent.postMessage({type:'apulab-telemetry',level:7,event:'data_sent',payload:{used_repeat_n7:false}},location.origin));
    }
    await frame.evaluate(({level})=>parent.postMessage({type:'apulab-telemetry',level,event:'level_completed',payload:{result:'success'}},location.origin),{level});
  }

  // No arbitrary sleep: wait until the local queue is settled and the mock repository
  // contains the complete burst, including SessionService's terminal session_completed.
  await page.waitForFunction(()=>{
    const pending=JSON.parse(localStorage.getItem('apulab_telemetry_events_v2')||'[]');
    const persisted=JSON.parse(localStorage.getItem('apulab_mock_events_v2')||'[]');
    const sessions=JSON.parse(localStorage.getItem('apulab_mock_sessions_v2')||'[]');
    return pending.length===0 && persisted.length>=21 && sessions.some(s=>s.status==='completed');
  },null,{timeout:15000});

  const data=await page.evaluate(()=>({events:JSON.parse(localStorage.getItem('apulab_mock_events_v2')||'[]'),pending:JSON.parse(localStorage.getItem('apulab_telemetry_events_v2')||'[]'),sessions:JSON.parse(localStorage.getItem('apulab_mock_sessions_v2')||'[]')}));
  const events=data.events.sort((a,b)=>a.event_seq-b.event_seq);
  assert(events.length>=21,`expected research sequence, got ${events.length}`);
  assert(data.pending.length===0,`queue not settled: ${data.pending.length} pending events`);
  assert(events[0].event_type==='session_started','session_started must be first');
  for(let level=1;level<=7;level++){
    assert(events.some(e=>e.event_type==='level_started'&&e.level_number===level),`level_started N${level} missing`);
    assert(events.some(e=>e.event_type==='level_completed'&&e.level_number===level),`level_completed N${level} missing`);
  }
  assert(events.some(e=>e.event_type==='program_refactored'&&e.level_number===5),'N5 refactor missing');
  assert(events.some(e=>e.event_type==='scan_completed'&&e.level_number===6),'N6 science event missing');
  assert(events.some(e=>e.event_type==='sample_reached'&&e.level_number===7),'N7 exact-sample event missing');
  assert(events.some(e=>e.event_type==='communication_point_reached'&&e.level_number===7),'N7 communication event missing');
  assert(events.some(e=>e.event_type==='data_sent'&&e.level_number===7),'N7 data_sent missing');
  assert(events.some(e=>e.event_type==='session_completed'),'session_completed missing');
  for(let i=0;i<events.length;i++){
    assert(events[i].event_seq===i+1,`event_seq gap at ${i+1}`);
    const p=events[i].payload||{};
    for(const key of ['participant_id','session_id','study_id','study_condition','build_version'])assert(!(key in p),`iframe authority leaked: ${key}`);
  }
  assert(new Set(events.map(e=>e.event_id)).size===events.length,'duplicate event_id');
  assert(data.sessions.some(s=>s.status==='completed'),'mock session was not marked completed');
  assert(errors.length===0,`runtime errors:\n${errors.join('\n')}`);
  await browser.close();
  console.log(`[e2e] Research pipeline OK · ${events.length} ordered events · queue settled · parent authority · N1→N7 · session complete`);
})().catch(async e=>{console.error(e);process.exit(1)});
