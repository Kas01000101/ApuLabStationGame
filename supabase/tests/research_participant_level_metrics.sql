\set ON_ERROR_STOP on
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.v_qa_participant_level_metrics') IS NULL THEN
    RAISE EXCEPTION 'missing v_qa_participant_level_metrics';
  END IF;
  IF to_regclass('public.v_participant_level_metrics') IS NULL THEN
    RAISE EXCEPTION 'missing v_participant_level_metrics';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE oid='public.v_qa_participant_level_metrics'::regclass
      AND reloptions @> ARRAY['security_invoker=true']
  ) THEN
    RAISE EXCEPTION 'QA participant metrics must be security_invoker';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE oid='public.v_participant_level_metrics'::regclass
      AND reloptions @> ARRAY['security_invoker=true']
  ) THEN
    RAISE EXCEPTION 'official participant metrics must be security_invoker';
  END IF;
  IF has_table_privilege('anon','public.v_qa_participant_level_metrics','SELECT')
     OR has_table_privilege('authenticated','public.v_qa_participant_level_metrics','SELECT') THEN
    RAISE EXCEPTION 'client roles can read QA participant metrics';
  END IF;
  IF has_table_privilege('anon','public.v_participant_level_metrics','SELECT')
     OR has_table_privilege('authenticated','public.v_participant_level_metrics','SELECT') THEN
    RAISE EXCEPTION 'client roles can read official participant metrics';
  END IF;
  IF NOT has_table_privilege('service_role','public.v_qa_participant_level_metrics','SELECT')
     OR NOT has_table_privilege('service_role','public.v_participant_level_metrics','SELECT') THEN
    RAISE EXCEPTION 'service_role missing participant metrics SELECT';
  END IF;
END $$;

INSERT INTO apulab_participants(participant_id,participant_code_hash,credential_hash,is_active)
VALUES ('00000000-0000-4000-8000-000000001201',repeat('m',43),repeat('n',43),true);

INSERT INTO apulab_study_assignments(study_id,participant_id,study_condition,assignment_method,is_active)
VALUES ('APULAB-QA-2026','00000000-0000-4000-8000-000000001201','game','qa',true);

INSERT INTO apulab_sessions(
  session_id,participant_id,participant_code,study_id,study_condition,session_mode,
  environment,build_version,git_commit_sha,schema_version,protocol_version,started_at,
  status,event_seq_last,sync_token_hash,screen_width,screen_height,user_agent
)
VALUES (
  '00000000-0000-4000-8000-000000001202',
  '00000000-0000-4000-8000-000000001201',
  NULL,'APULAB-QA-2026','game','study','preview','APULAB-STUDY-1.0.0',
  'ANALYTICS-QA-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1',
  now(),'completed',146,repeat('o',43),1280,720,'web'
);

INSERT INTO apulab_events(
  event_id,session_id,participant_id,participant_code,study_id,study_condition,session_mode,
  environment,build_version,git_commit_sha,schema_version,protocol_version,scene_id,
  level_number,event_type,event_seq,payload,elapsed_ms,client_timestamp,received_at,sync_status
)
SELECT gen_random_uuid(),'00000000-0000-4000-8000-000000001202',
  '00000000-0000-4000-8000-000000001201',NULL,'APULAB-QA-2026','game','study',
  'preview','APULAB-STUDY-1.0.0','ANALYTICS-QA-SHA','apulab-telemetry-v2',
  'apulab-protocol-2026-v1','mission01',level,event_type,seq,payload,seq*100,
  now(),now(),'synced'
FROM (VALUES
  (1,'level_started',1,'{}'::jsonb),
  (1,'measurement_attempt',2,'{}'::jsonb),
  (1,'measurement_attempt',3,'{}'::jsonb),
  (1,'valid_measurement',4,'{"reading":"15.0"}'::jsonb),
  (1,'level_completed',5,'{}'::jsonb),

  (2,'level_started',6,'{}'::jsonb),
  (2,'battery_selected',7,'{"battery_id":"B2","selection_order":1}'::jsonb),
  (2,'level_completed',8,'{}'::jsonb),

  (3,'level_started',9,'{}'::jsonb),
  (3,'program_started',16,'{"command_count":6}'::jsonb),
  (3,'goal_reached',17,'{}'::jsonb),
  (3,'level_completed',18,'{}'::jsonb),

  (4,'level_started',19,'{}'::jsonb),
  (4,'program_started',28,'{"command_count":8}'::jsonb),
  (4,'goal_reached',29,'{}'::jsonb),
  (4,'level_completed',30,'{}'::jsonb),

  (5,'level_started',31,'{}'::jsonb),
  (5,'program_started',32,'{}'::jsonb),
  (5,'program_started',33,'{}'::jsonb),
  (5,'goal_reached',34,'{}'::jsonb),
  (5,'initial_program_completed',35,'{}'::jsonb),
  (5,'pattern_highlighted',36,'{}'::jsonb),
  (5,'repeat_unlocked',37,'{}'::jsonb),
  (5,'repeat_count_changed',38,'{}'::jsonb),
  (5,'block_moved_into_repeat',39,'{}'::jsonb),
  (5,'program_refactored',40,'{}'::jsonb),
  (5,'program_started',62,'{}'::jsonb),
  (5,'goal_reached',63,'{}'::jsonb),
  (5,'level_completed',64,'{}'::jsonb),

  (6,'level_started',65,'{}'::jsonb),
  (6,'program_started',102,'{"attempt":9}'::jsonb),
  (6,'data_sent',103,'{"attempt":9,"science_order":["scan","analyze","send"]}'::jsonb),
  (6,'level_completed',104,'{}'::jsonb),

  (7,'level_started',105,'{}'::jsonb),
  (7,'instrument_selected',112,'{"instrument_type":"materials","relevant_to_question":true,"selection_order":1}'::jsonb),
  (7,'relevant_instrument_selected',113,'{"instrument_type":"materials"}'::jsonb),
  (7,'program_started',143,'{"attempt":7,"program_blocks":11,"used_repeat_n7":true,"repeat_instances_n7":2}'::jsonb),
  (7,'final_point_reached',144,'{"attempt":7}'::jsonb),
  (7,'level_completed',145,'{}'::jsonb),
  (NULL,'session_completed',146,'{}'::jsonb)
) AS x(level,event_type,seq,payload);

INSERT INTO apulab_events(
  event_id,session_id,participant_id,participant_code,study_id,study_condition,session_mode,
  environment,build_version,git_commit_sha,schema_version,protocol_version,scene_id,
  level_number,event_type,event_seq,payload,elapsed_ms,client_timestamp,received_at,sync_status
)
SELECT gen_random_uuid(),'00000000-0000-4000-8000-000000001202',
  '00000000-0000-4000-8000-000000001201',NULL,'APULAB-QA-2026','game','study',
  'preview','APULAB-STUDY-1.0.0','ANALYTICS-QA-SHA','apulab-telemetry-v2',
  'apulab-protocol-2026-v1','mission01',3,'program_modified',9+g,
  jsonb_build_object('before_count',g-1,'after_count',g),(9+g)*100,now(),now(),'synced'
FROM generate_series(1,6) g;

INSERT INTO apulab_events(
  event_id,session_id,participant_id,participant_code,study_id,study_condition,session_mode,
  environment,build_version,git_commit_sha,schema_version,protocol_version,scene_id,
  level_number,event_type,event_seq,payload,elapsed_ms,client_timestamp,received_at,sync_status
)
SELECT gen_random_uuid(),'00000000-0000-4000-8000-000000001202',
  '00000000-0000-4000-8000-000000001201',NULL,'APULAB-QA-2026','game','study',
  'preview','APULAB-STUDY-1.0.0','ANALYTICS-QA-SHA','apulab-telemetry-v2',
  'apulab-protocol-2026-v1','mission01',4,'program_modified',19+g,
  jsonb_build_object('before_count',g-1,'after_count',g),(19+g)*100,now(),now(),'synced'
FROM generate_series(1,8) g;

INSERT INTO apulab_events(
  event_id,session_id,participant_id,participant_code,study_id,study_condition,session_mode,
  environment,build_version,git_commit_sha,schema_version,protocol_version,scene_id,
  level_number,event_type,event_seq,payload,elapsed_ms,client_timestamp,received_at,sync_status
)
SELECT gen_random_uuid(),'00000000-0000-4000-8000-000000001202',
  '00000000-0000-4000-8000-000000001201',NULL,'APULAB-QA-2026','game','study',
  'preview','APULAB-STUDY-1.0.0','ANALYTICS-QA-SHA','apulab-telemetry-v2',
  'apulab-protocol-2026-v1','mission01',5,'program_modified',40+g,
  '{}'::jsonb,(40+g)*100,now(),now(),'synced'
FROM generate_series(1,21) g;

INSERT INTO apulab_events(
  event_id,session_id,participant_id,participant_code,study_id,study_condition,session_mode,
  environment,build_version,git_commit_sha,schema_version,protocol_version,scene_id,
  level_number,event_type,event_seq,payload,elapsed_ms,client_timestamp,received_at,sync_status
)
SELECT gen_random_uuid(),'00000000-0000-4000-8000-000000001202',
  '00000000-0000-4000-8000-000000001201',NULL,'APULAB-QA-2026','game','study',
  'preview','APULAB-STUDY-1.0.0','ANALYTICS-QA-SHA','apulab-telemetry-v2',
  'apulab-protocol-2026-v1','mission01',6,'program_started',65+g,
  jsonb_build_object('attempt',g),(65+g)*100,now(),now(),'synced'
FROM generate_series(1,8) g;

INSERT INTO apulab_events(
  event_id,session_id,participant_id,participant_code,study_id,study_condition,session_mode,
  environment,build_version,git_commit_sha,schema_version,protocol_version,scene_id,
  level_number,event_type,event_seq,payload,elapsed_ms,client_timestamp,received_at,sync_status
)
SELECT gen_random_uuid(),'00000000-0000-4000-8000-000000001202',
  '00000000-0000-4000-8000-000000001201',NULL,'APULAB-QA-2026','game','study',
  'preview','APULAB-STUDY-1.0.0','ANALYTICS-QA-SHA','apulab-telemetry-v2',
  'apulab-protocol-2026-v1','mission01',6,'premature_action',73+g,
  jsonb_build_object('attempt',g,'reason','test'),(73+g)*100,now(),now(),'synced'
FROM generate_series(1,7) g;

INSERT INTO apulab_events(
  event_id,session_id,participant_id,participant_code,study_id,study_condition,session_mode,
  environment,build_version,git_commit_sha,schema_version,protocol_version,scene_id,
  level_number,event_type,event_seq,payload,elapsed_ms,client_timestamp,received_at,sync_status
)
SELECT gen_random_uuid(),'00000000-0000-4000-8000-000000001202',
  '00000000-0000-4000-8000-000000001201',NULL,'APULAB-QA-2026','game','study',
  'preview','APULAB-STUDY-1.0.0','ANALYTICS-QA-SHA','apulab-telemetry-v2',
  'apulab-protocol-2026-v1','mission01',6,'program_modified',80+g,
  jsonb_build_object('attempt_number',8,'block_count',CASE WHEN g=21 THEN 9 ELSE LEAST(g,9) END),
  (80+g)*100,now(),now(),'synced'
FROM generate_series(1,21) g;

INSERT INTO apulab_events(
  event_id,session_id,participant_id,participant_code,study_id,study_condition,session_mode,
  environment,build_version,git_commit_sha,schema_version,protocol_version,scene_id,
  level_number,event_type,event_seq,payload,elapsed_ms,client_timestamp,received_at,sync_status
)
SELECT gen_random_uuid(),'00000000-0000-4000-8000-000000001202',
  '00000000-0000-4000-8000-000000001201',NULL,'APULAB-QA-2026','game','study',
  'preview','APULAB-STUDY-1.0.0','ANALYTICS-QA-SHA','apulab-telemetry-v2',
  'apulab-protocol-2026-v1','mission01',7,'program_started',105+g,
  jsonb_build_object('attempt',g,'program_blocks',g+3,'used_repeat_n7',true),
  (105+g)*100,now(),now(),'synced'
FROM generate_series(1,6) g;

INSERT INTO apulab_events(
  event_id,session_id,participant_id,participant_code,study_id,study_condition,session_mode,
  environment,build_version,git_commit_sha,schema_version,protocol_version,scene_id,
  level_number,event_type,event_seq,payload,elapsed_ms,client_timestamp,received_at,sync_status
)
SELECT gen_random_uuid(),'00000000-0000-4000-8000-000000001202',
  '00000000-0000-4000-8000-000000001201',NULL,'APULAB-QA-2026','game','study',
  'preview','APULAB-STUDY-1.0.0','ANALYTICS-QA-SHA','apulab-telemetry-v2',
  'apulab-protocol-2026-v1','mission01',7,'program_modified',113+g,
  jsonb_build_object('attempt',6,'blocks_final',11,'program_edit_count',g,'used_repeat_n7',true,'repeat_instances_n7',2),
  (113+g)*100,now(),now(),'synced'
FROM generate_series(1,29) g;

INSERT INTO apulab_participants(participant_id,participant_code_hash,credential_hash,is_active)
VALUES ('00000000-0000-4000-8000-000000001211',repeat('p',43),repeat('q',43),true);

INSERT INTO apulab_study_assignments(study_id,participant_id,study_condition,assignment_method,is_active)
VALUES ('APULAB-STUDY-2026','00000000-0000-4000-8000-000000001211','game','manual_protocol',true);

INSERT INTO apulab_sessions(
  session_id,participant_id,participant_code,study_id,study_condition,session_mode,
  environment,build_version,git_commit_sha,schema_version,protocol_version,started_at,
  status,event_seq_last,sync_token_hash,screen_width,screen_height,user_agent
)
VALUES (
  '00000000-0000-4000-8000-000000001212',
  '00000000-0000-4000-8000-000000001211',
  NULL,'APULAB-STUDY-2026','game','study','study','APULAB-STUDY-1.0.0',
  'ANALYTICS-OFFICIAL-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1',
  now(),'completed',3,repeat('r',43),1280,720,'web'
);

INSERT INTO apulab_events(
  event_id,session_id,participant_id,participant_code,study_id,study_condition,session_mode,
  environment,build_version,git_commit_sha,schema_version,protocol_version,scene_id,
  level_number,event_type,event_seq,payload,elapsed_ms,client_timestamp,received_at,sync_status
)
SELECT gen_random_uuid(),'00000000-0000-4000-8000-000000001212',
  '00000000-0000-4000-8000-000000001211',NULL,'APULAB-STUDY-2026','game','study',
  'study','APULAB-STUDY-1.0.0','ANALYTICS-OFFICIAL-SHA','apulab-telemetry-v2',
  'apulab-protocol-2026-v1','mission01',1,event_type,seq,'{}'::jsonb,seq*100,
  now(),now(),'synced'
FROM (VALUES
  ('measurement_attempt',1),
  ('valid_measurement',2),
  ('level_completed',3)
) AS x(event_type,seq);

DO $$
DECLARE
  r record;
BEGIN
  IF (SELECT count(*) FROM public.v_qa_participant_level_metrics
      WHERE session_id='00000000-0000-4000-8000-000000001202') <> 7 THEN
    RAISE EXCEPTION 'QA participant metrics must have 7 rows';
  END IF;

  IF (SELECT count(*) FROM public.v_participant_level_metrics
      WHERE session_id='00000000-0000-4000-8000-000000001202') <> 0 THEN
    RAISE EXCEPTION 'QA session leaked into official participant metrics';
  END IF;

  IF (SELECT count(*) FROM public.v_qa_participant_level_metrics
      WHERE session_id='00000000-0000-4000-8000-000000001212') <> 0 THEN
    RAISE EXCEPTION 'official session leaked into QA participant metrics';
  END IF;

  IF (SELECT count(*) FROM public.v_participant_level_metrics
      WHERE session_id='00000000-0000-4000-8000-000000001212') <> 1 THEN
    RAISE EXCEPTION 'official participant metric row missing';
  END IF;

  SELECT * INTO r FROM public.v_qa_participant_level_metrics
  WHERE session_id='00000000-0000-4000-8000-000000001202' AND level_number=1;
  IF r.attempts_to_goal<>2 OR r.attempts_to_complete<>2 OR NOT r.completed
     OR r.used_repeat IS NOT NULL THEN
    RAISE EXCEPTION 'N1 participant metrics incorrect';
  END IF;

  SELECT * INTO r FROM public.v_qa_participant_level_metrics
  WHERE session_id='00000000-0000-4000-8000-000000001202' AND level_number=2;
  IF r.attempts_to_goal<>1 OR r.attempts_to_complete<>1 OR NOT r.completed
     OR r.used_repeat IS NOT NULL THEN
    RAISE EXCEPTION 'N2 participant metrics incorrect';
  END IF;

  SELECT * INTO r FROM public.v_qa_participant_level_metrics
  WHERE session_id='00000000-0000-4000-8000-000000001202' AND level_number=3;
  IF r.attempts_to_goal<>1 OR r.attempts_to_complete<>1
     OR r.program_edits_before_success<>6 OR r.blocks_in_successful_program<>6
     OR r.used_repeat IS NOT NULL THEN
    RAISE EXCEPTION 'N3 participant metrics incorrect';
  END IF;

  SELECT * INTO r FROM public.v_qa_participant_level_metrics
  WHERE session_id='00000000-0000-4000-8000-000000001202' AND level_number=4;
  IF r.attempts_to_goal<>1 OR r.attempts_to_complete<>1
     OR r.program_edits_before_success<>8 OR r.blocks_in_successful_program<>8
     OR r.used_repeat IS NOT NULL THEN
    RAISE EXCEPTION 'N4 participant metrics incorrect';
  END IF;

  SELECT * INTO r FROM public.v_qa_participant_level_metrics
  WHERE session_id='00000000-0000-4000-8000-000000001202' AND level_number=5;
  IF r.attempts_to_goal<>2 OR r.attempts_to_complete<>3 OR r.attempts_before_complete<>2
     OR r.program_edits_before_success<>21 OR NOT r.used_repeat OR NOT r.completed
     OR NOT r.loop_flow_observed OR r.optimization_metrics_available
     OR r.blocks_in_successful_program IS NOT NULL THEN
    RAISE EXCEPTION 'N5 participant metrics incorrect';
  END IF;

  SELECT * INTO r FROM public.v_qa_participant_level_metrics
  WHERE session_id='00000000-0000-4000-8000-000000001202' AND level_number=6;
  IF r.attempts_to_goal<>9 OR r.attempts_to_complete<>9
     OR r.program_edits_before_success<>21 OR r.blocks_in_successful_program<>9
     OR r.explicit_failure_count<>7 OR r.used_repeat IS DISTINCT FROM false
     OR r.attempts_before_complete=r.explicit_failure_count THEN
    RAISE EXCEPTION 'N6 participant metrics incorrect';
  END IF;

  SELECT * INTO r FROM public.v_qa_participant_level_metrics
  WHERE session_id='00000000-0000-4000-8000-000000001202' AND level_number=7;
  IF r.attempts_to_goal<>7 OR r.attempts_to_complete<>7
     OR r.program_edits_before_success<>29 OR r.blocks_in_successful_program<>11
     OR r.used_repeat IS DISTINCT FROM true
     OR r.first_instrument IS DISTINCT FROM 'materials'
     OR r.final_instrument IS DISTINCT FROM 'materials'
     OR r.relevant_instrument_selected IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'N7 participant metrics incorrect';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.v_qa_participant_level_metrics
    WHERE session_id='00000000-0000-4000-8000-000000001202'
      AND (time_to_goal_ms IS NULL OR time_to_complete_ms IS NULL)
  ) THEN
    RAISE EXCEPTION 'time-to-goal/time-to-complete missing';
  END IF;

  IF (SELECT attempt_count FROM public.v_qa_level_outcomes
      WHERE session_id='00000000-0000-4000-8000-000000001202' AND level_number=1) <> 2 THEN
    RAISE EXCEPTION 'legacy QA outcome N1 attempt_count not canonicalized';
  END IF;

  IF (SELECT attempt_count FROM public.v_qa_level_outcomes
      WHERE session_id='00000000-0000-4000-8000-000000001202' AND level_number=2) <> 1 THEN
    RAISE EXCEPTION 'legacy QA outcome N2 attempt_count not canonicalized';
  END IF;
END $$;

ROLLBACK;
