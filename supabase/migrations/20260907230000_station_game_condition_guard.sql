-- ApuLabStationGame · Station-only condition guard
-- Forward-only Migration 6. Historical migrations 1-5 remain unchanged.
-- This database stores only the game condition. ApuLabControl is out of scope.

DO $$ BEGIN
  ALTER TABLE apulab_study_assignments
    ADD CONSTRAINT apulab_station_assignments_game_only
    CHECK (study_condition = 'game') NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE apulab_sessions
    ADD CONSTRAINT apulab_station_sessions_game_only
    CHECK (
      (session_mode::text = 'demo' AND study_condition IS NULL)
      OR (session_mode::text = 'study' AND study_condition = 'game')
    ) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE apulab_events
    ADD CONSTRAINT apulab_station_events_game_only
    CHECK (
      (session_mode::text = 'demo' AND study_condition IS NULL)
      OR (session_mode::text = 'study' AND study_condition = 'game')
    ) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE apulab_study_assignments VALIDATE CONSTRAINT apulab_station_assignments_game_only;
ALTER TABLE apulab_sessions VALIDATE CONSTRAINT apulab_station_sessions_game_only;
ALTER TABLE apulab_events VALIDATE CONSTRAINT apulab_station_events_game_only;

COMMENT ON CONSTRAINT apulab_station_assignments_game_only ON apulab_study_assignments IS
  'ApuLabStationGame stores only participants assigned to the game condition.';
COMMENT ON CONSTRAINT apulab_station_sessions_game_only ON apulab_sessions IS
  'Study sessions in ApuLabStationGame must be game; demo sessions keep study_condition NULL.';
COMMENT ON CONSTRAINT apulab_station_events_game_only ON apulab_events IS
  'Study events in ApuLabStationGame must be game; demo events keep study_condition NULL.';
