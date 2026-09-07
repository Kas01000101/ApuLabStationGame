import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { codeHmac, credentialHash, participantId, sqlLiteral, temporaryCredential } from './crypto.ts';

const pepper = process.env.APULAB_AUTH_PEPPER ?? '';
if (!pepper) throw new Error('APULAB_AUTH_PEPPER_required');

function parseRange(argv: string[]) {
  const readInt = (flag: string) => {
    const index = argv.indexOf(flag);
    if (index < 0) return undefined;
    const raw = argv[index + 1];
    if (!raw) throw new Error(`${flag}_value_required`);
    const value = Number.parseInt(raw, 10);
    if (!Number.isInteger(value)) throw new Error(`${flag}_must_be_integer`);
    return value;
  };

  const from = readInt('--from') ?? 1;
  const to = readInt('--to') ?? 10;

  if (from < 1 || from > 10) throw new Error('--from_must_be_between_1_and_10');
  if (to < 1 || to > 10) throw new Error('--to_must_be_between_1_and_10');
  if (from > to) throw new Error('--from_must_be_less_than_or_equal_to_--to');

  return { from, to };
}

const { from, to } = parseRange(process.argv.slice(2));
const outDir = resolve(process.cwd(), '.private');
await mkdir(outDir, { recursive:true });

const generated = Array.from({length:to-from+1}, (_,index) => {
  const ordinal = from + index;
  const code = `QT-${String(ordinal).padStart(3,'0')}`;
  const credential = temporaryCredential();
  return { code, credential, id:participantId(), codeHash:codeHmac(code, pepper), credentialHash:credentialHash(credential) };
});

const sql: string[] = [
  'BEGIN;',
  '-- Fail before writing anything if any requested QT code already exists. Credential rotation must be explicit.',
  `DO $$ BEGIN IF EXISTS (SELECT 1 FROM apulab_participants WHERE participant_code_hash IN (${generated.map((x) => sqlLiteral(x.codeHash)).join(',')})) THEN RAISE EXCEPTION 'QT participant already exists; use an explicit credential-rotation procedure'; END IF; END $$;`,
];
for (const item of generated) {
  sql.push(`INSERT INTO apulab_participants(participant_id,participant_code_hash,credential_hash,is_active) VALUES (${sqlLiteral(item.id)}::uuid,${sqlLiteral(item.codeHash)},${sqlLiteral(item.credentialHash)},true);`);
  sql.push(`INSERT INTO apulab_study_assignments(study_id,participant_id,study_condition,assignment_method,is_active) VALUES ('APULAB-QA-2026',${sqlLiteral(item.id)}::uuid,'game','qa',true);`);
}
sql.push('COMMIT;');

const suffix = from === 1 && to === 10
  ? ''
  : `-QT-${String(from).padStart(3,'0')}-to-QT-${String(to).padStart(3,'0')}`;
const access = ['study_code,temporary_credential', ...generated.map((x) => `${x.code},${x.credential}`)];
await writeFile(resolve(outDir, `qa-access${suffix}.csv`), access.join('\n') + '\n', { encoding:'utf8', mode:0o600 });
await writeFile(resolve(outDir, `qa-seed${suffix}.sql`), sql.join('\n') + '\n', { encoding:'utf8', mode:0o600 });
console.info(`[research] Prepared QT-${String(from).padStart(3,'0')} → QT-${String(to).padStart(3,'0')} files in .private/. Seed SQL fails if a requested QT identity already exists.`);
