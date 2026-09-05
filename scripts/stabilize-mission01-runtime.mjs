import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const OUT = resolve(ROOT, 'public/missions/mission01');
const VENDOR = resolve(ROOT, 'public/vendor/three');
const THREE_VERSION = '0.180.0';
const THREE_MODULE_SRC = resolve(ROOT, 'node_modules/three/build/three.module.js');
const THREE_CORE_SRC = resolve(ROOT, 'node_modules/three/build/three.core.js');
const ORBIT_SRC = resolve(ROOT, 'node_modules/three/examples/jsm/controls/OrbitControls.js');
const THREE_MODULE_OUT = resolve(VENDOR, 'three.module.js');
const THREE_CORE_OUT = resolve(VENDOR, 'three.core.js');
const ORBIT_OUT = resolve(VENDOR, 'OrbitControls.js');

const POPPINS_LINKS = `\n<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">`;
const LEVEL5_REPEAT_VISIBILITY_CSS = `\n<style id="apulab-level5-repeat-visibility">#repeat-palette[hidden]{display:none!important}</style>`;
const LEVEL67_REPEAT_CONTROL_CSS = '.program-node.repeat>.repeat-head>.node-remove{position:static;flex:0 0 25px;width:25px;height:25px;border:2px solid var(--dark);background:#fff;margin-left:2px}';
const LEVEL67_REPEAT_OLD_HTML = `d.innerHTML='<button class="node-remove">×</button><div class="repeat-head"><span>↻ REPETIR</span><span class="repeat-count"><button class="mini dec">−</button><b>× '+node.count+'</b><button class="mini inc">+</button></span></div><div class="repeat-body"></div>';`;
const LEVEL67_REPEAT_NEW_HTML = `d.innerHTML='<div class="repeat-head"><span>↻ REPETIR</span><span class="repeat-count"><button class="mini dec">−</button><b>× '+node.count+'</b><button class="mini inc">+</button></span><button class="node-remove repeat-remove" aria-label="Eliminar bloque REPETIR">×</button></div><div class="repeat-body"></div>';d.querySelector('.node-remove').onclick=e=>{e.stopPropagation();nodes.splice(index,1);if(node===activeRepeat)activeRepeat=null;renderProgram()};`;

function requireReplace(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`mission01_stabilize_missing:${label}`);
  return source.replace(before, after);
}

await mkdir(VENDOR, { recursive: true });
await copyFile(THREE_MODULE_SRC, THREE_MODULE_OUT);
await copyFile(THREE_CORE_SRC, THREE_CORE_OUT);

let orbit = await readFile(ORBIT_SRC, 'utf8');
orbit = orbit
  .replaceAll("from 'three';", "from './three.module.js';")
  .replaceAll('from "three";', 'from "./three.module.js";');
if (/from\s+['"]three['"]/.test(orbit)) {
  throw new Error('mission01_stabilize_orbit_three_bare_import');
}
await writeFile(ORBIT_OUT, orbit, 'utf8');

const localThreeModule = await readFile(THREE_MODULE_OUT, 'utf8');
if (!localThreeModule.includes("from './three.core.js'")) {
  throw new Error('mission01_stabilize_unexpected_three_module_layout');
}

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

  if (level === 1) {
    if (!html.includes('const PRACTICE_BATTERY_VOLTAGE = 28.0;') && !html.includes('const PRACTICE_BATTERY_VOLTAGE = 15.0;')) {
      throw new Error('mission01_stabilize_level1_practice_voltage_marker_missing');
    }
    html = html.replaceAll('28.0 V', '15.0 V').replaceAll('28.0', '15.0');
    if (!html.includes('const PRACTICE_BATTERY_VOLTAGE = 15.0;')) {
      throw new Error('mission01_stabilize_level1_practice_voltage_not_15');
    }

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

  if (level === 5 && !html.includes('id="apulab-level5-repeat-visibility"')) {
    html = requireReplace(html, '</head>', `${LEVEL5_REPEAT_VISIBILITY_CSS}\n</head>`, 'level5-repeat-hidden-style');
  }

  if (level === 6 && html.includes('APULAB_LEVEL6_FROM_LEVEL5_V1')) {
    for (const token of [
      'id="board-shell" class="board-shell"',
      'id="program-list" class="program-list"',
      'id="repeat-palette"',
      'data-command="scan"',
      'data-command="analyze"',
      'data-command="send"',
    ]) {
      if (!html.includes(token)) throw new Error(`mission01_stabilize_level6_n5_shell_missing:${token}`);
    }
  } else if (level === 6 || level === 7) {
    const canonicalShell = html.includes('class="panel simulator"') && html.includes('class="panel editor"');
    if (canonicalShell) {
      if (!html.includes("d.querySelector('.node-remove').onclick=(e)=>")) {
        throw new Error(`mission01_stabilize_level${level}_canonical_repeat_remove_missing`);
      }
      if (!html.includes('.repeat-head{display:flex') || !html.includes('padding-right:24px')) {
        throw new Error(`mission01_stabilize_level${level}_canonical_repeat_spacing_missing`);
      }
    } else {
      if (!html.includes(LEVEL67_REPEAT_CONTROL_CSS)) {
        html = requireReplace(
          html,
          '.program-node.repeat{background:#C9F6F7}',
          `.program-node.repeat{background:#C9F6F7}${LEVEL67_REPEAT_CONTROL_CSS}`,
          `level${level}-repeat-control-css`,
        );
      }
      if (!html.includes('class="node-remove repeat-remove"')) {
        html = requireReplace(
          html,
          LEVEL67_REPEAT_OLD_HTML,
          LEVEL67_REPEAT_NEW_HTML,
          `level${level}-repeat-remove-handler`,
        );
      }
    }
  }

  await writeFile(path, html, 'utf8');
}

console.info('[mission01] STABILIZATION PATCH OK · Three local completo N1–N7 · Poppins N1–N7 · SFX global · N1=15.0V · REPETIR N5 oculto · N6 derivado de N5 respetado · N7 shell canónico');
