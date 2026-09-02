import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

const outputs = new Map();
for (const [level, previous] of [[4, 3], [5, 4]]) {
  const path = resolve(OUT, `level${level}.html`);
  let html = await readFile(path, 'utf8');
  const before = `<small>MISIÓN 01 · NIVEL ${previous}</small>`;
  const after = `<small>REGISTRO ANTERIOR · NIVEL ${previous}</small>`;
  if (!html.includes(before)) {
    throw new Error(`mission01_journal_previous_label_missing:l${level}:prev${previous}`);
  }
  html = html.replace(before, after);
  await writeFile(path, html, 'utf8');
  outputs.set(level, html);
  console.info(`[mission01] Nivel ${level} · Bitácora previa rotulada como REGISTRO ANTERIOR · NIVEL ${previous}`);
}

const manifestPath = resolve(OUT, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const entry of manifest.levels || []) {
  const level = Number(entry.level);
  if (!outputs.has(level)) continue;
  const html = outputs.get(level);
  entry.bytes = Buffer.byteLength(html, 'utf8');
  entry.sha256 = hash(html);
}
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
