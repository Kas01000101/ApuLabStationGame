import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { codeHmac, credentialHash, participantId, sqlLiteral, temporaryCredential } from './crypto.ts';

const countArg=process.argv.find((x)=>x.startsWith('--count='));
const count=countArg?Number(countArg.split('=')[1]):50;
if(!Number.isInteger(count)||count<1||count>50)throw new Error('count_must_be_1_to_50');
const pepper=process.env.APULAB_AUTH_PEPPER??'';
if(!pepper)throw new Error('APULAB_AUTH_PEPPER_required');
const outDir=resolve(process.cwd(),'.private');await mkdir(outDir,{recursive:true});
const access=['study_code,temporary_credential'];const sql=['BEGIN;'];
for(let i=1;i<=count;i+=1){const code=`AP-${String(i).padStart(3,'0')}`,credential=temporaryCredential(),id=participantId();access.push(`${code},${credential}`);sql.push(`INSERT INTO apulab_participants(participant_id,participant_code_hash,credential_hash,is_active) VALUES (${sqlLiteral(id)}::uuid,${sqlLiteral(codeHmac(code,pepper))},${sqlLiteral(credentialHash(credential))},true) ON CONFLICT (participant_code_hash) DO NOTHING;`);sql.push(`-- Assignment intentionally omitted for ${code}. Add APULAB-STUDY-2026 condition later according to the approved protocol.`)}
sql.push('COMMIT;');await writeFile(resolve(outDir,'study-access.csv'),`${access.join('\n')}\n`,'utf8');await writeFile(resolve(outDir,'study-participants.sql'),`${sql.join('\n')}\n`,'utf8');console.info(`[research] Generated AP-001 → AP-${String(count).padStart(3,'0')} locally with NO condition assignments.`);
