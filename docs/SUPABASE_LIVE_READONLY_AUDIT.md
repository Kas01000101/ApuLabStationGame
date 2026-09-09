# Supabase Live Read-Only Audit — ApuLab Station GE

## Scope and safety

This audit is read-only. No migration, DDL, data mutation, Edge deployment, secret update, or production deployment was performed.

- Repository: `Kas01000101/ApuLabStationGame`
- Clean Research branch: `research/station-research-clean-v3`
- Validated Research code SHA: `630b63dcd5e24bdb38ed3ed1525efefcf86b82be`
- Supabase project: `ApuLabStation-Research`
- Region: `sa-east-1`
- Project status: `ACTIVE_HEALTHY`
- PostgreSQL: `17.6.1.166` / engine 17 / GA
- `SUPABASE_LIVE_WRITE = NO`
- `EDGE_LIVE_DEPLOY = NO`

## Executive finding

The live project is **not yet equivalent to clean-v3** even though its migration history contains migration names M1→M7.

The main live drift is:

1. the deployed Edge Function still uses the superseded N7 communication/send semantics;
2. `v_level7_instrument_metrics` still derives `communication_point_reached` / `data_sent` metrics;
3. analytical level views use participant-level grain rather than session-level grain;
4. Research views do not have `security_invoker=true`;
5. effective `service_role` grants are broader than clean-v3 least privilege;
6. some live condition constraints still retain `static_control` compatibility and the live event game-only check is not null-safe by itself;
7. live contains historical demo telemetry from the superseded PR #35 build.

No official participant data was found.

## Migration history

The live migration registry contains all seven migration names:

| Migration | clean-v3 | Live registry | Assessment |
| --- | --- | --- | --- |
| M1 `20260830090000_research_security_baseline` | present | present | historical |
| M2 `20260830091000_legacy_raw_code_nullable` | present | present | historical |
| M3 `20260906170000_research_schema_v2` | clean | present | content/result drift |
| M4 `20260906183000_research_hardening` | clean | present | content/result drift |
| M5 `20260907190000_research_pre_qa_hardening` | clean | present | content/result drift |
| M6 `20260907230000_station_game_condition_guard` | clean | present | partial semantic drift |
| M7 `20260908030000_edge_service_role_permissions` | clean | present | privilege drift |

`MIGRATION_DRIFT_KNOWN = YES`.

Because M3–M7 are already recorded as applied in production, **the clean files with those names must not simply be replayed**. Reconciliation must use new forward corrective migrations after explicit authorization.

## Live data classification

Counts observed read-only:

| Relation | Rows |
| --- | ---: |
| participants | 0 |
| study assignments | 0 |
| sessions | 4 |
| events | 176 |
| auth attempts | 0 |
| post-test responses | 0 |

All 4 sessions and all 176 events are classified as:

- `session_mode = demo`
- `environment = study`
- `study_id = NULL`
- `study_condition = NULL`
- build `APULAB-STUDY-RC.1`
- git commit `c5b3d89fa650af9faa31ace4f90d537b53371b57` (superseded PR #35 build)

Session status distribution:

- 1 completed demo, `last_level = 7`
- 3 in-progress demos

The completed N7 demo includes one `communication_point_reached` and one `data_sent`, proving that the stored demo telemetry reflects the superseded N7 contract.

Disposition:

- preserve these rows as historical/demo telemetry;
- do not relabel them as QA or official;
- do not use them as paper-eligible GE observations;
- do not delete them during reconciliation without a separate explicit retention decision.

`LIVE_OFFICIAL_PARTICIPANT_DATA = 0`.

## Study metadata

Live study records:

- `APULAB-QA-2026`: `qa`, status `pilot`, build `APULAB-STUDY-RC.1`, expected commit `c5b3d89fa650af9faa31ace4f90d537b53371b57`.
- `APULAB-STUDY-2026`: `official`, status `draft`, expected commit `UNFROZEN`.

The QA record therefore still points to the superseded #35 Research/gameplay build and must not be used for the clean QT-001 run until a later authorized write phase updates/finalizes its expected build/commit.

The official study remains correctly non-active/unfrozen.

## Tables and RLS

The relevant live tables exist:

- `apulab_participants`
- `apulab_auth_attempts`
- `apulab_studies`
- `apulab_study_assignments`
- `apulab_sessions`
- `apulab_events`
- `apulab_posttest_responses`

RLS is enabled on all seven tables.

There are no RLS policies on these tables. The Supabase security advisor reports seven `rls_enabled_no_policy` informational findings. In the current design this is an intentional fail-closed posture because browser roles have no direct table grants.

`apulab_posttest_responses` was inspected/documented only and was not modified.

## Browser grants

Observed grants:

- `anon`: no direct grants on audited Research tables/views
- `authenticated`: no direct grants on audited Research tables/views
- `PUBLIC`: no direct grants on audited Research tables/views

Therefore:

- `ANON_DIRECT_WRITE = NO`
- `AUTHENTICATED_DIRECT_WRITE = NO`

## service_role drift

The live `service_role` has the needed SELECT/INSERT/UPDATE capabilities but also inherited broader privileges such as `REFERENCES`, `TRIGGER`, and `TRUNCATE` on multiple Research relations.

Clean-v3 deliberately revokes all first and grants only:

| Relation | clean-v3 intended privileges |
| --- | --- |
| participants | SELECT |
| studies | SELECT |
| study assignments | SELECT |
| auth attempts | SELECT, INSERT |
| sessions | SELECT, INSERT, UPDATE |
| events | SELECT, INSERT |

Result: `SERVICE_ROLE_LEAST_PRIVILEGE_DRIFT = YES`.

## Constraint drift

Live has the stronger Station-specific `game` guards, but older compatibility constraints remain present and some are weaker than clean-v3:

- live `apulab_events_condition_check` still allows `game` or `static_control` or NULL;
- live `apulab_sessions_condition_check` still allows `game` or `static_control` or NULL;
- live assignment compatibility check still lists `game` and `static_control`;
- live Station-specific assignment guard requires `game`;
- live Station-specific session/event guards use equality rather than clean-v3's null-safe `IS NOT DISTINCT FROM` formulation.

For sessions, another study-consistency constraint reduces the practical NULL risk. For events, clean-v3's null-safe guard is still preferred so the database itself rejects a study event whose condition is NULL.

Result: `GAME_ONLY_EFFECTIVE = PARTIAL_HARDENED`, `CONSTRAINT_DEFINITION_DRIFT = YES`.

## View drift

Live contains:

- `v_official_study_events`
- `v_qa_events`
- `v_level_outcomes`
- `v_level5_loop_metrics`
- `v_level6_science_metrics`
- `v_level7_instrument_metrics`
- `v_session_quality`

All audited live views currently show no `security_invoker` relation option, whereas clean-v3 creates them with `security_invoker=true`.

### Grain

Live level analytical views aggregate primarily by `participant_id`.

Clean-v3 uses session-aware grain including:

- `session_id`
- `participant_id`
- `study_id`
- `study_condition`
- `build_version`
- `git_commit_sha`

This prevents two runs from the same participant being merged into a single metric row.

### N6

Live N6 communication/send semantics are valid and align conceptually with GE N6.

### N7

Live `v_level7_instrument_metrics` still contains:

- `communication_time_ms`
- `data_sent`
- `communication_point_reached_seq`
- `data_sent_seq`
- `communication_send_order_correct`

Clean-v3 instead derives:

- `final_point_reached`
- `time_to_final_point_ms`
- `final_point_before_completion`
- canonical completion metrics

Result: `N7_ANALYTIC_DRIFT = YES`.

## Edge Function drift

Live function:

- slug: `ingest-telemetry`
- status: `ACTIVE`
- version: `4`
- JWT verification: disabled because the function implements custom session/auth controls

The live source still declares for N7:

- `communication_point_reached`
- `data_sent`

and `/session/complete` still requires all of:

- N7 `level_completed`
- N7 `data_sent`
- `session_completed`

Clean-v3 instead accepts N7 `final_point_reached`, rejects N7 communication/send events, and completion requires canonical N7 `level_completed` + `session_completed` only.

Result: `EDGE_DRIFT_KNOWN = YES`, `EDGE_CANONICAL_N7 = NO`.

## Secret/configuration presence audit

The connected Supabase management tool available in this session does **not expose an Edge secret-listing operation**. No secret values were requested, retrieved, or displayed.

The function source references these required runtime variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APULAB_ALLOWED_ORIGINS`
- `APULAB_AUTH_PEPPER`
- `APULAB_SESSION_PROOF_SECRET`

Their present configured/missing status cannot be proven read-only with the available connector.

`SESSION_SYNC_SECRET` is **not part of the current clean-v3 design**: clean-v3 uses an opaque per-session sync token and stores only its SHA-256 hash in `sync_token_hash`.

Result: `LIVE_SECRETS_PRESENCE_AUDITED = NOT_VERIFIABLE_WITH_CURRENT_CONNECTOR`.

This is a blocker for declaring the final pre-write gate fully satisfied, but it does not authorize any write.

## Live vs Clean matrix

| Area | clean-v3 | Live | Drift | Risk |
| --- | --- | --- | --- | --- |
| migration registry | M1–M7 | M1–M7 | names match, resulting definitions differ | high if replayed blindly |
| core tables | expected | present | low structural drift | low/medium |
| study data | no official data expected pre-study | 0 participants, 0 assignments | no official participant data | low |
| historical telemetry | local synthetic only | 4 demo sessions / 176 events from #35 build | expected live history | preserve/classify |
| RLS | enabled/fail-closed | enabled/fail-closed | aligned | low |
| anon/auth grants | denied | denied | aligned | low |
| views | `security_invoker`, session grain | no `security_invoker`, participant grain | yes | high analytics/security hardening |
| N6 analytics | communication/send | communication/send | aligned | low |
| N7 analytics | final point | communication/send | yes | critical methodology |
| service_role | least privilege | broad inherited extras | yes | medium/high |
| Edge Function | canonical N7 | version 4, superseded N7 | yes | critical |
| QA study freeze | clean SHA not yet authorized | pilot points to `c5b3d89...` | yes | critical before QT-001 |
| official study | draft/unfrozen | draft/unfrozen | aligned | low |
| secrets presence | must be verified | connector cannot list | unknown | blocker before write |

## Read-only audit gates

```text
LIVE_PROJECT_IDENTIFIED          = YES
LIVE_MIGRATIONS_AUDITED          = YES
MIGRATION_DRIFT_KNOWN            = YES
LIVE_SCHEMA_AUDITED              = YES
LIVE_DATA_AUDITED                = YES
LIVE_RLS_AUDITED                 = YES
LIVE_GRANTS_AUDITED              = YES
LIVE_EDGE_AUDITED                = YES
EDGE_DRIFT_KNOWN                 = YES
LIVE_SECRETS_PRESENCE_AUDITED    = NOT_VERIFIABLE
LIVE_OFFICIAL_PARTICIPANT_DATA   = 0
SUPABASE_LIVE_WRITE              = NO
EDGE_LIVE_DEPLOY                 = NO
```

## Safety conclusion

The production project should **not** receive a replay of M3–M7. They are already registered live and their live resulting definitions reflect the older #35 implementation.

The next allowed artifact is a forward-only reconciliation/migration plan. Actual reconciliation remains blocked until an explicit `SUPABASE WRITE PHASE`, and secret presence must be verified before executing that phase.
