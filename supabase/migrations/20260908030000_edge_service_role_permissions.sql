-- ApuLab Station · Edge service-role permissions
-- Forward-only least-privilege remediation for ingest-telemetry.
-- Browser roles remain fail-closed.

-- Reassert browser denial.
REVOKE ALL ON TABLE public.apulab_participants
FROM anon, authenticated;

REVOKE ALL ON TABLE public.apulab_auth_attempts
FROM anon, authenticated;

REVOKE ALL ON TABLE public.apulab_studies
FROM anon, authenticated;

REVOKE ALL ON TABLE public.apulab_study_assignments
FROM anon, authenticated;

REVOKE ALL ON TABLE public.apulab_sessions
FROM anon, authenticated;

REVOKE ALL ON TABLE public.apulab_events
FROM anon, authenticated;

-- ingest-telemetry authentication reads
GRANT SELECT
ON TABLE public.apulab_participants
TO service_role;

GRANT SELECT
ON TABLE public.apulab_studies
TO service_role;

GRANT SELECT
ON TABLE public.apulab_study_assignments
TO service_role;

-- authentication audit
GRANT SELECT, INSERT
ON TABLE public.apulab_auth_attempts
TO service_role;

-- session creation, lookup and completion
GRANT SELECT, INSERT, UPDATE
ON TABLE public.apulab_sessions
TO service_role;

-- telemetry lookup and ingestion
GRANT SELECT, INSERT
ON TABLE public.apulab_events
TO service_role;
