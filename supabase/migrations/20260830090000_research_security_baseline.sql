-- ApuLab Station Game
-- Research security baseline for the Three.js migration.
-- This migration is intentionally fail-closed for browser access.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE apulab_session_mode AS ENUM ('study', 'demo');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS apulab_participants (
  participant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_code_hash TEXT NOT NULL UNIQUE,
  credential_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT apulab_participants_code_hash_length CHECK (length(trim(participant_code_hash)) >= 32),
  CONSTRAINT apulab_participants_credential_hash_length CHECK (length(trim(credential_hash)) >= 32)
);

CREATE TABLE IF NOT EXISTS apulab_auth_attempts (
  attempt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_code_hash TEXT,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cooldown_until TIMESTAMPTZ,
  client_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT apulab_auth_attempts_context_size CHECK (pg_column_size(client_context) <= 2048)
);

CREATE TABLE IF NOT EXISTS apulab_sessions (
  session_id TEXT PRIMARY KEY,
  participant_id UUID REFERENCES apulab_participants(participant_id) ON DELETE RESTRICT,
  participant_code VARCHAR(32),
  session_mode apulab_session_mode NOT NULL DEFAULT 'demo',
  build_version VARCHAR(32) NOT NULL,
  game_version VARCHAR(32),
  schema_version VARCHAR(32) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  last_checkpoint TEXT,
  questionnaire_version TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'in_progress',
  screen_width INT NOT NULL,
  screen_height INT NOT NULL,
  user_agent TEXT NOT NULL DEFAULT 'web',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE apulab_sessions
  ADD COLUMN IF NOT EXISTS participant_id UUID,
  ADD COLUMN IF NOT EXISTS participant_code VARCHAR(32),
  ADD COLUMN IF NOT EXISTS session_mode apulab_session_mode NOT NULL DEFAULT 'demo',
  ADD COLUMN IF NOT EXISTS build_version VARCHAR(32),
  ADD COLUMN IF NOT EXISTS game_version VARCHAR(32),
  ADD COLUMN IF NOT EXISTS schema_version VARCHAR(32),
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_checkpoint TEXT,
  ADD COLUMN IF NOT EXISTS questionnaire_version TEXT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'in_progress',
  ADD COLUMN IF NOT EXISTS screen_width INT,
  ADD COLUMN IF NOT EXISTS screen_height INT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$ BEGIN
  ALTER TABLE apulab_sessions
    ADD CONSTRAINT apulab_sessions_participant_id_fkey
    FOREIGN KEY (participant_id) REFERENCES apulab_participants(participant_id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE apulab_sessions
    ADD CONSTRAINT apulab_sessions_mode_participant_consistency
    CHECK (
      (session_mode = 'demo' AND participant_id IS NULL)
      OR
      (session_mode = 'study' AND participant_id IS NOT NULL)
    ) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE apulab_sessions
    ADD CONSTRAINT apulab_sessions_no_raw_participant_code
    CHECK (participant_code IS NULL) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE apulab_sessions
    ADD CONSTRAINT apulab_sessions_status_allowed
    CHECK (status IN ('in_progress', 'active', 'completed', 'abandoned', 'completed_pending_sync')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS apulab_events (
  event_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES apulab_sessions(session_id) ON DELETE RESTRICT,
  participant_id UUID REFERENCES apulab_participants(participant_id) ON DELETE RESTRICT,
  participant_code VARCHAR(32),
  session_mode apulab_session_mode NOT NULL DEFAULT 'demo',
  build_version VARCHAR(32) NOT NULL,
  schema_version VARCHAR(32) NOT NULL,
  scene_id VARCHAR(64) NOT NULL,
  challenge_id VARCHAR(64),
  event_type VARCHAR(64) NOT NULL,
  attempt_number INT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result VARCHAR(32),
  error_code VARCHAR(64),
  hint_used BOOLEAN NOT NULL DEFAULT FALSE,
  duration_seconds INT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  client_timestamp TIMESTAMPTZ,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sync_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE apulab_events
  ADD COLUMN IF NOT EXISTS participant_id UUID,
  ADD COLUMN IF NOT EXISTS participant_code VARCHAR(32),
  ADD COLUMN IF NOT EXISTS session_mode apulab_session_mode NOT NULL DEFAULT 'demo',
  ADD COLUMN IF NOT EXISTS build_version VARCHAR(32),
  ADD COLUMN IF NOT EXISTS schema_version VARCHAR(32),
  ADD COLUMN IF NOT EXISTS scene_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS challenge_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS event_type VARCHAR(64),
  ADD COLUMN IF NOT EXISTS attempt_number INT,
  ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS result VARCHAR(32),
  ADD COLUMN IF NOT EXISTS error_code VARCHAR(64),
  ADD COLUMN IF NOT EXISTS hint_used BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS duration_seconds INT,
  ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS client_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS sync_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$ BEGIN
  ALTER TABLE apulab_events
    ADD CONSTRAINT apulab_events_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES apulab_sessions(session_id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE apulab_events
    ADD CONSTRAINT apulab_events_participant_id_fkey
    FOREIGN KEY (participant_id) REFERENCES apulab_participants(participant_id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE apulab_events
    ADD CONSTRAINT apulab_events_no_raw_participant_code
    CHECK (participant_code IS NULL) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE apulab_events
    ADD CONSTRAINT apulab_events_payload_size
    CHECK (pg_column_size(payload) <= 8192) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE apulab_events
    ADD CONSTRAINT apulab_events_type_not_blank
    CHECK (length(trim(event_type)) BETWEEN 3 AND 64) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS apulab_posttest_responses (
  response_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES apulab_participants(participant_id) ON DELETE RESTRICT,
  session_id TEXT NOT NULL REFERENCES apulab_sessions(session_id) ON DELETE RESTRICT,
  questionnaire_version TEXT NOT NULL,
  question_id TEXT NOT NULL,
  answer JSONB NOT NULL,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT apulab_posttest_question_not_blank CHECK (length(trim(question_id)) > 0),
  CONSTRAINT apulab_posttest_questionnaire_not_blank CHECK (length(trim(questionnaire_version)) > 0),
  CONSTRAINT apulab_posttest_answer_size CHECK (pg_column_size(answer) <= 4096),
  CONSTRAINT apulab_posttest_unique_answer UNIQUE (session_id, questionnaire_version, question_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_apulab_events_event_id_unique ON apulab_events(event_id);
CREATE INDEX IF NOT EXISTS idx_apulab_participants_code_hash ON apulab_participants(participant_code_hash);
CREATE INDEX IF NOT EXISTS idx_apulab_sessions_participant_id ON apulab_sessions(participant_id);
CREATE INDEX IF NOT EXISTS idx_apulab_sessions_mode ON apulab_sessions(session_mode);
CREATE INDEX IF NOT EXISTS idx_apulab_sessions_status ON apulab_sessions(status);
CREATE INDEX IF NOT EXISTS idx_apulab_events_session ON apulab_events(session_id);
CREATE INDEX IF NOT EXISTS idx_apulab_events_participant_id ON apulab_events(participant_id);
CREATE INDEX IF NOT EXISTS idx_apulab_events_type ON apulab_events(event_type);
CREATE INDEX IF NOT EXISTS idx_apulab_events_received_at ON apulab_events(received_at);

ALTER TABLE apulab_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE apulab_auth_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE apulab_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE apulab_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE apulab_posttest_responses ENABLE ROW LEVEL SECURITY;

-- Browser roles must not directly read or mutate research tables.
-- All research writes go through reviewed Edge Functions using server-side credentials.
REVOKE ALL ON TABLE apulab_participants FROM anon, authenticated;
REVOKE ALL ON TABLE apulab_auth_attempts FROM anon, authenticated;
REVOKE ALL ON TABLE apulab_sessions FROM anon, authenticated;
REVOKE ALL ON TABLE apulab_events FROM anon, authenticated;
REVOKE ALL ON TABLE apulab_posttest_responses FROM anon, authenticated;

COMMENT ON TABLE apulab_participants IS
  'Pseudonymous participant registry. Store hashes only; raw participant codes and credentials are forbidden.';
COMMENT ON TABLE apulab_auth_attempts IS
  'Minimal authentication audit trail for server-side rate limiting; never store raw credentials.';
COMMENT ON TABLE apulab_posttest_responses IS
  'Structured POST-test responses linked by pseudonymous participant_id and session_id.';
