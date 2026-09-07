-- ApuLab Station · Research schema v2
-- Forward-only. Safe for an empty database after historical migrations and for legacy data.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS apulab_studies (
  study_id TEXT PRIMARY KEY,
  study_kind TEXT NOT NULL,
  study_version TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  protocol_version TEXT NOT NULL,
  telemetry_schema_version TEXT NOT NULL,
  study_build_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  CONSTRAINT apulab_studies_kind_check CHECK (study_kind IN ('qa','official')),
  CONSTRAINT apulab_studies_status_check CHECK (status IN ('draft','pilot','active','closed','archived'))
);

INSERT INTO apulab_studies(study_id,study_kind,study_version,title,status,protocol_version,telemetry_schema_version,study_build_version)
VALUES
 ('APULAB-QA-2026','qa','2026-v1','ApuLab internal QA 2026','draft','apulab-protocol-2026-v1','apulab-telemetry-v2','APULAB-STUDY-RC-2026-09-06'),
 ('APULAB-STUDY-2026','official','2026-v1','ApuLab official study 2026','draft','apulab-protocol-2026-v1','apulab-telemetry-v2','APULAB-STUDY-RC-2026-09-06')
ON CONFLICT (study_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS apulab_study_assignments (
  assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id TEXT NOT NULL REFERENCES apulab_studies(study_id) ON DELETE RESTRICT,
  participant_id UUID NOT NULL REFERENCES apulab_participants(participant_id) ON DELETE RESTRICT,
  study_condition TEXT NOT NULL,
  assignment_method TEXT NOT NULL,
  cohort_code TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT apulab_assignment_unique UNIQUE(study_id,participant_id),
  CONSTRAINT apulab_assignment_condition_check CHECK (study_condition IN ('game','static_control')),
  CONSTRAINT apulab_assignment_method_check CHECK (assignment_method IN ('random','classroom','manual_protocol','qa'))
);

ALTER TABLE apulab_sessions
  ADD COLUMN IF NOT EXISTS study_id TEXT,
  ADD COLUMN IF NOT EXISTS study_condition TEXT,
  ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL DEFAULT 'development',
  ADD COLUMN IF NOT EXISTS protocol_version TEXT,
  ADD COLUMN IF NOT EXISTS last_level SMALLINT,
  ADD COLUMN IF NOT EXISTS event_seq_last BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS input_mode TEXT;

ALTER TABLE apulab_events
  ADD COLUMN IF NOT EXISTS study_id TEXT,
  ADD COLUMN IF NOT EXISTS study_condition TEXT,
  ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL DEFAULT 'development',
  ADD COLUMN IF NOT EXISTS protocol_version TEXT,
  ADD COLUMN IF NOT EXISTS level_number SMALLINT,
  ADD COLUMN IF NOT EXISTS task_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS event_seq BIGINT,
  ADD COLUMN IF NOT EXISTS elapsed_ms BIGINT;

-- Backfill safe defaults for legacy rows. Legacy/demo data is never promoted into the official study.
UPDATE apulab_sessions SET protocol_version='legacy' WHERE protocol_version IS NULL;
UPDATE apulab_events SET protocol_version='legacy' WHERE protocol_version IS NULL;

DO $$ BEGIN
  ALTER TABLE apulab_sessions ADD CONSTRAINT apulab_sessions_study_fkey
    FOREIGN KEY(study_id) REFERENCES apulab_studies(study_id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE apulab_events ADD CONSTRAINT apulab_events_study_fkey
    FOREIGN KEY(study_id) REFERENCES apulab_studies(study_id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE apulab_sessions ADD CONSTRAINT apulab_sessions_condition_check
    CHECK (study_condition IS NULL OR study_condition IN ('game','static_control')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE apulab_events ADD CONSTRAINT apulab_events_condition_check
    CHECK (study_condition IS NULL OR study_condition IN ('game','static_control')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE apulab_sessions ADD CONSTRAINT apulab_sessions_environment_check
    CHECK (environment IN ('development','preview','study')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE apulab_events ADD CONSTRAINT apulab_events_environment_check
    CHECK (environment IN ('development','preview','study')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE apulab_sessions ADD CONSTRAINT apulab_sessions_study_consistency_v2
    CHECK (
      (session_mode::text='demo' AND participant_id IS NULL AND study_id IS NULL AND study_condition IS NULL)
      OR
      (session_mode::text='study' AND participant_id IS NOT NULL AND study_id IS NOT NULL AND study_condition IS NOT NULL)
    ) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE apulab_events ADD CONSTRAINT apulab_events_level_check
    CHECK (level_number IS NULL OR level_number BETWEEN 1 AND 7) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE apulab_events ADD CONSTRAINT apulab_events_event_seq_check
    CHECK (event_seq IS NULL OR event_seq >= 1) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE apulab_events ADD CONSTRAINT apulab_events_attempt_check
    CHECK (attempt_number IS NULL OR attempt_number >= 1) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE apulab_events ADD CONSTRAINT apulab_events_elapsed_check
    CHECK (elapsed_ms IS NULL OR elapsed_ms >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- event_id is UUID semantically. Convert legacy TEXT only when every existing value is safely castable.
DO $$
DECLARE coltype TEXT; invalid_count BIGINT;
BEGIN
  SELECT data_type INTO coltype FROM information_schema.columns
    WHERE table_schema='public' AND table_name='apulab_events' AND column_name='event_id';
  IF coltype IN ('text','character varying') THEN
    SELECT count(*) INTO invalid_count FROM apulab_events
      WHERE event_id IS NOT NULL AND event_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
    IF invalid_count = 0 THEN
      ALTER TABLE apulab_events ALTER COLUMN event_id TYPE UUID USING event_id::uuid;
    END IF;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_apulab_events_session_seq
  ON apulab_events(session_id,event_seq) WHERE event_seq IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_apulab_events_participant ON apulab_events(participant_id);
CREATE INDEX IF NOT EXISTS idx_apulab_events_study ON apulab_events(study_id);
CREATE INDEX IF NOT EXISTS idx_apulab_events_level ON apulab_events(level_number);
CREATE INDEX IF NOT EXISTS idx_apulab_events_event_type ON apulab_events(event_type);
CREATE INDEX IF NOT EXISTS idx_apulab_events_client_timestamp ON apulab_events(client_timestamp);
CREATE INDEX IF NOT EXISTS idx_apulab_sessions_participant_v2 ON apulab_sessions(participant_id);
CREATE INDEX IF NOT EXISTS idx_apulab_sessions_study ON apulab_sessions(study_id);
CREATE INDEX IF NOT EXISTS idx_apulab_assignments_study_condition ON apulab_study_assignments(study_id,study_condition);

ALTER TABLE apulab_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE apulab_study_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE apulab_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE apulab_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE apulab_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE apulab_studies FROM anon,authenticated;
REVOKE ALL ON TABLE apulab_study_assignments FROM anon,authenticated;
REVOKE ALL ON TABLE apulab_participants FROM anon,authenticated;
REVOKE ALL ON TABLE apulab_sessions FROM anon,authenticated;
REVOKE ALL ON TABLE apulab_events FROM anon,authenticated;

CREATE OR REPLACE VIEW v_official_study_events AS
SELECT * FROM apulab_events
WHERE study_id='APULAB-STUDY-2026' AND environment='study';

CREATE OR REPLACE VIEW v_qa_events AS
SELECT * FROM apulab_events WHERE study_id='APULAB-QA-2026';

CREATE OR REPLACE VIEW v_level_outcomes AS
SELECT participant_id,study_id,study_condition,level_number,build_version,
  bool_or(event_type='level_completed') AS completed,
  count(*) FILTER (WHERE event_type='program_started')::int AS attempt_count,
  count(*) FILTER (WHERE event_type='program_modified')::int AS program_edit_count,
  count(*) FILTER (WHERE event_type='help_requested')::int AS help_count,
  (min(attempt_number) FILTER (WHERE event_type='level_completed')=1) AS first_attempt_success,
  max(elapsed_ms) FILTER (WHERE event_type='level_completed') AS duration_ms,
  max(result) FILTER (WHERE event_type='level_completed') AS primary_outcome
FROM v_official_study_events
WHERE level_number BETWEEN 1 AND 7
GROUP BY participant_id,study_id,study_condition,level_number,build_version;

CREATE OR REPLACE VIEW v_level5_loop_metrics AS
WITH e AS (SELECT * FROM v_official_study_events WHERE level_number=5)
SELECT participant_id,
  max((payload->>'blocks_before')::int) FILTER (WHERE payload ? 'blocks_before') AS blocks_before,
  max((payload->>'blocks_after')::int) FILTER (WHERE payload ? 'blocks_after') AS blocks_after,
  max((payload->>'blocks_before')::int) FILTER (WHERE payload ? 'blocks_before') - max((payload->>'blocks_after')::int) FILTER (WHERE payload ? 'blocks_after') AS block_reduction,
  max((payload->>'reduction_pct')::numeric) FILTER (WHERE payload ? 'reduction_pct') AS reduction_pct,
  max((payload->>'repeat_n')::int) FILTER (WHERE payload ? 'repeat_n') AS repeat_n,
  max((payload->>'repeat_instances')::int) FILTER (WHERE payload ? 'repeat_instances') AS repeat_instances,
  min(elapsed_ms) FILTER (WHERE event_type='repeat_unlocked') AS time_to_repeat_unlock_ms,
  min(elapsed_ms) FILTER (WHERE event_type='repeat_added') AS time_to_first_repeat_use_ms,
  bool_or(event_type='program_refactored' AND coalesce(result,'') IN ('success','valid')) AS first_repeat_program_valid,
  max(elapsed_ms) FILTER (WHERE event_type='level_completed') AS completion_time_ms
FROM e GROUP BY participant_id;

CREATE OR REPLACE VIEW v_level6_science_metrics AS
WITH e AS (SELECT * FROM v_official_study_events WHERE level_number=6)
SELECT participant_id,
  (min(event_seq) FILTER (WHERE event_type='scan_completed') < min(event_seq) FILTER (WHERE event_type='analyze_completed')
   AND min(event_seq) FILTER (WHERE event_type='analyze_completed') < min(event_seq) FILTER (WHERE event_type='data_sent')) AS science_order_correct,
  count(*) FILTER (WHERE event_type='premature_action')::int AS premature_action_count,
  count(*) FILTER (WHERE event_type='program_modified')::int AS program_edit_count,
  bool_or(coalesce((payload->>'used_repeat_n6')::boolean,false)) AS used_repeat_n6,
  count(*) FILTER (WHERE event_type='program_started')::int AS attempt_count,
  max(elapsed_ms) FILTER (WHERE event_type='level_completed') AS completion_time_ms,
  bool_or(event_type='data_sent') AS data_sent
FROM e GROUP BY participant_id;

CREATE OR REPLACE VIEW v_level7_instrument_metrics AS
WITH e AS (SELECT * FROM v_official_study_events WHERE level_number=7)
SELECT participant_id,
  (array_agg(payload->>'instrument_type' ORDER BY event_seq) FILTER (WHERE event_type='instrument_selected'))[1] AS first_instrument,
  (array_agg(payload->>'instrument_type' ORDER BY event_seq DESC) FILTER (WHERE event_type IN ('instrument_selected','instrument_changed')))[1] AS final_instrument,
  bool_or(event_type='instrument_selected' AND coalesce((payload->>'relevant_to_question')::boolean,false) AND coalesce((payload->>'selection_order')::int,0)=1) AS first_choice_relevant,
  count(*) FILTER (WHERE event_type='instrument_selected')::int AS instrument_selection_count,
  count(*) FILTER (WHERE event_type='instrument_changed')::int AS instrument_change_count,
  bool_or(event_type='instrument_changed' AND coalesce((payload->>'previous_result_relevant')::boolean,true)=false) AS changed_after_irrelevant_feedback,
  min(elapsed_ms) FILTER (WHERE event_type='instrument_selected') AS time_to_first_choice_ms,
  min(elapsed_ms) FILTER (WHERE event_type='relevant_instrument_selected') AS time_to_relevant_choice_ms,
  bool_or(coalesce((payload->>'used_repeat_n7')::boolean,false)) AS used_repeat_n7,
  min(elapsed_ms) FILTER (WHERE event_type='communication_point_reached') AS communication_time_ms,
  bool_or(event_type='data_sent') AS data_sent,
  max(elapsed_ms) FILTER (WHERE event_type='level_completed') AS completion_time_ms
FROM e GROUP BY participant_id;

CREATE OR REPLACE VIEW v_session_quality AS
WITH base AS (
  SELECT s.session_id,s.participant_id,s.study_id,s.environment,s.build_version,s.schema_version,
    min(e.level_number) AS min_level,max(e.level_number) AS max_level,
    count(*) FILTER (WHERE e.event_type='session_completed') AS session_complete_count,
    count(*) FILTER (WHERE e.event_type='level_started') AS level_started_count,
    count(*) FILTER (WHERE e.event_type='level_completed') AS level_completed_count,
    count(*) FILTER (WHERE e.build_version IS DISTINCT FROM s.build_version) AS build_mismatch_count,
    count(*) FILTER (WHERE e.schema_version IS DISTINCT FROM s.schema_version) AS schema_mismatch_count,
    count(*) FILTER (WHERE e.level_number IS NOT NULL AND e.level_number NOT BETWEEN 1 AND 7) AS unexpected_level_count,
    count(*) AS event_count,count(DISTINCT e.event_seq) AS distinct_seq,max(e.event_seq)-min(e.event_seq)+1 AS expected_seq_span
  FROM apulab_sessions s LEFT JOIN apulab_events e USING(session_id)
  GROUP BY s.session_id,s.participant_id,s.study_id,s.environment,s.build_version,s.schema_version
)
SELECT *,
  (event_count<>distinct_seq) AS duplicate_event_seq,
  (event_count>0 AND expected_seq_span<>distinct_seq) AS event_sequence_gap,
  (level_started_count<7) AS missing_level_started,
  (level_completed_count<7) AS missing_level_completed,
  (session_complete_count=0) AS missing_session_complete,
  (build_mismatch_count>0) AS build_mismatch,
  (schema_mismatch_count>0) AS schema_mismatch,
  (unexpected_level_count>0) AS unexpected_level,
  (session_complete_count=0 OR level_completed_count<7) AS incomplete_session
FROM base;

COMMENT ON VIEW v_official_study_events IS 'Paper-eligible raw events only: official study_id + study environment. QA is excluded by construction.';
