import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const MANIFEST = resolve(OUT, 'manifest.json');
const hash = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
const outputs = new Map();

for (const level of [3, 4, 5]) {
  const path = resolve(OUT, `level${level}.html`);
  let html = await readFile(path, 'utf8');
  const next = level + 1;

  // El contenido 3–5 proviene de los antiguos 4–6. Normalizar cualquier puente
  // directo que todavía conserve la identidad anterior evita precargas/transiciones
  // con un número de nivel equivocado.
  html = html.replace(/parent\.apulabLevelReady\(\d+\)/g, `parent.apulabLevelReady(${level})`);
  html = html.replace(/parent\.apulabCompleteLevel\(\d+\s*,\s*\d+\)/g, `parent.apulabCompleteLevel(${level},${next})`);
  html = html.replace(/\{type:'apulab-level-ready',level:\d+\}/g, `{type:'apulab-level-ready',level:${level}}`);
  html = html.replace(/\{type:'apulab-level-ready', level:\d+\}/g, `{type:'apulab-level-ready', level:${level}}`);
  html = html.replace(/\{type:'apulab-level-complete',level:\d+,nextLevel:\d+\}/g, `{type:'apulab-level-complete',level:${level},nextLevel:${next}}`);

  // Bitácora/resumen de finalización: debe hablar del nivel actual, no del índice legacy.
  html = html.replace(/<b>Nivel \d+ completado\.<\/b>/g, `<b>Nivel ${level} completado.</b>`);

  // QA local de identidad runtime.
  const readyCalls = [...html.matchAll(/parent\.apulabLevelReady\((\d+)\)/g)].map((m) => Number(m[1]));
  if (readyCalls.some((n) => n !== level)) throw new Error(`mission01_runtime_identity_ready:l${level}:${readyCalls.join(',')}`);
  const completeCalls = [...html.matchAll(/parent\.apulabCompleteLevel\((\d+)\s*,\s*(\d+)\)/g)];
  if (completeCalls.some((m) => Number(m[1]) !== level || Number(m[2]) !== next)) {
    throw new Error(`mission01_runtime_identity_complete:l${level}`);
  }
  if (html.includes(`<b>Nivel ${level - 1} completado.</b>`)) throw new Error(`mission01_runtime_identity_old_journal:l${level}`);

  await writeFile(path, html, 'utf8');
  outputs.set(level, html);
  console.info(`[mission01] Nivel ${level} · identidad runtime normalizada · ready=${level} · complete=${level}->${next}`);
}

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
for (const entry of manifest.levels || []) {
  const level = Number(entry.level);
  if (!outputs.has(level)) continue;
  const html = outputs.get(level);
  entry.bytes = Buffer.byteLength(html, 'utf8');
  entry.sha256 = hash(html);
}
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.info('[mission01] RUNTIME IDENTITY QA OK · sin puentes legacy 4/5/6 dentro de los nuevos niveles 3/4/5');
