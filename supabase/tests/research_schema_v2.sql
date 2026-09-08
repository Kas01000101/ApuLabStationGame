-- Run after migrations in a disposable/local Supabase database.
DO $$ BEGIN
  IF to_regclass('public.apulab_studies') IS NULL THEN RAISE EXCEPTION 'missing apulab_studies'; END IF;
  IF to_regclass('public.apulab_study_assignments') IS NULL THEN RAISE EXCEPTION 'missing apulab_study_assignments'; END IF;
  IF to_regclass('public.apulab_events') IS NULL THEN RAISE EXCEPTION 'missing apulab_events'; END IF;
  IF to_regclass('public.v_official_study_events') IS NULL THEN RAISE EXCEPTION 'missing official view'; END IF;
  IF to_regclass('public.v_qa_events') IS NULL THEN RAISE EXCEPTION 'missing QA view'; END IF;
  IF NOT EXISTS (SELECT 1 FROM apulab_studies WHERE study_id='APULAB-QA-2026' AND study_kind='qa') THEN RAISE EXCEPTION 'missing QA study'; END IF;
  IF NOT EXISTS (SELECT 1 FROM apulab_studies WHERE study_id='APULAB-STUDY-2026' AND study_kind='official') THEN RAISE EXCEPTION 'missing official study'; END IF;
  IF EXISTS (SELECT 1 FROM v_official_study_events WHERE study_id<>'APULAB-STUDY-2026' OR environment<>'study') THEN RAISE EXCEPTION 'official view contamination'; END IF;
END $$;

SELECT conname FROM pg_constraint WHERE conrelid='apulab_events'::regclass AND conname IN ('apulab_events_level_check','apulab_events_event_seq_check','apulab_events_attempt_check','apulab_events_elapsed_check');
