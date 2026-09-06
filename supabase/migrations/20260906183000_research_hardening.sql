-- ApuLab Station · research hardening gate
-- Forward-only follow-up to research_schema_v2. No production connection is implied.

ALTER TABLE apulab_studies
  ADD COLUMN IF NOT EXISTS expected_commit_sha TEXT NOT NULL DEFAULT 'UNFROZEN';

ALTER TABLE apulab_sessions
  ADD COLUMN IF NOT EXISTS git_commit_sha TEXT,
  ADD COLUMN IF NOT EXISTS sync_token_hash TEXT;

ALTER TABLE apulab_events
  ADD COLUMN IF NOT EXISTS git_commit_sha TEXT;

UPDATE apulab_studies
SET study_build_version = 'APULAB-STUDY-RC.1',
    expected_commit_sha = COALESCE(NULLIF(expected_commit_sha, ''), 'UNFROZEN')
WHERE study_id IN ('APULAB-QA-2026', 'APULAB-STUDY-2026');

CREATE INDEX IF NOT EXISTS idx_apulab_auth_attempts_code_time
  ON apulab_auth_attempts(participant_code_hash, attempted_at DESC);

DO $$ BEGIN
  ALTER TABLE apulab_sessions ADD CONSTRAINT apulab_sessions_sync_token_hash_length
    CHECK (sync_token_hash IS NULL OR length(sync_token_hash) >= 43) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Views created by research_schema_v2 used SELECT * before git_commit_sha existed.
-- Recreate them after the ALTER so downstream views can safely reference the new column.
CREATE OR REPLACE VIEW v_official_study_events AS
SELECT * FROM apulab_events
WHERE study_id='APULAB-STUDY-2026' AND environment='study';

CREATE OR REPLACE VIEW v_qa_events AS
SELECT * FROM apulab_events WHERE study_id='APULAB-QA-2026';

CREATE OR REPLACE VIEW v_level_outcomes AS
SELECT participant_id,study_id,study_condition,level_number,build_version,git_commit_sha,
  bool_or(event_type='level_completed') AS completed,
  count(*) FILTER (WHERE event_type='program_started')::int AS attempt_count,
  count(*) FILTER (WHERE event_type='program_modified')::int AS program_edit_count,
  count(*) FILTER (WHERE event_type='help_requested')::int AS help_count,
  (min(attempt_number) FILTER (WHERE event_type='level_completed')=1) AS first_attempt_success,
  max(elapsed_ms) FILTER (WHERE event_type='level_completed') AS duration_ms,
  max(result) FILTER (WHERE event_type='level_completed') AS primary_outcome
FROM v_official_study_events
WHERE level_number BETWEEN 1 AND 7
GROUP BY participant_id,study_id,study_condition,level_number,build_version,git_commit_sha;

CREATE OR REPLACE VIEW v_level5_loop_metrics AS
WITH e AS (SELECT * FROM v_official_study_events WHERE level_number=5),
metrics AS (
  SELECT participant_id,
    max((payload->>'blocks_before')::int) FILTER (WHERE payload ? 'blocks_before') AS blocks_before,
    max((payload->>'blocks_after')::int) FILTER (WHERE payload ? 'blocks_after') AS blocks_after,
    max((payload->>'reduction_pct')::numeric) FILTER (WHERE payload ? 'reduction_pct') AS reduction_pct,
    max((payload->>'repeat_n')::int) FILTER (WHERE payload ? 'repeat_n') AS repeat_n,
    max((payload->>'repeat_instances')::int) FILTER (WHERE payload ? 'repeat_instances') AS repeat_instances,
    min(elapsed_ms) FILTER (WHERE event_type='repeat_unlocked') AS time_to_repeat_unlock_ms,
    min(elapsed_ms) FILTER (WHERE event_type='repeat_added') AS time_to_first_repeat_use_ms,
    max(elapsed_ms) FILTER (WHERE event_type='level_completed') AS completion_time_ms
  FROM e GROUP BY participant_id
)
SELECT *,
  CASE WHEN blocks_before IS NOT NULL AND blocks_after IS NOT NULL THEN blocks_before-blocks_after END AS block_reduction,
  (blocks_before IS NOT NULL AND blocks_after IS NOT NULL AND blocks_after < blocks_before) AS first_repeat_program_valid
FROM metrics;

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
WITH e AS (SELECT * FROM v_official_study_events WHERE level_number=7),
ordered AS (
  SELECT *, CASE
    WHEN event_type='instrument_selected' THEN payload->>'instrument_type'
    WHEN event_type='instrument_changed' THEN payload->>'to_instrument'
    ELSE NULL END AS resolved_instrument
  FROM e
)
SELECT participant_id,
  (array_agg(payload->>'instrument_type' ORDER BY event_seq) FILTER (WHERE event_type='instrument_selected'))[1] AS first_instrument,
  (array_agg(resolved_instrument ORDER BY event_seq DESC) FILTER (WHERE resolved_instrument IS NOT NULL))[1] AS final_instrument,
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
FROM ordered GROUP BY participant_id;

CREATE OR REPLACE VIEW v_session_quality AS
WITH base AS (
  SELECT s.session_id,s.participant_id,s.study_id,s.environment,s.build_version,s.git_commit_sha,s.schema_version,
    min(e.level_number) AS min_level,max(e.level_number) AS max_level,
    count(e.event_id) FILTER (WHERE e.event_type='session_completed') AS session_complete_count,
    count(e.event_id) FILTER (WHERE e.event_type='level_started') AS level_started_count,
    count(e.event_id) FILTER (WHERE e.event_type='level_completed') AS level_completed_count,
    count(e.event_id) FILTER (WHERE e.build_version IS DISTINCT FROM s.build_version) AS build_mismatch_count,
    count(e.event_id) FILTER (WHERE e.git_commit_sha IS DISTINCT FROM s.git_commit_sha) AS commit_mismatch_count,
    count(e.event_id) FILTER (WHERE e.schema_version IS DISTINCT FROM s.schema_version) AS schema_mismatch_count,
    count(e.event_id) FILTER (WHERE e.level_number IS NOT NULL AND e.level_number NOT BETWEEN 1 AND 7) AS unexpected_level_count,
    count(e.event_id) AS event_count,
    count(DISTINCT e.event_seq) FILTER (WHERE e.event_seq IS NOT NULL) AS distinct_seq,
    CASE WHEN count(e.event_id)=0 THEN 0 ELSE max(e.event_seq)-min(e.event_seq)+1 END AS expected_seq_span
  FROM apulab_sessions s LEFT JOIN apulab_events e USING(session_id)
  GROUP BY s.session_id,s.participant_id,s.study_id,s.environment,s.build_version,s.git_commit_sha,s.schema_version
)
SELECT *,
  (event_count<>distinct_seq) AS duplicate_event_seq,
  (event_count>0 AND expected_seq_span<>distinct_seq) AS event_sequence_gap,
  (level_started_count<7) AS missing_level_started,
  (level_completed_count<7) AS missing_level_completed,
  (session_complete_count=0) AS missing_session_complete,
  (build_mismatch_count>0) AS build_mismatch,
  (commit_mismatch_count>0) AS commit_mismatch,
  (schema_mismatch_count>0) AS schema_mismatch,
  (unexpected_level_count>0) AS unexpected_level,
  (session_complete_count=0 OR level_completed_count<7) AS incomplete_session
FROM base;

REVOKE ALL ON TABLE v_official_study_events FROM anon, authenticated;
REVOKE ALL ON TABLE v_qa_events FROM anon, authenticated;
REVOKE ALL ON TABLE v_level_outcomes FROM anon, authenticated;
REVOKE ALL ON TABLE v_level5_loop_metrics FROM anon, authenticated;
REVOKE ALL ON TABLE v_level6_science_metrics FROM anon, authenticated;
REVOKE ALL ON TABLE v_level7_instrument_metrics FROM anon, authenticated;
REVOKE ALL ON TABLE v_session_quality FROM anon, authenticated;

COMMENT ON COLUMN apulab_studies.expected_commit_sha IS 'Exact git commit required for study/QA session creation once the study is pilot/active. UNFROZEN blocks activation.';
COMMENT ON COLUMN apulab_sessions.sync_token_hash IS 'SHA-256 hash of an opaque per-session sync capability; raw token remains only on the originating browser/device.';
