-- ApuLab Station · Research analytics post-RC4
-- Analytics-only migration. No gameplay/runtime/event-row mutation.
-- Canonicalizes attempt semantics by level, separates N5 flow evidence from
-- optional optimization payloads, and adds participant-level QA/official views.

-- Canonical attempt_count in legacy outcome summaries.
CREATE OR REPLACE VIEW public.v_qa_level_outcomes WITH (security_invoker=true) AS
SELECT session_id,participant_id,study_id,study_condition,level_number,build_version,git_commit_sha,
  bool_or(event_type='level_completed') AS completed,
  count(*) FILTER (
    WHERE (level_number=1 AND event_type='measurement_attempt')
       OR (level_number=2 AND event_type='battery_selected')
       OR (level_number BETWEEN 3 AND 7 AND event_type='program_started')
  )::int AS attempt_count,
  count(*) FILTER (WHERE event_type='program_modified')::int AS program_edit_count,
  count(*) FILTER (WHERE event_type='help_requested')::int AS help_count,
  (min(attempt_number) FILTER (WHERE event_type='level_completed')=1) AS first_attempt_success,
  max(elapsed_ms) FILTER (WHERE event_type='level_completed') AS duration_ms,
  max(result) FILTER (WHERE event_type='level_completed') AS primary_outcome
FROM public.v_qa_events
WHERE level_number BETWEEN 1 AND 7
GROUP BY session_id,participant_id,study_id,study_condition,level_number,build_version,git_commit_sha;

CREATE OR REPLACE VIEW public.v_level_outcomes WITH (security_invoker=true) AS
SELECT session_id,participant_id,study_id,study_condition,level_number,build_version,git_commit_sha,
  bool_or(event_type='level_completed') AS completed,
  count(*) FILTER (
    WHERE (level_number=1 AND event_type='measurement_attempt')
       OR (level_number=2 AND event_type='battery_selected')
       OR (level_number BETWEEN 3 AND 7 AND event_type='program_started')
  )::int AS attempt_count,
  count(*) FILTER (WHERE event_type='program_modified')::int AS program_edit_count,
  count(*) FILTER (WHERE event_type='help_requested')::int AS help_count,
  (min(attempt_number) FILTER (WHERE event_type='level_completed')=1) AS first_attempt_success,
  max(elapsed_ms) FILTER (WHERE event_type='level_completed') AS duration_ms,
  max(result) FILTER (WHERE event_type='level_completed') AS primary_outcome
FROM public.v_official_study_events
WHERE level_number BETWEEN 1 AND 7
GROUP BY session_id,participant_id,study_id,study_condition,level_number,build_version,git_commit_sha;

CREATE OR REPLACE VIEW public.v_qa_level5_loop_metrics WITH (security_invoker=true) AS
WITH e AS (
  SELECT * FROM public.v_qa_events WHERE level_number=5
),
metrics AS (
  SELECT
    session_id,participant_id,study_id,study_condition,build_version,git_commit_sha,
    max((payload->>'blocks_before')::int) FILTER (WHERE payload ? 'blocks_before') AS blocks_before,
    max((payload->>'blocks_after')::int) FILTER (WHERE payload ? 'blocks_after') AS blocks_after,
    max((payload->>'reduction_pct')::numeric) FILTER (WHERE payload ? 'reduction_pct') AS reduction_pct,
    max((payload->>'repeat_n')::int) FILTER (WHERE payload ? 'repeat_n') AS repeat_n,
    max((payload->>'repeat_instances')::int) FILTER (WHERE payload ? 'repeat_instances') AS repeat_instances,
    min(elapsed_ms) FILTER (WHERE event_type='repeat_unlocked') AS time_to_repeat_unlock_ms,
    min(elapsed_ms) FILTER (
      WHERE event_type IN ('repeat_added','repeat_count_changed','block_moved_into_repeat','program_refactored')
    ) AS time_to_first_repeat_use_ms,
    min(event_seq) FILTER (WHERE event_type='initial_program_completed') AS initial_program_completed_seq,
    min(event_seq) FILTER (WHERE event_type='pattern_highlighted') AS pattern_highlighted_seq,
    min(event_seq) FILTER (WHERE event_type='repeat_unlocked') AS repeat_unlocked_seq,
    min(event_seq) FILTER (
      WHERE event_type IN ('repeat_added','repeat_count_changed','block_moved_into_repeat','program_refactored')
    ) AS first_repeat_use_seq,
    min(event_seq) FILTER (
      WHERE event_type IN ('repeat_added','repeat_count_changed','block_moved_into_repeat')
    ) AS repeat_use_before_refactor_seq,
    min(event_seq) FILTER (WHERE event_type='program_refactored') AS program_refactored_seq,
    min(event_seq) FILTER (WHERE event_type='goal_reached') AS first_goal_seq,
    min(event_seq) FILTER (WHERE event_type='level_completed') AS level_completed_seq,
    max(elapsed_ms) FILTER (WHERE event_type='level_completed') AS completion_time_ms
  FROM e
  GROUP BY session_id,participant_id,study_id,study_condition,build_version,git_commit_sha
),
ordered AS (
  SELECT
    m.*,
    (
      SELECT min(x.event_seq)
      FROM e x
      WHERE x.session_id=m.session_id
        AND x.event_type='program_started'
        AND m.program_refactored_seq IS NOT NULL
        AND x.event_seq > m.program_refactored_seq
        AND (m.level_completed_seq IS NULL OR x.event_seq < m.level_completed_seq)
    ) AS post_refactor_program_started_seq,
    (
      SELECT count(*)::int
      FROM e x
      WHERE x.session_id=m.session_id
        AND x.event_type='program_started'
        AND m.first_repeat_use_seq IS NOT NULL
        AND x.event_seq < m.first_repeat_use_seq
    ) AS attempts_before_repeat,
    (
      SELECT count(*)::int
      FROM e x
      WHERE x.session_id=m.session_id
        AND x.event_type='program_started'
        AND m.first_repeat_use_seq IS NOT NULL
        AND x.event_seq > m.first_repeat_use_seq
        AND (m.level_completed_seq IS NULL OR x.event_seq < m.level_completed_seq)
    ) AS attempts_after_repeat,
    (
      SELECT count(*)::int
      FROM e x
      WHERE x.session_id=m.session_id
        AND x.event_type='program_started'
        AND m.first_goal_seq IS NOT NULL
        AND x.event_seq <= m.first_goal_seq
    ) AS attempts_to_goal,
    (
      SELECT count(*)::int
      FROM e x
      WHERE x.session_id=m.session_id
        AND x.event_type='program_started'
        AND m.level_completed_seq IS NOT NULL
        AND x.event_seq <= m.level_completed_seq
    ) AS attempts_to_complete
  FROM metrics m
),
finalized AS (
  SELECT
    o.*,
    (
      SELECT min(x.event_seq)
      FROM e x
      WHERE x.session_id=o.session_id
        AND x.event_type='goal_reached'
        AND o.post_refactor_program_started_seq IS NOT NULL
        AND x.event_seq > o.post_refactor_program_started_seq
        AND (o.level_completed_seq IS NULL OR x.event_seq < o.level_completed_seq)
    ) AS post_refactor_goal_seq,
    (o.first_repeat_use_seq IS NOT NULL) AS used_repeat,
    (
      o.blocks_before IS NOT NULL
      AND o.blocks_after IS NOT NULL
      AND o.reduction_pct IS NOT NULL
      AND o.repeat_n IS NOT NULL
      AND o.repeat_instances IS NOT NULL
    ) AS optimization_metrics_available
  FROM ordered o
),
flags AS (
  SELECT
    f.*,
    (
      f.initial_program_completed_seq IS NOT NULL
      AND f.pattern_highlighted_seq IS NOT NULL
      AND f.repeat_unlocked_seq IS NOT NULL
      AND f.repeat_use_before_refactor_seq IS NOT NULL
      AND f.program_refactored_seq IS NOT NULL
      AND f.post_refactor_program_started_seq IS NOT NULL
      AND f.post_refactor_goal_seq IS NOT NULL
      AND f.level_completed_seq IS NOT NULL
      AND f.initial_program_completed_seq < f.pattern_highlighted_seq
      AND f.pattern_highlighted_seq < f.repeat_unlocked_seq
      AND f.repeat_unlocked_seq < f.repeat_use_before_refactor_seq
      AND f.repeat_use_before_refactor_seq < f.program_refactored_seq
      AND f.program_refactored_seq < f.post_refactor_program_started_seq
      AND f.post_refactor_program_started_seq < f.post_refactor_goal_seq
      AND f.post_refactor_goal_seq < f.level_completed_seq
    ) AS loop_flow_observed
  FROM finalized f
)
SELECT
  session_id,participant_id,study_id,study_condition,build_version,git_commit_sha,
  blocks_before,blocks_after,reduction_pct,repeat_n,repeat_instances,
  time_to_repeat_unlock_ms,time_to_first_repeat_use_ms,completion_time_ms,
  CASE WHEN blocks_before IS NOT NULL AND blocks_after IS NOT NULL THEN blocks_before-blocks_after END AS block_reduction,
  CASE
    WHEN blocks_before IS NULL OR blocks_after IS NULL THEN NULL
    ELSE blocks_after < blocks_before
  END AS first_repeat_program_valid,
  loop_flow_observed AS loop_flow_correct,
  used_repeat,
  attempts_before_repeat,
  attempts_after_repeat,
  attempts_to_goal,
  attempts_to_complete,
  loop_flow_observed,
  optimization_metrics_available
FROM flags;

CREATE OR REPLACE VIEW public.v_level5_loop_metrics WITH (security_invoker=true) AS
WITH e AS (
  SELECT * FROM public.v_official_study_events WHERE level_number=5
),
metrics AS (
  SELECT
    session_id,participant_id,study_id,study_condition,build_version,git_commit_sha,
    max((payload->>'blocks_before')::int) FILTER (WHERE payload ? 'blocks_before') AS blocks_before,
    max((payload->>'blocks_after')::int) FILTER (WHERE payload ? 'blocks_after') AS blocks_after,
    max((payload->>'reduction_pct')::numeric) FILTER (WHERE payload ? 'reduction_pct') AS reduction_pct,
    max((payload->>'repeat_n')::int) FILTER (WHERE payload ? 'repeat_n') AS repeat_n,
    max((payload->>'repeat_instances')::int) FILTER (WHERE payload ? 'repeat_instances') AS repeat_instances,
    min(elapsed_ms) FILTER (WHERE event_type='repeat_unlocked') AS time_to_repeat_unlock_ms,
    min(elapsed_ms) FILTER (
      WHERE event_type IN ('repeat_added','repeat_count_changed','block_moved_into_repeat','program_refactored')
    ) AS time_to_first_repeat_use_ms,
    min(event_seq) FILTER (WHERE event_type='initial_program_completed') AS initial_program_completed_seq,
    min(event_seq) FILTER (WHERE event_type='pattern_highlighted') AS pattern_highlighted_seq,
    min(event_seq) FILTER (WHERE event_type='repeat_unlocked') AS repeat_unlocked_seq,
    min(event_seq) FILTER (
      WHERE event_type IN ('repeat_added','repeat_count_changed','block_moved_into_repeat','program_refactored')
    ) AS first_repeat_use_seq,
    min(event_seq) FILTER (
      WHERE event_type IN ('repeat_added','repeat_count_changed','block_moved_into_repeat')
    ) AS repeat_use_before_refactor_seq,
    min(event_seq) FILTER (WHERE event_type='program_refactored') AS program_refactored_seq,
    min(event_seq) FILTER (WHERE event_type='goal_reached') AS first_goal_seq,
    min(event_seq) FILTER (WHERE event_type='level_completed') AS level_completed_seq,
    max(elapsed_ms) FILTER (WHERE event_type='level_completed') AS completion_time_ms
  FROM e
  GROUP BY session_id,participant_id,study_id,study_condition,build_version,git_commit_sha
),
ordered AS (
  SELECT
    m.*,
    (
      SELECT min(x.event_seq)
      FROM e x
      WHERE x.session_id=m.session_id
        AND x.event_type='program_started'
        AND m.program_refactored_seq IS NOT NULL
        AND x.event_seq > m.program_refactored_seq
        AND (m.level_completed_seq IS NULL OR x.event_seq < m.level_completed_seq)
    ) AS post_refactor_program_started_seq,
    (
      SELECT count(*)::int
      FROM e x
      WHERE x.session_id=m.session_id
        AND x.event_type='program_started'
        AND m.first_repeat_use_seq IS NOT NULL
        AND x.event_seq < m.first_repeat_use_seq
    ) AS attempts_before_repeat,
    (
      SELECT count(*)::int
      FROM e x
      WHERE x.session_id=m.session_id
        AND x.event_type='program_started'
        AND m.first_repeat_use_seq IS NOT NULL
        AND x.event_seq > m.first_repeat_use_seq
        AND (m.level_completed_seq IS NULL OR x.event_seq < m.level_completed_seq)
    ) AS attempts_after_repeat,
    (
      SELECT count(*)::int
      FROM e x
      WHERE x.session_id=m.session_id
        AND x.event_type='program_started'
        AND m.first_goal_seq IS NOT NULL
        AND x.event_seq <= m.first_goal_seq
    ) AS attempts_to_goal,
    (
      SELECT count(*)::int
      FROM e x
      WHERE x.session_id=m.session_id
        AND x.event_type='program_started'
        AND m.level_completed_seq IS NOT NULL
        AND x.event_seq <= m.level_completed_seq
    ) AS attempts_to_complete
  FROM metrics m
),
finalized AS (
  SELECT
    o.*,
    (
      SELECT min(x.event_seq)
      FROM e x
      WHERE x.session_id=o.session_id
        AND x.event_type='goal_reached'
        AND o.post_refactor_program_started_seq IS NOT NULL
        AND x.event_seq > o.post_refactor_program_started_seq
        AND (o.level_completed_seq IS NULL OR x.event_seq < o.level_completed_seq)
    ) AS post_refactor_goal_seq,
    (o.first_repeat_use_seq IS NOT NULL) AS used_repeat,
    (
      o.blocks_before IS NOT NULL
      AND o.blocks_after IS NOT NULL
      AND o.reduction_pct IS NOT NULL
      AND o.repeat_n IS NOT NULL
      AND o.repeat_instances IS NOT NULL
    ) AS optimization_metrics_available
  FROM ordered o
),
flags AS (
  SELECT
    f.*,
    (
      f.initial_program_completed_seq IS NOT NULL
      AND f.pattern_highlighted_seq IS NOT NULL
      AND f.repeat_unlocked_seq IS NOT NULL
      AND f.repeat_use_before_refactor_seq IS NOT NULL
      AND f.program_refactored_seq IS NOT NULL
      AND f.post_refactor_program_started_seq IS NOT NULL
      AND f.post_refactor_goal_seq IS NOT NULL
      AND f.level_completed_seq IS NOT NULL
      AND f.initial_program_completed_seq < f.pattern_highlighted_seq
      AND f.pattern_highlighted_seq < f.repeat_unlocked_seq
      AND f.repeat_unlocked_seq < f.repeat_use_before_refactor_seq
      AND f.repeat_use_before_refactor_seq < f.program_refactored_seq
      AND f.program_refactored_seq < f.post_refactor_program_started_seq
      AND f.post_refactor_program_started_seq < f.post_refactor_goal_seq
      AND f.post_refactor_goal_seq < f.level_completed_seq
    ) AS loop_flow_observed
  FROM finalized f
)
SELECT
  session_id,participant_id,study_id,study_condition,build_version,git_commit_sha,
  blocks_before,blocks_after,reduction_pct,repeat_n,repeat_instances,
  time_to_repeat_unlock_ms,time_to_first_repeat_use_ms,completion_time_ms,
  CASE WHEN blocks_before IS NOT NULL AND blocks_after IS NOT NULL THEN blocks_before-blocks_after END AS block_reduction,
  CASE
    WHEN blocks_before IS NULL OR blocks_after IS NULL THEN NULL
    ELSE blocks_after < blocks_before
  END AS first_repeat_program_valid,
  loop_flow_observed AS loop_flow_correct,
  used_repeat,
  attempts_before_repeat,
  attempts_after_repeat,
  attempts_to_goal,
  attempts_to_complete,
  loop_flow_observed,
  optimization_metrics_available
FROM flags;

CREATE OR REPLACE VIEW public.v_qa_participant_level_metrics WITH (security_invoker=true) AS
WITH e AS (
  SELECT *
  FROM public.v_qa_events
  WHERE level_number BETWEEN 1 AND 7
),
levels AS (
  SELECT DISTINCT session_id, participant_id, study_id, study_condition, level_number
  FROM e
),
cfg AS (
  SELECT
    l.session_id,
    l.participant_id,
    l.study_id,
    l.study_condition,
    s.environment,
    s.build_version,
    s.git_commit_sha,
    s.schema_version,
    s.protocol_version,
    l.level_number,
    CASE l.level_number
      WHEN 1 THEN 'measurement_attempt'
      WHEN 2 THEN 'battery_selected'
      ELSE 'program_started'
    END::text AS attempt_event_type,
    CASE l.level_number
      WHEN 1 THEN 'valid_measurement'
      WHEN 2 THEN 'battery_selected'
      WHEN 3 THEN 'goal_reached'
      WHEN 4 THEN 'goal_reached'
      WHEN 5 THEN 'goal_reached'
      WHEN 6 THEN 'data_sent'
      WHEN 7 THEN 'final_point_reached'
    END::text AS primary_goal_event
  FROM levels l
  JOIN public.apulab_sessions s USING (session_id)
),
bounds AS (
  SELECT
    c.*,
    (
      SELECT min(x.event_seq)
      FROM e x
      WHERE x.session_id=c.session_id
        AND x.level_number=c.level_number
        AND x.event_type=c.primary_goal_event
    ) AS goal_seq,
    (
      SELECT min(x.elapsed_ms)
      FROM e x
      WHERE x.session_id=c.session_id
        AND x.level_number=c.level_number
        AND x.event_type=c.primary_goal_event
    ) AS time_to_goal_ms,
    (
      SELECT min(x.event_seq)
      FROM e x
      WHERE x.session_id=c.session_id
        AND x.level_number=c.level_number
        AND x.event_type='level_completed'
    ) AS complete_seq,
    (
      SELECT min(x.elapsed_ms)
      FROM e x
      WHERE x.session_id=c.session_id
        AND x.level_number=c.level_number
        AND x.event_type='level_completed'
    ) AS time_to_complete_ms,
    EXISTS (
      SELECT 1
      FROM e x
      WHERE x.session_id=c.session_id
        AND x.level_number=c.level_number
        AND x.event_type='level_completed'
    ) AS completed
  FROM cfg c
),
success_bounds AS (
  SELECT
    b.*,
    CASE
      WHEN b.level_number=5 THEN (
        SELECT max(x.event_seq)
        FROM e x
        WHERE x.session_id=b.session_id
          AND x.level_number=5
          AND x.event_type='goal_reached'
          AND (b.complete_seq IS NULL OR x.event_seq < b.complete_seq)
      )
      ELSE b.goal_seq
    END AS success_milestone_seq
  FROM bounds b
),
derived AS (
  SELECT
    s.*,
    (
      SELECT count(*)::int
      FROM e x
      WHERE x.session_id=s.session_id
        AND x.level_number=s.level_number
        AND x.event_type=s.attempt_event_type
        AND s.goal_seq IS NOT NULL
        AND x.event_seq <= s.goal_seq
    ) AS attempts_to_goal,
    (
      SELECT count(*)::int
      FROM e x
      WHERE x.session_id=s.session_id
        AND x.level_number=s.level_number
        AND x.event_type=s.attempt_event_type
        AND s.complete_seq IS NOT NULL
        AND x.event_seq <= s.complete_seq
    ) AS attempts_to_complete,
    CASE
      WHEN s.level_number BETWEEN 3 AND 7 THEN (
        SELECT count(*)::int
        FROM e x
        WHERE x.session_id=s.session_id
          AND x.level_number=s.level_number
          AND x.event_type='program_modified'
          AND s.success_milestone_seq IS NOT NULL
          AND x.event_seq < s.success_milestone_seq
      )
      ELSE NULL
    END AS program_edits_before_success,
    (
      SELECT count(*)::int
      FROM e x
      WHERE x.session_id=s.session_id
        AND x.level_number=s.level_number
        AND (
          x.result='failure'
          OR x.error_code IS NOT NULL
          OR x.event_type IN (
            'premature_action',
            'collision',
            'invalid_measurement',
            'measurement_invalid',
            'program_failed',
            'execution_failed',
            'goal_failed',
            'selection_invalid'
          )
        )
        AND (s.complete_seq IS NULL OR x.event_seq <= s.complete_seq)
    ) AS generic_explicit_failure_count,
    CASE
      WHEN s.level_number BETWEEN 3 AND 7 THEN (
        SELECT max(x.event_seq)
        FROM e x
        WHERE x.session_id=s.session_id
          AND x.level_number=s.level_number
          AND x.event_type='program_started'
          AND s.success_milestone_seq IS NOT NULL
          AND x.event_seq < s.success_milestone_seq
      )
      ELSE NULL
    END AS successful_program_started_seq
  FROM success_bounds s
),
program_state AS (
  SELECT
    d.*,
    sp.payload AS successful_program_payload,
    (
      SELECT COALESCE(
        NULLIF(pm.payload->>'program_blocks','')::int,
        NULLIF(pm.payload->>'blocks_final','')::int,
        NULLIF(pm.payload->>'block_count','')::int,
        NULLIF(pm.payload->>'command_count','')::int,
        NULLIF(pm.payload->>'after_count','')::int
      )
      FROM e pm
      WHERE pm.session_id=d.session_id
        AND pm.level_number=d.level_number
        AND pm.event_type='program_modified'
        AND d.successful_program_started_seq IS NOT NULL
        AND pm.event_seq < d.successful_program_started_seq
        AND (
          pm.payload ? 'program_blocks'
          OR pm.payload ? 'blocks_final'
          OR pm.payload ? 'block_count'
          OR pm.payload ? 'command_count'
          OR pm.payload ? 'after_count'
        )
      ORDER BY pm.event_seq DESC
      LIMIT 1
    ) AS fallback_program_blocks
  FROM derived d
  LEFT JOIN e sp
    ON sp.session_id=d.session_id
   AND sp.level_number=d.level_number
   AND sp.event_seq=d.successful_program_started_seq
   AND sp.event_type='program_started'
)
SELECT
  p.session_id,
  p.participant_id,
  p.study_id,
  p.study_condition,
  p.environment,
  p.build_version,
  p.git_commit_sha,
  p.schema_version,
  p.protocol_version,
  p.level_number,
  p.completed,
  p.attempts_to_goal,
  p.attempts_to_complete,
  GREATEST(COALESCE(p.attempts_to_complete,0)-1,0)::int AS attempts_before_complete,
  p.program_edits_before_success,
  CASE
    WHEN p.level_number BETWEEN 3 AND 7 THEN COALESCE(
      NULLIF(p.successful_program_payload->>'program_blocks','')::int,
      NULLIF(p.successful_program_payload->>'blocks_final','')::int,
      NULLIF(p.successful_program_payload->>'block_count','')::int,
      NULLIF(p.successful_program_payload->>'command_count','')::int,
      NULLIF(p.successful_program_payload->>'after_count','')::int,
      p.fallback_program_blocks
    )
    ELSE NULL
  END AS blocks_in_successful_program,
  p.time_to_goal_ms,
  p.time_to_complete_ms,
  CASE
    WHEN p.level_number=5 THEN n5.used_repeat
    WHEN p.level_number=6 THEN n6.used_repeat_n6
    WHEN p.level_number=7 THEN n7.used_repeat_n7
    ELSE NULL
  END AS used_repeat,
  CASE
    WHEN p.level_number=6 THEN COALESCE(n6.premature_action_count,0)
    ELSE p.generic_explicit_failure_count
  END::int AS explicit_failure_count,
  CASE WHEN p.level_number=7 THEN n7.first_instrument ELSE NULL END AS first_instrument,
  CASE WHEN p.level_number=7 THEN n7.final_instrument ELSE NULL END AS final_instrument,
  CASE WHEN p.level_number=7 THEN (n7.time_to_relevant_choice_ms IS NOT NULL) ELSE NULL END AS relevant_instrument_selected,
  CASE WHEN p.level_number=7 THEN n7.time_to_relevant_choice_ms ELSE NULL END AS time_to_relevant_instrument_ms,
  p.primary_goal_event,
  p.attempt_event_type,
  CASE WHEN p.level_number=5 THEN n5.loop_flow_observed ELSE NULL END AS loop_flow_observed,
  CASE WHEN p.level_number=5 THEN n5.optimization_metrics_available ELSE NULL END AS optimization_metrics_available
FROM program_state p
LEFT JOIN public.v_qa_level5_loop_metrics n5
  ON p.level_number=5 AND n5.session_id=p.session_id
LEFT JOIN public.v_qa_level6_science_metrics n6
  ON p.level_number=6 AND n6.session_id=p.session_id
LEFT JOIN public.v_qa_level7_instrument_metrics n7
  ON p.level_number=7 AND n7.session_id=p.session_id;

CREATE OR REPLACE VIEW public.v_participant_level_metrics WITH (security_invoker=true) AS
WITH e AS (
  SELECT *
  FROM public.v_official_study_events
  WHERE level_number BETWEEN 1 AND 7
),
levels AS (
  SELECT DISTINCT session_id, participant_id, study_id, study_condition, level_number
  FROM e
),
cfg AS (
  SELECT
    l.session_id,
    l.participant_id,
    l.study_id,
    l.study_condition,
    s.environment,
    s.build_version,
    s.git_commit_sha,
    s.schema_version,
    s.protocol_version,
    l.level_number,
    CASE l.level_number
      WHEN 1 THEN 'measurement_attempt'
      WHEN 2 THEN 'battery_selected'
      ELSE 'program_started'
    END::text AS attempt_event_type,
    CASE l.level_number
      WHEN 1 THEN 'valid_measurement'
      WHEN 2 THEN 'battery_selected'
      WHEN 3 THEN 'goal_reached'
      WHEN 4 THEN 'goal_reached'
      WHEN 5 THEN 'goal_reached'
      WHEN 6 THEN 'data_sent'
      WHEN 7 THEN 'final_point_reached'
    END::text AS primary_goal_event
  FROM levels l
  JOIN public.apulab_sessions s USING (session_id)
),
bounds AS (
  SELECT
    c.*,
    (
      SELECT min(x.event_seq)
      FROM e x
      WHERE x.session_id=c.session_id
        AND x.level_number=c.level_number
        AND x.event_type=c.primary_goal_event
    ) AS goal_seq,
    (
      SELECT min(x.elapsed_ms)
      FROM e x
      WHERE x.session_id=c.session_id
        AND x.level_number=c.level_number
        AND x.event_type=c.primary_goal_event
    ) AS time_to_goal_ms,
    (
      SELECT min(x.event_seq)
      FROM e x
      WHERE x.session_id=c.session_id
        AND x.level_number=c.level_number
        AND x.event_type='level_completed'
    ) AS complete_seq,
    (
      SELECT min(x.elapsed_ms)
      FROM e x
      WHERE x.session_id=c.session_id
        AND x.level_number=c.level_number
        AND x.event_type='level_completed'
    ) AS time_to_complete_ms,
    EXISTS (
      SELECT 1
      FROM e x
      WHERE x.session_id=c.session_id
        AND x.level_number=c.level_number
        AND x.event_type='level_completed'
    ) AS completed
  FROM cfg c
),
success_bounds AS (
  SELECT
    b.*,
    CASE
      WHEN b.level_number=5 THEN (
        SELECT max(x.event_seq)
        FROM e x
        WHERE x.session_id=b.session_id
          AND x.level_number=5
          AND x.event_type='goal_reached'
          AND (b.complete_seq IS NULL OR x.event_seq < b.complete_seq)
      )
      ELSE b.goal_seq
    END AS success_milestone_seq
  FROM bounds b
),
derived AS (
  SELECT
    s.*,
    (
      SELECT count(*)::int
      FROM e x
      WHERE x.session_id=s.session_id
        AND x.level_number=s.level_number
        AND x.event_type=s.attempt_event_type
        AND s.goal_seq IS NOT NULL
        AND x.event_seq <= s.goal_seq
    ) AS attempts_to_goal,
    (
      SELECT count(*)::int
      FROM e x
      WHERE x.session_id=s.session_id
        AND x.level_number=s.level_number
        AND x.event_type=s.attempt_event_type
        AND s.complete_seq IS NOT NULL
        AND x.event_seq <= s.complete_seq
    ) AS attempts_to_complete,
    CASE
      WHEN s.level_number BETWEEN 3 AND 7 THEN (
        SELECT count(*)::int
        FROM e x
        WHERE x.session_id=s.session_id
          AND x.level_number=s.level_number
          AND x.event_type='program_modified'
          AND s.success_milestone_seq IS NOT NULL
          AND x.event_seq < s.success_milestone_seq
      )
      ELSE NULL
    END AS program_edits_before_success,
    (
      SELECT count(*)::int
      FROM e x
      WHERE x.session_id=s.session_id
        AND x.level_number=s.level_number
        AND (
          x.result='failure'
          OR x.error_code IS NOT NULL
          OR x.event_type IN (
            'premature_action',
            'collision',
            'invalid_measurement',
            'measurement_invalid',
            'program_failed',
            'execution_failed',
            'goal_failed',
            'selection_invalid'
          )
        )
        AND (s.complete_seq IS NULL OR x.event_seq <= s.complete_seq)
    ) AS generic_explicit_failure_count,
    CASE
      WHEN s.level_number BETWEEN 3 AND 7 THEN (
        SELECT max(x.event_seq)
        FROM e x
        WHERE x.session_id=s.session_id
          AND x.level_number=s.level_number
          AND x.event_type='program_started'
          AND s.success_milestone_seq IS NOT NULL
          AND x.event_seq < s.success_milestone_seq
      )
      ELSE NULL
    END AS successful_program_started_seq
  FROM success_bounds s
),
program_state AS (
  SELECT
    d.*,
    sp.payload AS successful_program_payload,
    (
      SELECT COALESCE(
        NULLIF(pm.payload->>'program_blocks','')::int,
        NULLIF(pm.payload->>'blocks_final','')::int,
        NULLIF(pm.payload->>'block_count','')::int,
        NULLIF(pm.payload->>'command_count','')::int,
        NULLIF(pm.payload->>'after_count','')::int
      )
      FROM e pm
      WHERE pm.session_id=d.session_id
        AND pm.level_number=d.level_number
        AND pm.event_type='program_modified'
        AND d.successful_program_started_seq IS NOT NULL
        AND pm.event_seq < d.successful_program_started_seq
        AND (
          pm.payload ? 'program_blocks'
          OR pm.payload ? 'blocks_final'
          OR pm.payload ? 'block_count'
          OR pm.payload ? 'command_count'
          OR pm.payload ? 'after_count'
        )
      ORDER BY pm.event_seq DESC
      LIMIT 1
    ) AS fallback_program_blocks
  FROM derived d
  LEFT JOIN e sp
    ON sp.session_id=d.session_id
   AND sp.level_number=d.level_number
   AND sp.event_seq=d.successful_program_started_seq
   AND sp.event_type='program_started'
)
SELECT
  p.session_id,
  p.participant_id,
  p.study_id,
  p.study_condition,
  p.environment,
  p.build_version,
  p.git_commit_sha,
  p.schema_version,
  p.protocol_version,
  p.level_number,
  p.completed,
  p.attempts_to_goal,
  p.attempts_to_complete,
  GREATEST(COALESCE(p.attempts_to_complete,0)-1,0)::int AS attempts_before_complete,
  p.program_edits_before_success,
  CASE
    WHEN p.level_number BETWEEN 3 AND 7 THEN COALESCE(
      NULLIF(p.successful_program_payload->>'program_blocks','')::int,
      NULLIF(p.successful_program_payload->>'blocks_final','')::int,
      NULLIF(p.successful_program_payload->>'block_count','')::int,
      NULLIF(p.successful_program_payload->>'command_count','')::int,
      NULLIF(p.successful_program_payload->>'after_count','')::int,
      p.fallback_program_blocks
    )
    ELSE NULL
  END AS blocks_in_successful_program,
  p.time_to_goal_ms,
  p.time_to_complete_ms,
  CASE
    WHEN p.level_number=5 THEN n5.used_repeat
    WHEN p.level_number=6 THEN n6.used_repeat_n6
    WHEN p.level_number=7 THEN n7.used_repeat_n7
    ELSE NULL
  END AS used_repeat,
  CASE
    WHEN p.level_number=6 THEN COALESCE(n6.premature_action_count,0)
    ELSE p.generic_explicit_failure_count
  END::int AS explicit_failure_count,
  CASE WHEN p.level_number=7 THEN n7.first_instrument ELSE NULL END AS first_instrument,
  CASE WHEN p.level_number=7 THEN n7.final_instrument ELSE NULL END AS final_instrument,
  CASE WHEN p.level_number=7 THEN (n7.time_to_relevant_choice_ms IS NOT NULL) ELSE NULL END AS relevant_instrument_selected,
  CASE WHEN p.level_number=7 THEN n7.time_to_relevant_choice_ms ELSE NULL END AS time_to_relevant_instrument_ms,
  p.primary_goal_event,
  p.attempt_event_type,
  CASE WHEN p.level_number=5 THEN n5.loop_flow_observed ELSE NULL END AS loop_flow_observed,
  CASE WHEN p.level_number=5 THEN n5.optimization_metrics_available ELSE NULL END AS optimization_metrics_available
FROM program_state p
LEFT JOIN public.v_level5_loop_metrics n5
  ON p.level_number=5 AND n5.session_id=p.session_id
LEFT JOIN public.v_level6_science_metrics n6
  ON p.level_number=6 AND n6.session_id=p.session_id
LEFT JOIN public.v_level7_instrument_metrics n7
  ON p.level_number=7 AND n7.session_id=p.session_id;

-- Least privilege: filtered event views do not expose anything beyond the
-- raw event SELECT already granted to service_role, but security_invoker
-- analytics require SELECT on their nested sources.
REVOKE ALL ON TABLE
  public.v_qa_participant_level_metrics,
  public.v_participant_level_metrics
FROM anon,authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN
    GRANT SELECT ON TABLE
      public.v_qa_events,
      public.v_official_study_events,
      public.v_qa_level_outcomes,
      public.v_level_outcomes,
      public.v_qa_level5_loop_metrics,
      public.v_level5_loop_metrics,
      public.v_qa_level6_science_metrics,
      public.v_level6_science_metrics,
      public.v_qa_level7_instrument_metrics,
      public.v_level7_instrument_metrics,
      public.v_qa_participant_level_metrics,
      public.v_participant_level_metrics
    TO service_role;
  END IF;
END $$;
