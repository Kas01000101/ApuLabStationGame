# ApuLab Station Supabase migration / connection runbook

## Scope and current gate
This runbook applies only to **ApuLabStationGame** and its Station research database. The only operational study condition here is `game`. ApuLabControl is out of scope: no shared database, no cross-repository build and no Control participant rows are created here.

Before the explicit Supabase write phase, keep the real project read-only: Migration 5 and Migration 6 remain unapplied live, no Edge Function is deployed, and no QT/AP participants are created.

## QA phase split
- `QA-01` is limited to **QT-001 only**.
- `QA-02` covers **QT-002 → QT-010** only after QA-01 passes and explicit authorization is given.
- During QA-01, do not create QT-002→QT-010 and do not create official AP participants.

Generate only QT-001 with:

```bash
tsx scripts/research/create-qa-testers.ts --from 1 --to 1
```

## Pre-Supabase sequence
1. Complete Station-only runtime/Edge/mock/generator hardening and Migration 6.
2. Require all CI, research-db fresh/legacy and physical N1→N7 gates to pass on one exact SHA.
3. Freeze that SHA as `STATION_QA_APPROVED_SHA`; any new commit invalidates the freeze.
4. Re-audit the real Station Supabase project read-only. Expected before write authorization: four historical migrations live; M5/M6 absent; participants/assignments/sessions/events all zero; Edge Functions zero.
5. Stop. Do not perform database writes without explicit `SUPABASE WRITE PHASE` authorization.

## Explicit write phase after authorization
1. Apply Migration 5 once and audit its indexes, validated constraints and N6/N7 metric ordering.
2. Apply Migration 6 once and audit game-only assignment/session/event constraints.
3. Confirm RLS remains enabled and direct `anon`/`authenticated` grants remain zero.
4. Configure QA study metadata with the exact approved Station SHA/build/schema/protocol.
5. Configure server-only secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APULAB_AUTH_PEPPER`, `APULAB_SESSION_PROOF_SECRET`, `APULAB_ALLOWED_ORIGINS`.
6. Deploy reviewed `ingest-telemetry` only after the database gates pass.
7. Configure QA Preview with `VITE_DATA_MODE=supabase`, `VITE_RESEARCH_ENVIRONMENT=preview` and the Station Edge URL. Never expose service-role/pepper/proof secrets as `VITE_*`.
8. Generate and insert **QT-001 only**; execute a physical N1→N7 session and audit persistence.
9. Stop after `QT-001 PASS`. QA-02 requires separate authorization.

## Official Station participants
The total study sample is not assumed to be 25/25 or any other fixed split. This repository must create only AP codes explicitly assigned by the approved protocol to the **game** group.

Prepare an admin-only file such as:

```csv
study_code
AP-002
AP-005
AP-009
```

Then, only after the official-study gate authorizes participant creation:

```bash
tsx scripts/research/create-study-participants.ts --codes-file=.private/station-game-codes.csv
```

The generator rejects empty lists, duplicates, QT codes and AP codes outside `AP-001`→`AP-050`, and creates only `APULAB-STUDY-2026` assignments with `study_condition=game`.

## External questionnaires
PRE, POST and MEEGA+KIDS remain external forms. They are not embedded in Mission 01 and never block gameplay. Linkage is an administrative pseudonymous process.

## Prohibited until their corresponding gate
Do not rewrite historical migrations, auto-create the full AP-001→AP-050 range, infer a cohort split, deploy production/study environments, enable the official study, merge this draft PR, or expose server-side secrets before the required gate explicitly authorizes the action.
