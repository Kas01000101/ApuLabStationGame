\set ON_ERROR_STOP on
DO $$
DECLARE s record; e record;
BEGIN
  SELECT * INTO s FROM apulab_sessions WHERE session_id='00000000-0000-4000-8000-000000000802';
  IF s.session_id IS NULL THEN RAISE EXCEPTION 'legacy session lost'; END IF;
  IF s.study_id IS NOT NULL OR s.study_condition IS NOT NULL THEN RAISE EXCEPTION 'legacy demo was promoted into study'; END IF;
  IF s.protocol_version <> 'legacy' THEN RAISE EXCEPTION 'legacy session protocol_version not backfilled'; END IF;
  SELECT * INTO e FROM apulab_events WHERE event_id='00000000-0000-4000-8000-000000000803'::uuid;
  IF e.event_id IS NULL THEN RAISE EXCEPTION 'legacy event lost'; END IF;
  IF e.study_id IS NOT NULL OR e.study_condition IS NOT NULL THEN RAISE EXCEPTION 'legacy event was promoted into study'; END IF;
  IF e.protocol_version <> 'legacy' THEN RAISE EXCEPTION 'legacy event protocol_version not backfilled'; END IF;
  IF NOT EXISTS (SELECT 1 FROM apulab_participants WHERE participant_id='00000000-0000-4000-8000-000000000801') THEN RAISE EXCEPTION 'legacy participant lost'; END IF;
END $$;
