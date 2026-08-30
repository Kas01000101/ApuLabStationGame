-- Compatibility hardening for databases created by the legacy ApuLabStation schema.
-- New architecture never persists raw participant codes.

ALTER TABLE IF EXISTS apulab_sessions
  ALTER COLUMN participant_code DROP NOT NULL;

ALTER TABLE IF EXISTS apulab_events
  ALTER COLUMN participant_code DROP NOT NULL;

ALTER TABLE IF EXISTS apulab_sessions
  DROP CONSTRAINT IF EXISTS apulab_study_requires_code;
