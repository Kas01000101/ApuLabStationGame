import { readFile, writeFile } from 'node:fs/promises';
import { codeHmac, normalizeStudyCode } from './crypto.ts';

const pepper=process.env.APULAB_AUTH_PEPPER??'';if(!pepper)throw new Error('APULAB_AUTH_PEPPER_required');
const args=Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith('--')).map(x=>{const [k,...v]=x.slice(2).split('=');return[k,v.join('=')]}));
if(!args.telemetry)throw new Error('use --telemetry=telemetry.csv and optional --pre --post --meega');
const telemetry=parseCsv(await readFile(args.telemetry,'utf8'));
const external:Record<string,Record<string,unknown>>={};
for(const key of ['pre','post','meega'] as const){if(!args[key])continue;for(const row of parseCsv(await readFile(args[key],'utf8'))){const raw=String(row.study_code??row.participant_code??row.code??'');if(!raw)continue;const code=normalizeStudyCode(raw);const hash=codeHmac(code,pepper);external[hash]={...(external[hash]??{}),...[key,row]};}}
// This script never writes raw operational codes to the output. An administrative mapping export
// must provide participant_code_hash alongside participant_id before linkage.
const joined=telemetry.map(row=>{const hash=String(row.participant_code_hash??'');const ext=external[hash]??{};const {participant_code_hash:_hash,participant_code:_code,study_code:_studyCode,credential:_credential,...safe}=row;return{...safe,...ext}});
await writeFile('analysis_dataset.json',JSON.stringify(joined,null,2)+'\n','utf8');console.info(`[research] Linked ${joined.length} telemetry rows. Raw study codes were not written to output.`);
function parseCsv(text:string){const [head,...lines]=text.trim().split(/\r?\n/);if(!head)return[];const headers=head.split(',').map(x=>x.trim());return lines.filter(Boolean).map(line=>{const cells=line.split(',');return Object.fromEntries(headers.map((h,i)=>[h,cells[i]??'']))})}
