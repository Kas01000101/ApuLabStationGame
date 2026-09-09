# QT-001 data collection incident

## Scope

This document records the first live QA run for participant `QT-001` in `APULAB-QA-2026`. It is QA evidence only. It does not relabel, delete, or modify historical telemetry and it does not change `APULAB-STUDY-2026`.

## Observed sessions

Two study sessions were observed for the same QA participant:

- `07578822-dbb9-443c-971e-69648798edeb` — `in_progress`, one event only: `session_started`, no level telemetry.
- `8db89481-5231-42ed-88ae-2fedc37fab61` — `completed`, `last_level=7`, 117 events, gameplay telemetry present for levels 5–7.

The first row is treated as an orphaned QA session caused by a second browser/session attempt. It is preserved as evidence and is not deleted automatically.

## Completed-session integrity

For session `8db89481-5231-42ed-88ae-2fedc37fab61`:

- `event_seq`: contiguous `1..117`
- duplicate `event_id`: `0`
- duplicate `event_seq`: `0`
- sequence gaps: `0`
- final lifecycle:
  - `115 final_point_reached [L7]`
  - `116 level_completed [L7]`
  - `117 session_completed`
- server session status: `completed`
- `last_level=7`

## Missing N1–N4 telemetry

The completed session recorded:

- `session_started`: `2026-09-09 08:45:39 UTC`
- first recorded level event: `level_started [L5]` at `2026-09-09 08:49:30 UTC`

The interval is approximately 3 minutes 51 seconds. No N1–N4 events exist between `event_seq=1` and the first N5 event; `event_seq=2` is already `level_started [L5]`.

The outer application enters Mission 01 through level 1. Because the stored sequence has no gaps and Supabase received a contiguous stream beginning at 1, there is no evidence that N1–N4 events were accepted into the local Research queue and later lost by Supabase.

### Incident classification

`PRE_QUEUE_TELEMETRY_COVERAGE_FAILURE`

This incident is **not classified as `DATABASE_DATA_LOSS`**.

The evidence places the failure before persistence, between level-side behavior and the parent Research telemetry bridge / canonical event queue. N5–N7 instrumentation was accepted and synchronized successfully.

## Independent concurrent-session defect

The database accepted two active study sessions for the same participant/study because no server/database invariant currently enforces one active study session per `(participant_id, study_id)`.

This is a separate defect from the N1–N4 telemetry coverage gap.

## Required remediation

1. Add QA-only analytics views without weakening official-study isolation.
2. Enforce one active study session per participant/study at the database layer.
3. Add Edge preflight returning `active_session_exists` for a different active session.
4. Support recovery/resume of the same session when the browser retains the session sync context.
5. Move `level_started`/`level_completed` lifecycle ownership to the parent shell.
6. Add explicit N1–N4 behavioral instrumentation and bridge diagnostics.
7. Add concurrent-browser, reload/resume, and complete N1→N7 regression tests.
8. Repeat QT-001 only after all gates pass.

## Preservation requirements

- Preserve the historical demo subset: 4 sessions / 176 events.
- Preserve both QT-001 session rows as QA evidence unless an explicit, documented administrative status transition is approved.
- Never store raw participant credentials, session proofs, peppers, or service-role keys in evidence files.
- `APULAB-STUDY-2026` remains draft and unfrozen.
