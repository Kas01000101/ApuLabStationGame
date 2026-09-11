# Security and Data Governance

## Current state

The active application architecture is `Vite + TypeScript + Three.js + DOM`, with Supabase providing the protected research backend. Phaser is not part of the main runtime.

The official study flow is implemented and operates with server-side participant authentication, bounded telemetry ingestion, research-table access controls, and build/version guards.

## Implemented controls

### Authentication and participant identity

- Participant study codes and credentials are verified server-side by the Supabase Edge Function.
- Credentials are stored as **PBKDF2-SHA256 hashes**, never as plaintext database values.
- Participant study codes are represented server-side by keyed hashes rather than raw codes in research records.
- Successful authentication produces a short-lived signed session proof used to authorize study-session operations.
- The browser is never trusted to declare its own `participant_id` for an official study session.
- Authentication failures are rate-limited: repeated failures within the configured window trigger a temporary cooldown.

### Secret management

- `SUPABASE_SERVICE_ROLE_KEY` exists only in the Supabase server environment and is never exposed through `VITE_*` variables or shipped to the browser.
- Authentication pepper and session-proof signing secrets are server-side only.
- Real credentials, participant datasets, and production secrets must never be committed to Git.

### Telemetry validation

- The client and Edge Function use an explicit event allowlist.
- Telemetry payloads reject PII and credential-related field names.
- Individual event payloads are size-limited.
- Requests and telemetry batches are bounded; event synchronization uses batches of at most 20 events.
- The Edge Function validates payload shape, types, event names, participant/session ownership, and study metadata.
- Browser-supplied objects are not blindly spread into database inserts; accepted fields are normalized through an allowlist.
- Internal PostgreSQL/Supabase errors are not returned verbatim to the browser.

### Study integrity

Official STUDY sessions are accepted only when the backend confirms:

- the study exists and is active;
- the participant and assignment are active;
- the assignment uses the expected `game` condition;
- the request is for the authorized research environment;
- build version matches the frozen study configuration;
- Git commit SHA matches the frozen study configuration;
- telemetry schema version matches;
- protocol version matches.

This prevents official data from being silently mixed across incompatible deployments or research protocols.

### Database protections

- Research tables use Row Level Security and direct anonymous/authenticated browser access is revoked where appropriate.
- New research rows do not persist raw participant codes.
- Service-role permissions are restricted to the server-side ingestion path.
- Database constraints and uniqueness rules support event ordering and idempotent ingestion.
- QA and official-study analytics are separated.

### Privacy and data minimization

Gameplay telemetry does not accept fields for names, email addresses, phone numbers, addresses, government IDs, birth dates, schools, parent names, passwords, credentials, audio, video, images, or screenshots.

`user_agent` is intentionally reduced to the fixed value `web` to avoid unnecessary browser fingerprinting.

### Synchronization and resilience

- Events are queued locally using an offline-first approach.
- Confirmed events are removed from the local queue only after successful server acknowledgment.
- Synchronization uses bounded batches and retry/backoff behavior.
- Duplicate ingestion is controlled through event identity and database constraints.

### CORS

The Edge Function uses an explicit origin allowlist for authorized application origins and does not rely on wildcard CORS.

**CORS is not authentication.** Origin checks are an additional browser control; official study identity and authorization still come from server-side credential verification and signed session proof.

## Dependency and build controls

- Vite is pinned to `7.3.6`.
- TypeScript is pinned to `5.9.2`.
- Three.js is pinned to `0.180.0`.
- `esbuild@0.28.2` is explicitly pinned and approved through `allowScripts`.
- `package-lock.json` is versioned, allowing reproducible npm dependency resolution.
- CI runs build, security, research-contract, database, gameplay-integrity, and browser E2E checks.

## Permanent rules

- Never expose server-only secrets to the client.
- Never commit participant credentials or private research datasets.
- Never accept official participant identity directly from browser-controlled fields.
- Never expand telemetry to personal information without an explicit research, ethical, and technical review.
- Keep DEMO, QA, and official STUDY data paths isolated.
- Treat changes to study build/version contracts as release changes that require corresponding research configuration updates.
