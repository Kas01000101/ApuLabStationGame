\set ON_ERROR_STOP on
BEGIN;

-- Migration 6 constraints exist and are validated.
DO $$
DECLARE missing text;
BEGIN
  SELECT string_agg(expected.name, ', ' ORDER BY expected.name)
  INTO missing
  FROM (VALUES
    ('apulab_station_assignments_game_only'),
    ('apulab_station_sessions_game_only'),
    ('apulab_station_events_game_only')
  ) AS expected(name)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conname=expected.name AND c.convalidated
  );
  IF missing IS NOT NULL THEN RAISE EXCEPTION 'Station game-only constraints missing or unvalidated: %', missing; END IF;
END $$;

INSERT INTO apulab_participants(participant_id,participant_code_hash,credential_hash,is_active) VALUES
('00000000-0000-4000-8000-000000000801',repeat('a',64),repeat('1',64),true),
('00000000-0000-4000-8000-000000000802',repeat('b',64),repeat('2',64),true);

-- game assignment succeeds.
INSERT INTO apulab_study_assignments(study_id,participant_id,study_condition,assignment_method,is_active)
VALUES ('APULAB-STUDY-2026','00000000-0000-4000-8000-000000000801','game','manual_protocol',true);

-- Any non-game assignment must be rejected by the Station-only guard.
DO $$ BEGIN
  BEGIN
    INSERT INTO apulab_study_assignments(study_id,participant_id,study_condition,assignment_method,is_active)
    VALUES ('APULAB-STUDY-2026','00000000-0000-4000-8000-000000000802','static_control','manual_protocol',true);
    RAISE EXCEPTION 'non-game assignment unexpectedly accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;

-- game study session succeeds.
INSERT INTO apulab_sessions(
  session_id,participant_id,participant_code,study_id,study_condition,session_mode,environment,
  build_version,git_commit_sha,schema_version,protocol_version,started_at,status,event_seq_last,
  screen_width,screen_height,user_agent
) VALUES (
  '00000000-0000-4000-8000-000000008011','00000000-0000-4000-8000-000000000801',NULL,
  'APULAB-STUDY-2026','game','study','study','TEST-BUILD','TEST-SHA','apulab-telemetry-v2',
  'apulab-protocol-2026-v1',now(),'in_progress',0,1280,720,'web'
);

-- non-game study session must fail.
DO $$ BEGIN
  BEGIN
    INSERT INTO apulab_sessions(
      session_id,participant_id,participant_code,study_id,study_condition,session_mode,environment,
      build_version,git_commit_sha,schema_version,protocol_version,started_at,status,event_seq_last,
      screen_width,screen_height,user_agent
    ) VALUES (
      '00000000-0000-4000-8000-000000008012','00000000-0000-4000-8000-000000000801',NULL,
      'APULAB-STUDY-2026','static_control','study','study','TEST-BUILD','TEST-SHA','apulab-telemetry-v2',
      'apulab-protocol-2026-v1',now(),'in_progress',0,1280,720,'web'
    );
    RAISE EXCEPTION 'non-game study session unexpectedly accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;

-- demo + NULL remains valid.
INSERT INTO apulab_sessions(
  session_id,participant_id,participant_code,session_mode,environment,build_version,git_commit_sha,
  schema_version,protocol_version,started_at,status,event_seq_last,screen_width,screen_height,user_agent
) VALUES (
  '00000000-0000-4000-8000-000000008013',NULL,NULL,'demo','development','TEST-BUILD','TEST-SHA',
  'apulab-telemetry-v2','apulab-protocol-2026-v1',now(),'in_progress',0,1280,720,'web'
);

-- game event succeeds.
INSERT INTO apulab_events(
  event_id,session_id,participant_id,participant_code,study_id,study_condition,session_mode,environment,
  build_version,git_commit_sha,schema_version,protocol_version,scene_id,level_number,event_type,event_seq,
  payload,timestamp,client_timestamp,received_at,sync_status
) VALUES (
  '00000000-0000-4000-8000-000000008021','00000000-0000-4000-8000-000000008011',
  '00000000-0000-4000-8000-000000000801',NULL,'APULAB-STUDY-2026','game','study','study',
  'TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',1,
  'level_started',1,'{}',now(),now(),now(),'synced'
);

-- non-game event must fail even when its session_id points at a valid Station session.
DO $$ BEGIN
  BEGIN
    INSERT INTO apulab_events(
      event_id,session_id,participant_id,participant_code,study_id,study_condition,session_mode,environment,
      build_version,git_commit_sha,schema_version,protocol_version,scene_id,level_number,event_type,event_seq,
      payload,timestamp,client_timestamp,received_at,sync_status
    ) VALUES (
      '00000000-0000-4000-8000-000000008022','00000000-0000-4000-8000-000000008011',
      '00000000-0000-4000-8000-000000000801',NULL,'APULAB-STUDY-2026','static_control','study','study',
      'TEST-BUILD','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1','mission01',1,
      'level_started',2,'{}',now(),now(),now(),'synced'
    );
    RAISE EXCEPTION 'non-game study event unexpectedly accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;

-- Migration 5 analytical contract remains present.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM information_schema.columns
  WHERE table_schema='public' AND table_name='v_level7_instrument_metrics'
    AND column_name='communication_send_order_correct';
  IF n <> 1 THEN RAISE EXCEPTION 'Migration 5 N7 metric missing after Migration 6'; END IF;

  SELECT count(*) INTO n FROM information_schema.columns
  WHERE table_schema='public' AND table_name='v_level6_science_metrics'
    AND column_name='science_order_correct';
  IF n <> 1 THEN RAISE EXCEPTION 'Migration 5 N6 metric missing after Migration 6'; END IF;
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
    ) AND c.relrowsecurity;
  IF n <> 7 THEN RAISE EXCEPTION 'RLS must remain enabled on all research tables, got %/7', n; END IF;

  SELECT count(*) INTO n FROM information_schema.role_table_grants
  WHERE grantee IN ('anon','authenticated') AND table_schema='public'
    AND table_name IN (
      'apulab_participants','apulab_auth_attempts','apulab_sessions','apulab_events',
      'apulab_posttest_responses','apulab_studies','apulab_study_assignments',
      'v_official_study_events','v_qa_events','v_level_outcomes','v_level5_loop_metrics',
      'v_level6_science_metrics','v_level7_instrument_metrics','v_session_quality'
    );
  IF n <> 0 THEN RAISE EXCEPTION 'browser roles unexpectedly retain research grants: %', n; END IF;
END $$;

-- Legacy compatibility path must preserve its pre-existing rows if present.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM apulab_sessions WHERE session_id='legacy-session')
     AND NOT EXISTS (SELECT 1 FROM apulab_events WHERE event_id::text='legacy-event-1') THEN
    RAISE EXCEPTION 'legacy event was lost during forward Station hardening';
  END IF;
END $$;

ROLLBACK;
