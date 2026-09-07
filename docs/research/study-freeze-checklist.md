# Study build freeze checklist

Freeze only after QT-001→QT-010 pass on the same release candidate.

- [ ] Build and browser regression green.
- [ ] Research contract/audit green.
- [ ] N1→N7 raw event sequence reconstructable.
- [ ] No pending event loss during offline/retry QA.
- [ ] N5 before/after and repeat metadata valid.
- [ ] N6 completes with and without REPETIR.
- [ ] N7 instrument-selection path and communication/data events valid.
- [ ] `v_session_quality` reviewed for all QT sessions.
- [ ] QA rows are absent from `v_official_study_events`.
- [ ] No raw participant/study code in events or official export.
- [ ] No PII/secrets committed.
- [ ] PRE, POST and MEEGA+KIDS remain external.
- [ ] Real Supabase project/schema/Edge Function configuration reviewed.
- [ ] `environment=study` only on the official study deployment.
- [ ] Final `STUDY_BUILD_ID` assigned and documented.

After freeze, gameplay/UI must not change during official data collection. Any required gameplay change creates a new build version and must be documented in the protocol.
