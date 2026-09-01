import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const LEVEL1_PATH = resolve(process.cwd(), 'public/missions/mission01/level1.html');
const EXPECTED = Object.freeze({
  bytes: 162198,
  sha256: 'c4e5abe27762f063a8e0336fb6ed919a90f8b6a5cc5a1132cc64b463fd088a44',
});

const html = await readFile(LEVEL1_PATH, 'utf8');
const bytes = Buffer.byteLength(html, 'utf8');
const sha256 = createHash('sha256').update(Buffer.from(html, 'utf8')).digest('hex');

if (bytes !== EXPECTED.bytes || sha256 !== EXPECTED.sha256) {
  throw new Error(
    `mission01_level1_output_integrity_failed:sha=${sha256}:bytes=${bytes}`,
  );
}

console.info(`[mission01] level 1 output locked · ${bytes} bytes · ${sha256}`);
