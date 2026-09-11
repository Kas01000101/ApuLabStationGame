# Migration from the Monolithic Three.js Prototype

The original prototype HTML is retained only as historical/visual reference. The active architecture lives in TypeScript modules under `src/`, while the canonical Mission 01 runtime is produced through the current deterministic build/patch pipeline.

## Phase 1 — complete

- Vite + TypeScript + Three.js
- `ThreeEngine`
- DOM-based `MenuScreen` and `AccessModal`
- `GameState` and `SessionService`
- Mock/Supabase boundary through `ResearchRepository`
- offline-first telemetry
- no Phaser dependency in the active runtime

## Phase 2 — intro migration — complete

The prototype intro was migrated into real modules:

1. `Rover.ts`: reusable Spirit/Opportunity-style base with butterfly deck, six wheels, rocker-bogie suspension, mast, main cameras, antenna, dish, lights, and detachable panel.
2. `Yachay.ts`: exploration, scanning, telemetry, and visual reaction behavior.
3. `Ayni.ts`: twin rover with presentation movement/bounce and mast gestures.
4. `Ruth.ts`: block-style voxel character with hair, rectangular eyes, thin glasses, uniform, flags, and RUTH / MANZANARES badge.
5. `MarsWorld.ts`: natural APU-07 sector with irregular terrain, rocks, dunes, tracks, target formation, dust, and cyan scanning.
6. `FailureEffects.ts`: side cover, low-poly smoke, solar-panel detachment, and debris behavior.
7. `TelemetryEffects.ts`: telemetry pulses and protagonist pulse.
8. `ApuLabWorld.ts`: bay, walls, roof/gate, lighting, landing area, technical atmosphere, Ruth spotlight, and practice-table reveal.
9. `CinematicCamera.ts`: shot-based camera and blends.
10. `IntroAudio.ts`: BIP, PFF, CLANK, CLINK, WOOOSH, BOOM, telemetry, and success WebAudio cues.
11. `IntroOverlay.ts`: dialog, SFX, location, beats, `SKIP INTRO`, and nickname flow without a timer.
12. `IntroController.ts`: Mars → failure → telemetry → Ruth → nickname → AYNI → method → Mission 01 timeline.

## Nickname rule

The `nickname` state has no timeout or automatic progression. The cinematic remains paused until the player enters a nickname and continues.

## Data boundary

Three.js and the intro do not know participant passwords, service-role credentials, RLS internals, or direct database persistence details. The session flow remains:

```text
MenuScreen → AccessModal → SessionService → ResearchRepository → Intro → Mission 01
```

DEMO uses an anonymous session (`participant_id = null`). STUDY now uses implemented server-side authentication, a signed short-lived session proof, and the Supabase research repository.

## Mission migration — complete

Mission 01 is now fully integrated as a seven-level canonical sequence. The active pipeline reconstructs and validates the approved gameplay sources, generates Levels 6 and 7 through dedicated builders, applies level-specific patches, and runs regression audits before the production build.

Current state:

- canonical Mission 01: **7/7 complete**;
- study telemetry: implemented for all seven levels;
- production deployment: active on Vercel;
- official study backend: active on Supabase;
- browser E2E and research validation: included in CI.

## Permanent rule

Do not return to standalone `Vxx.html` files as the final application architecture. Improvements must live in the maintained TypeScript/application modules or in the explicit Mission 01 source/build pipeline, with regression coverage for approved gameplay behavior.
