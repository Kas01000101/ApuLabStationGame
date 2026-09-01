import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const LEVEL1_PATH = resolve(process.cwd(), 'public/missions/mission01/level1.html');
let html = await readFile(LEVEL1_PATH, 'utf8');

if (!html.includes('id="level1-feedback-audio-runtime"')) {
  throw new Error('mission01_level1_audio_boost_missing_runtime');
}
if (html.includes('LEVEL1_AUDIO_BOOST_V2')) {
  throw new Error('mission01_level1_audio_boost_already_present');
}

function replaceRequired(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`mission01_level1_audio_boost_missing:${label}`);
  return source.replace(before, after);
}

// Tachado: +~35% de presencia.
html = replaceRequired(
  html,
  'master.gain.setValueAtTime(0.58, now);',
  'master.gain.setValueAtTime(0.78, now);',
  'guide-master-gain',
);

// Confeti: +~44% de presencia.
html = replaceRequired(
  html,
  'master.gain.setValueAtTime(0.52, now);',
  'master.gain.setValueAtTime(0.75, now);',
  'confetti-master-gain',
);

const helpers = `
  // LEVEL1_AUDIO_BOOST_V2
  const requestMusicDuck = (durationMs, volume = 10) => {
    if (window.parent === window) return;
    try {
      const ParentCustomEvent = window.parent.CustomEvent;
      window.parent.dispatchEvent(new ParentCustomEvent('apulab-intro-music-duck', {
        detail: { durationMs, volume },
      }));
    } catch (_) {
      // El efecto local debe seguir funcionando aunque el frame no pueda pedir ducking.
    }
  };

  // Click corto y claro para BITÁCORA, EXPLORAR/CONTINUAR y GUÍA.
  const playUiClick = () => {
    const context = getAudioContext();
    if (context.state === 'suspended') {
      context.resume().then(() => playUiClick()).catch(() => {});
      return;
    }
    if (context.state !== 'running') return;

    const now = context.currentTime;
    const master = context.createGain();
    master.gain.setValueAtTime(0.82, now);
    master.connect(context.destination);

    const tone = context.createOscillator();
    const gain = context.createGain();
    tone.type = 'triangle';
    tone.frequency.setValueAtTime(480, now);
    tone.frequency.exponentialRampToValueAtTime(690, now + 0.052);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.082, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.082);
    tone.connect(gain);
    gain.connect(master);
    tone.start(now);
    tone.stop(now + 0.09);

    // Segundo toque muy breve: da sensación de botón físico sin sonar doble.
    const snap = context.createOscillator();
    const snapGain = context.createGain();
    snap.type = 'square';
    snap.frequency.setValueAtTime(1180, now + 0.014);
    snapGain.gain.setValueAtTime(0.0001, now + 0.014);
    snapGain.gain.linearRampToValueAtTime(0.018, now + 0.018);
    snapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.046);
    snap.connect(snapGain);
    snapGain.connect(master);
    snap.start(now + 0.014);
    snap.stop(now + 0.05);
  };

  const NAV_BUTTON_SELECTOR = '#kawsay-journal, #kawsay-explanation, #kawsay-guide';
  const handleUiPointerDown = (event) => {
    const target = event.target instanceof Element ? event.target.closest(NAV_BUTTON_SELECTOR) : null;
    if (!target) return;
    if (target.disabled || target.getAttribute('aria-disabled') === 'true') return;
    playUiClick();
  };

  // pointerdown hace que el feedback se oiga justo al presionar el botón.
  document.addEventListener('pointerdown', handleUiPointerDown, true);

`;

html = replaceRequired(
  html,
  '  const playGuideTick = () => {',
  `${helpers}  const playGuideTick = () => {`,
  'audio-helpers',
);

html = replaceRequired(
  html,
  "  const playGuideTick = () => {\n    const context = getAudioContext();\n    if (context.state !== 'running') return;",
  "  const playGuideTick = () => {\n    const context = getAudioContext();\n    if (context.state !== 'running') return;\n    requestMusicDuck(520, 10);",
  'guide-duck',
);

html = replaceRequired(
  html,
  "  const playConfettiChime = () => {\n    const context = getAudioContext();\n    if (context.state !== 'running') return;",
  "  const playConfettiChime = () => {\n    const context = getAudioContext();\n    if (context.state !== 'running') return;\n    requestMusicDuck(820, 10);",
  'confetti-duck',
);

html = replaceRequired(
  html,
  "    window.removeEventListener('keydown', unlockAudio, { capture: true });",
  "    window.removeEventListener('keydown', unlockAudio, { capture: true });\n    document.removeEventListener('pointerdown', handleUiPointerDown, true);",
  'cleanup-click-listener',
);

await writeFile(LEVEL1_PATH, html, 'utf8');
console.info('[mission01] Level 1 · BITÁCORA/CONTINUAR/GUÍA click inmediato + tachado/confeti reforzados');
