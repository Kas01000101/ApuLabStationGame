-- ApuLab Station Research · Pre-QA hardening
-- Forward-only migration.
-- Does not create participants or study sessions.
-- Removes confirmed redundant indexes, hardens N6/N7 research metrics,
-- adds the assignment lookup index, and validates safe research constraints.

-- Confirmed source-equivalent duplicates from the historical baseline + schema v2.
DROP INDEX IF EXISTS idx_apulab_events_type;
DROP INDEX IF EXISTS idx_apulab_events_participant;
DROP INDEX IF EXISTS idx_apulab_events_event_id_unique;
DROP INDEX IF EXISTS idx_apulab_sessions_participant_v2;

CREATE INDEX IF NOT EXISTS idx_apulab_study_assignments_participant_id
  ON apulab_study_assignments(participant_id);

-- N6 canonical research order:
-- scan -> analyze -> communication point -> explicit send -> level completion.
CREATE OR REPLACE VIEW v_level6_science_metrics AS
WITH e AS (SELECT * FROM v_official_study_events WHERE level_number=6),
seq AS (
  SELECT participant_id,
    min(event_seq) FILTER (WHERE event_type='scan_completed') AS scan_completed_seq,
    min(event_seq) FILTER (WHERE event_type='analyze_completed') AS analyze_completed_seq,
    min(event_seq) FILTER (WHERE event_type='communication_point_reached') AS communication_point_reached_seq,
    min(event_seq) FILTER (WHERE event_type='data_sent') AS data_sent_seq,
    min(event_seq) FILTER (WHERE event_type='level_completed') AS level_completed_seq,
    count(*) FILTER (WHERE event_type='premature_action')::int AS premature_action_count,
    count(*) FILTER (WHERE event_type='program_modified')::int AS program_edit_count,
    bool_or(coalesce((payload->>'used_repeat_n6')::boolean,false)) AS used_repeat_n6,
    count(*) FILTER (WHERE event_type='program_started')::int AS attempt_count,
    max(elapsed_ms) FILTER (WHERE event_type='level_completed') AS completion_time_ms,
    bool_or(event_type='data_sent') AS data_sent
  FROM e
  GROUP BY participant_id
)
SELECT participant_id,
  CASE
    WHEN scan_completed_seq IS NULL
      OR analyze_completed_seq IS NULL
      OR communication_point_reached_seq IS NULL
      OR data_sent_seq IS NULL
      OR level_completed_seq IS NULL
      THEN false
    ELSE scan_completed_seq < analyze_completed_seq
      AND analyze_completed_seq < communication_point_reached_seq
      AND communication_point_reached_seq < data_sent_seq
      AND data_sent_seq < level_completed_seq
  END AS science_order_correct,
  premature_action_count,
  program_edit_count,
  used_repeat_n6,
  attempt_count,
  completion_time_ms,
  data_sent
FROM seq;

-- N7 keeps the existing instrument metrics and adds an explicit audit of
-- checkpoint arrival -> explicit ENVIAR DATOS -> completion.
CREATE OR REPLACE VIEW v_level7_instrument_metrics AS
WITH e AS (SELECT * FROM v_official_study_events WHERE level_number=7),
ordered AS (
  SELECT *, CASE
    WHEN event_type='instrument_selected' THEN payload->>'instrument_type'
    WHEN event_type='instrument_changed' THEN payload->>'to_instrument'
    ELSE NULL END AS resolved_instrument
  FROM e
),
metrics AS (
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
    max(elapsed_ms) FILTER (WHERE event_type='level_completed') AS completion_time_ms,
    min(event_seq) FILTER (WHERE event_type='communication_point_reached') AS communication_point_reached_seq,
    min(event_seq) FILTER (WHERE event_type='data_sent') AS data_sent_seq,
    min(event_seq) FILTER (WHERE event_type='level_completed') AS level_completed_seq
  FROM ordered
  GROUP BY participant_id
)
SELECT participant_id,
  first_instrument,
  final_instrument,
  first_choice_relevant,
  instrument_selection_count,
  instrument_change_count,
  changed_after_irrelevant_feedback,
  time_to_first_choice_ms,
  time_to_relevant_choice_ms,
  used_repeat_n7,
  communication_time_ms,
  data_sent,
  completion_time_ms,
  CASE
    WHEN communication_point_reached_seq IS NULL
      OR data_sent_seq IS NULL
      OR level_completed_seq IS NULL
      THEN false
    ELSE communication_point_reached_seq < data_sent_seq
      AND data_sent_seq < level_completed_seq
  END AS communication_send_order_correct
FROM metrics;

-- Browser access remains fail-closed after view replacement.
REVOKE ALL ON TABLE v_level6_science_metrics FROM anon, authenticated;
REVOKE ALL ON TABLE v_level7_instrument_metrics FROM anon, authenticated;

-- The current fresh and legacy compatibility paths satisfy these checks.
-- VALIDATE upgrades historical NOT VALID constraints without weakening them.
ALTER TABLE apulab_sessions VALIDATE CONSTRAINT apulab_sessions_no_raw_participant_code;
ALTER TABLE apulab_events VALIDATE CONSTRAINT apulab_events_no_raw_participant_code;
ALTER TABLE apulab_events VALIDATE CONSTRAINT apulab_events_payload_size;
ALTER TABLE apulab_events VALIDATE CONSTRAINT apulab_events_level_check;
ALTER TABLE apulab_events VALIDATE CONSTRAINT apulab_events_event_seq_check;
ALTER TABLE apulab_events VALIDATE CONSTRAINT apulab_events_environment_check;
ALTER TABLE apulab_sessions VALIDATE CONSTRAINT apulab_sessions_environment_check;
ALTER TABLE apulab_sessions VALIDATE CONSTRAINT apulab_sessions_study_consistency_v2;
ALTER TABLE apulab_sessions VALIDATE CONSTRAINT apulab_sessions_sync_token_hash_length;
