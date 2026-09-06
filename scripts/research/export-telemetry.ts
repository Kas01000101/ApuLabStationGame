import { writeFile } from 'node:fs/promises';

const studyArg=process.argv.find(x=>x.startsWith('--study='));
const study=studyArg?.split('=')[1]??'';
if(!['APULAB-STUDY-2026','APULAB-QA-2026'].includes(study))throw new Error('use --study=APULAB-STUDY-2026 or --study=APULAB-QA-2026');
const url=(process.env.SUPABASE_URL??'').replace(/\/$/,'');
const key=process.env.SUPABASE_SERVICE_ROLE_KEY??'';
if(!url||!key)throw new Error('SUPABASE_URL_and_SERVICE_ROLE_KEY_required_server_side');
const view=study==='APULAB-STUDY-2026'?'v_official_study_events':'v_qa_events';
const response=await fetch(`${url}/rest/v1/${view}?select=*`,{headers:{apikey:key,Authorization:`Bearer ${key}`,Accept:'application/json'}});
if(!response.ok)throw new Error(`export_failed_${response.status}`);
const rows=await response.json() as Record<string,unknown>[];
const forbidden=new Set(['credential_hash','participant_code_hash','participant_code','study_code','credential','password']);
const cleaned=rows.map(row=>Object.fromEntries(Object.entries(row).filter(([k])=>!forbidden.has(k))));
const headers=[...new Set(cleaned.flatMap(Object.keys))];
const csv=[headers.join(','),...cleaned.map(row=>headers.map(h=>csvCell(row[h])).join(','))].join('\n')+'\n';
const filename=study==='APULAB-STUDY-2026'?'telemetry-official.csv':'telemetry-qa.csv';
await writeFile(filename,csv,'utf8');console.info(`[research] Exported ${cleaned.length} pseudonymous rows to ${filename}`);
function csvCell(value:unknown){const text=value==null?'':typeof value==='object'?JSON.stringify(value):String(value);return /[",\n]/.test(text)?`"${text.replaceAll('"','""')}"`:text}
