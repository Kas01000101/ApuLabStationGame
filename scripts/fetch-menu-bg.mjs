import { mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const SOURCE = 'https://raw.githubusercontent.com/Kas01000101/ApuLabStation/main/public/assets/boot/menu/fondo_menu_apulab.png';
const TARGET = resolve('public/assets/menu/apulab-menu-bg-hd.png');
const MIN_BYTES = 1_000_000;

async function hasValidCachedFile() {
  try {
    const info = await stat(TARGET);
    return info.size >= MIN_BYTES;
  } catch {
    return false;
  }
}

if (!(await hasValidCachedFile())) {
  const response = await fetch(SOURCE, {
    headers: { 'user-agent': 'ApuLabStationGame-build/1.0' },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`menu_background_download_failed:${response.status}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const isPng =
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;

  if (!isPng || bytes.length < MIN_BYTES) {
    throw new Error(`menu_background_invalid:${bytes.length}`);
  }

  await mkdir(dirname(TARGET), { recursive: true });
  await writeFile(TARGET, bytes);
  console.log(`ApuLab menu HD: ${bytes.length} bytes`);
} else {
  console.log('ApuLab menu HD: cached asset OK');
}
