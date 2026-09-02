import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const LEVELS = [2, 3];

const stylePatch = `
<style id="apulab-level23-primary-audio-style">
/* Nivel 2–3 únicamente: el botón que inicia como EXPLORAR adopta
   el mismo lenguaje visual amarillo del Nivel 1. No altera layout. */
.apulab-level23-explore-primary {
  background: linear-gradient(180deg, #F7D06F 0%, #F4C75E 100%) !important;
  color: #17133A !important;
  border-color: #FFE5A3 !important;
  box-shadow: 5px 5px 0 #D5A43D !important;
}
.apulab-level23-explore-primary:hover:not(:disabled) {
  background: #F7D06F !important;
}
.apulab-level23-explore-primary:active:not(:disabled) {
  background: #DDB047 !important;
  box-shadow: 3px 3px 0 #D5A43D !important;
}
</style>`;

const runtimePatch = `
<script id="apulab-level23-primary-audio-runtime">
(() => {
  // NIVEL 2–3 ÚNICAMENTE · amarillo de EXPLORAR + click UI.
  const normalizeLabel = (value) => String(value || '')
    .replace(/\\s+/g, ' ')
    .trim()
    .toUpperCase();

  const markExploreButton = () => {
    document.querySelectorAll('button').forEach((button) => {
      if (button.classList.contains('apulab-level23-explore-primary')) return;
      const label = normalizeLabel(button.textContent);
      if (label === 'EXPLORAR') button.classList.add('apulab-level23-explore-primary');
    });
  };

  markExploreButton();
  const buttonObserver = new MutationObserver(markExploreButton);
  buttonObserver.observe(document.body, { childList: true, subtree: true });

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  let audioContext = null;

  const sfxEnabled = () => {
    try {
      return localStorage.getItem('apulab.settings.sfx') !== 'off';
    } catch (_) {
      return true;
    }
  };

  const isTargetButton = (button) => {
    const label = normalizeLabel(button.textContent);
    return label.includes('BITÁCORA')
      || label.includes('GUÍA')
      || label === 'EXPLORAR'
      || label === 'CONTINUAR'
      || label.startsWith('CONTINUAR ');
  };

  const playUiClick = () => {
    if (!AudioContextClass || !sfxEnabled()) return;
    if (!audioContext) audioContext = new AudioContextClass();

    const play = () => {
      if (!audioContext || audioContext.state !== 'running') return;
      const now = audioContext.currentTime;
      const master = audioContext.createGain();
      master.gain.setValueAtTime(0.68, now);
      master.connect(audioContext.destination);

      const tone = audioContext.createOscillator();
      const gain = audioContext.createGain();
      tone.type = 'triangle';
      tone.frequency.setValueAtTime(510, now);
      tone.frequency.exponentialRampToValueAtTime(650, now + 0.055);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.060, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);
      tone.connect(gain);
      gain.connect(master);
      tone.start(now);
      tone.stop(now + 0.085);
    };

    if (audioContext.state === 'suspended') {
      audioContext.resume().then(play).catch(() => {});
    } else {
      play();
    }
  };

  const handlePointerDown = (event) => {
    const target = event.target instanceof Element ? event.target.closest('button') : null;
    if (!target || !isTargetButton(target)) return;
    if (target.disabled || target.getAttribute('aria-disabled') === 'true') return;
    playUiClick();
  };

  document.addEventListener('pointerdown', handlePointerDown, true);

  const cleanup = () => {
    buttonObserver.disconnect();
    document.removeEventListener('pointerdown', handlePointerDown, true);
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close().catch(() => {});
    }
  };

  window.addEventListener('pagehide', cleanup, { once: true });
  window.addEventListener('beforeunload', cleanup, { once: true });
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'apulab-dispose') cleanup();
  });
})();
</script>`;

for (const level of LEVELS) {
  const path = resolve(ROOT, `public/missions/mission01/level${level}.html`);
  let html = await readFile(path, 'utf8');

  if (html.includes('apulab-level23-primary-audio-runtime')) {
    throw new Error(`mission01_level${level}_primary_audio_patch_already_present`);
  }
  if (!html.includes('</head>') || !html.includes('</body>')) {
    throw new Error(`mission01_level${level}_primary_audio_invalid_html`);
  }

  html = html.replace('</head>', `${stylePatch}\n</head>`);
  html = html.replace('</body>', `${runtimePatch}\n</body>`);
  await writeFile(path, html, 'utf8');

  console.info(`[mission01] Level ${level} · EXPLORAR amarillo + clicks BITÁCORA/CONTINUAR/GUÍA`);
}

// Encadenado aquí para no modificar package.json ni la configuración global del proyecto.
await import('./patch-mission01-level2-guide.mjs');
