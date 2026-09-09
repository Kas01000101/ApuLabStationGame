# Supabase Pre-Write Checkpoint — ApuLab Station GE

## Status

This checkpoint was captured **read-only** on 2026-09-09 before any live reconciliation.

- Supabase project: `ApuLabStation-Research`
- Project ref: `dkvxbvacsegneszuopwy`
- Region: `sa-east-1`
- Project status: `ACTIVE_HEALTHY`
- PostgreSQL: `17.6.1.166` / engine 17 / GA
- Clean Research branch: `research/station-research-clean-v3`
- Research branch SHA before this documentation commit: `134a66137ad3132f600804b6f51b445b84c23320`
- Validated Research code SHA: `630b63dcd5e24bdb38ed3ed1525efefcf86b82be`
- Canonical GE gameplay baseline: `2f94e9e701172ab455767757225110606b983597`

```text
SUPABASE_WRITE_PHASE          = NOT AUTHORIZED
SUPABASE_LIVE_WRITE           = NO
APPLY_MIGRATION               = NO
EDGE_LIVE_DEPLOY              = NO
PRODUCTION_DEPLOY             = NO
SECRET_VALUES_EXPOSED         = NO
```

## Step 46 — Secret/config presence gate

The available Supabase connector does not expose an Edge secret-listing operation. Therefore the presence of all required runtime variables cannot be proven from this session without using a different authorized channel.

Required by clean-v3:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APULAB_ALLOWED_ORIGINS`
- `APULAB_AUTH_PEPPER`
- `APULAB_SESSION_PROOF_SECRET`

`SESSION_SYNC_SECRET` is not required by clean-v3; per-session sync uses an opaque `session_sync_token` and persists only its SHA-256 hash in `sync_token_hash`.

```text
LIVE_SECRETS_PRESENCE_AUDITED = NOT_VERIFIABLE_WITH_CURRENT_CONNECTOR
SECRETS_PRESENT                = NOT PROVEN
PREWRITE_SECRET_GATE           = BLOCKED
```

No secret value was requested, retrieved, or displayed.

## Step 47 — Immediate live re-audit

Re-audited immediately before any possible write phase.

### Project / Edge

```text
PROJECT_STATUS       = ACTIVE_HEALTHY
EDGE_FUNCTION        = ingest-telemetry
EDGE_STATUS          = ACTIVE
EDGE_VERSION         = 4
EDGE_EZBR_SHA256     = 3b3a76f4d5d2ffdab68ac169f413516cf457c80266dc3b179f7fa6fbe44348e9
```

### Migration registry

Live still contains the same seven registered migrations:

1. `20260830090000_research_security_baseline`
2. `20260830091000_legacy_raw_code_nullable`
3. `20260906170000_research_schema_v2`
4. `20260906183000_research_hardening`
5. `20260907190000_research_pre_qa_hardening`
6. `20260907230000_station_game_condition_guard`
7. `20260908030000_edge_service_role_permissions`

No new migration appeared between the read-only audit and this pre-write checkpoint.

### Row counts

| Relation | Count |
| --- | ---: |
| `apulab_participants` | 0 |
| `apulab_study_assignments` | 0 |
| `apulab_sessions` | 4 |
| `apulab_events` | 176 |
| `apulab_auth_attempts` | 0 |
| `apulab_posttest_responses` | 0 |

Existing sessions remain historical demo telemetry only:

- 4 demo sessions
- `environment = study`
- `study_id = NULL`
- `study_condition = NULL`
- build `APULAB-STUDY-RC.1`
- commit `c5b3d89fa650af9faa31ace4f90d537b53371b57`
- 1 completed session with `last_level = 7`
- 3 in-progress sessions

These rows must remain historical/demo and must not be relabeled or rewritten during reconciliation.

### Study metadata

`APULAB-QA-2026`:

```text
study_kind               = qa
status                   = pilot
study_build_version      = APULAB-STUDY-RC.1
expected_commit_sha      = c5b3d89fa650af9faa31ace4f90d537b53371b57
telemetry_schema_version = apulab-telemetry-v2
protocol_version         = apulab-protocol-2026-v1
```

`APULAB-STUDY-2026`:

```text
study_kind               = official
status                   = draft
study_build_version      = APULAB-STUDY-RC.1
expected_commit_sha      = UNFROZEN
telemetry_schema_version = apulab-telemetry-v2
protocol_version         = apulab-protocol-2026-v1
```

Abort criteria from the plan are not triggered by current participant/assignment counts or official-study status.

## Step 48 — Structural checkpoint

The following hashes fingerprint the current live definitions before any M8/M9/M10 reconciliation. They are intended for post-write comparison.

### Table constraint fingerprints

| Relation | Constraint count | MD5 fingerprint |
| --- | ---: | --- |
| `apulab_auth_attempts` | 2 | `7506e53c3e98796207e82130eb927e44` |
| `apulab_events` | 14 | `5008518d80a11144dd4a5b8068e4b7c6` |
| `apulab_participants` | 4 | `bc2a4b3ecf63b4d8ddc5a24f10d4fcab` |
| `apulab_posttest_responses` | 7 | `3fc7df4a9deb7d64af9b69a36606e96d` |
| `apulab_sessions` | 11 | `2fc4cb85cf9f3332f90a92e14d50023b` |
| `apulab_studies` | 3 | `8c958f5a050a8741b2123b59708d29b5` |
| `apulab_study_assignments` | 7 | `6e5d9fca120e1d53d600810201206259` |

RLS is enabled on all seven audited tables. `force_rls` is false.

### View fingerprints

Current views have no relation option indicating `security_invoker=true`.

| View | MD5 `pg_get_viewdef` fingerprint |
| --- | --- |
| `v_official_study_events` | `db365a2187f9496f31d67430993f11f1` |
| `v_qa_events` | `b8d33cca8d4e291928d1955f16bb50a6` |
| `v_level_outcomes` | `fc305f4ca158c4c05723c184f3b16ca9` |
| `v_level5_loop_metrics` | `41e8e3fd97c51826abaad4a2312d2b44` |
| `v_level6_science_metrics` | `2b1878acff98eed881e8f5fefd124960` |
| `v_level7_instrument_metrics` | `c6d1c542a67109a0ad40bcaf21a956d1` |
| `v_session_quality` | `bdba7f763119412f47cf01a833da437a` |

These fingerprints intentionally capture the current drifted live state before M9.

### Browser grants

The filtered grant snapshot returned no direct grant rows for `anon`, `authenticated`, or `PUBLIC` on the audited Research relations.

```text
ANON_DIRECT_ACCESS          = NO
AUTHENTICATED_DIRECT_ACCESS = NO
PUBLIC_DIRECT_ACCESS        = NO
```

### Current effective `service_role` grants

Live remains broader than clean-v3 least privilege:

| Relation | Effective live privileges |
| --- | --- |
| `apulab_participants` | REFERENCES, SELECT, TRIGGER, TRUNCATE |
| `apulab_studies` | REFERENCES, SELECT, TRIGGER, TRUNCATE |
| `apulab_study_assignments` | REFERENCES, SELECT, TRIGGER, TRUNCATE |
| `apulab_auth_attempts` | INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE |
| `apulab_sessions` | INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| `apulab_events` | INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE |

Research views also retain inherited `REFERENCES`, `TRIGGER`, and `TRUNCATE` privileges for `service_role` in the current live state.

This is the baseline M10 must reconcile.

## Pre-write decision

The live data/schema preflight itself is stable and matches the prior read-only audit. However, the mandatory secret/config presence gate cannot be verified with the currently available connector.

Therefore:

```text
STEP_46_SECRET_GATE          = BLOCKED / NOT VERIFIABLE
STEP_47_LIVE_REAUDIT         = PASS
STEP_48_PREWRITE_CHECKPOINT  = PASS

PARTICIPANTS                 = 0
ASSIGNMENTS                  = 0
HISTORICAL_DEMO_SESSIONS     = 4
HISTORICAL_DEMO_EVENTS       = 176
OFFICIAL_STUDY_STATUS        = draft
OFFICIAL_EXPECTED_COMMIT     = UNFROZEN
EDGE_VERSION                 = 4

SUPABASE_WRITE_PHASE         = NOT AUTHORIZED
SAFE_TO_APPLY_M8             = NO
```

The next permitted operation is to verify required Edge secret/config presence through an authorized channel that can report only `configured/missing`. After that, the user must separately and explicitly authorize `SUPABASE WRITE PHASE` before M8, M9, M10, any QA metadata update, participant creation, or Edge deployment.