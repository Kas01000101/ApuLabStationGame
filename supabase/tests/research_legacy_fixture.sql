\set ON_ERROR_STOP on
INSERT INTO apulab_participants(participant_id,participant_code_hash,credential_hash,is_active)
VALUES ('00000000-0000-4000-8000-000000000801','ccccccccccccccccccccccccccccccccccccccccccc','ddddddddddddddddddddddddddddddddddddddddddd',true);
INSERT INTO apulab_sessions(session_id,participant_id,participant_code,session_mode,build_version,schema_version,started_at,status,screen_width,screen_height,user_agent)
VALUES ('00000000-0000-4000-8000-000000000802',NULL,NULL,'demo','LEGACY-BUILD','legacy-schema',now(),'in_progress',1024,768,'web');
INSERT INTO apulab_events(event_id,session_id,participant_id,participant_code,session_mode,build_version,schema_version,scene_id,event_type,payload,client_timestamp,sync_status)
VALUES ('00000000-0000-4000-8000-000000000803','00000000-0000-4000-8000-000000000802',NULL,NULL,'demo','LEGACY-BUILD','legacy-schema','mission01','level_started','{}',now(),'synced');
