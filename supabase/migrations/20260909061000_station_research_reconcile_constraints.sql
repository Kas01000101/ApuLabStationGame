-- ApuLab Station GE · Live reconciliation M8
-- Forward-only correction. Preserves historical demo rows and removes stale static_control compatibility.
DO $$
DECLARE
  participants_count bigint;
  assignments_count bigint;
  sessions_count bigint;
  events_count bigint;
  official_status text;
  official_commit text;
BEGIN
  SELECT count(*) INTO participants_count FROM public.apulab_participants;
  SELECT count(*) INTO assignments_count FROM public.apulab_study_assignments;
  SELECT count(*) INTO sessions_count FROM public.apulab_sessions;
  SELECT count(*) INTO events_count FROM public.apulab_events;
  SELECT status, expected_commit_sha INTO official_status, official_commit
    FROM public.apulab_studies WHERE study_id='APULAB-STUDY-2026';

  IF participants_count <> 0 OR assignments_count <> 0 THEN
    RAISE EXCEPTION 'prewrite_participant_state_changed';
  END IF;
  IF sessions_count <> 4 OR events_count <> 176 THEN
    RAISE EXCEPTION 'prewrite_historical_counts_changed';
  END IF;
  IF official_status IS DISTINCT FROM 'draft' OR official_commit IS DISTINCT FROM 'UNFROZEN' THEN
    RAISE EXCEPTION 'official_study_state_changed';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.apulab_sessions
    WHERE session_mode::text <> 'demo' OR study_id IS NOT NULL OR study_condition IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'unexpected_non_demo_session_present';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.apulab_events
    WHERE session_mode::text <> 'demo' OR study_id IS NOT NULL OR study_condition IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'unexpected_non_demo_event_present';
  END IF;
END $$;

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
