-- ApuLab Station · Edge service-role permissions
-- Browser roles remain fail-closed; service_role gets only ingest requirements.
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
    GRANT SELECT ON TABLE public.apulab_participants TO service_role;
    GRANT SELECT ON TABLE public.apulab_studies TO service_role;
    GRANT SELECT ON TABLE public.apulab_study_assignments TO service_role;
    GRANT SELECT,INSERT ON TABLE public.apulab_auth_attempts TO service_role;
    GRANT SELECT,INSERT,UPDATE ON TABLE public.apulab_sessions TO service_role;
    GRANT SELECT,INSERT ON TABLE public.apulab_events TO service_role;
  END IF;
END $$;
