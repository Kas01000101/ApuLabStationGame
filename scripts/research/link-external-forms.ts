import { mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { codeHmac, normalizeStudyCode } from './crypto.ts';

type CsvRow = Record<string,string>;
type CsvDocument = { headers: string[]; rows: CsvRow[] };
type ExternalBundle = { pre?: Record<string,string>; post?: Record<string,string>; meega?: Record<string,string> };

const pepper = process.env.APULAB_AUTH_PEPPER ?? '';
if (!pepper) throw new Error('APULAB_AUTH_PEPPER_required');
const args = Object.fromEntries(process.argv.slice(2).filter((x) => x.startsWith('--')).map((x) => {
  const [key,...rest] = x.slice(2).split('=');
  return [key, rest.join('=')];
}));
if (!args.telemetry || !args.mapping) {
  throw new Error('use --telemetry=.private/telemetry-official.csv --mapping=.private/participant-map.csv and optional --pre --post --meega --meega-columns=...');
}

const PRIVATE_DIR = resolve(process.cwd(), '.private');
await mkdir(PRIVATE_DIR, { recursive: true });
const telemetry = parseCsv(args.telemetry).rows;
const mapping = parseCsv(args.mapping).rows;
const participantByHash = new Map<string,string>();
for (const row of mapping) {
  const participantId = String(row.participant_id ?? '').trim();
  const hash = String(row.participant_code_hash ?? '').trim();
  if (!participantId || !hash) throw new Error('mapping_requires_participant_id_and_participant_code_hash');
  participantByHash.set(hash, participantId);
}

const PRE_POST_ALLOWED = new Set(['study_code', ...Array.from({length:15}, (_,i) => `Q${i+9}`)]);
const meegaAllowed = new Set(['study_code', ...String(args['meega-columns'] ?? '').split(',').map((x) => x.trim()).filter(Boolean)]);
if (args.meega && meegaAllowed.size === 1) throw new Error('meega_requires_explicit_--meega-columns_whitelist');

const externalByParticipant = new Map<string,ExternalBundle>();
for (const [kind,path,allowlist] of [
  ['pre',args.pre,PRE_POST_ALLOWED],
  ['post',args.post,PRE_POST_ALLOWED],
  ['meega',args.meega,meegaAllowed],
] as const) {
  if (!path) continue;
  for (const row of parseCsv(path).rows) {
    const rawCode = String(row.study_code ?? '').trim();
    if (!rawCode) throw new Error(`${kind}_row_missing_study_code`);
    const hash = codeHmac(normalizeStudyCode(rawCode), pepper);
    const participantId = participantByHash.get(hash);
    if (!participantId) throw new Error(`${kind}_code_not_present_in_admin_mapping`);
    const sanitized = whitelistRow(row, allowlist);
    delete sanitized.study_code;
    const current = externalByParticipant.get(participantId) ?? {};
    current[kind] = sanitized;
    externalByParticipant.set(participantId, current);
  }
}

const joined = telemetry.map((row) => {
  const participantId = String(row.participant_id ?? '').trim();
  if (!participantId) throw new Error('telemetry_row_missing_participant_id');
  const {
    participant_code_hash: _hash,
    participant_code: _code,
    study_code: _studyCode,
    credential: _credential,
    credential_hash: _credentialHash,
    name: _name,
    email: _email,
    school: _school,
    phone: _phone,
    dni: _dni,
    ...safeParticipant
  } = row;
  return { ...safeParticipant, ...(externalByParticipant.get(participantId) ?? {}) };
});

const output = resolve(PRIVATE_DIR, 'analysis_dataset.json');
await writeFile(output, JSON.stringify(joined, null, 2) + '\n', 'utf8');
console.info(`[research] Linked ${joined.length} pseudonymous telemetry rows into .private/analysis_dataset.json`);

function whitelistRow(row: CsvRow, allowed: Set<string>): Record<string,string> {
  const out: Record<string,string> = {};
  for (const [key,value] of Object.entries(row)) if (allowed.has(key)) out[key] = value;
  return out;
}

function parseCsv(path: string): CsvDocument {
  const python = process.env.PYTHON ?? 'python3';
  const script = resolve(process.cwd(), 'scripts/research/csv-bridge.py');
  const child = spawnSync(python, [script, path], { encoding:'utf8', maxBuffer:16*1024*1024 });
  if (child.error) throw child.error;
  if (child.status !== 0) throw new Error(`csv_parse_failed:${path}:${child.stderr.trim()}`);
  let parsed: unknown;
  try { parsed = JSON.parse(child.stdout); } catch { throw new Error(`csv_parser_invalid_json:${path}`); }
  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as CsvDocument).rows)) throw new Error(`csv_parser_invalid_result:${path}`);
  return parsed as CsvDocument;
}
