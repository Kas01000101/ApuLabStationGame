import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const LEVEL1_PATH = resolve(process.cwd(), 'public/missions/mission01/level1.html');
let html = await readFile(LEVEL1_PATH, 'utf8');

if (!html.includes('id="level1-guide-strike-runtime"')) {
  throw new Error('mission01_level1_audio_missing_guide_strike_runtime');
}
if (html.includes('id="level1-feedback-audio-runtime"')) {
  throw new Error('mission01_level1_audio_patch_already_present');
}

const runtimePatch = `
<script id="level1-feedback-audio-runtime">
(() => {
  /*
    NIVEL 1 · FEEDBACK SONORO
    Sonidos sintetizados con Web Audio API: no usa archivos externos.
    - Tachado de GUÍA: click/tick corto.
    - Confeti: chime ascendente breve.
  */
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  let audioContext = null;
  const playedGuideTasks = new Set();

  const getAudioContext = () => {
    if (!audioContext) audioContext = new AudioContextClass();
    return audioContext;
  };

  const unlockAudio = () => {
    const context = getAudioContext();
    if (context.state === 'suspended') {
      context.resume().catch(() => {});
    }
  };

  window.addEventListener('pointerdown', unlockAudio, { capture: true });
  window.addEventListener('touchstart', unlockAudio, { capture: true, passive: true });
  window.addEventListener('keydown', unlockAudio, { capture: true });

  const playGuideTick = () => {
    const context = getAudioContext();
    if (context.state !== 'running') return;

    const now = context.currentTime;
    const master = context.createGain();
    master.gain.setValueAtTime(0.58, now);
    master.connect(context.destination);

    const tone = context.createOscillator();
    const toneGain = context.createGain();
    tone.type = 'triangle';
    tone.frequency.setValueAtTime(720, now);
    tone.frequency.exponentialRampToValueAtTime(940, now + 0.105);
    toneGain.gain.setValueAtTime(0.0001, now);
    toneGain.gain.linearRampToValueAtTime(0.075, now + 0.008);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    tone.connect(toneGain);
    toneGain.connect(master);
    tone.start(now);
    tone.stop(now + 0.14);

    const sparkle = context.createOscillator();
    const sparkleGain = context.createGain();
    sparkle.type = 'sine';
    sparkle.frequency.setValueAtTime(1320, now + 0.018);
    sparkle.frequency.exponentialRampToValueAtTime(1580, now + 0.09);
    sparkleGain.gain.setValueAtTime(0.0001, now);
    sparkleGain.gain.linearRampToValueAtTime(0.028, now + 0.025);
    sparkleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.115);
    sparkle.connect(sparkleGain);
    sparkleGain.connect(master);
    sparkle.start(now + 0.018);
    sparkle.stop(now + 0.125);
  };

  const playConfettiChime = () => {
    const context = getAudioContext();
    if (context.state !== 'running') return;

    const now = context.currentTime;
    const master = context.createGain();
    master.gain.setValueAtTime(0.52, now);
    master.connect(context.destination);

    const notes = [
      { frequency: 659.25, offset: 0.00, duration: 0.30, gain: 0.070 },
      { frequency: 783.99, offset: 0.075, duration: 0.34, gain: 0.062 },
      { frequency: 1046.50, offset: 0.165, duration: 0.46, gain: 0.078 },
      { frequency: 1318.51, offset: 0.285, duration: 0.36, gain: 0.038 },
    ];

    notes.forEach((note) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = now + note.offset;
      const end = start + note.duration;

      oscillator.type = note.frequency > 1200 ? 'sine' : 'triangle';
      oscillator.frequency.setValueAtTime(note.frequency, start);
      oscillator.frequency.exponentialRampToValueAtTime(note.frequency * 1.012, end);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(note.gain, start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);

      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(start);
      oscillator.stop(end + 0.015);
    });
  };

  const guidePanel = document.getElementById('kawsay-concept-panel');
  const inspectCompletedGuideTasks = () => {
    if (!guidePanel) return;
    guidePanel.querySelectorAll('.guide-task.completed').forEach((task) => {
      const taskId = task.getAttribute('data-guide-task');
      if (!taskId || playedGuideTasks.has(taskId)) return;
      playedGuideTasks.add(taskId);
      playGuideTick();
    });
  };

  const guideObserver = guidePanel
    ? new MutationObserver(inspectCompletedGuideTasks)
    : null;
  guideObserver?.observe(guidePanel, {
    attributes: true,
    attributeFilter: ['class', 'hidden'],
    childList: true,
    subtree: true,
  });
  inspectCompletedGuideTasks();

  const confettiLayer = document.getElementById('kawsay-confetti');
  let confettiActive = Boolean(confettiLayer?.childElementCount);
  const confettiObserver = confettiLayer
    ? new MutationObserver(() => {
        const isActive = confettiLayer.childElementCount > 0;
        if (isActive && !confettiActive) playConfettiChime();
        confettiActive = isActive;
      })
    : null;
  confettiObserver?.observe(confettiLayer, { childList: true });

  const cleanup = () => {
    guideObserver?.disconnect();
    confettiObserver?.disconnect();
    window.removeEventListener('pointerdown', unlockAudio, { capture: true });
    window.removeEventListener('touchstart', unlockAudio, { capture: true });
    window.removeEventListener('keydown', unlockAudio, { capture: true });
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

if (!html.includes('</body>')) {
  throw new Error('mission01_level1_audio_invalid_html');
}

html = html.replace('</body>', `${runtimePatch}\n</body>`);
await writeFile(LEVEL1_PATH, html, 'utf8');
console.info('[mission01] level 1 guide/confetti Web Audio feedback applied');
