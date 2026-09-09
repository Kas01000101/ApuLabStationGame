# PR #35 Scope Audit · GE Research vs Gameplay

## Audit target

- Repository: `Kas01000101/ApuLabStationGame`
- GE baseline: `2f94e9e701172ab455767757225110606b983597`
- PR: #35 · `Research-ready Supabase migration · Mission 01 N1–N7`
- PR head: `c5b3d89fa650af9faa31ace4f90d537b53371b57`
- PR state at audit: `OPEN · DRAFT · NOT MERGED`
- Changed files reported by GitHub: **65**
- Audit branch: `audit/ge-pr35-scope`

## Decision rule

A research-only change is unacceptable if it changes what a participant **sees, does, decides, or needs to complete** a level.

Actions used in this audit:

- `KEEP`: can be carried into a clean research branch as-is, subject to normal CI.
- `VERIFY`: conceptually valid/research-only, but must be re-tested before porting.
- `REWRITE`: useful intent exists, but the current implementation depends on or encodes altered gameplay and must be rebuilt against the canonical GE baseline.
- `REMOVE`: do not port into the research-only branch; it directly changes gameplay or replaces the canonical gameplay contract.

Classification codes:

- `R`: research/session/admin logic
- `T`: telemetry
- `DB`: Supabase/data layer
- `Q`: QA/test/audit
- `INFRA`: build/config/CI
- `G`: direct gameplay

## Executive finding

PR #35 is **not research-only in its current form**.

The contamination is broader than one N7 patch:

1. N7 gameplay is directly changed from `PUNTO FINAL` to `PUNTO DE COMUNICACIÓN`.
2. N7 changes the sample-position rule to require AYNI on the exact sample cell.
3. N7 adds `ENVIAR DATOS` as a programmable command.
4. N7 adds `dataSent` as a completion requirement.
5. Build CI was rewritten to require the altered N7 and reject the canonical baseline.
6. Static audits and E2E were rewritten to enforce the altered N7.
7. Research event catalogs and database views were then aligned to those altered mechanics.
8. N1–N4 research telemetry is injected by rewriting generated Mission HTML, which violates the strict gameplay-artifact immutability target even where the intended behavior is observational.

The correct remediation is to rebuild Research from the canonical `main` baseline and make telemetry adapt to the game, not the game adapt to telemetry.

## Classification summary

```text
TOTAL = 65
CLASSIFIED = 65
UNKNOWN = 0

KEEP = 17
VERIFY = 18
REWRITE = 26
REMOVE = 4
```

By class:

```text
Q = 24
R = 17
DB = 9
T = 7
INFRA = 5
G = 3
```

`REMOVE` includes one QA file (`tests/e2e/mission01-level7-contract.cjs`) because the PR version replaces the canonical N7 contract with the altered gameplay contract.

## 65-file matrix

| # | File | Class | Action | Reason / required treatment |
|---:|---|---|---|---|
| 1 | `.env.example` | INFRA | KEEP | Research/server configuration placeholders only; no gameplay effect. |
| 2 | `.github/workflows/build.yml` | INFRA | REWRITE | CI was changed to require N7 communication/send semantics and reject canonical `PUNTO FINAL` / `final_point_reached`. Restore baseline gameplay assertions; research checks belong in a separate gate. |
| 3 | `.github/workflows/research-ready.yml` | INFRA | REWRITE | Workflow explicitly depends on the N7 gameplay patches and altered event vocabulary. Keep research/DB/security structure but remove gameplay-patch dependencies and add a GE immutability gate. |
| 4 | `.gitignore` | INFRA | KEEP | Adds `.private/`; appropriate for local credentials/mappings. |
| 5 | `docs/research/data-dictionary.md` | R | VERIFY | Station-only/game-only separation and external questionnaire model are sound. Verify all derived N7 terminology against canonical events before porting. |
| 6 | `docs/research/database-schema.md` | DB | REWRITE | Core architecture is useful, but documented analytical views inherit altered N7 communication/send assumptions. |
| 7 | `docs/research/event-catalog.md` | R | REWRITE | Declares `communication_point_reached` + `data_sent` canonical for N7 and deprecates canonical `final_point_reached`; must reflect the actual baseline game instead. |
| 8 | `docs/research/qa-protocol.md` | Q | VERIFY | QA cohort structure is sound. Revalidate all N7 acceptance expectations against canonical N7. |
| 9 | `docs/research/study-freeze-checklist.md` | Q | REWRITE | Currently requires N7 communication/data events; freeze must require canonical N7 events plus gameplay immutability. |
| 10 | `docs/research/supabase-migration.md` | DB | REWRITE | Runbook/security/external forms separation are useful; update references to altered N7 metric ordering and the superseded PR architecture. |
| 11 | `package.json` | INFRA | REWRITE | `prepare:missions` was modified to run research telemetry injection and two N7 gameplay patches. Research must not mutate Mission gameplay build outputs. |
| 12 | `scripts/audit-mission01-full-seven.mjs` | Q | REWRITE | N7 audit was changed to require exact sample + communication + explicit send and reject `PUNTO FINAL`. Restore canonical N7 contract. |
| 13 | `scripts/audit-mission01-level67-shell.mjs` | Q | REWRITE | N7 shell assertions inherit the alternate communication/send contract. Restore baseline N7 shell semantics. |
| 14 | `scripts/audit-mission01-level7-final-gdd.mjs` | Q | REWRITE | Altered to validate the non-baseline N7 contract. Restore/retain baseline GDD acceptance only. |
| 15 | `scripts/audit-mission01-level7-instrument-choice.mjs` | Q | REWRITE | Instrument-selection audit is useful but must not require altered terminal/send semantics. |
| 16 | `scripts/audit-mission01-level7-n5-parity.mjs` | Q | REWRITE | Parity assertions inherited altered N7 goal/command semantics; restore baseline. |
| 17 | `scripts/audit-mission01-ux-contract-v2.mjs` | Q | REWRITE | N7 section explicitly changed from `PUNTO FINAL` / no send to exact sample + communication/send + `dataSent` gate. |
| 18 | `scripts/config/mission01-level7.mjs` | G | REMOVE | Directly changes goal label from `PUNTO FINAL` to `PUNTO DE COMUNICACIÓN` and changes guide step to send data. Do not port from #35. |
| 19 | `scripts/patch-mission01-level7-final-hardening.mjs` | G | REMOVE | Direct gameplay rewrite: exact-cell sample, adds `ENVIAR DATOS`, new communication/data state, new completion gate, new objective/feedback. |
| 20 | `scripts/patch-mission01-level7-research-semantics.mjs` | G | REMOVE | Changes runtime sample-reached condition and replaces `final_point_reached` with `communication_point_reached`. Research semantics cannot change gameplay/runtime semantics. |
| 21 | `scripts/patch-mission01-research-telemetry.mjs` | T | REWRITE | Valid telemetry intent, but injects scripts/hooks into generated N1–N4 HTML and rewrites canonical artifacts. Replace with passive outer-layer/event adapters or canonical built-in emitters without research-time gameplay patching. |
| 22 | `scripts/research/create-qa-testers.ts` | R | VERIFY | QA participant tooling is research-only; verify no automatic population or non-game condition leakage. |
| 23 | `scripts/research/create-study-participants.ts` | R | VERIFY | Official participant tooling is research-only; retain explicit allowlisted code file and game-only assignment behavior. |
| 24 | `scripts/research/crypto.ts` | R | KEEP | Server/admin cryptographic helpers; no gameplay effect. |
| 25 | `scripts/research/csv-bridge.py` | R | KEEP | Administrative CSV parsing only. |
| 26 | `scripts/research/export-telemetry.ts` | R | VERIFY | Export path is research-only; verify official/QA separation and pagination before porting. |
| 27 | `scripts/research/link-external-forms.ts` | R | KEEP | Correctly links external PRE/POST/MEEGA data administratively through pseudonymous mapping; not a runtime questionnaire. |
| 28 | `src/config/researchConfig.ts` | R | KEEP | Defines `StudyCondition='game'`, build/schema/protocol metadata and modes; no mechanics. |
| 29 | `src/main.ts` | T | VERIFY | Unified outer telemetry bridge + mock QA hooks appear outside Mission mechanics. Verify no startup/performance/participant-visible regression. |
| 30 | `src/research/telemetry/eventRegistry.ts` | T | REWRITE | Canonicalization currently maps baseline `final_point_reached` into altered `communication_point_reached`. Registry must preserve the source event and normalize only analytically if desired. |
| 31 | `src/research/telemetry/events.ts` | T | REWRITE | N7 official allowlist encodes communication/send as canonical. Rebuild N7 list from baseline runtime. |
| 32 | `src/research/telemetry/payloads.ts` | T | KEEP | Recursive PII/forbidden-field filter and payload-size guard are independent of gameplay. |
| 33 | `src/systems/GameState.ts` | R | VERIFY | Adds research/session metadata and event sequence state. Verify no mission-state ownership or gameplay coupling. |
| 34 | `src/systems/LocalQueueService.ts` | R | VERIFY | Offline queue/resilience is research infrastructure. Verify storage degradation cannot block normal demo/gameplay except approved study-start safety. |
| 35 | `src/systems/Mission01TelemetryBridge.ts` | T | VERIFY | Parent-side origin/source validation and passive recording are architecturally appropriate. Verify completion callback does not alter Mission runtime and uses canonical N7 completion. |
| 36 | `src/systems/SessionService.ts` | R | VERIFY | Game-only auth/session lifecycle is useful; verify network/session completion failures cannot change the player's completed gameplay state. |
| 37 | `src/systems/SupabaseClient.ts` | R | VERIFY | Research transport client; verify fail-closed secrets/config and no gameplay dependency. |
| 38 | `src/systems/SyncService.ts` | R | VERIFY | Offline retry/idempotent sync is useful; verify no blocking/punitive gameplay behavior. |
| 39 | `src/systems/TelemetryService.ts` | T | VERIFY | Event envelope/queue path is reusable; align level event registry with canonical source events. |
| 40 | `src/systems/research/MockResearchRepository.ts` | R | VERIFY | Mock research repository is useful; retain game-only contract and verify no altered N7 assumptions. |
| 41 | `src/systems/research/ResearchRepository.ts` | R | KEEP | Repository abstraction only; no gameplay effect. |
| 42 | `src/systems/research/SupabaseResearchRepository.ts` | R | VERIFY | Transport repository is research-only; verify canonical event pass-through and session lifecycle. |
| 43 | `supabase/config.toml` | DB | KEEP | Edge invocation configuration; no gameplay semantics. |
| 44 | `supabase/functions/ingest-telemetry/index.ts` | DB | REWRITE | Keep auth, game-only isolation, PII, sync-token and idempotency logic. Rewrite N7 event allowlist and `/session/complete`, which currently requires N7 `data_sent`. |
| 45 | `supabase/migrations/20260906170000_research_schema_v2.sql` | DB | REWRITE | Core schema/RLS/views are reusable, but N7 analytical view assumes communication/data events; condition model also requires clean Station-only review. |
| 46 | `supabase/migrations/20260906183000_research_hardening.sql` | DB | REWRITE | Build/commit/sync-token hardening is useful; N7 analytical view must be rebuilt from canonical events. |
| 47 | `supabase/migrations/20260907190000_research_pre_qa_hardening.sql` | DB | REWRITE | Explicitly encodes N7 `communication_point_reached → data_sent → level_completed`; invalid for canonical N7. Keep unrelated index/constraint hardening separately. |
| 48 | `supabase/migrations/20260907230000_station_game_condition_guard.sql` | DB | KEEP | Correct Station/GE-only guard: study rows must be `game`; demo condition remains null. |
| 49 | `supabase/migrations/20260908030000_edge_service_role_permissions.sql` | DB | KEEP | Server permission hardening only; no gameplay effect. |
| 50 | `supabase/tests/research_hardening.sql` | Q | REWRITE | Tests derived views that will change when canonical N7 metrics are restored. |
| 51 | `supabase/tests/research_pre_qa_hardening.sql` | Q | REWRITE | Tests altered N7 communication/send ordering; rewrite for canonical N7. |
| 52 | `supabase/tests/research_schema_v2.sql` | Q | VERIFY | Core schema test is useful; verify no assertions depend on non-game or altered N7 semantics. |
| 53 | `supabase/tests/station_game_condition_guard.sql` | Q | KEEP | Correct negative tests for GE-only `game` condition. |
| 54 | `tests/e2e/mission01-electronics.cjs` | Q | REWRITE | Gameplay assertions are useful, but added telemetry assertions depend on HTML injection. Keep canonical physical N1/N2 test and test research observation separately. |
| 55 | `tests/e2e/mission01-level7-contract.cjs` | Q | REMOVE | PR version replaces the canonical N7 test with exact-sample + explicit-send gameplay. The baseline test must remain the authority. |
| 56 | `tests/e2e/mission01-level7-n6-parity.cjs` | Q | REWRITE | Restore baseline N7 parity and remove alternate terminal/send assumptions. |
| 57 | `tests/e2e/mission01-research-physical.cjs` | Q | REWRITE | Wrapper concept is useful, but currently delegates to modified N7/electronics contracts. Rebuild as baseline physical gameplay + passive telemetry checks. |
| 58 | `tests/e2e/mission01-research-pipeline.cjs` | Q | VERIFY | Parent authority/protocol E2E is useful; verify it uses canonical source events and does not synthesize gameplay state. |
| 59 | `tests/e2e/mission01-research-resilience.cjs` | Q | VERIFY | Offline/shared-device research resilience is useful; verify no gameplay blocking behavior. |
| 60 | `tests/research/csv-linkage.test.mjs` | Q | KEEP | External pseudonymous linkage test; no runtime gameplay effect. |
| 61 | `tests/research/export-pagination.test.mjs` | Q | KEEP | Export pagination test only. |
| 62 | `tests/research/qa-generator.test.mjs` | Q | KEEP | QA generation isolation test only. |
| 63 | `tests/research/research-contract.test.mjs` | Q | REWRITE | Explicitly requires altered N7 patches/events/alias. Retain game-only/security/privacy checks; remove gameplay-hardening assertions and add immutability checks. |
| 64 | `tests/research/station-generator.test.mjs` | Q | KEEP | Station official generator isolation test only. |
| 65 | `tests/research/sync-burst.test.mjs` | Q | KEEP | Sync/reentrant drain test only. |

## Critical contamination paths

### A. Build pipeline contamination

PR #35 changed `package.json` so `prepare:missions` runs:

```text
patch-mission01-level7-research-semantics.mjs
patch-mission01-research-telemetry.mjs
patch-mission01-level7-final-hardening.mjs
```

A research branch must not require gameplay mutation steps in the Mission build pipeline.

### B. N7 direct gameplay contamination

The current PR #35 N7 chain changes all of the following relative to the canonical baseline:

```text
PUNTO FINAL
→ PUNTO DE COMUNICACIÓN

sample interaction rule
→ exact sample cell required

N7 command palette
→ + ENVIAR DATOS

completion
→ relevant data + communication point + dataSent

source event
final_point_reached
→ communication_point_reached + data_sent
```

These are intervention changes, not telemetry refactors.

### C. CI/test contamination

`build.yml`, research CI, static audits and browser E2E were updated to enforce the alternate N7. Passing CI on #35 therefore does **not** prove gameplay parity with the canonical GE; it proves internal consistency of the changed game.

### D. Analytics contamination

The event registry, Edge allowlist, session-completion gate and N7 SQL views were adapted to the altered N7. They must be rewritten around the canonical source event contract.

### E. N1–N4 artifact mutation

`patch-mission01-research-telemetry.mjs` instruments real handlers by rewriting generated N1–N4 HTML. The telemetry intent is valid, but the clean architecture target requires that Research not mutate canonical Mission artifacts merely to collect data.

This should be replaced with passive parent-side observation or telemetry emitters that are part of the approved gameplay baseline before freeze, with an explicit immutability comparison proving participant behavior is unchanged.

## What can be salvaged

The following architecture is broadly reusable after verification:

- `StudyCondition = 'game'`
- QA vs official study separation
- pseudonymous participant identity
- HMAC/PBKDF2 server-side authentication
- session proof and per-session sync capability
- recursive PII filtering
- RLS and direct browser-table access revocation
- local/offline event queue
- idempotent event IDs and event sequence checks
- sync retry logic
- external PRE/POST/MEEGA linkage outside gameplay
- Station-only database guard
- fresh/legacy migration testing
- research export tooling

## Required clean-branch treatment

The later clean branch must start from:

```text
main@2f94e9e701172ab455767757225110606b983597
```

and port only items marked `KEEP` or approved after `VERIFY`.

Items marked `REWRITE` must be recreated against the canonical baseline. Items marked `REMOVE` must not be cherry-picked from PR #35.

The clean research branch must add a new gate:

```text
GE_GAMEPLAY_IMMUTABILITY = PASS
```

with deterministic build comparison for N1–N7 and the Mission manifest.

## Audit gate

```text
PR35_CHANGED_FILES = 65
PR35_FILES_CLASSIFIED = 65
PR35_UNKNOWN_FILES = 0
KEEP = 17
VERIFY = 18
REWRITE = 26
REMOVE = 4
PR35_RESEARCH_ONLY = NO
DIRECT_GAMEPLAY_CONTAMINATION = YES
BUILD_CONTRACT_CONTAMINATION = YES
QA_CONTRACT_CONTAMINATION = YES
ANALYTICS_CONTRACT_CONTAMINATION = YES
MAIN_CHANGED_BY_AUDIT = NO
PR35_MERGED = NO
PR33_MERGED = NO
```

## Next implementation stage

Do **not** repair PR #35 in place.

Next, create `research/station-research-clean-v3` from the exact canonical baseline and port the validated research/data components according to this matrix. Before any research PR can be merged, reproduce the baseline build hashes and enforce gameplay immutability.
