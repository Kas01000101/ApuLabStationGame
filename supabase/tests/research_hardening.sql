\set ON_ERROR_STOP on
BEGIN;

-- Zero-event sessions must not manufacture a joined event row.
INSERT INTO apulab_sessions(
  session_id,participant_id,participant_code,session_mode,environment,build_version,git_commit_sha,schema_version,protocol_version,
  started_at,status,event_seq_last,screen_width,screen_height,user_agent
) VALUES (
  '00000000-0000-4000-8000-000000000101',NULL,NULL,'demo','development','TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1',
  now(),'in_progress',0,1280,720,'web'
);

DO $$
DECLARE q record;
BEGIN
  SELECT * INTO q FROM v_session_quality WHERE session_id='00000000-0000-4000-8000-000000000101';
  IF q.event_count <> 0 THEN RAISE EXCEPTION 'zero-event session event_count must be 0, got %', q.event_count; END IF;
  IF q.duplicate_event_seq THEN RAISE EXCEPTION 'zero-event session must not flag duplicate_event_seq'; END IF;
  IF NOT q.missing_level_started OR NOT q.missing_level_completed OR NOT q.missing_session_complete THEN
    RAISE EXCEPTION 'zero-event session missing flags are incorrect';
  END IF;
END $$;

-- N7 final instrument must use the last real selection/change ordered by event_seq.
INSERT INTO apulab_participants(participant_id,participant_code_hash,credential_hash,is_active)
VALUES ('00000000-0000-4000-8000-000000000201','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','pbkdf2_sha256$210000$abcdefghijklmnop$abcdefghijklmnopqrstuvwxyz1234567890ABCDE',true);
INSERT INTO apulab_study_assignments(study_id,participant_id,study_condition,assignment_method,is_active)
VALUES ('APULAB-STUDY-2026','00000000-0000-4000-8000-000000000201','game','manual_protocol',true);
INSERT INTO apulab_sessions(
  session_id,participant_id,participant_code,study_id,study_condition,session_mode,environment,build_version,git_commit_sha,schema_version,protocol_version,
  started_at,status,event_seq_last,screen_width,screen_height,user_agent
) VALUES (
  '00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000201',NULL,'APULAB-STUDY-2026','game','study','study',
  'APULAB-STUDY-RC.1','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1',now(),'in_progress',4,1280,720,'web'
);

INSERT INTO apulab_events(
  event_id,session_id,participant_id,participant_code,study_id,study_condition,session_mode,environment,build_version,git_commit_sha,schema_version,protocol_version,
  scene_id,level_number,event_type,event_seq,payload,timestamp,client_timestamp,received_at,sync_status
) VALUES
(gen_random_uuid(),'00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000201',NULL,'APULAB-STUDY-2026','game','study','study','APULAB-STUDY-RC.1','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',7,'instrument_selected',1,'{"instrument_type":"temperature","selection_order":1,"relevant_to_question":false}',now(),now(),now(),'synced'),
(gen_random_uuid(),'00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000201',NULL,'APULAB-STUDY-2026','game','study','study','APULAB-STUDY-RC.1','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',7,'instrument_changed',2,'{"from_instrument":"temperature","to_instrument":"materials","previous_result_relevant":false}',now(),now(),now(),'synced'),
(gen_random_uuid(),'00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000201',NULL,'APULAB-STUDY-2026','game','study','study','APULAB-STUDY-RC.1','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',7,'instrument_selected',3,'{"instrument_type":"materials","selection_order":2,"relevant_to_question":true}',now(),now(),now(),'synced'),
(gen_random_uuid(),'00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000201',NULL,'APULAB-STUDY-2026','game','study','study','APULAB-STUDY-RC.1','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',7,'level_completed',4,'{}',now(),now(),now(),'synced');

DO $$
DECLARE m record;
BEGIN
  SELECT * INTO m FROM v_level7_instrument_metrics WHERE participant_id='00000000-0000-4000-8000-000000000201';
  IF m.first_instrument <> 'temperature' THEN RAISE EXCEPTION 'first_instrument expected temperature, got %',m.first_instrument; END IF;
  IF m.final_instrument <> 'materials' THEN RAISE EXCEPTION 'final_instrument expected materials, got %',m.final_instrument; END IF;
  IF m.instrument_change_count <> 1 THEN RAISE EXCEPTION 'instrument_change_count expected 1'; END IF;
END $$;

-- Views must not be directly granted to browser roles.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM information_schema.role_table_grants
  WHERE grantee IN ('anon','authenticated')
    AND table_name IN ('v_official_study_events','v_qa_events','v_level_outcomes','v_level5_loop_metrics','v_level6_science_metrics','v_level7_instrument_metrics','v_session_quality');
  IF n <> 0 THEN RAISE EXCEPTION 'browser roles unexpectedly have view grants: %',n; END IF;
END $$;

ROLLBACK;
