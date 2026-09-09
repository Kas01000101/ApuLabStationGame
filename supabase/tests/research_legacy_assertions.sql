\set ON_ERROR_STOP on
DO $$
DECLARE s record; e record; view_count int;
BEGIN
  SELECT * INTO s FROM apulab_sessions WHERE session_id='00000000-0000-4000-8000-000000000802';
  IF s.session_id IS NULL THEN RAISE EXCEPTION 'legacy session lost'; END IF;
  IF s.study_id IS NOT NULL OR s.study_condition IS NOT NULL THEN RAISE EXCEPTION 'legacy demo was promoted into study'; END IF;
  IF s.protocol_version <> 'legacy' THEN RAISE EXCEPTION 'legacy session protocol_version not backfilled'; END IF;

  SELECT * INTO e FROM apulab_events WHERE event_id='00000000-0000-4000-8000-000000000803'::uuid;
  IF e.event_id IS NULL THEN RAISE EXCEPTION 'legacy event lost'; END IF;
  IF e.study_id IS NOT NULL OR e.study_condition IS NOT NULL THEN RAISE EXCEPTION 'legacy event was promoted into study'; END IF;
  IF e.protocol_version <> 'legacy' THEN RAISE EXCEPTION 'legacy event protocol_version not backfilled'; END IF;

  IF NOT EXISTS (SELECT 1 FROM apulab_participants WHERE participant_id='00000000-0000-4000-8000-000000000801') THEN
    RAISE EXCEPTION 'legacy participant lost';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.apulab_events'::regclass
      AND conname='apulab_station_events_game_only'
      AND pg_get_constraintdef(oid) ILIKE '%game%'
  ) THEN RAISE EXCEPTION 'M8 event game-only guard missing'; END IF;

  SELECT count(*) INTO view_count
  FROM pg_class
  WHERE relnamespace='public'::regnamespace
    AND relname IN ('v_official_study_events','v_qa_events','v_level_outcomes','v_level5_loop_metrics','v_level6_science_metrics','v_level7_instrument_metrics','v_session_quality')
    AND coalesce(reloptions,'{}'::text[]) @> ARRAY['security_invoker=true'];
  IF view_count <> 7 THEN RAISE EXCEPTION 'M9 security_invoker views incomplete: %', view_count; END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='v_level7_instrument_metrics'
      AND column_name IN ('data_sent','communication_time_ms','communication_send_order_correct')
  ) THEN RAISE EXCEPTION 'M9 contaminated N7 analytics remain'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='v_level7_instrument_metrics'
      AND column_name='final_point_reached'
  ) THEN RAISE EXCEPTION 'M9 final point analytics missing'; END IF;

  IF NOT has_table_privilege('service_role','public.apulab_participants','SELECT') THEN RAISE EXCEPTION 'M10 participant SELECT missing'; END IF;
  IF NOT has_table_privilege('service_role','public.apulab_sessions','SELECT,INSERT,UPDATE') THEN RAISE EXCEPTION 'M10 session grants missing'; END IF;
  IF NOT has_table_privilege('service_role','public.apulab_events','SELECT,INSERT') THEN RAISE EXCEPTION 'M10 event grants missing'; END IF;
  IF has_table_privilege('service_role','public.apulab_events','UPDATE')
     OR has_table_privilege('service_role','public.apulab_events','DELETE')
     OR has_table_privilege('service_role','public.apulab_events','TRUNCATE') THEN
    RAISE EXCEPTION 'M10 excessive event privilege remains';
  END IF;
END $$;
