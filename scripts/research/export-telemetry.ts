import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).filter((x) => x.startsWith('--')).map((x) => {
  const [key,...rest] = x.slice(2).split('=');
  return [key, rest.join('=')];
}));
const study = args.study ?? '';
if (!['APULAB-STUDY-2026','APULAB-QA-2026'].includes(study)) throw new Error('use --study=APULAB-STUDY-2026 or --study=APULAB-QA-2026');
const pageSize = args['page-size'] ? Number(args['page-size']) : 500;
if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 5000) throw new Error('page-size_must_be_1_to_5000');
const url = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
if (!url || !key) throw new Error('SUPABASE_URL_and_SERVICE_ROLE_KEY_required_server_side');

const view = study === 'APULAB-STUDY-2026' ? 'v_official_study_events' : 'v_qa_events';
const endpoint = `${url}/rest/v1/${view}?select=*&order=received_at.asc,event_seq.asc`;
const rows: Record<string,unknown>[] = [];
let expectedCount: number | null = null;
let offset = 0;

while (true) {
  const end = offset + pageSize - 1;
  const response = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      Prefer: 'count=exact',
      Range: `${offset}-${end}`,
      'Range-Unit': 'items',
    },
  });
  if (!response.ok) throw new Error(`export_failed_${response.status}`);
  const page = await response.json() as Record<string,unknown>[];
  if (!Array.isArray(page)) throw new Error('export_response_not_array');
  const contentRange = response.headers.get('content-range');
  const total = parseTotal(contentRange);
  if (total != null) {
    if (expectedCount != null && expectedCount !== total) throw new Error(`export_count_changed_during_pagination:${expectedCount}->${total}`);
    expectedCount = total;
  }
  rows.push(...page);
  if (page.length < pageSize) break;
  offset += page.length;
  if (expectedCount != null && rows.length >= expectedCount) break;
}

if (expectedCount == null) throw new Error('export_exact_count_missing');
if (rows.length !== expectedCount) throw new Error(`export_count_mismatch:expected=${expectedCount}:exported=${rows.length}`);

const forbidden = new Set([
  'credential_hash','participant_code_hash','participant_code','study_code','credential','password','sync_token_hash',
  'name','email','school','phone','dni','document_id','parent_name','birth_date',
]);
const cleaned = rows.map((row) => Object.fromEntries(Object.entries(row).filter(([field]) => !forbidden.has(field))));
const headers = [...new Set(cleaned.flatMap(Object.keys))];
const csv = [headers.join(','), ...cleaned.map((row) => headers.map((header) => csvCell(row[header])).join(','))].join('\n') + '\n';
const privateDir = resolve(process.cwd(), '.private');
await mkdir(privateDir, { recursive:true });
const filename = study === 'APULAB-STUDY-2026' ? 'telemetry-official.csv' : 'telemetry-qa.csv';
const output = resolve(privateDir, filename);
await writeFile(output, csv, 'utf8');
console.info(`[research] Export verified · expected_count=${expectedCount} · exported_count=${cleaned.length} · .private/${filename}`);

function parseTotal(contentRange: string | null): number | null {
  if (!contentRange) return null;
  const match = contentRange.match(/\/(\d+|\*)$/);
  return match && match[1] !== '*' ? Number(match[1]) : null;
}
function csvCell(value: unknown): string {
  const text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"','""')}"` : text;
}
