# ApuLab research database schema v2

## Purpose
This schema is preparation for a future real Supabase project. It is not evidence that Supabase is connected or deployed.

## Study separation
- `APULAB-QA-2026`: internal QA only (`study_kind=qa`).
- `APULAB-STUDY-2026`: official research cohort (`study_kind=official`).
- Official paper data is exposed only by `v_official_study_events`, which requires both the official `study_id` and `environment='study'`.

## Core tables
- `apulab_studies`: protocol/schema/build metadata and study lifecycle.
- `apulab_participants`: pseudonymous identity only. Stores HMAC of code and credential hash, never raw code.
- `apulab_study_assignments`: condition belongs here, not in the participant row. No 25/25 split is assumed.
- `apulab_sessions`: server-authoritative participant/study/condition, build/schema/protocol, environment and progress.
- `apulab_events`: atomic raw events, ordered by `event_seq`, with UUID `event_id` as idempotency key.

## Security
All research tables have RLS enabled and direct `anon`/`authenticated` table access revoked. Browser writes go through Edge Functions. The Edge Function reconstructs participant, study, condition and versions from the session row instead of trusting iframe/client payloads.

## Analytical views
`v_level_outcomes`, `v_level5_loop_metrics`, `v_level6_science_metrics`, `v_level7_instrument_metrics`, and `v_session_quality` derive metrics from raw events. Behavioral measures are not relabeled as proof of learning.

## Migration strategy
`20260906170000_research_schema_v2.sql` is forward-only and uses defensive `CREATE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, guarded constraints and legacy-safe backfills. Historical migrations are intentionally left unchanged.
