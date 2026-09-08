export const COMMON_EVENTS = [
  'session_started',
  'session_completed',
  'level_started',
  'level_completed',
  'program_started',
  'program_modified',
  'explore_opened',
  'bitacora_opened',
  'help_requested',
  'task_started',
  'task_response_submitted',
  'task_response_changed',
  'task_completed',
  'premature_action',
  'sync_failed',
  'storage_pressure',
] as const;

export const LEVEL_EVENTS = {
  1: [
    'battery_power_changed',
    'multimeter_power_changed',
    'multimeter_mode_changed',
    'probe_drag_start',
    'probe_snap',
    'measurement_attempt',
    'polarity_state',
    'valid_measurement',
  ],
  2: [
    'battery_viewed',
    'battery_measured',
    'all_batteries_measured',
    'battery_selected',
    'battery_selection_changed',
  ],
  3: [
    'command_added',
    'command_removed',
    'command_moved',
    'command_executed',
    'goal_reached',
  ],
  4: [
    'command_added',
    'command_removed',
    'command_moved',
    'command_executed',
    'collision_detected',
    'program_modified_after_failure',
    'goal_reached',
  ],
  5: [
    'initial_program_completed',
    'pattern_highlighted',
    'repeat_unlocked',
    'repeat_added',
    'repeat_removed',
    'repeat_count_changed',
    'block_moved_into_repeat',
    'block_removed_from_repeat',
    'program_refactored',
    'goal_reached',
  ],
  6: [
    'science_zone_reached',
    'scan_started',
    'scan_completed',
    'analyze_started',
    'analyze_completed',
    'communication_point_reached',
    'data_sent',
  ],
  7: [
    'sample_reached',
    'sample_analyze_requested',
    'instrument_modal_opened',
    'instrument_selected',
    'sample_analyzed',
    'instrument_changed',
    'relevant_instrument_selected',
    'communication_point_reached',
    'data_sent',
  ],
} as const;

export type CommonEventType = typeof COMMON_EVENTS[number];
export type LevelNumber = keyof typeof LEVEL_EVENTS;
export type LevelSpecificEventType = typeof LEVEL_EVENTS[LevelNumber][number];
export type ResearchEventType = CommonEventType | LevelSpecificEventType;

export const OFFICIAL_EVENT_TYPES = new Set<string>([
  ...COMMON_EVENTS,
  ...Object.values(LEVEL_EVENTS).flat(),
]);

/** Runtime-only aliases. Legacy names are never exported as official v2 names. */
export const COMPATIBILITY_EVENT_ALIASES: Readonly<Record<string, ResearchEventType | null>> = {
  mission_completed: 'level_completed',
  level4_completed: 'level_completed',
  sample_checkpoint_reached: 'sample_reached',
  final_checkpoint_reached: 'communication_point_reached',
  final_point_reached: 'communication_point_reached',
  hint_requested: 'help_requested',
  challenge_completed: 'task_completed',
  challenge_failed: 'premature_action',
  block_added: 'command_added',
  block_removed: 'command_removed',
  block_reordered: 'command_moved',
  science_action: null,
  instrument_change_requested: null,
  feedback_shown: null,
  program_restarted: null,
  program_cleared: 'program_modified',
  scenario_changed: null,
};
