\set ON_ERROR_STOP on
BEGIN;

-- Migration 5 index contract.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM pg_indexes
  WHERE schemaname='public'
    AND indexname IN (
      'idx_apulab_events_type',
      'idx_apulab_events_participant',
      'idx_apulab_events_event_id_unique',
      'idx_apulab_sessions_participant_v2'
    );
  IF n <> 0 THEN RAISE EXCEPTION 'redundant research indexes still present: %', n; END IF;

  SELECT count(*) INTO n FROM pg_indexes
  WHERE schemaname='public'
    AND indexname IN (
      'idx_apulab_events_event_type',
      'idx_apulab_events_participant_id',
      'idx_apulab_sessions_participant_id',
      'idx_apulab_study_assignments_participant_id',
      'apulab_events_pkey'
    );
  IF n <> 5 THEN RAISE EXCEPTION 'required research indexes missing: expected 5, got %', n; END IF;
END $$;

-- Selected historical NOT VALID constraints must now be fully validated.
DO $$
DECLARE invalid_names text;
BEGIN
  SELECT string_agg(c.conname, ', ' ORDER BY c.conname)
  INTO invalid_names
  FROM pg_constraint c
  JOIN pg_class r ON r.oid=c.conrelid
  JOIN pg_namespace n ON n.oid=r.relnamespace
  WHERE n.nspname='public'
    AND c.conname IN (
      'apulab_sessions_no_raw_participant_code',
      'apulab_events_no_raw_participant_code',
      'apulab_events_payload_size',
      'apulab_events_level_check',
      'apulab_events_event_seq_check',
      'apulab_events_environment_check',
      'apulab_sessions_environment_check',
      'apulab_sessions_study_consistency_v2',
      'apulab_sessions_sync_token_hash_length'
    )
    AND NOT c.convalidated;
  IF invalid_names IS NOT NULL THEN
    RAISE EXCEPTION 'pre-QA constraints still NOT VALID: %', invalid_names;
  END IF;
END $$;

-- Security remains fail-closed.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n
  FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace
  WHERE ns.nspname='public'
    AND c.relname IN (
      'apulab_participants','apulab_auth_attempts','apulab_sessions','apulab_events',
      'apulab_posttest_responses','apulab_studies','apulab_study_assignments'
    )
    AND c.relrowsecurity;
  IF n <> 7 THEN RAISE EXCEPTION 'RLS must remain enabled on all research tables, got %/7', n; END IF;

  SELECT count(*) INTO n FROM information_schema.role_table_grants
  WHERE grantee IN ('anon','authenticated')
    AND table_schema='public'
    AND table_name IN (
      'apulab_participants','apulab_auth_attempts','apulab_sessions','apulab_events',
      'apulab_posttest_responses','apulab_studies','apulab_study_assignments',
      'v_level6_science_metrics','v_level7_instrument_metrics'
    );
  IF n <> 0 THEN RAISE EXCEPTION 'browser roles unexpectedly retain research grants: %', n; END IF;
END $$;

-- Participants used only inside this rolled-back disposable assertion transaction.
INSERT INTO apulab_participants(participant_id,participant_code_hash,credential_hash,is_active) VALUES
('00000000-0000-4000-8000-000000000601',repeat('a',64),repeat('1',64),true),
('00000000-0000-4000-8000-000000000602',repeat('b',64),repeat('2',64),true),
('00000000-0000-4000-8000-000000000603',repeat('c',64),repeat('3',64),true),
('00000000-0000-4000-8000-000000000701',repeat('d',64),repeat('4',64),true),
('00000000-0000-4000-8000-000000000702',repeat('e',64),repeat('5',64),true),
('00000000-0000-4000-8000-000000000703',repeat('f',64),repeat('6',64),true);

INSERT INTO apulab_sessions(
  session_id,participant_id,participant_code,study_id,study_condition,session_mode,environment,
  build_version,git_commit_sha,schema_version,protocol_version,started_at,status,event_seq_last,
  screen_width,screen_height,user_agent
) VALUES
('m5-n6-valid','00000000-0000-4000-8000-000000000601',NULL,'APULAB-STUDY-2026','game','study','study','TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1',now(),'in_progress',5,1280,720,'web'),
('m5-n6-invalid','00000000-0000-4000-8000-000000000602',NULL,'APULAB-STUDY-2026','game','study','study','TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1',now(),'in_progress',5,1280,720,'web'),
('m5-n6-missing','00000000-0000-4000-8000-000000000603',NULL,'APULAB-STUDY-2026','game','study','study','TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1',now(),'in_progress',4,1280,720,'web'),
('m5-n7-valid','00000000-0000-4000-8000-000000000701',NULL,'APULAB-STUDY-2026','game','study','study','TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1',now(),'in_progress',8,1280,720,'web'),
('m5-n7-invalid','00000000-0000-4000-8000-000000000702',NULL,'APULAB-STUDY-2026','game','study','study','TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1',now(),'in_progress',3,1280,720,'web'),
('m5-n7-missing','00000000-0000-4000-8000-000000000703',NULL,'APULAB-STUDY-2026','game','study','study','TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1',now(),'in_progress',2,1280,720,'web');

-- N6 valid canonical order.
INSERT INTO apulab_events(event_id,session_id,participant_id,participant_code,study_id,study_condition,session_mode,environment,build_version,git_commit_sha,schema_version,protocol_version,scene_id,level_number,event_type,event_seq,payload,elapsed_ms,timestamp,client_timestamp,received_at,sync_status) VALUES
('00000000-0000-4000-8000-000000006001','m5-n6-valid','00000000-0000-4000-8000-000000000601',NULL,'APULAB-STUDY-2026','game','study','study','TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',6,'scan_completed',1,'{}',100,now(),now(),now(),'synced'),
('00000000-0000-4000-8000-000000006002','m5-n6-valid','00000000-0000-4000-8000-000000000601',NULL,'APULAB-STUDY-2026','game','study','study','TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',6,'analyze_completed',2,'{}',200,now(),now(),now(),'synced'),
('00000000-0000-4000-8000-000000006003','m5-n6-valid','00000000-0000-4000-8000-000000000601',NULL,'APULAB-STUDY-2026','game','study','study','TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',6,'communication_point_reached',3,'{}',300,now(),now(),now(),'synced'),
('00000000-0000-4000-8000-000000006004','m5-n6-valid','00000000-0000-4000-8000-000000000601',NULL,'APULAB-STUDY-2026','game','study','study','TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',6,'data_sent',4,'{"used_repeat_n6":false}',400,now(),now(),now(),'synced'),
('00000000-0000-4000-8000-000000006005','m5-n6-valid','00000000-0000-4000-8000-000000000601',NULL,'APULAB-STUDY-2026','game','study','study','TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',6,'level_completed',5,'{}',500,now(),now(),now(),'synced');

-- N6 invalid: send occurs before communication point.
INSERT INTO apulab_events(event_id,session_id,participant_id,participant_code,study_id,study_condition,session_mode,environment,build_version,git_commit_sha,schema_version,protocol_version,scene_id,level_number,event_type,event_seq,payload,elapsed_ms,timestamp,client_timestamp,received_at,sync_status) VALUES
('00000000-0000-4000-8000-000000006011','m5-n6-invalid','00000000-0000-4000-8000-000000000602',NULL,'APULAB-STUDY-2026','game','study','study','TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',6,'scan_completed',1,'{}',100,now(),now(),now(),'synced'),
('00000000-0000-4000-8000-000000006012','m5-n6-invalid','00000000-0000-4000-8000-000000000602',NULL,'APULAB-STUDY-2026','game','study','study','TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',6,'analyze_completed',2,'{}',200,now(),now(),now(),'synced'),
('00000000-0000-4000-8000-000000006013','m5-n6-invalid','00000000-0000-4000-8000-000000000602',NULL,'APULAB-STUDY-2026','game','study','study','TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',6,'data_sent',3,'{}',300,now(),now(),now(),'synced'),
('00000000-0000-4000-8000-000000006014','m5-n6-invalid','00000000-0000-4000-8000-000000000602',NULL,'APULAB-STUDY-2026','game','study','study','TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',6,'communication_point_reached',4,'{}',400,now(),now(),now(),'synced'),
('00000000-0000-4000-8000-000000006015','m5-n6-invalid','00000000-0000-4000-8000-000000000602',NULL,'APULAB-STUDY-2026','game','study','study','TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',6,'level_completed',5,'{}',500,now(),now(),now(),'synced');

-- N6 incomplete: no data_sent event.
INSERT INTO apulab_events(event_id,session_id,participant_id,participant_code,study_id,study_condition,session_mode,environment,build_version,git_commit_sha,schema_version,protocol_version,scene_id,level_number,event_type,event_seq,payload,elapsed_ms,timestamp,client_timestamp,received_at,sync_status) VALUES
('00000000-0000-4000-8000-000000006021','m5-n6-missing','00000000-0000-4000-8000-000000000603',NULL,'APULAB-STUDY-2026','game','study','study','TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',6,'scan_completed',1,'{}',100,now(),now(),now(),'synced'),
('00000000-0000-4000-8000-000000006022','m5-n6-missing','00000000-0000-4000-8000-000000000603',NULL,'APULAB-STUDY-2026','game','study','study','TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',6,'analyze_completed',2,'{}',200,now(),now(),now(),'synced'),
('00000000-0000-4000-8000-000000006023','m5-n6-missing','00000000-0000-4000-8000-000000000603',NULL,'APULAB-STUDY-2026','game','study','study','TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',6,'communication_point_reached',3,'{}',300,now(),now(),now(),'synced'),
('00000000-0000-4000-8000-000000006024','m5-n6-missing','00000000-0000-4000-8000-000000000603',NULL,'APULAB-STUDY-2026','game','study','study','TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',6,'level_completed',4,'{}',400,now(),now(),now(),'synced');

-- N7 valid: communication point -> explicit send -> completion.
INSERT INTO apulab_events(event_id,session_id,participant_id,participant_code,study_id,study_condition,session_mode,environment,build_version,git_commit_sha,schema_version,protocol_version,scene_id,level_number,event_type,event_seq,payload,elapsed_ms,timestamp,client_timestamp,received_at,sync_status) VALUES
('00000000-0000-4000-8000-000000007001','m5-n7-valid','00000000-0000-4000-8000-000000000701',NULL,'APULAB-STUDY-2026','game','study','study','TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',7,'sample_reached',1,'{}',100,now(),now(),now(),'synced'),
('00000000-0000-4000-8000-000000007002','m5-n7-valid','00000000-0000-4000-8000-000000000701',NULL,'APULAB-STUDY-2026','game','study','study','TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',7,'sample_analyze_requested',2,'{}',200,now(),now(),now(),'synced'),
('00000000-0000-4000-8000-000000007003','m5-n7-valid','00000000-0000-4000-8000-000000000701',NULL,'APULAB-STUDY-2026','game','study','study','TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',7,'instrument_selected',3,'{"instrument_type":"materials","selection_order":1,"relevant_to_question":true}',300,now(),now(),now(),'synced'),
('00000000-0000-4000-8000-000000007004','m5-n7-valid','00000000-0000-4000-8000-000000000701',NULL,'APULAB-STUDY-2026','game','study','study','TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',7,'sample_analyzed',4,'{}',400,now(),now(),now(),'synced'),
('00000000-0000-4000-8000-000000007005','m5-n7-valid','00000000-0000-4000-8000-000000000701',NULL,'APULAB-STUDY-2026','game','study','study','TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',7,'relevant_instrument_selected',5,'{}',500,now(),now(),now(),'synced'),
('00000000-0000-4000-8000-000000007006','m5-n7-valid','00000000-0000-4000-8000-000000000701',NULL,'APULAB-STUDY-2026','game','study','study','TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',7,'communication_point_reached',6,'{}',600,now(),now(),now(),'synced'),
('00000000-0000-4000-8000-000000007007','m5-n7-valid','00000000-0000-4000-8000-000000000701',NULL,'APULAB-STUDY-2026','game','study','study','TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',7,'data_sent',7,'{"used_repeat_n7":false}',700,now(),now(),now(),'synced'),
('00000000-0000-4000-8000-000000007008','m5-n7-valid','00000000-0000-4000-8000-000000000701',NULL,'APULAB-STUDY-2026','game','study','study','TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',7,'level_completed',8,'{}',800,now(),now(),now(),'synced');

-- N7 invalid: send before checkpoint.
INSERT INTO apulab_events(event_id,session_id,participant_id,participant_code,study_id,study_condition,session_mode,environment,build_version,git_commit_sha,schema_version,protocol_version,scene_id,level_number,event_type,event_seq,payload,elapsed_ms,timestamp,client_timestamp,received_at,sync_status) VALUES
('00000000-0000-4000-8000-000000007011','m5-n7-invalid','00000000-0000-4000-8000-000000000702',NULL,'APULAB-STUDY-2026','game','study','study','TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',7,'data_sent',1,'{}',100,now(),now(),now(),'synced'),
('00000000-0000-4000-8000-000000007012','m5-n7-invalid','00000000-0000-4000-8000-000000000702',NULL,'APULAB-STUDY-2026','game','study','study','TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',7,'communication_point_reached',2,'{}',200,now(),now(),now(),'synced'),
('00000000-0000-4000-8000-000000007013','m5-n7-invalid','00000000-0000-4000-8000-000000000702',NULL,'APULAB-STUDY-2026','game','study','study','TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',7,'level_completed',3,'{}',300,now(),now(),now(),'synced');

-- N7 incomplete: checkpoint reached but explicit send never happens.
INSERT INTO apulab_events(event_id,session_id,participant_id,participant_code,study_id,study_condition,session_mode,environment,build_version,git_commit_sha,schema_version,protocol_version,scene_id,level_number,event_type,event_seq,payload,elapsed_ms,timestamp,client_timestamp,received_at,sync_status) VALUES
('00000000-0000-4000-8000-000000007021','m5-n7-missing','00000000-0000-4000-8000-000000000703',NULL,'APULAB-STUDY-2026','game','study','study','TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',7,'communication_point_reached',1,'{}',100,now(),now(),now(),'synced'),
('00000000-0000-4000-8000-000000007022','m5-n7-missing','00000000-0000-4000-8000-000000000703',NULL,'APULAB-STUDY-2026','game','study','study','TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',7,'level_completed',2,'{}',200,now(),now(),now(),'synced');

DO $$
DECLARE good boolean; bad boolean; missing boolean;
BEGIN
  SELECT science_order_correct INTO good FROM v_level6_science_metrics WHERE participant_id='00000000-0000-4000-8000-000000000601';
  SELECT science_order_correct INTO bad FROM v_level6_science_metrics WHERE participant_id='00000000-0000-4000-8000-000000000602';
  SELECT science_order_correct INTO missing FROM v_level6_science_metrics WHERE participant_id='00000000-0000-4000-8000-000000000603';
  IF good IS DISTINCT FROM true THEN RAISE EXCEPTION 'N6 canonical order must be true'; END IF;
  IF bad IS DISTINCT FROM false THEN RAISE EXCEPTION 'N6 send-before-communication must be false'; END IF;
  IF missing IS DISTINCT FROM false THEN RAISE EXCEPTION 'N6 missing data_sent must be false'; END IF;

  SELECT communication_send_order_correct INTO good FROM v_level7_instrument_metrics WHERE participant_id='00000000-0000-4000-8000-000000000701';
  SELECT communication_send_order_correct INTO bad FROM v_level7_instrument_metrics WHERE participant_id='00000000-0000-4000-8000-000000000702';
  SELECT communication_send_order_correct INTO missing FROM v_level7_instrument_metrics WHERE participant_id='00000000-0000-4000-8000-000000000703';
  IF good IS DISTINCT FROM true THEN RAISE EXCEPTION 'N7 communication-send-complete order must be true'; END IF;
  IF bad IS DISTINCT FROM false THEN RAISE EXCEPTION 'N7 send-before-communication must be false'; END IF;
  IF missing IS DISTINCT FROM false THEN RAISE EXCEPTION 'N7 missing data_sent must be false'; END IF;
END $$;

ROLLBACK;
