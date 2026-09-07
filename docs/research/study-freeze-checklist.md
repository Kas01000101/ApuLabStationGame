# Study build freeze checklist

Freeze only after QT-001→QT-010 pass on the same Station release candidate.

- [ ] Build and browser regression green.
- [ ] Research contract/audit green.
- [ ] Station-only source guard green: active runtime, Edge, mock, generator and runbooks contain no non-game condition.
- [ ] Migration 6 negative SQL tests reject every non-game Station assignment/session/event.
- [ ] N1→N7 raw event sequence reconstructable.
- [ ] No pending event loss during offline/retry QA.
- [ ] N5 before/after and repeat metadata valid.
- [ ] N6 completes with and without REPETIR.
- [ ] N7 instrument-selection path and communication/data events valid.
- [ ] `v_session_quality` reviewed for all QT sessions.
- [ ] QA rows are absent from `v_official_study_events`.
- [ ] All Station study rows have `study_condition=game`; demo rows have `study_condition=NULL`.
- [ ] No raw participant/study code in events or official export.
- [ ] No PII/secrets committed.
- [ ] PRE, POST and MEEGA+KIDS remain external.
- [ ] Real Station Supabase project/schema/Edge Function configuration reviewed.
- [ ] `environment=study` only on the official Station study deployment.
- [ ] Final `STUDY_BUILD_ID` and exact Git SHA assigned and documented.

ApuLabControl is a separate system and is not part of this freeze. After freeze, Station gameplay/UI must not change during official data collection; any required gameplay change creates a new build version and protocol entry.
