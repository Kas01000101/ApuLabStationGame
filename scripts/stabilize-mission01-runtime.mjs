import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const OUT = resolve(ROOT, 'public/missions/mission01');
const VENDOR = resolve(ROOT, 'public/vendor/three');
const THREE_VERSION = '0.180.0';
const THREE_MODULE_SRC = resolve(ROOT, 'node_modules/three/build/three.module.js');
const ORBIT_SRC = resolve(ROOT, 'node_modules/three/examples/jsm/controls/OrbitControls.js');
const THREE_MODULE_OUT = resolve(VENDOR, 'three.module.js');
const ORBIT_OUT = resolve(VENDOR, 'OrbitControls.js');

const POPPINS_LINKS = `\n<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">`;

function requireReplace(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`mission01_stabilize_missing:${label}`);
  return source.replace(before, after);
}

await mkdir(VENDOR, { recursive: true });
await copyFile(THREE_MODULE_SRC, THREE_MODULE_OUT);

let orbit = await readFile(ORBIT_SRC, 'utf8');
orbit = orbit
  .replaceAll("from 'three';", "from './three.module.js';")
  .replaceAll('from "three";', 'from "./three.module.js";');
if (/from\s+['"]three['"]/.test(orbit)) {
  throw new Error('mission01_stabilize_orbit_three_bare_import');
}
await writeFile(ORBIT_OUT, orbit, 'utf8');

const externalThreeUrls = [
  `https://esm.sh/three@${THREE_VERSION}/examples/jsm/controls/OrbitControls.js`,
  `https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/build/three.module.js`,
  `https://esm.sh/three@${THREE_VERSION}`,
];

for (let level = 1; level <= 7; level += 1) {
  const path = resolve(OUT, `level${level}.html`);
  let html = await readFile(path, 'utf8');

  html = html
    .replaceAll(externalThreeUrls[0], '/vendor/three/OrbitControls.js')
    .replaceAll(externalThreeUrls[1], '/vendor/three/three.module.js')
    .replaceAll(externalThreeUrls[2], '/vendor/three/three.module.js');

  if (!html.includes('fonts.googleapis.com/css2?family=Poppins')) {
    html = requireReplace(html, '</head>', `${POPPINS_LINKS}\n</head>`, `poppins-head-l${level}`);
  }

  // Nivel 1 conserva feedback Web Audio propio. Debe obedecer el mismo switch
  // global de EFECTOS que la intro y los niveles 2–5.
  if (level === 1) {
    const audioMarker = 'id="level1-feedback-audio-runtime"';
    if (!html.includes(audioMarker)) throw new Error('mission01_stabilize_level1_audio_runtime_missing');

    const audioClassAnchor = '  const AudioContextClass = window.AudioContext || window.webkitAudioContext;\n  if (!AudioContextClass) return;\n';
    const sfxContract = `${audioClassAnchor}\n  const SFX_SETTING_KEY = 'apulab.settings.sfx';\n  const isSfxEnabled = () => {\n    try {\n      return localStorage.getItem(SFX_SETTING_KEY) !== 'off';\n    } catch (_) {\n      return true;\n    }\n  };\n`;

    if (!html.includes("const SFX_SETTING_KEY = 'apulab.settings.sfx';")) {
      html = requireReplace(html, audioClassAnchor, sfxContract, 'level1-sfx-contract');
    }

    const guardedFunctions = [
      'unlockAudio',
      'requestMusicDuck',
      'playUiClick',
      'playGuideTick',
      'playConfettiChime',
    ];

    for (const name of guardedFunctions) {
      const pattern = new RegExp(`(const ${name}\\s*=\\s*\\([^)]*\\)\\s*=>\\s*\\{\\n)(?!\\s*if \\(!isSfxEnabled\\(\\)\\) return;)`);
      if (!pattern.test(html) && !html.includes(`const ${name}`)) {
        throw new Error(`mission01_stabilize_level1_audio_function_missing:${name}`);
      }
      html = html.replace(pattern, `$1    if (!isSfxEnabled()) return;\n`);
    }
  }

  await writeFile(path, html, 'utf8');
}

console.info('[mission01] STABILIZATION PATCH OK · Three local N1–N7 · Poppins N1–N7 · SFX global contract');
