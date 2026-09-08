import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { codeHmac, credentialHash, participantId, sqlLiteral, temporaryCredential } from './crypto.ts';

const codesArg = process.argv.find((value) => value.startsWith('--codes-file='));
if (!codesArg) throw new Error('use --codes-file=.private/station-game-codes.csv');
const codesFile = codesArg.slice('--codes-file='.length).trim();
if (!codesFile) throw new Error('codes_file_required');

const pepper = process.env.APULAB_AUTH_PEPPER ?? '';
if (!pepper) throw new Error('APULAB_AUTH_PEPPER_required');

const raw = (await readFile(resolve(process.cwd(), codesFile), 'utf8')).replace(/^\uFEFF/, '');
const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
if (lines[0] !== 'study_code') throw new Error('codes_file_header_must_be_study_code');
const codes = lines.slice(1);
if (codes.length === 0) throw new Error('codes_file_must_contain_at_least_one_AP_code');
if (new Set(codes).size !== codes.length) throw new Error('codes_file_contains_duplicates');

for (const code of codes) {
  const match = code.match(/^AP-(\d{3})$/);
  const ordinal = match ? Number(match[1]) : 0;
  if (!match || ordinal < 1 || ordinal > 50) throw new Error(`invalid_station_game_code:${code}`);
}

const outDir = resolve(process.cwd(), '.private');
await mkdir(outDir, { recursive:true });
const generated = codes.map((code) => {
  const credential = temporaryCredential();
  return { code, credential, id:participantId(), codeHash:codeHmac(code, pepper), credentialHash:credentialHash(credential) };
});

const sql: string[] = [
  'BEGIN;',
  '-- ApuLabStationGame official identities selected explicitly by the approved game-condition protocol.',
  '-- Fail before writes if any requested AP identity already exists; credential rotation is a separate explicit procedure.',
  `DO $$ BEGIN IF EXISTS (SELECT 1 FROM apulab_participants WHERE participant_code_hash IN (${generated.map((item) => sqlLiteral(item.codeHash)).join(',')})) THEN RAISE EXCEPTION 'AP participant already exists; use an explicit credential-rotation procedure'; END IF; END $$;`,
];
for (const item of generated) {
  sql.push(`INSERT INTO apulab_participants(participant_id,participant_code_hash,credential_hash,is_active) VALUES (${sqlLiteral(item.id)}::uuid,${sqlLiteral(item.codeHash)},${sqlLiteral(item.credentialHash)},true);`);
  sql.push(`INSERT INTO apulab_study_assignments(study_id,participant_id,study_condition,assignment_method,is_active) VALUES ('APULAB-STUDY-2026',${sqlLiteral(item.id)}::uuid,'game','manual_protocol',true);`);
}
sql.push('COMMIT;');

const access = ['study_code,temporary_credential', ...generated.map((item) => `${item.code},${item.credential}`)];
await writeFile(resolve(outDir, 'station-game-access.csv'), access.join('\n') + '\n', { encoding:'utf8', mode:0o600 });
await writeFile(resolve(outDir, 'station-game-seed.sql'), sql.join('\n') + '\n', { encoding:'utf8', mode:0o600 });
console.info(`[research] Prepared ${generated.length} explicitly selected ApuLab Station game participant(s) in .private/. No cohort-size split was assumed.`);
