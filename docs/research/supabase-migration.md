# Supabase migration / connection runbook

## Current state
The repository is prepared to connect later. No real project, credentials, database push, function deployment or Vercel production environment is configured by this change.

## QA phase split

- `QA-01` is limited to **QT-001 only** and is the first controlled real Supabase validation.
- `QA-02` covers **QT-002 → QT-010** only after QA-01 passes and explicit authorization is given.
- During QA-01, do not create QT-002→QT-010 and do not create AP-001→AP-050.

Generate only QT-001 with:

```bash
tsx scripts/research/create-qa-testers.ts --from 1 --to 1
```

Do **not** run `--from 1 --to 10` during QA-01.

## Safe sequence after this PR is approved
1. Confirm the final QA-approved Git SHA after all generator, documentation, CI, research-db and physical N1→N7 checks pass.
2. Inspect the real Supabase project in read-only mode before writing anything: project status, migration history, public tables/views, Edge Functions, security advisors and performance advisors.
3. Run migrations in a disposable/local environment first.
4. Apply the historical migrations and then `20260906170000_research_schema_v2.sql` and `20260906183000_research_hardening.sql` in order.
5. Audit the resulting schema, RLS, constraints and browser-role privileges before deploying any Edge Function.
6. Configure server-only secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APULAB_AUTH_PEPPER`, `APULAB_SESSION_PROOF_SECRET`, `APULAB_ALLOWED_ORIGINS`.
7. Deploy the reviewed `ingest-telemetry` Edge Function only after the schema and security gates pass.
8. Configure QA Preview only with `VITE_DATA_MODE=supabase`, the approved research environment and the real Edge Function URL. Never expose service-role/pepper/proof secrets as `VITE_*`.
9. Generate and insert **QT-001 only** using `--from 1 --to 1`.
10. Execute the physical QT-001 N1→N7 happy-path session.
11. Audit the persisted QT-001 session, event sequence, N5/N6/N7 metrics, privacy, QA/official dataset isolation and quality flags.
12. Stop after `QA-01 PASS`. Do not continue automatically to QT-002→QT-010.
13. Only after explicit authorization, run QA-02 for QT-002→QT-010.
14. After all QA passes, freeze a final `STUDY_BUILD_ID` and stop gameplay changes during official collection.
15. Generate AP-001→AP-050 without assigning a condition until the approved protocol defines assignments.

## External questionnaires
PRE, POST and MEEGA+KIDS remain external forms. They are not embedded in Mission 01, are not runtime Supabase tables required by this design, and never block gameplay. Linkage is an administrative process using pseudonymous codes/HMAC mapping.

## Explicitly prohibited at this stage
Do not run production database or function deployment actions, change production Vercel data variables, create official participants, enable the official study, or expose server-side secrets before the pre-Supabase gate is fully approved.
