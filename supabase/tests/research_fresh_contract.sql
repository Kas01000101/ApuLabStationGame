\set ON_ERROR_STOP on
BEGIN;

DO $$ BEGIN
  IF to_regclass('public.apulab_studies') IS NULL THEN RAISE EXCEPTION 'missing apulab_studies'; END IF;
  IF to_regclass('public.apulab_study_assignments') IS NULL THEN RAISE EXCEPTION 'missing apulab_study_assignments'; END IF;
  IF to_regclass('public.v_level7_instrument_metrics') IS NULL THEN RAISE EXCEPTION 'missing N7 view'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid='public.apulab_events'::regclass AND relrowsecurity) THEN RAISE EXCEPTION 'RLS disabled on events'; END IF;
  IF has_table_privilege('anon','public.apulab_events','SELECT') THEN RAISE EXCEPTION 'anon can select events'; END IF;
  IF has_table_privilege('authenticated','public.apulab_events','SELECT') THEN RAISE EXCEPTION 'authenticated can select events'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='v_level7_instrument_metrics' AND column_name IN ('data_sent','communication_time_ms','communication_send_order_correct')) THEN RAISE EXCEPTION 'contaminated N7 metric columns remain'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='v_level7_instrument_metrics' AND column_name='final_point_before_completion') THEN RAISE EXCEPTION 'missing canonical N7 final point metric'; END IF;

  IF NOT has_table_privilege('service_role','public.apulab_participants','SELECT') THEN RAISE EXCEPTION 'service_role missing participant SELECT'; END IF;
  IF NOT has_table_privilege('service_role','public.apulab_studies','SELECT') THEN RAISE EXCEPTION 'service_role missing studies SELECT'; END IF;
  IF NOT has_table_privilege('service_role','public.apulab_study_assignments','SELECT') THEN RAISE EXCEPTION 'service_role missing assignment SELECT'; END IF;
  IF NOT has_table_privilege('service_role','public.apulab_auth_attempts','SELECT,INSERT') THEN RAISE EXCEPTION 'service_role auth_attempt grants incorrect'; END IF;
  IF NOT has_table_privilege('service_role','public.apulab_sessions','SELECT,INSERT,UPDATE') THEN RAISE EXCEPTION 'service_role session grants incorrect'; END IF;
  IF NOT has_table_privilege('service_role','public.apulab_events','SELECT,INSERT') THEN RAISE EXCEPTION 'service_role event grants incorrect'; END IF;
  IF has_table_privilege('service_role','public.apulab_events','UPDATE') OR has_table_privilege('service_role','public.apulab_events','DELETE') THEN RAISE EXCEPTION 'service_role has excessive event mutation grants'; END IF;
  IF has_table_privilege('service_role','public.apulab_participants','INSERT') OR has_table_privilege('service_role','public.apulab_participants','UPDATE') OR has_table_privilege('service_role','public.apulab_participants','DELETE') THEN RAISE EXCEPTION 'service_role has excessive participant mutation grants'; END IF;
END $$;

INSERT INTO apulab_participants(participant_id,participant_code_hash,credential_hash,is_active)
VALUES ('00000000-0000-4000-8000-000000000701','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',true);
INSERT INTO apulab_study_assignments(study_id,participant_id,study_condition,assignment_method,is_active)
VALUES ('APULAB-STUDY-2026','00000000-0000-4000-8000-000000000701','game','manual_protocol',true);
INSERT INTO apulab_sessions(session_id,participant_id,participant_code,study_id,study_condition,session_mode,environment,build_version,git_commit_sha,schema_version,protocol_version,started_at,status,event_seq_last,sync_token_hash,screen_width,screen_height,user_agent)
VALUES ('00000000-0000-4000-8000-000000000702','00000000-0000-4000-8000-000000000701',NULL,'APULAB-STUDY-2026','game','study','study','APULAB-STUDY-RC.1','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1',now(),'in_progress',0,repeat('x',43),1280,720,'web');

INSERT INTO apulab_events(event_id,session_id,participant_id,participant_code,study_id,study_condition,session_mode,environment,build_version,git_commit_sha,schema_version,protocol_version,scene_id,level_number,event_type,event_seq,payload,client_timestamp,received_at,sync_status)
VALUES (gen_random_uuid(),'00000000-0000-4000-8000-000000000702','00000000-0000-4000-8000-000000000701',NULL,'APULAB-STUDY-2026','game','study','study','APULAB-STUDY-RC.1','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',6,'data_sent',1,'{}',now(),now(),'synced');

INSERT INTO apulab_events(event_id,session_id,participant_id,participant_code,study_id,study_condition,session_mode,environment,build_version,git_commit_sha,schema_version,protocol_version,scene_id,level_number,event_type,event_seq,payload,elapsed_ms,client_timestamp,received_at,sync_status)
VALUES (gen_random_uuid(),'00000000-0000-4000-8000-000000000702','00000000-0000-4000-8000-000000000701',NULL,'APULAB-STUDY-2026','game','study','study','APULAB-STUDY-RC.1','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',7,'final_point_reached',2,'{}',1200,now(),now(),'synced');

DO $$ BEGIN
  BEGIN
    INSERT INTO apulab_events(event_id,session_id,participant_id,study_id,study_condition,session_mode,environment,build_version,schema_version,protocol_version,scene_id,level_number,event_type,event_seq,payload)
    VALUES (gen_random_uuid(),'00000000-0000-4000-8000-000000000702','00000000-0000-4000-8000-000000000701','APULAB-STUDY-2026','game','study','study','APULAB-STUDY-RC.1','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',7,'data_sent',3,'{}');
    RAISE EXCEPTION 'N7 data_sent unexpectedly accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO apulab_events(event_id,session_id,participant_id,study_id,study_condition,session_mode,environment,build_version,schema_version,protocol_version,scene_id,level_number,event_type,event_seq,payload)
    VALUES (gen_random_uuid(),'00000000-0000-4000-8000-000000000702','00000000-0000-4000-8000-000000000701','APULAB-STUDY-2026','game','study','study','APULAB-STUDY-RC.1','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',7,'communication_point_reached',3,'{}');
    RAISE EXCEPTION 'N7 communication_point_reached unexpectedly accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO apulab_study_assignments(study_id,participant_id,study_condition,assignment_method)
    VALUES ('APULAB-QA-2026','00000000-0000-4000-8000-000000000701','static_control','qa');
    RAISE EXCEPTION 'static_control unexpectedly accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE apulab_sessions SET participant_code='RAW-CODE' WHERE session_id='00000000-0000-4000-8000-000000000702';
    RAISE EXCEPTION 'raw participant code unexpectedly accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO apulab_events(event_id,session_id,participant_id,study_id,study_condition,session_mode,environment,build_version,schema_version,protocol_version,scene_id,level_number,event_type,event_seq,payload)
    VALUES (gen_random_uuid(),'00000000-0000-4000-8000-000000000702','00000000-0000-4000-8000-000000000701','APULAB-STUDY-2026','game','study','study','APULAB-STUDY-RC.1','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',8,'level_started',4,'{}');
    RAISE EXCEPTION 'invalid level unexpectedly accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO apulab_events(event_id,session_id,participant_id,study_id,study_condition,session_mode,environment,build_version,schema_version,protocol_version,scene_id,level_number,event_type,event_seq,payload)
    VALUES (gen_random_uuid(),'00000000-0000-4000-8000-000000000702','00000000-0000-4000-8000-000000000701','APULAB-STUDY-2026','game','study','study','APULAB-STUDY-RC.1','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',7,'level_started',0,'{}');
    RAISE EXCEPTION 'event_seq=0 unexpectedly accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO apulab_events(event_id,session_id,participant_id,study_id,study_condition,session_mode,environment,build_version,schema_version,protocol_version,scene_id,level_number,event_type,event_seq,payload)
    VALUES (gen_random_uuid(),'00000000-0000-4000-8000-000000000702','00000000-0000-4000-8000-000000000701','APULAB-STUDY-2026','game','study','study','APULAB-STUDY-RC.1','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',7,'level_started',4,jsonb_build_object('blob',repeat('x',9000)));
    RAISE EXCEPTION 'oversized payload unexpectedly accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;

ROLLBACK;
