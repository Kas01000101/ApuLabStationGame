\set ON_ERROR_STOP on
INSERT INTO apulab_participants(participant_id,participant_code_hash,credential_hash,is_active)
VALUES ('00000000-0000-4000-8000-000000001001','1111111111111111111111111111111111111111111','2222222222222222222222222222222222222222222',true)
ON CONFLICT (participant_id) DO NOTHING;

INSERT INTO apulab_study_assignments(study_id,participant_id,study_condition,assignment_method,is_active)
VALUES ('APULAB-STUDY-2026','00000000-0000-4000-8000-000000001001','game','manual_protocol',true)
ON CONFLICT (study_id,participant_id) DO NOTHING;

INSERT INTO apulab_sessions(
  session_id,participant_id,participant_code,study_id,study_condition,session_mode,environment,
  build_version,git_commit_sha,schema_version,protocol_version,started_at,status,event_seq_last,
  sync_token_hash,screen_width,screen_height,user_agent
)
VALUES (
  '00000000-0000-4000-8000-000000001002','00000000-0000-4000-8000-000000001001',NULL,
  'APULAB-STUDY-2026','game','study','study','APULAB-STUDY-RC.1','TEST-SHA',
  'apulab-telemetry-v2','apulab-protocol-2026-v1',now(),'in_progress',0,
  'nVXX3UnLnNDXIwmsMQ2iaWUSgHUZIdcv8lDpDMU5KbA',1280,720,'web'
)
ON CONFLICT (session_id) DO NOTHING;
