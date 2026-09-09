# Research DB Validation — Station GE

## Scope

This evidence applies to the **ApuLab Station GE** Research implementation only.

- Repository: `Kas01000101/ApuLabStationGame`
- Research branch: `research/station-research-clean-v3`
- Canonical GE gameplay baseline: `2f94e9e701172ab455767757225110606b983597`
- Validated Research code SHA: `630b63dcd5e24bdb38ed3ed1525efefcf86b82be`
- Validation mode: local/CI only
- Supabase live write: **NO**
- Edge Function live deploy: **NO**
- Production deploy: **NO**

## Migration chain validated

Historical migrations remain unchanged; clean forward migrations are validated in order:

1. `20260830090000_research_security_baseline.sql` — M1 historical
2. `20260830091000_legacy_raw_code_nullable.sql` — M2 historical
3. `20260906170000_research_schema_v2.sql` — M3 clean
4. `20260906183000_research_hardening.sql` — M4 clean
5. `20260907190000_research_pre_qa_hardening.sql` — M5 clean
6. `20260907230000_station_game_condition_guard.sql` — M6 clean
7. `20260908030000_edge_service_role_permissions.sql` — M7 clean

## CI evidence on one code SHA

All three validation workflows were executed against `630b63dcd5e24bdb38ed3ed1525efefcf86b82be`.

| Workflow / job | Result |
| --- | --- |
| GE gameplay immutability | PASS |
| Research clean validation | PASS |
| Research DB validation / `db-fresh` | PASS |
| Research DB validation / `db-legacy` | PASS |
| Research DB validation / `runtime-recovery` | PASS |

Research DB workflow run: `34315614965`.

## DB fresh

A fresh Supabase local stack was started and rebuilt from migrations M1→M7.

Validated:

- schema creation and constraints
- RLS and access restrictions
- canonical N6/N7 event semantics
- event idempotency
- `event_seq` integrity
- local Edge Function readiness
- premature completion rejection
- canonical completion recovery
- completion idempotency

Result: `DB_FRESH = PASS`.

## DB legacy

A PostgreSQL 15 database was built with M1–M2, seeded with synthetic legacy rows, and upgraded with clean M3–M7.

Validated:

- legacy rows preserved
- no synthetic legacy record promoted to official study data
- clean forward migration chain applies without destructive rewrite

Result:

- `DB_LEGACY_UPGRADE = PASS`
- `LEGACY_ROWS_PRESERVED = YES`
- `LEGACY_PROMOTED_TO_STUDY = NO`

## Security contract

Validated locally:

- RLS enabled on Research tables in the exposed schema
- direct `anon` access denied
- direct `authenticated` access denied
- Research views use `security_invoker` where applicable and are not exposed to browser roles
- Station study rows are `study_condition = game` only
- null study condition is rejected for study rows
- raw participant code is not accepted in Research telemetry storage
- oversized telemetry payloads are rejected

`service_role` is reduced to the required Research operations:

| Relation | Allowed operations |
| --- | --- |
| participants | SELECT |
| studies | SELECT |
| study assignments | SELECT |
| auth attempts | SELECT, INSERT |
| sessions | SELECT, INSERT, UPDATE |
| events | SELECT, INSERT |

## Canonical N6 / N7 contract

### N6

- `communication_point_reached` → accepted
- `data_sent` → accepted

### N7

- `final_point_reached` → accepted
- `communication_point_reached` → rejected
- `data_sent` → rejected

N7 analytical views are based on the sample/instrument/final-point flow and do not require communication/send semantics.

## Idempotency and sequence integrity

Validated:

- repeated `event_id` retry does not create duplicate event rows
- conflicting reuse of immutable event identity is rejected
- `event_seq` remains session-scoped and ordered
- completion is idempotent

Result:

- `EVENT_IDEMPOTENCY = PASS`
- `EVENT_SEQ_INTEGRITY = PASS`
- `COMPLETION_IDEMPOTENCY = PASS`

## Offline persistence and recovery

Chromium validation performs a real browser storage restart:

1. starts an online demo session and drains `session_started`
2. places the browser offline
3. records 21 pending events
4. leaves the session in `completed_pending_sync`
5. captures the browser context's durable localStorage state while offline
6. verifies all pending `event_id` and `event_seq` values, pending completion, and sync context
7. destroys the browser context
8. creates a new browser context from the captured storage state
9. restores normal runtime connectivity and flushes Research sync
10. verifies no event loss or duplication and final session status `completed`

Result:

- `OFFLINE_STORAGE_PERSISTENCE = PASS`
- `OFFLINE_RECOVERY = PASS`
- `EVENT_LOSS = 0`
- `EVENT_DUPLICATES = 0`

## Session completion recovery

Local Edge Function validation proves:

1. incomplete session → `/session/complete` returns `409 session_not_complete`
2. session remains `in_progress`
3. canonical N7 `level_completed` and `session_completed` are synchronized
4. `/session/complete` returns `200 success=true`
5. session becomes `completed`, `last_level = 7`
6. repeated completion returns success without creating a second `session_completed`

Result:

- `PREMATURE_COMPLETION = REJECT`
- `RECOVERED_COMPLETION = PASS`
- `COMPLETION_IDEMPOTENCY = PASS`

## Final local gate

```text
LOCAL_DB_FRESH                 = PASS
LOCAL_DB_LEGACY                = PASS
OFFLINE_STORAGE_PERSISTENCE    = PASS
OFFLINE_RECOVERY               = PASS
COMPLETION_RECOVERY            = PASS
GAMEPLAY_IMMUTABILITY          = PASS
RESEARCH_CLEAN                 = PASS
BLOCK_25_32                    = CLOSED
SUPABASE_LIVE_WRITE            = NO
EDGE_LIVE_DEPLOY               = NO
PRODUCTION_DEPLOY              = NO
```

The next permitted phase is a **read-only audit of the connected Supabase project**. No live migration or Edge deployment is authorized by this document.
