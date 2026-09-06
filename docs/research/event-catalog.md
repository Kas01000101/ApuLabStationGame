# Mission 01 · Research event catalog

Raw atomic events are the source of truth. The canonical allowlist lives in `src/research/telemetry/events.ts` and is enforced again server-side.

## Common
`session_started`, `session_completed`, `level_started`, `level_completed`, `program_started`, `program_modified`, `explore_opened`, `bitacora_opened`, `help_requested`, `task_started`, `task_response_submitted`, `task_response_changed`, `task_completed`, `premature_action`, `sync_failed`.

## N1 · MEDIR
`battery_power_changed`, `multimeter_power_changed`, `multimeter_mode_changed`, `probe_drag_start`, `probe_snap`, `measurement_attempt`, `polarity_state`, `valid_measurement`.

## N2 · COMPARAR
`battery_viewed`, `battery_measured`, `all_batteries_measured`, `battery_selected`, `battery_selection_changed`.

## N3 · PROGRAMAR
`command_added`, `command_removed`, `command_moved`, `command_executed`, `goal_reached` plus common program events.

## N4 · NAVEGAR / DEPURAR
`collision_detected`, `program_modified_after_failure`, `goal_reached` plus common program events.

## N5 · BUCLES
`initial_program_completed`, `pattern_highlighted`, `repeat_unlocked`, `repeat_added`, `repeat_removed`, `repeat_count_changed`, `block_moved_into_repeat`, `block_removed_from_repeat`, `program_refactored`, `goal_reached`.

## N6 · INVESTIGAR
`science_zone_reached`, `scan_started`, `scan_completed`, `analyze_started`, `analyze_completed`, `communication_point_reached`, `data_sent`, `premature_action`, `program_modified`. `REPETIR` is optional; `used_repeat_n6` is behavioral telemetry only.

## N7 · MUESTRA DESCONOCIDA
`sample_reached`, `sample_analyze_requested`, `instrument_modal_opened`, `instrument_selected`, `sample_analyzed`, `instrument_changed`, `relevant_instrument_selected`, `communication_point_reached`, `data_sent`, `program_modified`. `sample_reached` means AYNI is exactly on the sample tile. `final_point_reached` is not an official v2 event. `REPETIR` is optional.

## Iframe contract
The preferred message is:

```js
parent.postMessage({ type: 'apulab-telemetry', level: 5, event: 'repeat_added', payload: { repeat_n: 3 } }, location.origin)
```

The iframe must not send authoritative `participant_id`, `session_id`, `study_id`, condition or build. The parent validates `origin` and `source`, strips identity-like fields and creates the event envelope.
