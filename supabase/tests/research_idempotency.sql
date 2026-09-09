\set ON_ERROR_STOP on
BEGIN;
INSERT INTO apulab_participants(participant_id,participant_code_hash,credential_hash,is_active)
VALUES ('00000000-0000-4000-8000-000000000901','eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee','fffffffffffffffffffffffffffffffffffffffffff',true);
INSERT INTO apulab_study_assignments(study_id,participant_id,study_condition,assignment_method,is_active)
VALUES ('APULAB-STUDY-2026','00000000-0000-4000-8000-000000000901','game','manual_protocol',true);
INSERT INTO apulab_sessions(session_id,participant_id,participant_code,study_id,study_condition,session_mode,environment,build_version,git_commit_sha,schema_version,protocol_version,started_at,status,event_seq_last,sync_token_hash,screen_width,screen_height,user_agent)
VALUES ('00000000-0000-4000-8000-000000000902','00000000-0000-4000-8000-000000000901',NULL,'APULAB-STUDY-2026','game','study','study','APULAB-STUDY-RC.1','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1',now(),'in_progress',0,repeat('y',43),1280,720,'web');
INSERT INTO apulab_events(event_id,session_id,participant_id,study_id,study_condition,session_mode,environment,build_version,git_commit_sha,schema_version,protocol_version,scene_id,level_number,event_type,event_seq,payload,client_timestamp,received_at,sync_status)
VALUES ('00000000-0000-4000-8000-000000000903','00000000-0000-4000-8000-000000000902','00000000-0000-4000-8000-000000000901','APULAB-STUDY-2026','game','study','study','APULAB-STUDY-RC.1','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',1,'level_started',1,'{}',now(),now(),'synced');

DO $$ BEGIN
  BEGIN
    INSERT INTO apulab_events(event_id,session_id,participant_id,study_id,study_condition,session_mode,environment,build_version,git_commit_sha,schema_version,protocol_version,scene_id,level_number,event_type,event_seq,payload)
    VALUES ('00000000-0000-4000-8000-000000000903','00000000-0000-4000-8000-000000000902','00000000-0000-4000-8000-000000000901','APULAB-STUDY-2026','game','study','study','APULAB-STUDY-RC.1','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',1,'level_started',1,'{}');
    RAISE EXCEPTION 'duplicate event_id accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
    INSERT INTO apulab_events(event_id,session_id,participant_id,study_id,study_condition,session_mode,environment,build_version,git_commit_sha,schema_version,protocol_version,scene_id,level_number,event_type,event_seq,payload)
    VALUES (gen_random_uuid(),'00000000-0000-4000-8000-000000000902','00000000-0000-4000-8000-000000000901','APULAB-STUDY-2026','game','study','study','APULAB-STUDY-RC.1','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',1,'program_started',1,'{}');
    RAISE EXCEPTION 'duplicate session event_seq accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;

INSERT INTO apulab_events(event_id,session_id,participant_id,study_id,study_condition,session_mode,environment,build_version,git_commit_sha,schema_version,protocol_version,scene_id,level_number,event_type,event_seq,payload,client_timestamp,received_at,sync_status)
VALUES (gen_random_uuid(),'00000000-0000-4000-8000-000000000902','00000000-0000-4000-8000-000000000901','APULAB-STUDY-2026','game','study','study','APULAB-STUDY-RC.1','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',1,'level_completed',3,'{}',now(),now(),'synced');

DO $$ DECLARE q record; BEGIN
  SELECT * INTO q FROM v_session_quality WHERE session_id='00000000-0000-4000-8000-000000000902';
  IF NOT q.event_sequence_gap THEN RAISE EXCEPTION 'event sequence gap not detected'; END IF;
  IF q.duplicate_event_seq THEN RAISE EXCEPTION 'duplicate seq incorrectly present after rejected insert'; END IF;
  IF (SELECT count(*) FROM apulab_events WHERE event_id='00000000-0000-4000-8000-000000000903'::uuid) <> 1 THEN RAISE EXCEPTION 'event_id idempotency invariant broken'; END IF;
END $$;
ROLLBACK;
