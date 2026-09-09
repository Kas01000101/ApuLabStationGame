# Edge v6 live smoke evidence

## Scope

Authenticated QA-only live smoke for `ingest-telemetry` Edge Function v6. The Research candidate remained frozen at `6a677b73b8c945dd60ada87f3e560b6ba050fd92`; this evidence was produced only from the temporary branch `research/edge-v6-live-smoke`.

## Root cause of the prior QT-010 authentication failure

The prior failure was caused by two temporary smoke workflows running concurrently. Each generated a different ephemeral credential for `QT-010`; only one credential hash was provisioned. The other workflow therefore produced an authentication failure and raised the code to the configured authentication cooldown threshold. The subsequently correct workflow was then blocked by cooldown. This was a harness orchestration failure, not an Edge v6 credential-verification defect.

Verified contracts:
- participant-code hash matched between the QA participant and Edge auth audit rows;
- participant and assignment contracts were valid;
- Edge `verifyCredential()` parses the iteration count from the stored `pbkdf2_sha256` hash and accepts counts >= 100000;
- the retry harness self-tested the generated stored hash with the correct credential and a wrong credential before provisioning.

## Successful live smoke

- Workflow run: `34349430683`
- Temporary workflow SHA: `935cdc0037cb7b5384e1f0b0ffaf9ff9e926a65b`
- Research candidate SHA: `6a677b73b8c945dd60ada87f3e560b6ba050fd92`
- Edge Function: `ingest-telemetry` v6
- Technical participant UUID: `019f4ced-2045-4886-858d-2a9984d9d6df`
- Study: `APULAB-QA-2026`
- Condition: `game`
- Assignment method: `qa`
- Cohort: `EDGE_V6_SMOKE`
- Session A: `ab906a72-f0a3-452a-a9ca-32cfc231cc0f`
- Session B candidate: `d8990b64-20f1-41fb-8c29-493aa58e2321`

Results:

```text
CREDENTIAL_HASH_REGRESSION        = PASS
EDGE_AUTH_SMOKE                   = PASS
EDGE_SESSION_CREATE               = PASS
EDGE_CONCURRENT_SESSION_GUARD     = PASS
EDGE_RESUME_VALID                 = PASS
EDGE_RESUME_INVALID_TOKEN         = PASS
EDGE_SESSION_IDEMPOTENCY          = PASS
EDGE_LIVE_SMOKE                   = PASS
```

The second-session candidate was rejected and no row was created for Session B.

## Controlled cleanup and preservation

After the smoke:

```text
QT010_ACTIVE_SESSIONS             = 0
QT001_ACTIVE_SESSIONS             = 0
QT010_SMOKE_SESSION_STATUS        = abandoned
QT010_OFFICIAL_EVENTS             = 0
HISTORICAL_DEMO_SESSIONS          = 4
HISTORICAL_DEMO_EVENTS            = 176
APULAB-STUDY-2026.status          = draft
APULAB-STUDY-2026.expected_commit = UNFROZEN
POST_SMOKE_PRESERVATION           = PASS
```

The technical QT-010 participant and assignment were deactivated after the smoke. Prior auth-attempt rows and the abandoned smoke session were retained as audit evidence.

## Secrets excluded

This document intentionally does not contain raw credentials, complete credential hashes, session proofs, sync tokens, pepper values, service-role credentials, or database connection strings.
