-- ApuLab Station GE · Research reconciliation M8
-- Forward-only contract correction.
-- Live snapshot/count preflight is an operational deployment gate and is recorded
-- separately in docs/SUPABASE_PREWRITE_CHECKPOINT.md. The migration itself must
-- remain reproducible on fresh, legacy, QA, and future databases.

ALTER TABLE public.apulab_study_assignments
  DROP CONSTRAINT IF EXISTS apulab_assignment_condition_check,
  DROP CONSTRAINT IF EXISTS apulab_station_assignments_game_only;
ALTER TABLE public.apulab_study_assignments
  ADD CONSTRAINT apulab_assignment_condition_check
    CHECK (study_condition IS NOT DISTINCT FROM 'game') NOT VALID,
  ADD CONSTRAINT apulab_station_assignments_game_only
    CHECK (study_condition IS NOT DISTINCT FROM 'game') NOT VALID;
ALTER TABLE public.apulab_study_assignments VALIDATE CONSTRAINT apulab_assignment_condition_check;
ALTER TABLE public.apulab_study_assignments VALIDATE CONSTRAINT apulab_station_assignments_game_only;

ALTER TABLE public.apulab_sessions
  DROP CONSTRAINT IF EXISTS apulab_sessions_condition_check,
  DROP CONSTRAINT IF EXISTS apulab_sessions_study_consistency_v2,
  DROP CONSTRAINT IF EXISTS apulab_station_sessions_game_only;
ALTER TABLE public.apulab_sessions
  ADD CONSTRAINT apulab_sessions_condition_check
    CHECK (study_condition IS NULL OR study_condition IS NOT DISTINCT FROM 'game') NOT VALID,
  ADD CONSTRAINT apulab_sessions_study_consistency_v2
    CHECK (
      (session_mode::text='demo' AND participant_id IS NULL AND study_id IS NULL AND study_condition IS NULL)
      OR
      (session_mode::text='study' AND participant_id IS NOT NULL AND study_id IS NOT NULL AND study_condition IS NOT DISTINCT FROM 'game')
    ) NOT VALID,
  ADD CONSTRAINT apulab_station_sessions_game_only
    CHECK (
      (session_mode::text='demo' AND study_condition IS NULL)
      OR
      (session_mode::text='study' AND study_condition IS NOT DISTINCT FROM 'game')
    ) NOT VALID;
ALTER TABLE public.apulab_sessions VALIDATE CONSTRAINT apulab_sessions_condition_check;
ALTER TABLE public.apulab_sessions VALIDATE CONSTRAINT apulab_sessions_study_consistency_v2;
ALTER TABLE public.apulab_sessions VALIDATE CONSTRAINT apulab_station_sessions_game_only;

ALTER TABLE public.apulab_events
  DROP CONSTRAINT IF EXISTS apulab_events_condition_check,
  DROP CONSTRAINT IF EXISTS apulab_station_events_game_only;
ALTER TABLE public.apulab_events
  ADD CONSTRAINT apulab_events_condition_check
    CHECK (study_condition IS NULL OR study_condition IS NOT DISTINCT FROM 'game') NOT VALID,
  ADD CONSTRAINT apulab_station_events_game_only
    CHECK (
      (session_mode::text='demo' AND study_condition IS NULL)
      OR
      (session_mode::text='study' AND study_condition IS NOT DISTINCT FROM 'game')
    ) NOT VALID;
ALTER TABLE public.apulab_events VALIDATE CONSTRAINT apulab_events_condition_check;
ALTER TABLE public.apulab_events VALIDATE CONSTRAINT apulab_station_events_game_only;

COMMENT ON CONSTRAINT apulab_station_assignments_game_only ON public.apulab_study_assignments IS 'Station GE stores only game assignments.';
COMMENT ON CONSTRAINT apulab_station_sessions_game_only ON public.apulab_sessions IS 'Study sessions must be game; demo remains NULL.';
COMMENT ON CONSTRAINT apulab_station_events_game_only ON public.apulab_events IS 'Study events must be game; demo remains NULL.';
