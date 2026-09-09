-- ApuLab Station · Research schema v2 clean
-- Forward-only over the two historical migrations. Station stores only condition=game.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS apulab_studies (
  study_id TEXT PRIMARY KEY,
  study_kind TEXT NOT NULL CHECK (study_kind IN ('qa','official')),
  study_version TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','pilot','active','closed','archived')),
  protocol_version TEXT NOT NULL,
  telemetry_schema_version TEXT NOT NULL,
  study_build_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

INSERT INTO apulab_studies(study_id,study_kind,study_version,title,status,protocol_version,telemetry_schema_version,study_build_version)
VALUES
 ('APULAB-QA-2026','qa','2026-v1','ApuLab internal QA 2026','draft','apulab-protocol-2026-v1','apulab-telemetry-v2','APULAB-STUDY-RC.1'),
 ('APULAB-STUDY-2026','official','2026-v1','ApuLab official study 2026','draft','apulab-protocol-2026-v1','apulab-telemetry-v2','APULAB-STUDY-RC.1')
ON CONFLICT (study_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS apulab_study_assignments (
  assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id TEXT NOT NULL REFERENCES apulab_studies(study_id) ON DELETE RESTRICT,
  participant_id UUID NOT NULL REFERENCES apulab_participants(participant_id) ON DELETE RESTRICT,
  study_condition TEXT NOT NULL CHECK (study_condition='game'),
  assignment_method TEXT NOT NULL CHECK (assignment_method IN ('random','classroom','manual_protocol','qa')),
  cohort_code TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT apulab_assignment_unique UNIQUE(study_id,participant_id)
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
    CHECK (study_condition IS NULL OR study_condition='game') NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE apulab_events ADD CONSTRAINT apulab_events_condition_check
    CHECK (study_condition IS NULL OR study_condition='game') NOT VALID;
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
      (session_mode::text='study' AND participant_id IS NOT NULL AND study_id IS NOT NULL AND study_condition='game')
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
CREATE INDEX IF NOT EXISTS idx_apulab_events_study ON apulab_events(study_id);
CREATE INDEX IF NOT EXISTS idx_apulab_events_level ON apulab_events(level_number);
CREATE INDEX IF NOT EXISTS idx_apulab_events_event_type ON apulab_events(event_type);
CREATE INDEX IF NOT EXISTS idx_apulab_events_client_timestamp ON apulab_events(client_timestamp);
CREATE INDEX IF NOT EXISTS idx_apulab_sessions_study ON apulab_sessions(study_id);
CREATE INDEX IF NOT EXISTS idx_apulab_assignments_study_condition ON apulab_study_assignments(study_id,study_condition);

ALTER TABLE apulab_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE apulab_study_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE apulab_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE apulab_auth_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE apulab_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE apulab_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE apulab_studies FROM anon,authenticated;
REVOKE ALL ON TABLE apulab_study_assignments FROM anon,authenticated;
REVOKE ALL ON TABLE apulab_participants FROM anon,authenticated;
REVOKE ALL ON TABLE apulab_auth_attempts FROM anon,authenticated;
REVOKE ALL ON TABLE apulab_sessions FROM anon,authenticated;
REVOKE ALL ON TABLE apulab_events FROM anon,authenticated;

CREATE OR REPLACE VIEW v_official_study_events WITH (security_invoker=true) AS
SELECT * FROM apulab_events WHERE study_id='APULAB-STUDY-2026' AND environment='study';
CREATE OR REPLACE VIEW v_qa_events WITH (security_invoker=true) AS
SELECT * FROM apulab_events WHERE study_id='APULAB-QA-2026';
REVOKE ALL ON TABLE v_official_study_events FROM anon,authenticated;
REVOKE ALL ON TABLE v_qa_events FROM anon,authenticated;

COMMENT ON VIEW v_official_study_events IS 'Paper-eligible raw events only: official study_id + study environment. QA excluded by construction.';
