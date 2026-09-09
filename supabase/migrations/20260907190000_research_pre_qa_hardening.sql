-- ApuLab Station Research · Pre-QA hardening clean
-- Canonical N6/N7 semantics, validated constraints, no browser grants.
DROP INDEX IF EXISTS idx_apulab_events_type;
DROP INDEX IF EXISTS idx_apulab_events_participant;
DROP INDEX IF EXISTS idx_apulab_events_event_id_unique;
DROP INDEX IF EXISTS idx_apulab_sessions_participant_v2;

CREATE INDEX IF NOT EXISTS idx_apulab_study_assignments_participant_id
  ON apulab_study_assignments(participant_id);

DO $$ BEGIN
  ALTER TABLE apulab_events ADD CONSTRAINT apulab_events_level_semantics
    CHECK (
      level_number IS NULL
      OR (
        (event_type NOT IN ('communication_point_reached','data_sent') OR level_number=6)
        AND (event_type <> 'final_point_reached' OR level_number=7)
      )
    ) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE apulab_sessions VALIDATE CONSTRAINT apulab_sessions_no_raw_participant_code;
ALTER TABLE apulab_events VALIDATE CONSTRAINT apulab_events_no_raw_participant_code;
ALTER TABLE apulab_events VALIDATE CONSTRAINT apulab_events_payload_size;
ALTER TABLE apulab_events VALIDATE CONSTRAINT apulab_events_level_check;
ALTER TABLE apulab_events VALIDATE CONSTRAINT apulab_events_event_seq_check;
ALTER TABLE apulab_events VALIDATE CONSTRAINT apulab_events_environment_check;
ALTER TABLE apulab_events VALIDATE CONSTRAINT apulab_events_level_semantics;
ALTER TABLE apulab_sessions VALIDATE CONSTRAINT apulab_sessions_environment_check;
ALTER TABLE apulab_sessions VALIDATE CONSTRAINT apulab_sessions_study_consistency_v2;
ALTER TABLE apulab_sessions VALIDATE CONSTRAINT apulab_sessions_sync_token_hash_length;

REVOKE ALL ON TABLE v_level6_science_metrics,v_level7_instrument_metrics FROM anon,authenticated;
