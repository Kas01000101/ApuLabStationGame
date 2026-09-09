-- ApuLab Station GE · Live reconciliation M10
-- Normalize Research runtime privileges to least privilege.
DO $$
DECLARE
  participants_count bigint;
  assignments_count bigint;
  sessions_count bigint;
  events_count bigint;
BEGIN
  SELECT count(*) INTO participants_count FROM public.apulab_participants;
  SELECT count(*) INTO assignments_count FROM public.apulab_study_assignments;
  SELECT count(*) INTO sessions_count FROM public.apulab_sessions;
  SELECT count(*) INTO events_count FROM public.apulab_events;
  IF participants_count <> 0 OR assignments_count <> 0 OR sessions_count <> 4 OR events_count <> 176 THEN
    RAISE EXCEPTION 'prewrite_state_changed_before_m10';
  END IF;
END $$;

REVOKE ALL ON TABLE public.apulab_participants FROM anon,authenticated;
REVOKE ALL ON TABLE public.apulab_auth_attempts FROM anon,authenticated;
REVOKE ALL ON TABLE public.apulab_studies FROM anon,authenticated;
REVOKE ALL ON TABLE public.apulab_study_assignments FROM anon,authenticated;
REVOKE ALL ON TABLE public.apulab_sessions FROM anon,authenticated;
REVOKE ALL ON TABLE public.apulab_events FROM anon,authenticated;
REVOKE ALL ON TABLE public.v_official_study_events,public.v_qa_events,public.v_level_outcomes,public.v_level5_loop_metrics,public.v_level6_science_metrics,public.v_level7_instrument_metrics,public.v_session_quality FROM anon,authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN
    REVOKE ALL ON TABLE public.apulab_participants FROM service_role;
    REVOKE ALL ON TABLE public.apulab_auth_attempts FROM service_role;
    REVOKE ALL ON TABLE public.apulab_studies FROM service_role;
    REVOKE ALL ON TABLE public.apulab_study_assignments FROM service_role;
    REVOKE ALL ON TABLE public.apulab_sessions FROM service_role;
    REVOKE ALL ON TABLE public.apulab_events FROM service_role;
    REVOKE ALL ON TABLE public.v_official_study_events,public.v_qa_events,public.v_level_outcomes,public.v_level5_loop_metrics,public.v_level6_science_metrics,public.v_level7_instrument_metrics,public.v_session_quality FROM service_role;

    GRANT SELECT ON TABLE public.apulab_participants TO service_role;
    GRANT SELECT ON TABLE public.apulab_studies TO service_role;
    GRANT SELECT ON TABLE public.apulab_study_assignments TO service_role;
    GRANT SELECT,INSERT ON TABLE public.apulab_auth_attempts TO service_role;
    GRANT SELECT,INSERT,UPDATE ON TABLE public.apulab_sessions TO service_role;
    GRANT SELECT,INSERT ON TABLE public.apulab_events TO service_role;
  END IF;
END $$;
