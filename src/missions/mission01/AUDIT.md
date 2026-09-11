# Mission 01 · Canonical 1–7 Sequence Audit

Mission 01 uses **seven canonical logical levels**. The former legacy Level 3 was removed from the active mission, and the remaining sequence was renumbered.

## Legacy-to-canonical mapping

| Legacy position | Canonical position |
| --- | --- |
| Level 1 | Level 1 |
| Level 2 | Level 2 |
| Level 3 | Removed |
| Level 4 | Level 3 |
| Level 5 | Level 4 |
| Level 6 | Level 5 |
| Legacy later-stage lineage | Levels 6–7 are produced by the current dedicated builders and patch pipeline |

## Current repository state

The active production pipeline builds and validates **all seven canonical levels**.

The packed source directories preserve legacy naming for the early/mid mission lineage so approved gameplay does not need to be rewritten solely for renumbering. Canonical Levels 6 and 7 are deterministically created and finalized by the current Level 6/7 build and patch scripts before the production mission is emitted.

The final runtime therefore exposes:

- `level1.html`
- `level2.html`
- `level3.html`
- `level4.html`
- `level5.html`
- `level6.html`
- `level7.html`

Mission 01 is **7/7 complete**.

## Regression rule

Approved gameplay behavior must not be changed merely to rename or renumber levels. The pipeline may transform visible numbering, navigation, unlock keys, telemetry identity, and other level-number-dependent continuity fields while preserving the intended interaction contract.

The active validation pipeline checks, among other things:

- seven-level generation and completeness;
- canonical numbering;
- level-to-level transitions;
- generated inline JavaScript syntax;
- the shared `1672 × 941` logical stage contract;
- help/guide lifecycle behavior;
- level-specific gameplay contracts;
- Level 5 repeat/optimization flow;
- Level 6 scientific-operation flow;
- Level 7 instrument-selection and completion handoff.

The removed legacy Level 3 and its old tracing/source-harness behavior are not part of the canonical production mission.
