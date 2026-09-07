import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { codeHmac, credentialHash, participantId, sqlLiteral, temporaryCredential } from './crypto.ts';

const countArg = process.argv.find((x) => x.startsWith('--count='));
const count = countArg ? Number(countArg.split('=')[1]) : 50;
if (!Number.isInteger(count) || count < 1 || count > 50) throw new Error('count_must_be_1_to_50');
const pepper = process.env.APULAB_AUTH_PEPPER ?? '';
if (!pepper) throw new Error('APULAB_AUTH_PEPPER_required');

const outDir = resolve(process.cwd(), '.private');
await mkdir(outDir, { recursive:true });
const generated = Array.from({length:count}, (_,index) => {
  const code = `AP-${String(index+1).padStart(3,'0')}`;
  const credential = temporaryCredential();
  return { code, credential, id:participantId(), codeHash:codeHmac(code, pepper), credentialHash:credentialHash(credential) };
});

const sql: string[] = [
  'BEGIN;',
  '-- Identity creation only. Conditions remain intentionally unassigned.',
  '-- Fail before writes if any requested AP code already exists; never emit replacement credentials silently.',
  `DO $$ BEGIN IF EXISTS (SELECT 1 FROM apulab_participants WHERE participant_code_hash IN (${generated.map((x) => sqlLiteral(x.codeHash)).join(',')})) THEN RAISE EXCEPTION 'AP participant already exists; use an explicit credential-rotation procedure'; END IF; END $$;`,
];
for (const item of generated) {
  sql.push(`INSERT INTO apulab_participants(participant_id,participant_code_hash,credential_hash,is_active) VALUES (${sqlLiteral(item.id)}::uuid,${sqlLiteral(item.codeHash)},${sqlLiteral(item.credentialHash)},true);`);
  sql.push(`-- ${item.code}: assignment to APULAB-STUDY-2026 must be added only after the approved protocol defines its condition.`);
}
sql.push('COMMIT;');

const access = ['study_code,temporary_credential', ...generated.map((x) => `${x.code},${x.credential}`)];
await writeFile(resolve(outDir, 'study-access.csv'), access.join('\n') + '\n', { encoding:'utf8', mode:0o600 });
await writeFile(resolve(outDir, 'study-participants.sql'), sql.join('\n') + '\n', { encoding:'utf8', mode:0o600 });
console.info(`[research] Prepared AP-001 → AP-${String(count).padStart(3,'0')} locally with NO assignments. Do not execute before the research gate authorizes participant creation.`);
