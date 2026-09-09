\set ON_ERROR_STOP on
INSERT INTO apulab_events(
  event_id,session_id,participant_id,participant_code,study_id,study_condition,session_mode,environment,
  build_version,git_commit_sha,schema_version,protocol_version,scene_id,level_number,event_type,event_seq,
  payload,client_timestamp,received_at,sync_status
)
VALUES
(
  '00000000-0000-4000-8000-000000001003','00000000-0000-4000-8000-000000001002',
  '00000000-0000-4000-8000-000000001001',NULL,'APULAB-STUDY-2026','game','study','study',
  'APULAB-STUDY-RC.1','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1',
  'mission01',7,'level_completed',1,'{}',now(),now(),'synced'
),
(
  '00000000-0000-4000-8000-000000001004','00000000-0000-4000-8000-000000001002',
  '00000000-0000-4000-8000-000000001001',NULL,'APULAB-STUDY-2026','game','study','study',
  'APULAB-STUDY-RC.1','TEST-SHA','apulab-telemetry-v2','apulab-protocol-2026-v1',
  'mission01',NULL,'session_completed',2,'{}',now(),now(),'synced'
)
ON CONFLICT (event_id) DO NOTHING;

UPDATE apulab_sessions
SET event_seq_last=2
WHERE session_id='00000000-0000-4000-8000-000000001002';
