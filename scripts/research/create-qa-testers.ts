import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { codeHmac, credentialHash, participantId, sqlLiteral, temporaryCredential } from './crypto.ts';

const pepper = process.env.APULAB_AUTH_PEPPER ?? '';
if (!pepper) throw new Error('APULAB_AUTH_PEPPER_required');
const outDir = resolve(process.cwd(), '.private');
await mkdir(outDir, { recursive:true });

const generated = Array.from({length:10}, (_,index) => {
  const code = `QT-${String(index+1).padStart(3,'0')}`;
  const credential = temporaryCredential();
  return { code, credential, id:participantId(), codeHash:codeHmac(code, pepper), credentialHash:credentialHash(credential) };
});

const sql: string[] = [
  'BEGIN;',
  '-- Fail before writing anything if any QT code already exists. Credential rotation must be explicit.',
  `DO $$ BEGIN IF EXISTS (SELECT 1 FROM apulab_participants WHERE participant_code_hash IN (${generated.map((x) => sqlLiteral(x.codeHash)).join(',')})) THEN RAISE EXCEPTION 'QT participant already exists; use an explicit credential-rotation procedure'; END IF; END $$;`,
];
for (const item of generated) {
  sql.push(`INSERT INTO apulab_participants(participant_id,participant_code_hash,credential_hash,is_active) VALUES (${sqlLiteral(item.id)}::uuid,${sqlLiteral(item.codeHash)},${sqlLiteral(item.credentialHash)},true);`);
  sql.push(`INSERT INTO apulab_study_assignments(study_id,participant_id,study_condition,assignment_method,is_active) VALUES ('APULAB-QA-2026',${sqlLiteral(item.id)}::uuid,'game','qa',true);`);
}
sql.push('COMMIT;');

const access = ['study_code,temporary_credential', ...generated.map((x) => `${x.code},${x.credential}`)];
await writeFile(resolve(outDir, 'qa-access.csv'), access.join('\n') + '\n', { encoding:'utf8', mode:0o600 });
await writeFile(resolve(outDir, 'qa-seed.sql'), sql.join('\n') + '\n', { encoding:'utf8', mode:0o600 });
console.info('[research] Prepared QT-001 → QT-010 files in .private/. Seed SQL fails if a QT identity already exists.');
