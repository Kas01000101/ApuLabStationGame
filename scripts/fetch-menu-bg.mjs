import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const SOURCE = 'https://drive.usercontent.google.com/download?id=19RMYgjglV0jHxjEzdFv2MSwcO2YAVeSL&export=download&confirm=t';
const TARGET = resolve('public/assets/menu/apulab-menu-bg-hd.png');
const EXPECTED_BYTES = 1_846_613;
const EXPECTED_WIDTH = 1633;
const EXPECTED_HEIGHT = 963;

function pngDimensions(bytes) {
  if (bytes.length < 24) return null;
  const isPng =
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  if (!isPng) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function isCanonical(bytes) {
  const dimensions = pngDimensions(bytes);
  return Boolean(
    dimensions &&
    bytes.length === EXPECTED_BYTES &&
    dimensions.width === EXPECTED_WIDTH &&
    dimensions.height === EXPECTED_HEIGHT
  );
}

async function hasValidCachedFile() {
  try {
    const info = await stat(TARGET);
    if (info.size !== EXPECTED_BYTES) return false;
    const bytes = new Uint8Array(await readFile(TARGET));
    return isCanonical(bytes);
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
  if (!isCanonical(bytes)) {
    const dimensions = pngDimensions(bytes);
    throw new Error(
      `menu_background_invalid:${bytes.length}:${dimensions?.width ?? 0}x${dimensions?.height ?? 0}`
    );
  }

  await mkdir(dirname(TARGET), { recursive: true });
  await writeFile(TARGET, bytes);
  console.log(`ApuLab menu canonical: ${EXPECTED_WIDTH}x${EXPECTED_HEIGHT}, ${bytes.length} bytes`);
} else {
  console.log('ApuLab menu canonical: cached asset OK');
}
