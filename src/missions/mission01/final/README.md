# Mission 01 Final Sources

Mission 01 uses **seven canonical logical levels** after the former legacy Level 3 was removed from the active sequence.

## Packed source lineage

The early and mid-mission packed source folders retain legacy names to preserve approved gameplay lineage:

- `level1/` → canonical Level 1
- `level2/` → canonical Level 2
- `level3/` → removed; no longer part of the active build or flow
- `level4/` → source lineage for canonical Level 3
- `level5/` → source lineage for canonical Level 4
- `level6/` → source lineage for canonical Level 5

The folder names `level4/`, `level5/`, and `level6/` intentionally remain unchanged internally. Renaming those source folders would add unnecessary risk to already validated gameplay.

## Canonical Levels 6 and 7

Canonical Levels 6 and 7 are generated and finalized by the current dedicated build pipeline, including:

- `scripts/build-mission01-level6-from-level5.mjs`
- Level 6 patch, telemetry, UX, and audit scripts
- `scripts/build-mission01-level7-from-level5.mjs`
- Level 7 sample/instrument, telemetry, UX, completion, and audit scripts

This process deterministically produces the final mission runtime without requiring separate legacy `level7/` or `level8/` packed-source directories.

## Build output

The active pipeline emits and validates all seven public mission routes:

```text
level1.html
level2.html
level3.html
level4.html
level5.html
level6.html
level7.html
```

Only the canonical seven-level sequence is part of production. The removed legacy Level 3 is not restored or synthesized.

**Mission 01 status: 7/7 complete.**
