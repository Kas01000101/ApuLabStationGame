# Supabase migration / connection runbook

## Current state
The repository is prepared to connect later. No real project, credentials, database push, function deployment or Vercel production environment is configured by this change.

## Safe sequence after this PR is approved
1. Create/connect the real Supabase project administratively.
2. Inspect the existing schema before writing anything.
3. Run migrations in a disposable/local environment first.
4. Apply the historical migrations and then `20260906170000_research_schema_v2.sql`.
5. Configure server-only secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APULAB_AUTH_PEPPER`, `APULAB_SESSION_PROOF_SECRET`, `APULAB_ALLOWED_ORIGINS`.
6. Deploy the reviewed Edge Function only after the schema dry-run passes.
7. Set the study Vercel environment to `VITE_DATA_MODE=supabase`, `VITE_RESEARCH_ENVIRONMENT=study`, and the real Edge Function base URL. Never expose service-role/pepper/proof secrets as `VITE_*`.
8. Generate and insert QT testers locally; execute QT-001 first.
9. Audit the persisted QT-001 session and event sequence before continuing QT-002→QT-010.
10. After all QA passes, freeze a final `STUDY_BUILD_ID` and stop gameplay changes during official collection.
11. Generate AP-001→AP-050 without assigning a condition until the approved protocol defines assignments.

## External questionnaires
PRE, POST and MEEGA+KIDS remain external forms. They are not embedded in Mission 01, are not runtime Supabase tables required by this design, and never block gameplay. Linkage is an administrative process using pseudonymous codes/HMAC mapping.

## Explicitly prohibited at this stage
Do not run `supabase link` against production, `supabase db push` against production, `supabase functions deploy` to production, or change production Vercel data variables before the real project is reviewed.
