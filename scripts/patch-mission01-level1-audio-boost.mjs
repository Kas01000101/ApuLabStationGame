import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const LEVEL1_PATH = resolve(process.cwd(), 'public/missions/mission01/level1.html');
let html = await readFile(LEVEL1_PATH, 'utf8');

if (!html.includes('id="level1-feedback-audio-runtime"')) {
  throw new Error('mission01_level1_audio_boost_missing_runtime');
}
if (html.includes('LEVEL1_AUDIO_BOOST_V1')) {
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
  // LEVEL1_AUDIO_BOOST_V1
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

  const playUiClick = () => {
    const context = getAudioContext();
    if (context.state !== 'running') return;

    const now = context.currentTime;
    const master = context.createGain();
    master.gain.setValueAtTime(0.68, now);
    master.connect(context.destination);

    const tone = context.createOscillator();
    const gain = context.createGain();
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

  const handleUiClick = (event) => {
    const target = event.target instanceof Element ? event.target.closest('button') : null;
    if (!target || target.disabled) return;
    playUiClick();
  };

  document.addEventListener('click', handleUiClick, true);

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
  "    window.removeEventListener('keydown', unlockAudio, { capture: true });\n    document.removeEventListener('click', handleUiClick, true);",
  'cleanup-click-listener',
);

await writeFile(LEVEL1_PATH, html, 'utf8');
console.info('[mission01] Level 1 · click/tachado/confeti reforzados + music ducking');
