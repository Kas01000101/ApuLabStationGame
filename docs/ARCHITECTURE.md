# ApuLabStationGame Architecture

## Primary architecture decision

Phaser is not part of the active runtime. The application uses:

- **Vite + TypeScript** for the application and build pipeline;
- **Three.js** for 3D rendering, cameras, worlds, characters, and effects;
- **DOM/CSS** for menus, access forms, dialogs, overlays, and the HUD;
- **Services and repositories** for session management, telemetry, synchronization, and backend access;
- **Supabase Edge Functions + PostgreSQL** for official study authentication, ingestion, and analytics.

## Main layers

```text
DOM UI
  ├─ MenuScreen
  ├─ AccessModal
  ├─ IntroOverlay
  └─ Mission01Screen
       ↓
SessionService
       ↓
GameState + TelemetryService + SyncService
       ↓
ResearchRepository
  ├─ MockResearchRepository
  └─ SupabaseResearchRepository
       ↓
Supabase Edge Function
       ↓
PostgreSQL research tables + analytics views

Three.js
  ├─ ThreeEngine
  ├─ IntroController
  ├─ MarsWorld / ApuLabWorld
  ├─ Yachay / AYNI / Ruth
  └─ Visual and audio effects
```

The Three.js layer does not know participant passwords, Supabase service-role credentials, RLS policy details, or database secrets.

## DEMO flow

```text
Demo mode
  → startNewSession('demo', null)
  → MockResearchRepository
  → session_started
  → IntroController / Mission 01
```

DEMO does not use a participant identity and does not write official study data.

## STUDY flow

```text
Study code + credential
  → server-side authenticateParticipant()
  → validate participant + assignment + active study
  → issue short-lived signed session proof
  → createSession()
  → persist anonymous participant_id
  → session_started
  → Mission 01
  → bounded telemetry batches
  → server-side validation
  → PostgreSQL
```

The browser never becomes the authority for participant identity. Official study identity is derived from successful server-side authentication and a signed session proof.

Before a study session is accepted, the backend validates the active study, study condition, environment, build version, Git commit SHA, telemetry schema version, and protocol version.

## Telemetry and synchronization

Gameplay emits an allowlisted event vocabulary. Events are normalized before persistence and contain anonymous participant/session identifiers plus behavioral fields such as level number, event sequence, attempt number, elapsed time, result, and an event-specific safe payload.

The client uses an offline-first queue. Events are synchronized in bounded batches, kept locally until acknowledged, and protected against duplicate ingestion by server-side constraints and idempotency rules.

## Research isolation

The repository keeps the following concerns separate:

- **DEMO**: local/mock research flow;
- **QA**: isolated validation identities and evidence;
- **STUDY**: official participant sessions accepted only when the frozen study contract matches the deployed production build.

Private participant credentials and study datasets are not part of the public repository.
