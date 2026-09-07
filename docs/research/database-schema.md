# ApuLab Station research database schema

## Scope
This database belongs only to **ApuLabStationGame**. Its operational research condition is `game`. **ApuLabControl is out of scope**: there is no database synchronization, no cross-repository build and no Control participant storage in this project.

## Study separation
- `APULAB-QA-2026`: internal Station QA only (`study_kind=qa`).
- `APULAB-STUDY-2026`: official Station game cohort (`study_kind=official`).
- Official paper data is exposed only by `v_official_study_events`, which requires the official `study_id` and `environment='study'`.
- The overall research protocol may contain other conditions elsewhere, but they are never persisted or executed by this Station database.

## Core tables
- `apulab_studies`: protocol/schema/build metadata and study lifecycle.
- `apulab_participants`: pseudonymous Station identity only. Stores HMAC of code and credential hash, never raw code.
- `apulab_study_assignments`: Station assignments are `game` only after Migration 6.
- `apulab_sessions`: server-authoritative participant/study/condition, build/schema/protocol, environment and progress.
- `apulab_events`: atomic raw events, ordered by `event_seq`, with UUID `event_id` as idempotency key.

## Defense in depth
The TypeScript runtime, `SessionService`, mock repository, Edge Function and Migration 6 all enforce `study_condition='game'` for Station study traffic. Demo sessions/events retain `study_condition=NULL`.

All research tables have RLS enabled and direct `anon`/`authenticated` access revoked. Browser writes go through the reviewed Edge Function; the iframe never owns authoritative identity metadata.

## Analytical views
`v_level_outcomes`, `v_level5_loop_metrics`, `v_level6_science_metrics`, `v_level7_instrument_metrics`, and `v_session_quality` derive metrics from raw events. Behavioral measures are not relabeled as proof of learning.

## Migration strategy
Historical migrations are immutable. Migration 5 (`20260907190000_research_pre_qa_hardening.sql`) hardens research metrics and constraints. Migration 6 (`20260907230000_station_game_condition_guard.sql`) adds the Station-only game condition guard. Both are forward-only.
