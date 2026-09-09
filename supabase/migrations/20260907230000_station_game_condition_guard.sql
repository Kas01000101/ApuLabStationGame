-- ApuLabStationGame · Station-only condition guard
-- This database stores only the game condition. ApuLabControl is out of scope.
DO $$ BEGIN
  ALTER TABLE apulab_study_assignments
    ADD CONSTRAINT apulab_station_assignments_game_only CHECK (study_condition='game') NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE apulab_sessions
    ADD CONSTRAINT apulab_station_sessions_game_only CHECK (
      (session_mode::text='demo' AND study_condition IS NULL)
      OR (session_mode::text='study' AND study_condition='game')
    ) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE apulab_events
    ADD CONSTRAINT apulab_station_events_game_only CHECK (
      (session_mode::text='demo' AND study_condition IS NULL)
      OR (session_mode::text='study' AND study_condition='game')
    ) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE apulab_study_assignments VALIDATE CONSTRAINT apulab_station_assignments_game_only;
ALTER TABLE apulab_sessions VALIDATE CONSTRAINT apulab_station_sessions_game_only;
ALTER TABLE apulab_events VALIDATE CONSTRAINT apulab_station_events_game_only;
COMMENT ON CONSTRAINT apulab_station_assignments_game_only ON apulab_study_assignments IS 'Station stores only game assignments.';
COMMENT ON CONSTRAINT apulab_station_sessions_game_only ON apulab_sessions IS 'Study sessions must be game; demo remains NULL.';
COMMENT ON CONSTRAINT apulab_station_events_game_only ON apulab_events IS 'Study events must be game; demo remains NULL.';
