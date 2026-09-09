import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const edgePath = new URL('../../supabase/functions/ingest-telemetry/index.ts', import.meta.url);
const edge = await readFile(edgePath, 'utf8');

function extractLimits(source) {
  const qt = source.match(/match\[1\] === 'QT'[\s\S]{0,80}n > (\d+)/)?.[1];
  const ap = source.match(/match\[1\] === 'AP'[\s\S]{0,80}n > (\d+)/)?.[1];
  return { qt: Number(qt), ap: Number(ap) };
}

function normalizeWithSourceContract(value, limits) {
  const code = String(value).trim().toUpperCase();
  const match = code.match(/^(QT|AP)-(\d{3})$/);
  if (!match) return null;
  const n = Number(match[2]);
  if (match[1] === 'QT' && (n < 1 || n > limits.qt)) return null;
  if (match[1] === 'AP' && (n < 1 || n > limits.ap)) return null;
  return code;
}

test('official participant code range is AP-001 through AP-070 while QT remains QT-001 through QT-010', () => {
  assert.match(edge, /const code = stringField\(value, 'study_code', 16\)\.toUpperCase\(\)/);
  assert.match(edge, /\^\(QT\|AP\)-\(\\d\{3\}\)\$/);

  const limits = extractLimits(edge);
  assert.deepEqual(limits, { qt: 10, ap: 70 });

  for (const code of ['AP-001', 'AP-050', 'AP-051', 'AP-069', 'AP-070']) {
    assert.equal(normalizeWithSourceContract(code, limits), code);
  }
  assert.equal(normalizeWithSourceContract('ap-070', limits), 'AP-070');

  for (const code of ['AP-000', 'AP-071', 'AP-999', 'AP-01', 'AP-0001', 'XX-001']) {
    assert.equal(normalizeWithSourceContract(code, limits), null);
  }

  for (const code of ['QT-001', 'QT-010']) {
    assert.equal(normalizeWithSourceContract(code, limits), code);
  }
  for (const code of ['QT-000', 'QT-011']) {
    assert.equal(normalizeWithSourceContract(code, limits), null);
  }
});
