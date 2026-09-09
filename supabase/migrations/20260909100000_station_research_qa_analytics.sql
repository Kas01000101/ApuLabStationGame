-- ApuLab Station GE · Research M11
-- QA analytics separation. Official views remain unchanged and continue to read
-- exclusively from v_official_study_events.

CREATE OR REPLACE VIEW public.v_qa_level_outcomes WITH (security_invoker=true) AS
SELECT session_id,participant_id,study_id,study_condition,level_number,build_version,git_commit_sha,
  bool_or(event_type='level_completed') AS completed,
  count(*) FILTER (WHERE event_type='program_started')::int AS attempt_count,
  count(*) FILTER (WHERE event_type='program_modified')::int AS program_edit_count,
  count(*) FILTER (WHERE event_type='help_requested')::int AS help_count,
  (min(attempt_number) FILTER (WHERE event_type='level_completed')=1) AS first_attempt_success,
  max(elapsed_ms) FILTER (WHERE event_type='level_completed') AS duration_ms,
  max(result) FILTER (WHERE event_type='level_completed') AS primary_outcome
FROM public.v_qa_events
WHERE level_number BETWEEN 1 AND 7
GROUP BY session_id,participant_id,study_id,study_condition,level_number,build_version,git_commit_sha;

CREATE OR REPLACE VIEW public.v_qa_level5_loop_metrics WITH (security_invoker=true) AS
WITH e AS (
  SELECT * FROM public.v_qa_events WHERE level_number=5
), metrics AS (
  SELECT session_id,participant_id,study_id,study_condition,build_version,git_commit_sha,
    max((payload->>'blocks_before')::int) FILTER (WHERE payload ? 'blocks_before') AS blocks_before,
    max((payload->>'blocks_after')::int) FILTER (WHERE payload ? 'blocks_after') AS blocks_after,
    max((payload->>'reduction_pct')::numeric) FILTER (WHERE payload ? 'reduction_pct') AS reduction_pct,
    max((payload->>'repeat_n')::int) FILTER (WHERE payload ? 'repeat_n') AS repeat_n,
    max((payload->>'repeat_instances')::int) FILTER (WHERE payload ? 'repeat_instances') AS repeat_instances,
    min(elapsed_ms) FILTER (WHERE event_type='repeat_unlocked') AS time_to_repeat_unlock_ms,
    min(elapsed_ms) FILTER (WHERE event_type='repeat_added') AS time_to_first_repeat_use_ms,
    min(event_seq) FILTER (WHERE event_type='initial_program_completed') AS initial_program_completed_seq,
    min(event_seq) FILTER (WHERE event_type='pattern_highlighted') AS pattern_highlighted_seq,
    min(event_seq) FILTER (WHERE event_type='repeat_unlocked') AS repeat_unlocked_seq,
    min(event_seq) FILTER (WHERE event_type='repeat_added') AS repeat_added_seq,
    min(event_seq) FILTER (WHERE event_type='program_refactored') AS program_refactored_seq,
    min(event_seq) FILTER (WHERE event_type='level_completed') AS level_completed_seq,
    max(elapsed_ms) FILTER (WHERE event_type='level_completed') AS completion_time_ms
  FROM e
  GROUP BY session_id,participant_id,study_id,study_condition,build_version,git_commit_sha
)
SELECT session_id,participant_id,study_id,study_condition,build_version,git_commit_sha,
  blocks_before,blocks_after,reduction_pct,repeat_n,repeat_instances,time_to_repeat_unlock_ms,time_to_first_repeat_use_ms,
  completion_time_ms,
  CASE WHEN blocks_before IS NOT NULL AND blocks_after IS NOT NULL THEN blocks_before-blocks_after END AS block_reduction,
  (blocks_before IS NOT NULL AND blocks_after IS NOT NULL AND blocks_after < blocks_before) AS first_repeat_program_valid,
  (initial_program_completed_seq IS NOT NULL
   AND pattern_highlighted_seq IS NOT NULL
   AND repeat_unlocked_seq IS NOT NULL
   AND repeat_added_seq IS NOT NULL
   AND program_refactored_seq IS NOT NULL
   AND level_completed_seq IS NOT NULL
   AND initial_program_completed_seq < pattern_highlighted_seq
   AND pattern_highlighted_seq < repeat_unlocked_seq
   AND repeat_unlocked_seq < repeat_added_seq
   AND repeat_added_seq < program_refactored_seq
   AND program_refactored_seq < level_completed_seq) AS loop_flow_correct
FROM metrics;

CREATE OR REPLACE VIEW public.v_qa_level6_science_metrics WITH (security_invoker=true) AS
WITH e AS (
  SELECT * FROM public.v_qa_events WHERE level_number=6
), seq AS (
  SELECT session_id,participant_id,study_id,study_condition,build_version,git_commit_sha,
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
  GROUP BY session_id,participant_id,study_id,study_condition,build_version,git_commit_sha
)
SELECT session_id,participant_id,study_id,study_condition,build_version,git_commit_sha,
  CASE
    WHEN scan_completed_seq IS NULL OR analyze_completed_seq IS NULL OR communication_point_reached_seq IS NULL OR data_sent_seq IS NULL OR level_completed_seq IS NULL THEN false
    ELSE scan_completed_seq < analyze_completed_seq
      AND analyze_completed_seq < communication_point_reached_seq
      AND communication_point_reached_seq < data_sent_seq
      AND data_sent_seq < level_completed_seq
  END AS science_order_correct,
  premature_action_count,program_edit_count,used_repeat_n6,attempt_count,completion_time_ms,data_sent
FROM seq;

CREATE OR REPLACE VIEW public.v_qa_level7_instrument_metrics WITH (security_invoker=true) AS
WITH e AS (
  SELECT * FROM public.v_qa_events WHERE level_number=7
), ordered AS (
  SELECT *,
    CASE
      WHEN event_type='instrument_selected' THEN payload->>'instrument_type'
      WHEN event_type='instrument_changed' THEN payload->>'to_instrument'
      ELSE NULL
    END AS resolved_instrument
  FROM e
), metrics AS (
  SELECT session_id,participant_id,study_id,study_condition,build_version,git_commit_sha,
    (array_agg(payload->>'instrument_type' ORDER BY event_seq) FILTER (WHERE event_type='instrument_selected'))[1] AS first_instrument,
    (array_agg(resolved_instrument ORDER BY event_seq DESC) FILTER (WHERE resolved_instrument IS NOT NULL))[1] AS final_instrument,
    bool_or(event_type='instrument_selected' AND coalesce((payload->>'relevant_to_question')::boolean,false) AND coalesce((payload->>'selection_order')::int,0)=1) AS first_choice_relevant,
    count(*) FILTER (WHERE event_type='instrument_selected')::int AS instrument_selection_count,
    count(*) FILTER (WHERE event_type='instrument_changed')::int AS instrument_change_count,
    bool_or(event_type='instrument_changed' AND coalesce((payload->>'previous_result_relevant')::boolean,true)=false) AS changed_after_irrelevant_feedback,
    min(elapsed_ms) FILTER (WHERE event_type='instrument_selected') AS time_to_first_choice_ms,
    min(elapsed_ms) FILTER (WHERE event_type='relevant_instrument_selected') AS time_to_relevant_choice_ms,
    bool_or(coalesce((payload->>'used_repeat_n7')::boolean,false)) AS used_repeat_n7,
    bool_or(event_type='final_point_reached') AS final_point_reached,
    min(elapsed_ms) FILTER (WHERE event_type='final_point_reached') AS time_to_final_point_ms,
    min(event_seq) FILTER (WHERE event_type='final_point_reached') AS final_point_seq,
    min(event_seq) FILTER (WHERE event_type='level_completed') AS level_completed_seq,
    bool_or(event_type='communication_point_reached') AS unexpected_communication_point,
    bool_or(event_type='data_sent') AS unexpected_data_sent,
    max(elapsed_ms) FILTER (WHERE event_type='level_completed') AS completion_time_ms
  FROM ordered
  GROUP BY session_id,participant_id,study_id,study_condition,build_version,git_commit_sha
)
SELECT session_id,participant_id,study_id,study_condition,build_version,git_commit_sha,
  first_instrument,final_instrument,first_choice_relevant,instrument_selection_count,instrument_change_count,changed_after_irrelevant_feedback,
  time_to_first_choice_ms,time_to_relevant_choice_ms,used_repeat_n7,final_point_reached,time_to_final_point_ms,
  (final_point_seq IS NOT NULL AND level_completed_seq IS NOT NULL AND final_point_seq < level_completed_seq) AS final_point_before_completion,
  unexpected_communication_point,unexpected_data_sent,completion_time_ms
FROM metrics;

CREATE OR REPLACE VIEW public.v_qa_session_quality WITH (security_invoker=true) AS
WITH base AS (
  SELECT s.session_id,s.participant_id,s.study_id,s.study_condition,s.environment,s.build_version,s.git_commit_sha,s.schema_version,
    min(e.level_number) AS min_level,
    max(e.level_number) AS max_level,
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
  FROM public.apulab_sessions s
  LEFT JOIN public.v_qa_events e USING(session_id)
  WHERE s.study_id='APULAB-QA-2026'
  GROUP BY s.session_id,s.participant_id,s.study_id,s.study_condition,s.environment,s.build_version,s.git_commit_sha,s.schema_version
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
  (session_complete_count=0 OR level_started_count<7 OR level_completed_count<7) AS incomplete_session
FROM base;

REVOKE ALL ON TABLE public.v_qa_level_outcomes,public.v_qa_level5_loop_metrics,public.v_qa_level6_science_metrics,public.v_qa_level7_instrument_metrics,public.v_qa_session_quality FROM anon,authenticated;
GRANT SELECT ON TABLE public.v_qa_level_outcomes,public.v_qa_level5_loop_metrics,public.v_qa_level6_science_metrics,public.v_qa_level7_instrument_metrics,public.v_qa_session_quality TO service_role;
