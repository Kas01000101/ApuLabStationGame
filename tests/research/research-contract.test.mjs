import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=(p)=>readFile(new URL(`../../${p}`,import.meta.url),'utf8');

test('central research config separates QA and official study',async()=>{const s=await read('src/config/researchConfig.ts');assert.match(s,/APULAB-QA-2026/);assert.match(s,/APULAB-STUDY-2026/);assert.match(s,/apulab-telemetry-v2/);assert.match(s,/apulab-protocol-2026-v1/)});
test('event registry covers N1 through N7 and final N7 contract',async()=>{const s=await read('src/research/telemetry/events.ts');for(const token of ['battery_power_changed','battery_measured','command_executed','collision_detected','repeat_unlocked','scan_completed','sample_reached','communication_point_reached','data_sent'])assert.match(s,new RegExp(token));assert.match(s,/final_point_reached: 'communication_point_reached'/)});
test('PII guard blocks raw codes and child-identifying fields',async()=>{const s=await read('src/research/telemetry/payloads.ts');for(const token of ['participant_code','study_code','parent_name','birth_date','school','screenshot','html'])assert.match(s,new RegExp(token))});
test('database migration filters official paper events by study and environment',async()=>{const s=await read('supabase/migrations/20260906170000_research_schema_v2.sql');assert.match(s,/study_id='APULAB-STUDY-2026' AND environment='study'/);assert.match(s,/APULAB-QA-2026/);assert.match(s,/event_seq/);assert.match(s,/ENABLE ROW LEVEL SECURITY/)});
test('edge auth uses HMAC pepper and server proof',async()=>{const s=await read('supabase/functions/ingest-telemetry/index.ts');assert.match(s,/APULAB_AUTH_PEPPER/);assert.match(s,/APULAB_SESSION_PROOF_SECRET/);assert.match(s,/pbkdf2_sha256/);assert.match(s,/session_proof_mismatch/);assert.doesNotMatch(s,/participant_auth_not_configured/)});
test('external questionnaires are documented as external and not runtime screens',async()=>{const s=await read('docs/research/supabase-migration.md');assert.match(s,/PRE, POST and MEEGA\+KIDS remain external forms/)});
test('environment file contains no committed values for server secrets',async()=>{const s=await read('.env.example');for(const key of ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','APULAB_AUTH_PEPPER','APULAB_SESSION_PROOF_SECRET'])assert.match(s,new RegExp(`^${key}=$`,'m'))});
