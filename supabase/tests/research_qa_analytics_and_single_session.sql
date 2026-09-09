\set ON_ERROR_STOP on
BEGIN;

DO $$ BEGIN
  IF to_regclass('public.v_qa_level_outcomes') IS NULL THEN RAISE EXCEPTION 'missing v_qa_level_outcomes'; END IF;
  IF to_regclass('public.v_qa_level5_loop_metrics') IS NULL THEN RAISE EXCEPTION 'missing v_qa_level5_loop_metrics'; END IF;
  IF to_regclass('public.v_qa_level6_science_metrics') IS NULL THEN RAISE EXCEPTION 'missing v_qa_level6_science_metrics'; END IF;
  IF to_regclass('public.v_qa_level7_instrument_metrics') IS NULL THEN RAISE EXCEPTION 'missing v_qa_level7_instrument_metrics'; END IF;
  IF to_regclass('public.v_qa_session_quality') IS NULL THEN RAISE EXCEPTION 'missing v_qa_session_quality'; END IF;
  IF to_regclass('public.uq_apulab_sessions_one_active_study') IS NULL THEN RAISE EXCEPTION 'missing active-session guard index'; END IF;
  IF has_table_privilege('anon','public.v_qa_level_outcomes','SELECT') THEN RAISE EXCEPTION 'anon can read QA analytics'; END IF;
  IF has_table_privilege('authenticated','public.v_qa_level_outcomes','SELECT') THEN RAISE EXCEPTION 'authenticated can read QA analytics'; END IF;
  IF NOT has_table_privilege('service_role','public.v_qa_level_outcomes','SELECT') THEN RAISE EXCEPTION 'service_role missing QA analytics SELECT'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE oid='public.v_qa_level_outcomes'::regclass
      AND reloptions @> ARRAY['security_invoker=true']
  ) THEN RAISE EXCEPTION 'QA analytics not security_invoker'; END IF;
END $$;

INSERT INTO apulab_participants(participant_id,participant_code_hash,credential_hash,is_active)
VALUES ('00000000-0000-4000-8000-000000001101',repeat('q',43),repeat('r',43),true);
INSERT INTO apulab_study_assignments(study_id,participant_id,study_condition,assignment_method,is_active)
VALUES ('APULAB-QA-2026','00000000-0000-4000-8000-000000001101','game','qa',true);

INSERT INTO apulab_sessions(session_id,participant_id,participant_code,study_id,study_condition,session_mode,environment,build_version,git_commit_sha,schema_version,protocol_version,started_at,status,event_seq_last,sync_token_hash,screen_width,screen_height,user_agent)
VALUES ('00000000-0000-4000-8000-000000001102','00000000-0000-4000-8000-000000001101',NULL,'APULAB-QA-2026','game','study','preview','APULAB-STUDY-1.0.0','QA-TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1',now(),'in_progress',0,repeat('s',43),1280,720,'web');

DO $$ BEGIN
  BEGIN
    INSERT INTO apulab_sessions(session_id,participant_id,participant_code,study_id,study_condition,session_mode,environment,build_version,git_commit_sha,schema_version,protocol_version,started_at,status,event_seq_last,sync_token_hash,screen_width,screen_height,user_agent)
    VALUES ('00000000-0000-4000-8000-000000001103','00000000-0000-4000-8000-000000001101',NULL,'APULAB-QA-2026','game','study','preview','APULAB-STUDY-1.0.0','QA-TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1',now(),'in_progress',0,repeat('t',43),1280,720,'web');
    RAISE EXCEPTION 'second active study session unexpectedly accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;

INSERT INTO apulab_events(event_id,session_id,participant_id,participant_code,study_id,study_condition,session_mode,environment,build_version,git_commit_sha,schema_version,protocol_version,scene_id,level_number,event_type,event_seq,payload,elapsed_ms,client_timestamp,received_at,sync_status)
SELECT gen_random_uuid(),'00000000-0000-4000-8000-000000001102','00000000-0000-4000-8000-000000001101',NULL,'APULAB-QA-2026','game','study','preview','APULAB-STUDY-1.0.0','QA-TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',level,event_type,seq,payload,seq*100,now(),now(),'synced'
FROM (VALUES
  (5,'level_started',1,'{}'::jsonb),
  (5,'initial_program_completed',2,'{"blocks_before":10}'::jsonb),
  (5,'pattern_highlighted',3,'{}'::jsonb),
  (5,'repeat_unlocked',4,'{}'::jsonb),
  (5,'repeat_added',5,'{"repeat_n":6,"repeat_instances":2}'::jsonb),
  (5,'program_refactored',6,'{"blocks_after":5,"reduction_pct":50}'::jsonb),
  (5,'level_completed',7,'{}'::jsonb),
  (6,'level_started',8,'{}'::jsonb),
  (6,'scan_completed',9,'{}'::jsonb),
  (6,'analyze_completed',10,'{}'::jsonb),
  (6,'communication_point_reached',11,'{}'::jsonb),
  (6,'data_sent',12,'{}'::jsonb),
  (6,'level_completed',13,'{}'::jsonb),
  (7,'level_started',14,'{}'::jsonb),
  (7,'instrument_selected',15,'{"instrument_type":"material","relevant_to_question":true,"selection_order":1}'::jsonb),
  (7,'relevant_instrument_selected',16,'{}'::jsonb),
  (7,'final_point_reached',17,'{}'::jsonb),
  (7,'level_completed',18,'{}'::jsonb),
  (NULL,'session_completed',19,'{}'::jsonb)
) AS x(level,event_type,seq,payload);

DO $$ BEGIN
  IF (SELECT count(*) FROM public.v_qa_events WHERE session_id='00000000-0000-4000-8000-000000001102') <> 19 THEN RAISE EXCEPTION 'QA event view count mismatch'; END IF;
  IF (SELECT count(*) FROM public.v_official_study_events WHERE session_id='00000000-0000-4000-8000-000000001102') <> 0 THEN RAISE EXCEPTION 'QA leaked into official events'; END IF;
  IF (SELECT count(*) FROM public.v_qa_level_outcomes WHERE session_id='00000000-0000-4000-8000-000000001102') <> 3 THEN RAISE EXCEPTION 'QA level outcomes mismatch'; END IF;
  IF (SELECT count(*) FROM public.v_level_outcomes WHERE session_id='00000000-0000-4000-8000-000000001102') <> 0 THEN RAISE EXCEPTION 'QA leaked into official level outcomes'; END IF;
  IF NOT (SELECT loop_flow_correct FROM public.v_qa_level5_loop_metrics WHERE session_id='00000000-0000-4000-8000-000000001102') THEN RAISE EXCEPTION 'N5 loop flow not recognized'; END IF;
  IF NOT (SELECT science_order_correct AND data_sent FROM public.v_qa_level6_science_metrics WHERE session_id='00000000-0000-4000-8000-000000001102') THEN RAISE EXCEPTION 'N6 science flow not recognized'; END IF;
  IF NOT (SELECT final_point_reached AND final_point_before_completion AND NOT unexpected_communication_point AND NOT unexpected_data_sent FROM public.v_qa_level7_instrument_metrics WHERE session_id='00000000-0000-4000-8000-000000001102') THEN RAISE EXCEPTION 'N7 QA metrics incorrect'; END IF;
  IF NOT (SELECT min_level=5 AND max_level=7 AND missing_level_started AND missing_level_completed AND incomplete_session FROM public.v_qa_session_quality WHERE session_id='00000000-0000-4000-8000-000000001102') THEN RAISE EXCEPTION 'QA session quality should expose missing N1-N4'; END IF;
END $$;

ROLLBACK;
