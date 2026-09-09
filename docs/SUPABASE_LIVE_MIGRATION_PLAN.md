# Supabase Live Reconciliation Plan — PREPARED, NOT AUTHORIZED

## Status

This document prepares a future live reconciliation for `ApuLabStation-Research`.

It does **not** authorize or perform any write.

```text
SUPABASE_WRITE_PHASE = NOT AUTHORIZED
DB_PUSH               = NO
APPLY_MIGRATION       = NO
EDGE_DEPLOY           = NO
PRODUCTION_DEPLOY     = NO
```

Validated clean Research code SHA: `630b63dcd5e24bdb38ed3ed1525efefcf86b82be`.

The live migration registry already contains M1→M7. Therefore the clean versions of M3–M7 must **not** be replayed under the same migration identities.

## Preconditions before any write

All must be true:

1. local `DB_FRESH = PASS`;
2. local `DB_LEGACY = PASS`;
3. `OFFLINE_RECOVERY = PASS`;
4. `COMPLETION_RECOVERY = PASS`;
5. `GE_GAMEPLAY_IMMUTABILITY = PASS`;
6. `RESEARCH_CLEAN = PASS`;
7. live schema/data/RLS/grants/Edge audit captured;
8. current live row counts re-read immediately before change;
9. no official participant/assignment data exists, unless a separate preservation procedure is approved;
10. Edge secret presence is verified without exposing values;
11. clean QA build/commit to be used by QT-001 is explicitly frozen;
12. explicit user authorization: `SUPABASE WRITE PHASE`.

Current blockers:

- secret presence cannot be verified through the current connector;
- `APULAB-QA-2026` still points to superseded SHA `c5b3d89fa650af9faa31ace4f90d537b53371b57`;
- live contains 4 demo sessions / 176 historical events from that superseded build.

The demo rows must be preserved and remain demo/unassigned.

## Reconciliation strategy

Use new forward-only migrations. Exact timestamps/names must be generated only during the authorized write phase.

Recommended logical split:

### M8 — `station_research_reconcile_constraints`

Purpose: make the database contract itself match Station GE clean-v3.

Actions:

1. preflight counts and abort if participant/assignment/official-study data differs from the approved snapshot;
2. replace stale condition compatibility constraints where appropriate so Station does not advertise `static_control` as a valid condition;
3. replace Station game-only constraints with null-safe definitions equivalent to clean-v3:
   - assignments: `study_condition IS NOT DISTINCT FROM 'game'`;
   - study sessions: `study_condition IS NOT DISTINCT FROM 'game'`;
   - study events: `study_condition IS NOT DISTINCT FROM 'game'`;
   - demo sessions/events remain `study_condition IS NULL`;
4. validate the new constraints against existing rows;
5. leave `apulab_posttest_responses` unchanged.

Abort if any existing row cannot satisfy the corrected constraints.

Verification after M8:

```text
study assignment game           = ACCEPT
study assignment static_control = REJECT
study session NULL condition     = REJECT
study event NULL condition       = REJECT
demo NULL condition              = ACCEPT
historical demo rows preserved   = YES
```

### M9 — `station_research_reconcile_analytics_views`

Purpose: replace only analytical/view definitions; do not rewrite event rows.

Actions:

1. recreate `v_official_study_events` with `security_invoker=true`;
2. recreate `v_qa_events` with `security_invoker=true`;
3. recreate `v_level_outcomes` with session-aware grain;
4. recreate `v_level5_loop_metrics` with session-aware grain;
5. recreate `v_level6_science_metrics` with session-aware grain while preserving valid N6 communication/send semantics;
6. recreate `v_level7_instrument_metrics` using canonical N7 final-point semantics:
   - remove `communication_time_ms`;
   - remove `data_sent` as N7 metric;
   - remove `communication_send_order_correct`;
   - add/retain `final_point_reached`;
   - `time_to_final_point_ms`;
   - `final_point_before_completion`;
   - canonical instrument metrics;
7. recreate `v_session_quality` with clean-v3 fields/grain;
8. revoke view access from `anon` and `authenticated`.

No event is transformed, deleted, or relabeled.

Verification after M9:

```text
all Research views security_invoker = true
N6 communication/send analytics     = present
N7 communication/send analytics     = absent
N7 final-point analytics            = present
session_id in analytical grain      = yes
historical event row count          = unchanged
```

### M10 — `station_research_reconcile_service_role`

Purpose: eliminate inherited broad privileges.

Actions:

1. `REVOKE ALL` from `service_role` on the Research runtime tables/views covered by clean-v3;
2. re-grant only:
   - participants: SELECT
   - studies: SELECT
   - assignments: SELECT
   - auth attempts: SELECT, INSERT
   - sessions: SELECT, INSERT, UPDATE
   - events: SELECT, INSERT
3. keep `anon` and `authenticated` with no direct access;
4. do not alter `apulab_posttest_responses` permissions as part of Station gameplay reconciliation unless separately justified.

Verification after M10:

```text
service_role TRUNCATE research runtime tables = NO
service_role DELETE research runtime tables   = NO
service_role UPDATE events                    = NO
anon direct access                            = NO
authenticated direct access                   = NO
```

## Edge Function reconciliation — after M8–M10 only

Deploy a new version of `ingest-telemetry` from the validated clean branch.

Current live version: `4`.

Required canonical server behavior after deployment:

### N6

```text
communication_point_reached = ACCEPT
data_sent                    = ACCEPT
```

### N7

```text
final_point_reached          = ACCEPT
communication_point_reached  = REJECT
data_sent                    = REJECT
```

### Session completion

Require:

```text
N7 level_completed
+
session_completed
```

Do **not** require N7 `data_sent`.

No Edge deployment may happen before the DB constraints/views/grants are reconciled and verified.

## Secret/config verification gate

Before Edge deployment, verify presence only; never print values.

Required by current clean source:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APULAB_ALLOWED_ORIGINS`
- `APULAB_AUTH_PEPPER`
- `APULAB_SESSION_PROOF_SECRET`

The clean implementation does not require a separate `SESSION_SYNC_SECRET`; per-session sync uses an opaque client capability whose SHA-256 hash is stored in `sync_token_hash`.

If any required secret/configuration is missing: **ABORT**.

## QA metadata reconciliation

Only after the clean GE/Research build used for QA is frozen:

1. update `APULAB-QA-2026` from the superseded #35 expected commit to the approved clean/frozen SHA;
2. confirm `study_build_version`, telemetry schema, protocol version, and environment expectations match the deployment;
3. keep `APULAB-STUDY-2026` in `draft` / `UNFROZEN` until official-study freeze is separately approved.

Do not create official participant codes during this reconciliation.

## Historical live data handling

Current read-only snapshot contains:

- 0 participants
- 0 assignments
- 4 demo sessions
- 176 demo events
- 0 auth attempts
- 0 post-test responses

All existing session/event rows are demo rows from superseded commit `c5b3d89fa650af9faa31ace4f90d537b53371b57`.

Required treatment:

- preserve rows;
- preserve original build/git metadata;
- preserve original raw event names, including old N7 communication/send events;
- do not backfill them to `final_point_reached`;
- do not attach them to QA or official study IDs;
- analytical official views must continue excluding them by construction.

If participant or assignment count becomes non-zero before write execution: **ABORT and re-audit**.

## Execution order for a future authorized write phase

```text
01 confirm explicit SUPABASE WRITE PHASE authorization
02 re-read project health and live row counts
03 verify secret/config presence without revealing values
04 capture migration/schema/grant/Edge pre-change checkpoint
05 apply M8 constraint reconciliation
06 verify M8 and row preservation
07 apply M9 analytics/view reconciliation
08 verify M9 and row preservation
09 apply M10 least-privilege reconciliation
10 verify grants/RLS
11 deploy clean ingest-telemetry Edge Function
12 verify function metadata/version
13 run non-participant negative smoke tests
14 freeze approved clean QA SHA/build
15 update QA metadata only as authorized
16 create/authorize QT-001 only
17 execute QT-001 N1→N7
18 inspect session/event sequence and canonical N6/N7 semantics
19 STOP if QT-001 fails
20 only after QT-001 PASS consider QT-002→QT-010
```

## Abort criteria

Stop immediately if any of the following occurs:

- project not `ACTIVE_HEALTHY`;
- live participant/assignment counts differ from approved preflight without explanation;
- official study is unexpectedly active;
- migration/schema state changed since the read-only audit;
- M8 constraint validation fails;
- any historical demo row is lost or relabeled;
- any view still exposes N7 communication/send as canonical after M9;
- `anon` or `authenticated` receives direct Research access;
- `service_role` retains unintended destructive privileges after M10;
- required Edge configuration is missing;
- Edge function after deployment accepts N7 `data_sent` or rejects N7 `final_point_reached`;
- completion still requires N7 `data_sent`;
- gameplay immutability no longer passes;
- QT-001 produces duplicate, missing, out-of-order, or misclassified events.

## Rollback posture

The preferred safety mechanism is forward-only correction, not destructive rollback.

If a migration step fails before commit, abort that migration transaction.

If a completed forward migration needs correction, prepare a new forward migration rather than editing migration history or replaying M3–M7.

Do not delete the historical demo telemetry as a rollback mechanism.

## Pre-write gate status after read-only audit

```text
LOCAL_DB_FRESH                = PASS
LOCAL_DB_LEGACY               = PASS
OFFLINE_RECOVERY              = PASS
COMPLETION_RECOVERY           = PASS
GAMEPLAY_IMMUTABILITY         = PASS
RESEARCH_CLEAN                = PASS
LIVE_MIGRATIONS_AUDITED       = YES
LIVE_SCHEMA_AUDITED           = YES
LIVE_DATA_AUDITED             = YES
LIVE_RLS_AUDITED              = YES
LIVE_EDGE_AUDITED             = YES
MIGRATION_DRIFT_KNOWN         = YES
EDGE_DRIFT_KNOWN              = YES
LIVE_SECRETS_PRESENCE_AUDITED = NOT_VERIFIABLE
MIGRATION_PLAN_READY          = YES
SUPABASE_LIVE_WRITE           = NO
```

No live write may begin until `LIVE_SECRETS_PRESENCE_AUDITED = YES` and the user explicitly authorizes `SUPABASE WRITE PHASE`.
