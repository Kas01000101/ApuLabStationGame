import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const OUT = resolve(ROOT, 'public/missions/mission01');

function fail(code, detail = '') {
  throw new Error(`mission01_inline_js_syntax:${code}${detail ? `:${detail}` : ''}`);
}

for (let level = 1; level <= 7; level += 1) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1])
    .filter((code) => code.trim().length > 0);

  if (!scripts.length) fail('no_inline_scripts', `l${level}`);

  for (let index = 0; index < scripts.length; index += 1) {
    const result = spawnSync(process.execPath, ['--input-type=module', '--check'], {
      encoding: 'utf8',
      input: scripts[index],
    });
    if (result.status !== 0) {
      const detail = (result.stderr || result.stdout || 'syntax error')
        .replace(/\s+/g, ' ')
        .slice(0, 500);
      fail('syntax', `l${level}:script${index}:${detail}`);
    }
  }

  console.info(`[mission01] JS syntax OK · Nivel ${level} · ${scripts.length} inline scripts`);
}

console.info('[mission01] INLINE JS SYNTAX OK · N1–N7');
