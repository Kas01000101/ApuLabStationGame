# ApuLab Station — Intro Canon Audit

The modular migration must preserve the approved visual behavior of Intro V38/V42. This audit documents regressions identified after the first migration.

## Rule

**Modularizing does not mean redesigning.** Three.js modules should extract the approved visual implementation rather than reinterpret it.

## Required restoration

1. Canonical optics/cameras (FOV 36, exposure .93).
2. Complete canonical voxel Ruth.
3. Canonical Spirit/Opportunity-style rover and AYNI with the same base design.
4. Mars telemetry → ApuLab monitor match cut.
5. Dynamic monitor, STEM visuals, and AYNI sensors before the failure.
6. `telemetrySimulation` state before the battery reveal.
7. Driving/failure audio and safe animation-loop recovery.
8. `SKIP INTRO` only after the intro has already been viewed.
9. Effective handoff from the end of the intro into Mission 01.

## Parts that must not be rebuilt from scratch

- `FailureEffects`: cover, gray smoke, solar panel, debris, and progressive shutdown.
- Nickname flow without a timeout.
- Condensed Ruth/AYNI dialog.
- Dynamic AYNI presentation.
