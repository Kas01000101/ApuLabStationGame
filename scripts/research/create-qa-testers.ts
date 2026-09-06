import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { codeHmac, credentialHash, participantId, sqlLiteral, temporaryCredential } from './crypto.ts';

const pepper = process.env.APULAB_AUTH_PEPPER ?? '';
if (!pepper) throw new Error('APULAB_AUTH_PEPPER_required');
const outDir = resolve(process.cwd(), '.private');
await mkdir(outDir, { recursive: true });

const access: string[] = ['study_code,temporary_credential'];
const sql: string[] = ['BEGIN;'];
for (let i=1;i<=10;i+=1) {
  const code=`QT-${String(i).padStart(3,'0')}`, credential=temporaryCredential(), id=participantId();
  access.push(`${code},${credential}`);
  sql.push(`INSERT INTO apulab_participants(participant_id,participant_code_hash,credential_hash,is_active) VALUES (${sqlLiteral(id)}::uuid,${sqlLiteral(codeHmac(code,pepper))},${sqlLiteral(credentialHash(credential))},true) ON CONFLICT (participant_code_hash) DO NOTHING;`);
  sql.push(`INSERT INTO apulab_study_assignments(study_id,participant_id,study_condition,assignment_method,is_active) VALUES ('APULAB-QA-2026',${sqlLiteral(id)}::uuid,'game','qa',true) ON CONFLICT (study_id,participant_id) DO NOTHING;`);
}
sql.push('COMMIT;');
await writeFile(resolve(outDir,'qa-access.csv'),`${access.join('\n')}\n`,'utf8');
await writeFile(resolve(outDir,'qa-seed.sql'),`${sql.join('\n')}\n`,'utf8');
console.info('[research] Generated QT-001 → QT-010 locally in .private/. Nothing was uploaded or deployed.');
