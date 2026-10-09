# ApuLab Station — Intro Canon Audit

The modular migration must preserve the approved visual behavior of Intro V38/V42. This audit documents regressions identified after the first migration.

## Rule

**Change scope:** the approved scientist substitution explicitly replaces the previous figure; the surrounding rover, timing, cameras, gameplay handoff, and effects must preserve the established cinematic contract unless updated in the approved A–F script.

## Required restoration

1. Canonical optics/cameras (FOV 36, exposure .93).
2. Approved enhanced voxel tribute to María Luisa Aguilar Hurtado (navy blazer, cream blouse, dark trousers, glasses, astronomy pin; no flags or NASA identity).
3. Canonical Spirit/Opportunity-style rover and AYNI with the same base design.
4. Mars telemetry → ApuLab monitor match cut.
5. Dynamic monitor, STEM visuals, and AYNI sensors before the failure.
6. `telemetrySimulation` state before the battery reveal.
7. Driving/failure audio and safe animation-loop recovery.
8. The canonical `OMITIR INTRO` (Skip Intro) control only after the intro has already been viewed.
9. Effective handoff from the end of the intro into Mission 01.

## Parts that must not be rebuilt from scratch

- `FailureEffects`: cover, gray smoke, solar panel, debris, and progressive shutdown.
- Nickname flow without a timeout.
- Explicit on-screen identification of the historical tribute; no fabricated historical quotations.
- Approved scenes A–F: nine scientist introduction lines, personalized welcome, AYNI dialogue, five scientific-method lines, first measurement. Do not collapse independently approved turns.
- Dynamic AYNI presentation.
