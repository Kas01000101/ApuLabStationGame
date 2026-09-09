# Supabase Live Reconciliation — ApuLab Station GE

## Scope

This document records the authorized `SUPABASE WRITE PHASE` for database reconciliation only: M8, M9, M10, and the post-reconciliation audit.

No Edge Function deployment, QA metadata mutation, QT participant creation, or production gameplay deployment is recorded here.

- Supabase project: `ApuLabStation-Research`
- Project ref: `dkvxbvacsegneszuopwy`
- Pre-write checkpoint commit: `d812341922253a3e859b344a9611049d61539763`
- Canonical GE gameplay baseline: `2f94e9e701172ab455767757225110606b983597`
- Historical live snapshot before reconciliation: 4 demo sessions / 176 demo events
- Official study before and after reconciliation: `draft` / `UNFROZEN`
- QA metadata before and after reconciliation: unchanged, still points to superseded `c5b3d89fa650af9faa31ace4f90d537b53371b57`

## Applied forward migrations

The live registry already contained historical M1→M7, so they were not replayed.

New forward-only migrations applied successfully:

1. `station_research_reconcile_constraints` — live version `20260909061405`
2. `station_research_reconcile_analytics_views` — live version `20260909061447`
3. `station_research_reconcile_service_role` — live version `20260909061536`

Repository migration files:

- `supabase/migrations/20260909061000_station_research_reconcile_constraints.sql`
- `supabase/migrations/20260909062000_station_research_reconcile_analytics_views.sql`
- `supabase/migrations/20260909063000_station_research_reconcile_service_role.sql`

## M8 — constraint reconciliation

Result: PASS.

Station GE database semantics are now explicit and null-safe:

- assignments: `study_condition` must be `game`;
- demo sessions/events: `study_condition IS NULL`;
- study sessions/events: `study_condition IS NOT DISTINCT FROM 'game'`;
- stale `static_control` compatibility was removed from the active condition constraints;
- session study consistency remains participant/study/game aware.

Post-M8 preservation check:

```text
participants       = 0
assignments        = 0
sessions           = 4
events             = 176
demo sessions OK   = 4
demo events OK     = 176
official status    = draft
official commit    = UNFROZEN
```

No historical row was rewritten or relabeled.

## M9 — analytical view reconciliation

Result: PASS.

All Research views now have:

```text
security_invoker=true
```

Session-aware analytical grain is used where appropriate:

- `session_id`
- `participant_id`
- `study_id`
- `study_condition`
- `build_version`
- `git_commit_sha`

### N6

Canonical communication/send semantics remain present:

```text
communication_point_reached
data_sent
```

### N7

Canonical N7 analytics now expose:

```text
final_point_reached
time_to_final_point_ms
final_point_before_completion
```

and no longer expose N7 communication/send fields such as:

```text
communication_time_ms
data_sent
communication_send_order_correct
```

Post-M9 counts remained exactly:

```text
participants = 0
assignments  = 0
sessions     = 4
events       = 176
```

The historical demo events retain their original event names and are not reinterpreted.

## M10 — service_role least privilege

Result: PASS.

Effective live Research runtime grants now are exactly:

| Relation | service_role privileges |
| --- | --- |
| `apulab_participants` | SELECT |
| `apulab_studies` | SELECT |
| `apulab_study_assignments` | SELECT |
| `apulab_auth_attempts` | INSERT, SELECT |
| `apulab_sessions` | INSERT, SELECT, UPDATE |
| `apulab_events` | INSERT, SELECT |

No direct grant rows remain for `anon`, `authenticated`, or `PUBLIC` on the audited Research runtime tables/views.

Therefore:

```text
SERVICE_ROLE_TRUNCATE_RUNTIME = NO
SERVICE_ROLE_DELETE_RUNTIME   = NO
SERVICE_ROLE_UPDATE_EVENTS    = NO
ANON_DIRECT_ACCESS            = NO
AUTH_DIRECT_ACCESS            = NO
```

`apulab_posttest_responses` was not modified by M8–M10.

## RLS / security advisor

RLS remains enabled on all seven audited Research tables.

The Supabase security advisor still reports informational `rls_enabled_no_policy` notices for the seven tables. This is expected under the current fail-closed architecture: browser roles have no direct table grants and no permissive RLS policies are defined.

## Final row-preservation audit

Immediately after M10:

```text
participants         = 0
assignments          = 0
sessions             = 4
events               = 176
auth_attempts        = 0
posttest_responses   = 0

demo_sessions_ok     = 4
demo_events_ok       = 176

official_status      = draft
official_commit      = UNFROZEN
qa_status            = pilot
qa_expected_commit   = c5b3d89fa650af9faa31ace4f90d537b53371b57
```

Historical data preservation: PASS.

## Gate

```text
M8_CONSTRAINTS                     = PASS
GAME_ONLY_DB_GUARD                 = PASS
NULL_SAFE_STUDY_CONDITION          = PASS

M9_ANALYTICS                       = PASS
ALL_RESEARCH_VIEWS_SECURITY_INVOKER = YES
SESSION_GRAIN                      = YES
N6_SEND_ANALYTICS                  = PRESENT
N7_SEND_ANALYTICS                  = ABSENT
N7_FINAL_POINT_ANALYTICS           = PRESENT

M10_LEAST_PRIVILEGE                = PASS
ANON_DIRECT_ACCESS                 = NO
AUTH_DIRECT_ACCESS                 = NO

HISTORICAL_DEMO_ROWS_PRESERVED     = YES
LIVE_SESSIONS                      = 4
LIVE_EVENTS                        = 176

OFFICIAL_STUDY_CHANGED             = NO
QA_METADATA_CHANGED                = NO
EDGE_LIVE_DEPLOY                   = NO
QT001_CREATED                      = NO
```

Database reconciliation M8→M10 is complete. The next separate operation is the clean `ingest-telemetry` Edge Function deployment and live negative smoke, followed later by QA freeze and QT-001.
