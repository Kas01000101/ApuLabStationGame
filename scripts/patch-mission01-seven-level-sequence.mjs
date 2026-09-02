import { createHash } from 'node:crypto';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT_DIR = resolve(process.cwd(), 'public/missions/mission01');
const TOTAL_LEVELS = 7;
const AVAILABLE_LEVELS = [1, 2, 3, 4, 5];
const SOURCE_TO_TARGET = new Map([[4, 3], [5, 4], [6, 5]]);

function sha256(text) {
  return createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
}

function mapLegacyLevel(value) {
  const level = Number(value);
  if (level >= 4 && level <= 8) return level - 1;
  return level;
}

function mapLevelReference(prefix, value) {
  const oldLevel = Number(value);
  const mapped = mapLegacyLevel(oldLevel);
  return `${prefix} ${mapped}`;
}

function convertTotalOnly(html, level) {
  let out = html;
  const spaced = `${level} / 8`;
  const compact = `${level}/8`;
  if (!out.includes(spaced) && !out.includes(compact)) {
    throw new Error(`mission01_sequence7_missing_progress:level${level}`);
  }
  out = out.replaceAll(spaced, `${level} / 7`);
  out = out.replaceAll(compact, `${level}/7`);
  out = out.replaceAll(`Nivel ${level} de 8`, `Nivel ${level} de 7`);
  out = out.replaceAll(`NIVEL ${level} DE 8`, `NIVEL ${level} DE 7`);
  out = out.replaceAll(`Nivel ${level} / 8`, `Nivel ${level} / 7`);
  out = out.replaceAll(`NIVEL ${level} / 8`, `NIVEL ${level} / 7`);
  return out;
}

function convertLegacyLevel(html, sourceLevel, targetLevel) {
  let out = html;
  const spaced = `${sourceLevel} / 8`;
  const compact = `${sourceLevel}/8`;
  if (!out.includes(spaced) && !out.includes(compact)) {
    throw new Error(`mission01_sequence7_missing_legacy_progress:old${sourceLevel}`);
  }

  out = out.replaceAll(spaced, `${targetLevel} / 7`);
  out = out.replaceAll(compact, `${targetLevel}/7`);

  // Referencias visibles de numeración de la Misión 01.
  out = out.replace(/\b(Nivel|NIVEL)\s+([4-8])\s+(de|DE)\s+8\b/g, (_m, prefix, value, de) => {
    return `${prefix} ${mapLegacyLevel(value)} ${de} 7`;
  });
  out = out.replace(/\b(Level|LEVEL)\s+([4-8])\s+(of|OF)\s+8\b/g, (_m, prefix, value, of) => {
    return `${prefix} ${mapLegacyLevel(value)} ${of} 7`;
  });
  out = out.replace(/\b(Nivel|NIVEL)\s+([4-8])\b/g, (_m, prefix, value) => mapLevelReference(prefix, value));
  out = out.replace(/\b(Level|LEVEL)\s+([4-8])\b/g, (_m, prefix, value) => mapLevelReference(prefix, value));

  // El antiguo Nivel 4 tenía al antiguo Nivel 3 como predecesor. Tras eliminarlo,
  // su predecesor real es el Nivel 2.
  if (sourceLevel === 4) {
    out = out.replace(/\b(Nivel|NIVEL)\s+3\b/g, (_m, prefix) => `${prefix} 2`);
    out = out.replace(/\b(Level|LEVEL)\s+3\b/g, (_m, prefix) => `${prefix} 2`);
  }

  // Metadata de runtime y desbloqueos.
  out = out.replace(/data-apulab-level=(['"])([4-8])\1/g, (_m, quote, value) => {
    return `data-apulab-level=${quote}${mapLegacyLevel(value)}${quote}`;
  });
  out = out.replace(/data-mission-level=(['"])([4-8])\1/g, (_m, quote, value) => {
    return `data-mission-level=${quote}${mapLegacyLevel(value)}${quote}`;
  });
  out = out.replace(/data-unlocked-from-level=(['"])(\d+)\1/g, (_m, quote, value) => {
    const oldValue = Number(value);
    const mapped = sourceLevel === 4 && oldValue === 3 ? 2 : mapLegacyLevel(oldValue);
    return `data-unlocked-from-level=${quote}${mapped}${quote}`;
  });

  // Puentes de navegación y mensajes entre iframe/padre.
  out = out.replace(/\blevel\s*:\s*([4-8])\b/g, (_m, value) => `level:${mapLegacyLevel(value)}`);
  out = out.replace(/\bnextLevel\s*:\s*([4-8])\b/g, (_m, value) => `nextLevel:${mapLegacyLevel(value)}`);
  out = out.replace(/apulabCompleteLevel\(\s*([4-8])\s*,\s*([4-8])\s*\)/g, (_m, current, next) => {
    return `apulabCompleteLevel(${mapLegacyLevel(current)},${mapLegacyLevel(next)})`;
  });

  // Continuidad de programas guardados por los niveles de programación.
  out = out.replace(/apulab\.level([4-8])\./g, (_m, value) => `apulab.level${mapLegacyLevel(value)}.`);

  return out;
}

function assertActiveOutput(level, html) {
  const expected = `${level} / 7`;
  if (!html.includes(expected)) {
    throw new Error(`mission01_sequence7_missing_final_progress:level${level}:${expected}`);
  }
  if (/\b[1-8]\s*\/\s*8\b/.test(html) || /\b(?:Nivel|NIVEL)\s+[1-8]\s+(?:de|DE)\s+8\b/.test(html)) {
    throw new Error(`mission01_sequence7_residual_total8:level${level}`);
  }
  if (level === 3 && /\bTP1\b|\bTP2\b|\bTP3\b|Conector de seguridad|SOURCE HARNESS|RASTREAR/.test(html)) {
    throw new Error('mission01_sequence7_old_level3_gameplay_leaked_into_new_level3');
  }
}

const original = new Map();
for (const level of [1, 2, 4, 5, 6]) {
  original.set(level, await readFile(resolve(OUT_DIR, `level${level}.html`), 'utf8'));
}

const finalOutputs = new Map();
finalOutputs.set(1, convertTotalOnly(original.get(1), 1));
finalOutputs.set(2, convertTotalOnly(original.get(2), 2));
for (const [sourceLevel, targetLevel] of SOURCE_TO_TARGET) {
  finalOutputs.set(targetLevel, convertLegacyLevel(original.get(sourceLevel), sourceLevel, targetLevel));
}

const manifestLevels = [];
for (const level of AVAILABLE_LEVELS) {
  const html = finalOutputs.get(level);
  assertActiveOutput(level, html);
  await writeFile(resolve(OUT_DIR, `level${level}.html`), html, 'utf8');
  const bytes = Buffer.byteLength(html, 'utf8');
  const hash = sha256(html);
  manifestLevels.push({ level, sha256: hash, bytes });
  console.info(`[mission01] level ${level}/${TOTAL_LEVELS} OK · ${bytes} bytes · ${hash}`);
}

// No deben sobrevivir salidas con la numeración vieja. Los niveles nuevos 6 y 7
// quedan reservados hasta que existan fuentes reales de los antiguos 7 y 8.
for (const staleLevel of [6, 7, 8]) {
  await rm(resolve(OUT_DIR, `level${staleLevel}.html`), { force: true });
}

await writeFile(
  resolve(OUT_DIR, 'manifest.json'),
  `${JSON.stringify({
    mission: 1,
    totalLevels: TOTAL_LEVELS,
    availableLevels: AVAILABLE_LEVELS,
    unavailableLevels: [6, 7],
    migration: {
      removedLegacyLevel: 3,
      remappedLegacyLevels: { 4: 3, 5: 4, 6: 5 },
      note: 'Los antiguos niveles 7 y 8 no existen como fuentes integradas en esta rama.',
    },
    levels: manifestLevels,
  }, null, 2)}\n`,
  'utf8',
);

console.info('[mission01] secuencia 1–7 aplicada · antiguo Nivel 3 eliminado · antiguos 4–6 remapeados a 3–5');
