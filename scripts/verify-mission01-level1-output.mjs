import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const LEVEL1_PATH = resolve(process.cwd(), 'public/missions/mission01/level1.html');
const EXPECTED = Object.freeze({
  bytes: 171185,
  sha256: 'a5e8335ca6c8f9c6f716f0fbb6b6e468fbb793373b0c14a43f3f62988e3ace51',
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
