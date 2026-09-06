import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MAX_BATCH_SIZE = 20;
const MAX_PAYLOAD_BYTES = 8192;
const MAX_REQUEST_BYTES = 128 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENT_PATTERN = /^[a-z0-9_]{3,64}$/;
const OFFICIAL_EVENTS = new Set([
  'session_started','session_completed','level_started','level_completed','program_started','program_modified','explore_opened','bitacora_opened','help_requested','task_started','task_response_submitted','task_response_changed','task_completed','premature_action','sync_failed',
  'battery_power_changed','multimeter_power_changed','multimeter_mode_changed','probe_drag_start','probe_snap','measurement_attempt','polarity_state','valid_measurement',
  'battery_viewed','battery_measured','all_batteries_measured','battery_selected','battery_selection_changed',
  'command_added','command_removed','command_moved','command_executed','goal_reached','collision_detected','program_modified_after_failure',
  'initial_program_completed','pattern_highlighted','repeat_unlocked','repeat_added','repeat_removed','repeat_count_changed','block_moved_into_repeat','block_removed_from_repeat','program_refactored',
  'science_zone_reached','scan_started','scan_completed','analyze_started','analyze_completed','communication_point_reached','data_sent',
  'sample_reached','sample_analyze_requested','instrument_modal_opened','instrument_selected','sample_analyzed','instrument_changed','relevant_instrument_selected',
]);
const FORBIDDEN = new Set(['name','first_name','last_name','email','phone','address','dni','document_id','birth_date','school','parent_name','credential','password','participant_code','study_code','credential_hash','audio','video','image','screenshot','html','__proto__','prototype','constructor']);

class PublicError extends Error { constructor(readonly code:string, readonly status=400){ super(code); } }
const enc = new TextEncoder();
const dec = new TextDecoder();

function admin(){
  const url=Deno.env.get('SUPABASE_URL'), key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!key) throw new Error('supabase_server_configuration_missing');
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
function origins(){return (Deno.env.get('APULAB_ALLOWED_ORIGINS')??'').split(',').map(x=>x.trim()).filter(Boolean)}
function originAllowed(origin:string|null){return !origin || origins().includes(origin)}
function cors(origin:string|null):HeadersInit{const h:Record<string,string>={'Access-Control-Allow-Headers':'content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Max-Age':'600','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};if(origin&&originAllowed(origin))h['Access-Control-Allow-Origin']=origin;return h}
function json(body:unknown,status:number,origin:string|null){return new Response(JSON.stringify(body),{status,headers:{...cors(origin),'Content-Type':'application/json; charset=utf-8'}})}
function bytes(v:unknown){return enc.encode(JSON.stringify(v??{})).length}
async function body(req:Request){if(!(req.headers.get('content-type')??'').toLowerCase().startsWith('application/json'))throw new PublicError('content_type_invalid',415);const t=await req.text();if(enc.encode(t).length>MAX_REQUEST_BYTES)throw new PublicError('request_too_large',413);let p;try{p=JSON.parse(t)}catch{throw new PublicError('json_invalid')}if(!p||typeof p!=='object'||Array.isArray(p))throw new PublicError('body_invalid');return p as Record<string,unknown>}
function str(v:unknown,f:string,max=128){if(typeof v!=='string'||!v.trim()||v.trim().length>max)throw new PublicError(`${f}_invalid`);return v.trim()}
function integer(v:unknown,f:string,min:number,max=Number.MAX_SAFE_INTEGER){if(!Number.isInteger(v)||Number(v)<min||Number(v)>max)throw new PublicError(`${f}_invalid`);return Number(v)}
function iso(v:unknown,f:string){const s=str(v,f,64),n=Date.parse(s);if(!Number.isFinite(n))throw new PublicError(`${f}_invalid`);return new Date(n).toISOString()}
function safePayload(v:unknown){if(v==null)return{};if(typeof v!=='object'||Array.isArray(v))throw new PublicError('payload_invalid');if(bytes(v)>MAX_PAYLOAD_BYTES)throw new PublicError('payload_too_large',413);const stack:unknown[]=[v];while(stack.length){const cur=stack.pop();if(Array.isArray(cur)){stack.push(...cur);continue}if(!cur||typeof cur!=='object')continue;for(const[k,val]of Object.entries(cur as Record<string,unknown>)){if(FORBIDDEN.has(k.toLowerCase()))throw new PublicError('payload_forbidden_field');if(val&&typeof val==='object')stack.push(val)}}return v as Record<string,unknown>}
function normalizeCode(v:unknown){const code=str(v,'study_code',16).toUpperCase();const m=code.match(/^(QT|AP)-(\d{3})$/);if(!m)throw new PublicError('study_code_invalid');const n=Number(m[2]);if((m[1]==='QT'&&(n<1||n>10))||(m[1]==='AP'&&(n<1||n>50)))throw new PublicError('study_code_invalid');return code}
function b64url(data:Uint8Array){return btoa(String.fromCharCode(...data)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function unb64url(s:string){const p=s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4);return Uint8Array.from(atob(p),c=>c.charCodeAt(0))}
async function hmac(text:string,secret:string){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return b64url(new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(text))))}
async function codeHash(code:string){const pepper=Deno.env.get('APULAB_AUTH_PEPPER');if(!pepper)throw new Error('auth_pepper_missing');return hmac(code,pepper)}
async function verifyCredential(credential:string,stored:string){const parts=stored.split('$');if(parts.length!==4||parts[0]!=='pbkdf2_sha256')return false;const iterations=Number(parts[1]);if(!Number.isInteger(iterations)||iterations<100000)return false;const salt=unb64url(parts[2]),expected=unb64url(parts[3]);const material=await crypto.subtle.importKey('raw',enc.encode(credential),'PBKDF2',false,['deriveBits']);const actual=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations},material,expected.length*8));if(actual.length!==expected.length)return false;let diff=0;for(let i=0;i<actual.length;i++)diff|=actual[i]^expected[i];return diff===0}
type Proof={participant_id:string;study_id:string;study_condition:'game'|'static_control';exp:number};
async function issueProof(p:Omit<Proof,'exp'>){const secret=Deno.env.get('APULAB_SESSION_PROOF_SECRET');if(!secret)throw new Error('proof_secret_missing');const payload={...p,exp:Date.now()+4*60*60*1000};const raw=b64url(enc.encode(JSON.stringify(payload)));return `${raw}.${await hmac(raw,secret)}`}
async function readProof(token:unknown):Promise<Proof>{const t=str(token,'session_proof',4096),[raw,sig]=t.split('.');if(!raw||!sig)throw new PublicError('session_proof_invalid',403);const secret=Deno.env.get('APULAB_SESSION_PROOF_SECRET');if(!secret)throw new Error('proof_secret_missing');if(await hmac(raw,secret)!==sig)throw new PublicError('session_proof_invalid',403);let p:Proof;try{p=JSON.parse(dec.decode(unb64url(raw)))}catch{throw new PublicError('session_proof_invalid',403)}if(!p||p.exp<Date.now()||!UUID_PATTERN.test(p.participant_id)||!p.study_id||!['game','static_control'].includes(p.study_condition))throw new PublicError('session_proof_invalid',403);return p}

serve(async(req)=>{
  const origin=req.headers.get('origin');
  if(!originAllowed(origin))return json({error:'origin_not_allowed'},403,origin);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors(origin)});
  if(req.method!=='POST')return json({error:'method_not_allowed'},405,origin);
  try{
    const url=new URL(req.url),client=admin();
    if(url.pathname.endsWith('/authenticate')){
      const input=await body(req),code=normalizeCode(input.study_code),credential=str(input.credential,'credential',256),hash=await codeHash(code);
      const {data:participant,error:pe}=await client.from('apulab_participants').select('participant_id,credential_hash,is_active').eq('participant_code_hash',hash).maybeSingle();
      if(pe)throw new Error('participant_lookup_failed');
      if(!participant||!participant.is_active||!(await verifyCredential(credential,participant.credential_hash)))throw new PublicError('authentication_failed',401);
      const {data:assignment,error:ae}=await client.from('apulab_study_assignments').select('study_id,study_condition,is_active').eq('participant_id',participant.participant_id).eq('is_active',true).maybeSingle();
      if(ae)throw new Error('assignment_lookup_failed');
      if(!assignment)throw new PublicError('assignment_not_found',403);
      const proof=await issueProof({participant_id:participant.participant_id,study_id:assignment.study_id,study_condition:assignment.study_condition});
      return json({success:true,data:{participant_id:participant.participant_id,study_id:assignment.study_id,study_condition:assignment.study_condition,session_proof:proof}},200,origin);
    }
    if(url.pathname.endsWith('/session/complete')){
      const input=await body(req),sid=str(input.session_id,'session_id',128);if(!UUID_PATTERN.test(sid))throw new PublicError('session_id_invalid');
      const {data:s,error}=await client.from('apulab_sessions').select('session_id,session_mode,participant_id,study_id,study_condition').eq('session_id',sid).maybeSingle();if(error)throw new Error('session_lookup_failed');if(!s)throw new PublicError('session_not_found',404);
      if(s.session_mode==='study'){const p=await readProof(input.session_proof);if(p.participant_id!==s.participant_id||p.study_id!==s.study_id||p.study_condition!==s.study_condition)throw new PublicError('session_proof_mismatch',403)}
      const {data:events,error:ee}=await client.from('apulab_events').select('event_type,level_number').eq('session_id',sid).in('event_type',['data_sent','level_completed']);if(ee)throw new Error('completion_lookup_failed');
      const hasN7Complete=(events??[]).some((e:any)=>e.event_type==='level_completed'&&e.level_number===7),hasData=(events??[]).some((e:any)=>e.event_type==='data_sent'&&e.level_number===7);if(!hasN7Complete||!hasData)throw new PublicError('session_not_complete',409);
      const {error:ue}=await client.from('apulab_sessions').update({status:'completed',completed_at:new Date().toISOString(),last_level:7}).eq('session_id',sid);if(ue)throw new Error('session_complete_failed');return json({success:true},200,origin);
    }
    if(url.pathname.endsWith('/session')){
      const input=await body(req),raw=(input.session&&typeof input.session==='object'&&!Array.isArray(input.session)?input.session:input) as Record<string,unknown>;
      const mode=str(raw.session_mode,'session_mode',16);if(mode!=='demo'&&mode!=='study')throw new PublicError('session_mode_invalid');const sid=str(raw.session_id,'session_id',128);if(!UUID_PATTERN.test(sid))throw new PublicError('session_id_invalid');
      let identity={participant_id:null as string|null,study_id:null as string|null,study_condition:null as string|null};
      if(mode==='study'){const p=await readProof(input.session_proof);identity={participant_id:p.participant_id,study_id:p.study_id,study_condition:p.study_condition}}
      const row={session_id:sid,...identity,participant_code:null,session_mode:mode,environment:str(raw.environment,'environment',16),build_version:str(raw.build_version,'build_version',64),schema_version:str(raw.schema_version,'schema_version',64),protocol_version:str(raw.protocol_version,'protocol_version',64),started_at:iso(raw.started_at,'started_at'),status:'in_progress',last_level:null,last_checkpoint:null,event_seq_last:0,screen_width:integer(raw.screen_width,'screen_width',200,10000),screen_height:integer(raw.screen_height,'screen_height',200,10000),input_mode:null,user_agent:'web'};
      if(!['development','preview','study'].includes(row.environment))throw new PublicError('environment_invalid');const {error}=await client.from('apulab_sessions').upsert(row,{onConflict:'session_id'});if(error)throw new Error('session_upsert_failed');return json({success:true},200,origin);
    }
    if(url.pathname.endsWith('/events')){
      const input=await body(req);if(!Array.isArray(input.events)||input.events.length<1||input.events.length>MAX_BATCH_SIZE)throw new PublicError('events_batch_invalid');const rawEvents=input.events as Record<string,unknown>[];
      const sessionIds=[...new Set(rawEvents.map(e=>str(e.session_id,'session_id',128)))];
      const {data:sessions,error:se}=await client.from('apulab_sessions').select('session_id,participant_id,study_id,study_condition,session_mode,environment,build_version,schema_version,protocol_version').in('session_id',sessionIds);if(se)throw new Error('session_lookup_failed');const map=new Map((sessions??[]).map((s:any)=>[s.session_id,s]));if(map.size!==sessionIds.length)throw new PublicError('session_not_found',404);
      let proof:Proof|null=null;if((sessions??[]).some((s:any)=>s.session_mode==='study'))proof=await readProof(input.session_proof);
      const received=new Date().toISOString();const rows=rawEvents.map(e=>{const sid=str(e.session_id,'session_id',128),s:any=map.get(sid);if(!s)throw new PublicError('session_not_found',404);if(s.session_mode==='study'&&(!proof||proof.participant_id!==s.participant_id||proof.study_id!==s.study_id||proof.study_condition!==s.study_condition))throw new PublicError('session_proof_mismatch',403);const eventType=str(e.event_type,'event_type',64);if(!EVENT_PATTERN.test(eventType)||!OFFICIAL_EVENTS.has(eventType))throw new PublicError('event_type_not_allowed');const eventId=str(e.event_id,'event_id',64);if(!UUID_PATTERN.test(eventId))throw new PublicError('event_id_invalid');const level=e.level_number==null?null:integer(e.level_number,'level_number',1,7),attempt=e.attempt_number==null?null:integer(e.attempt_number,'attempt_number',1),elapsed=e.elapsed_ms==null?null:integer(e.elapsed_ms,'elapsed_ms',0);return{event_id:eventId,session_id:sid,participant_id:s.participant_id,participant_code:null,study_id:s.study_id,study_condition:s.study_condition,session_mode:s.session_mode,environment:s.environment,build_version:s.build_version,schema_version:s.schema_version,protocol_version:s.protocol_version,scene_id:str(e.scene_id,'scene_id',64),level_number:level,task_id:e.task_id==null?null:str(e.task_id,'task_id',64),event_type:eventType,event_seq:integer(e.event_seq,'event_seq',1),attempt_number:attempt,elapsed_ms:elapsed,payload:safePayload(e.payload),result:e.result==null?null:str(e.result,'result',32),error_code:e.error_code==null?null:str(e.error_code,'error_code',64),hint_used:e.hint_used===true,client_timestamp:iso(e.timestamp,'timestamp'),received_at:received,sync_status:'synced'}});
      const {error}=await client.from('apulab_events').upsert(rows,{onConflict:'event_id'});if(error)throw new Error('event_upsert_failed');for(const sid of sessionIds){const max=Math.max(...rows.filter(r=>r.session_id===sid).map(r=>r.event_seq));await client.from('apulab_sessions').update({event_seq_last:max}).eq('session_id',sid).lt('event_seq_last',max)}return json({success:true,accepted:rows.length},200,origin);
    }
    return json({error:'endpoint_not_found'},404,origin);
  }catch(error){if(error instanceof PublicError)return json({success:false,error:error.code},error.status,origin);console.error('[ApuLab ingest]',error instanceof Error?error.message:'internal_error');return json({success:false,error:'internal_error'},500,origin)}
});
