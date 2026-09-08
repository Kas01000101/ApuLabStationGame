# QA protocol · APULAB-QA-2026

QA uses `QT-001` → `QT-010`, always separated from the official paper dataset by `study_id=APULAB-QA-2026`. Credentials are generated locally into `.private/` and are never documented or committed.

## QA phases

- `QA-01` authorizes **QT-001 only** as the first controlled happy-path Supabase validation.
- `QA-02` covers **QT-002 → QT-010** only after QA-01 passes and explicit authorization is given.
- During QA-01, do not generate or insert QT-002→QT-010 and do not create any AP-001→AP-050 participants.

Generate only QT-001 with:

```bash
tsx scripts/research/create-qa-testers.ts --from 1 --to 1
```

Do **not** run `--from 1 --to 10` during QA-01.

| Tester | Case | Acceptance |
|---|---|---|
| QT-001 | Happy path online | Complete N1→N7; reconstruct full event sequence. |
| QT-002 | Partial offline | Disable network during a level, restore it, queue syncs with no missing events. |
| QT-003 | Reload/resume | No duplicate `event_id`; supported resume behavior is documented. |
| QT-004 | N5 loops intensive | `blocks_before > blocks_after`, repeat metadata and timing reconstruct correctly. |
| QT-005 | N6 without REPETIR | Completes; `used_repeat_n6=false`. |
| QT-006 | N6 with REPETIR | Completes; `used_repeat_n6=true`. |
| QT-007 | N7 temperature → materials | One instrument change; irrelevant feedback precedes change. |
| QT-008 | N7 materials first | `first_choice_relevant=true`. |
| QT-009 | Premature/error actions | Program remains usable and telemetry records the behavior. |
| QT-010 | Full regression / study simulation | Exact candidate build used for final pre-freeze simulation. |

Before freeze, audit for event sequence gaps, duplicates, missing level start/completion, missing session completion, build/schema mismatch and unexpected levels. Quality flags mark records for review; they do not automatically exclude participants.
