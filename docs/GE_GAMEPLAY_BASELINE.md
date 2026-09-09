# GE Gameplay Baseline · ApuLabStationGame

## Scope

This document freezes the audit reference for the **Grupo Experimental (GE)** only.

- Repository: `Kas01000101/ApuLabStationGame`
- Experimental condition: `game`
- GC / ApuLabControl: out of scope
- PRE / POST / MEEGA+KIDS: external instruments; not Mission 01 runtime screens

The research/data layer may observe, validate, queue, persist and analyze gameplay events. It must not change what a participant sees, does, decides, or needs to complete a level.

## Canonical audit baseline

- `GE_BASELINE_SHA`: `2f94e9e701172ab455767757225110606b983597`
- Git tree: `e5651dcaee3f6d1c180a4a755b582e44735bd2c4`
- Commit: merge of PR #34 · `Nivel 5 · SIMPLIFICAR · BUCLES`
- Baseline branch: `main`
- Audit branch: `audit/ge-pr35-scope`
- Audit branch was created directly from `GE_BASELINE_SHA`.

### Current protected state at audit start

- `main` changed by this audit: **NO**
- PR #35 merged: **NO** (`OPEN · DRAFT`)
- PR #33 merged: **NO** (`OPEN · DRAFT`)
- Supabase live write performed by this audit: **NO**
- Production deploy performed by this audit: **NO**

## Canonical Mission 01 contract

Mission 01 contains exactly seven active levels and no Level 8.

| Level | Canonical role protected by this audit |
|---|---|
| N1 | Electronics measurement interaction; multimeter/battery/probes and existing completion flow |
| N2 | Measure/compare three batteries and select according to the existing criterion |
| N3 | Programming/navigation task on the existing board and command set |
| N4 | Planning/correction task with the existing collision and correction flow |
| N5 | `SIMPLIFICAR · BUCLES`: first valid long route, detect pattern, unlock `REPETIR`, then complete with a shorter repeated solution |
| N6 | `INVESTIGAR · DATOS CIENTÍFICOS`: zone → `ESCANEAR` → `ANALIZAR` → communication point → `ENVIAR DATOS`; `REPETIR` optional |
| N7 | `LA MUESTRA DESCONOCIDA`: scientific question → `ANALIZAR MUESTRA` → choose among three instruments → obtain relevant datum → `PUNTO FINAL`; terminal mission, no Level 8 |

## Canonical N7 baseline

N7 is especially protected because PR #35 and PR #33 contain an overlapping alternative design.

At the canonical baseline:

- final checkpoint label: `PUNTO FINAL`
- science block: `ANALIZAR MUESTRA`
- exactly three instrument options: temperature, proximity, materials
- `REPETIR` is available and optional
- `data-command="send"` is **not** part of N7
- `ENVIAR DATOS` is **not** an N7 programmable completion requirement
- canonical terminal event vocabulary includes `final_point_reached`
- completion is based on the relevant scientific datum plus reaching the final point
- no Level 8 exists

The research layer must adapt to this N7 contract. It must not rename the goal, add a new command, add a new completion requirement, or change the valid sample-position rule merely to satisfy an analytics schema.

## CI evidence for the canonical tree

PR #34's merge-preview commit `b75aa547ae89ea97c742953b16c8f30d5159c1df` has the same Git tree as `GE_BASELINE_SHA`:

`e5651dcaee3f6d1c180a4a755b582e44735bd2c4`

The equivalent merge-preview passed:

- `Build and verify Mission 01` · run `34029624614` · SUCCESS
- `Security and Build` · run `34029624605` · SUCCESS
- `Mission 01 Browser E2E` · run `34029624607` · SUCCESS

The build verification for that canonical tree explicitly expected `PUNTO FINAL` in N7 and explicitly rejected `data-command="send"` in N7.

## Generated artifact hash capture

`public/missions/mission01/level1.html` through `level7.html` and `manifest.json` are generated during `prepare:missions`; the final generated files are not committed in the canonical Git tree.

The historical canonical CI run did not retain a downloadable generated-build artifact. Therefore this audit does **not** invent final HTML hashes.

Current status:

- `GE_BASELINE_TREE_CAPTURED = PASS`
- `CANONICAL_CI_EQUIVALENCE = PASS`
- `GE_GENERATED_HASH_CAPTURE = PENDING_REPRODUCIBLE_BUILD`

Before the later `GE GAMEPLAY IMMUTABILITY` gate can be declared green, the exact canonical tree must be rebuilt deterministically and the final generated hashes for N1–N7 plus `manifest.json` must be captured and compared against the research build.

## Protected gameplay surfaces

The following are considered gameplay/intervention surfaces and cannot be changed by a research-only branch:

- level objectives and scientific questions
- maps, coordinates, obstacles and start/goal positions
- AYNI position/orientation behavior
- command palettes and available commands
- unlock conditions and blocking rules
- EXPLORAR, GUÍA and BITÁCORA behavior visible to participants
- narrative and feedback wording that changes task interpretation
- audio/SFX/reward behavior
- drag/drop, click and keyboard interaction semantics
- error/collision behavior
- success/completion gates
- level transitions and terminal behavior
- generated Mission 01 HTML/runtime when the change affects participant-visible or participant-actionable behavior

## Baseline gate

```text
GE_BASELINE_SHA = 2f94e9e701172ab455767757225110606b983597
GE_BASELINE_TREE = e5651dcaee3f6d1c180a4a755b582e44735bd2c4
GE_BASELINE_TREE_CAPTURED = PASS
CANONICAL_CI_EQUIVALENCE = PASS
GE_GENERATED_HASH_CAPTURE = PENDING_REPRODUCIBLE_BUILD
MAIN_CHANGED_BY_AUDIT = NO
PR35_MERGED = NO
PR33_MERGED = NO
SUPABASE_LIVE_WRITE_BY_AUDIT = NO
PRODUCTION_DEPLOY_BY_AUDIT = NO
```

This document is an audit checkpoint, not a study freeze. The final `GE_FROZEN_SHA` is assigned only after the clean research branch passes gameplay immutability, physical N1→N7, resilience, privacy, database and full-session gates.
