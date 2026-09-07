# Research data dictionary

| Variable | Source | Raw/derived | Definition | Interpretation / limitation |
|---|---|---|---|---|
| `participant_id` | server auth | raw UUID | Pseudonymous participant identifier | Never expose raw access code in telemetry. |
| `study_id` | server assignment | raw | QA or official study identifier | Official analysis must filter `APULAB-STUDY-2026`. |
| `study_condition` | server assignment | raw | `game` or `static_control` | Code itself does not reveal condition. |
| `event_seq` | parent TelemetryService | raw | Monotonic sequence within session | Used to reconstruct order across offline/retry batches. |
| `elapsed_ms` | gameplay/parent | raw | Milliseconds from level start | Not wall-clock duration across separate sessions. |
| `attempt_number` | gameplay | raw | 1-based attempt counter when meaningful | Nullable for non-attempt events. |
| `blocks_before` | N5 | raw payload / view | Executable block count before refactor | Behavioral program size. |
| `blocks_after` | N5 | raw payload / view | Executable block count after refactor | Must be compared with same task/goal. |
| `reduction_pct` | N5 | derived | Percentage reduction in executable blocks | Efficiency measure; not proof of learning by itself. |
| `repeat_instances` | N5 | raw payload / view | Number of executable `REPETIR` blocks | One instance is sufficient if the valid program is shorter. |
| `used_repeat_n6` | N6 | derived | At least one executable repeat block used in N6 | Spontaneous in-game reuse; do **not** claim validated transfer learning. |
| `first_choice_relevant` | N7 | derived | First instrument selected answered the required datum | Choice behavior only. |
| `instrument_change_count` | N7 | derived | Number of instrument changes | Does not independently measure conceptual learning. |
| `used_repeat_n7` | N7 | derived | At least one executable repeat block used in N7 | Optional behavior; never a win condition. |
| `event_sequence_gap` | quality view | derived flag | Sequence has missing ordinal(s) | Flag only; do not auto-delete session. |
| `build_mismatch` | quality view | derived flag | Event/session build versions disagree | Investigate before analysis. |

No variable named `learned_loop`, `learned_science`, `learned_sensor` or `transfer_success` is generated from telemetry. PRE, POST and MEEGA+KIDS remain external instruments.
