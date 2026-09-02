import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const LEVEL2_PATH = resolve(process.cwd(), 'public/missions/mission01/level2.html');
let html = await readFile(LEVEL2_PATH, 'utf8');

if (html.includes('id="apulab-level2-progress-guide-runtime"')) {
  throw new Error('mission01_level2_progress_guide_already_present');
}
if (!html.includes('MIDE LAS 3 BATERÍAS')) {
  throw new Error('mission01_level2_progress_guide_missing_original_copy');
}

// Getter de solo lectura: no modifica la lógica original de medición.
const measuredValuesPattern = /((?:const|let)\s+measuredValues\s*=\s*new\s+Map(?:<[^;>]+>)?\s*\(\s*\)\s*;?)/;
if (!measuredValuesPattern.test(html)) {
  throw new Error('mission01_level2_progress_guide_missing_measured_values');
}
html = html.replace(
  measuredValuesPattern,
  `$1\nwindow.__apulabLevel2MeasuredCount = () => measuredValues.size;`,
);

const css = `
<style id="apulab-level2-progress-guide-style">
/* NIVEL 2 ÚNICAMENTE · guía progresiva, sin reemplazar el DOM nativo. */
#kawsay-concept-panel.apulab-l2-guide-enhanced > .apulab-l2-guide-shell{display:none}
#kawsay-concept-panel.apulab-l2-guide-enhanced.is-guide > #kawsay-concept-title,
#kawsay-concept-panel.apulab-l2-guide-enhanced.is-guide > #kawsay-concept-text,
#kawsay-concept-panel.apulab-l2-guide-enhanced.is-guide > #kawsay-hint{display:none !important}
#kawsay-concept-panel.apulab-l2-guide-enhanced.is-guide > .apulab-l2-guide-shell{display:flex}
.apulab-l2-guide-shell{flex-direction:column;gap:0;font-family:"Poppins",sans-serif;font-style:normal;color:#fff}
.apulab-l2-guide-kicker{margin:0 0 9px;font-size:13px;font-weight:800;line-height:1;color:#fff}
.apulab-l2-guide-steps{display:flex;flex-direction:column;gap:7px;margin:0 0 10px}
.apulab-l2-guide-step{position:relative;box-sizing:border-box;min-height:25px;padding:5px 8px;border-left:3px solid transparent;font-size:12px;font-weight:800;line-height:1.2;color:#f8f9fa;overflow:hidden}
.apulab-l2-guide-step.is-active{border-left-color:#49C9D7;background:rgba(73,201,215,.11)}
.apulab-l2-guide-step.is-pending{color:#c8c4df;opacity:.84}
.apulab-l2-guide-step.is-complete{color:#d7b5d1;opacity:.82}
.apulab-l2-guide-step.is-complete::after{content:"";position:absolute;left:7px;right:7px;top:50%;height:2px;border-radius:999px;background:#e57bb4;box-shadow:0 0 5px rgba(229,123,180,.34);transform-origin:left center;animation:apulab-l2-guide-strike .34s ease-out both}
.apulab-l2-guide-copy{border-top:1px solid rgba(255,255,255,.12);padding-top:10px}
.apulab-l2-guide-copy strong{display:block;margin:0 0 4px;color:#fff;font-size:12px;font-weight:800;line-height:1.2}
.apulab-l2-guide-copy p{margin:0;color:#f0eef8;font-size:11px;font-weight:500;line-height:1.45}
.apulab-l2-guide-count{color:#A8EDF1;font-weight:800}
@keyframes apulab-l2-guide-strike{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@media (prefers-reduced-motion:reduce){.apulab-l2-guide-step.is-complete::after{animation:none}}
</style>`;

const runtime = `
<script id="apulab-level2-progress-guide-runtime">
(() => {
  // NIVEL 2 · GUÍA B. No usa MutationObserver global ni sustituye innerHTML del panel nativo.
  const panel = document.getElementById('kawsay-concept-panel');
  if (!panel) return;

  panel.classList.add('apulab-l2-guide-enhanced');
  const shell = document.createElement('div');
  shell.className = 'apulab-l2-guide-shell';
  shell.setAttribute('aria-hidden', 'true');
  panel.appendChild(shell);

  let previousCount = -1;
  let previousStage = -1;
  let audioContext = null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  const sfxEnabled = () => {
    try { return localStorage.getItem('apulab.settings.sfx') !== 'off'; }
    catch (_) { return true; }
  };

  const playGuideTick = () => {
    if (!AudioContextClass || !sfxEnabled()) return;
    if (!audioContext) audioContext = new AudioContextClass();
    const play = () => {
      if (!audioContext || audioContext.state !== 'running') return;
      const now = audioContext.currentTime;
      const master = audioContext.createGain();
      master.gain.setValueAtTime(0.78, now);
      master.connect(audioContext.destination);

      const tone = audioContext.createOscillator();
      const gain = audioContext.createGain();
      tone.type = 'triangle';
      tone.frequency.setValueAtTime(720, now);
      tone.frequency.exponentialRampToValueAtTime(940, now + 0.105);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.075, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
      tone.connect(gain); gain.connect(master);
      tone.start(now); tone.stop(now + 0.14);

      const sparkle = audioContext.createOscillator();
      const sparkleGain = audioContext.createGain();
      sparkle.type = 'sine';
      sparkle.frequency.setValueAtTime(1320, now + 0.018);
      sparkle.frequency.exponentialRampToValueAtTime(1580, now + 0.09);
      sparkleGain.gain.setValueAtTime(0.0001, now);
      sparkleGain.gain.linearRampToValueAtTime(0.028, now + 0.025);
      sparkleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.115);
      sparkle.connect(sparkleGain); sparkleGain.connect(master);
      sparkle.start(now + 0.018); sparkle.stop(now + 0.125);
    };
    if (audioContext.state === 'suspended') audioContext.resume().then(play).catch(() => {});
    else play();
  };

  const getCount = () => {
    try {
      const value = Number(window.__apulabLevel2MeasuredCount?.() ?? 0);
      return Math.max(0, Math.min(3, Number.isFinite(value) ? value : 0));
    } catch (_) { return 0; }
  };

  const stepClass = (index, stage) => {
    if (index < stage) return 'is-complete';
    if (index === stage) return 'is-active';
    return 'is-pending';
  };

  const copyFor = (count) => {
    if (count === 0) return {
      title: 'MIDE LAS 3 BATERÍAS',
      body: 'Usa el multímetro para medirlas una por una. El dato de misión se desbloquea cuando completes <span class="apulab-l2-guide-count">3 / 3</span>. Puedes medirlas en el orden que prefieras.'
    };
    if (count === 1) return {
      title: 'PRIMERA MEDICIÓN LISTA',
      body: 'Bien. Ahora mide las otras dos baterías. Puedes continuar en el orden que prefieras.'
    };
    if (count === 2) return {
      title: 'FALTA UNA BATERÍA',
      body: 'Ya tienes <span class="apulab-l2-guide-count">2 / 3</span> mediciones. Mide la batería restante para poder compararlas.'
    };
    return {
      title: 'YA TIENES LAS 3 MEDICIONES',
      body: 'Compara los voltajes registrados y elige la batería más adecuada para la misión.'
    };
  };

  const render = (force = false) => {
    const count = getCount();
    if (!force && count === previousCount) return;

    const stage = count === 0 ? 0 : count < 3 ? 1 : 2;
    const copy = copyFor(count);
    if (previousStage >= 0 && stage > previousStage) playGuideTick();

    shell.innerHTML =
      '<div class="apulab-l2-guide-kicker">GUÍA · 3 PASOS</div>' +
      '<div class="apulab-l2-guide-steps">' +
        '<div class="apulab-l2-guide-step ' + stepClass(0, stage) + '">1 · MIDE UNA BATERÍA</div>' +
        '<div class="apulab-l2-guide-step ' + stepClass(1, stage) + '">2 · MIDE LAS OTRAS DOS</div>' +
        '<div class="apulab-l2-guide-step ' + stepClass(2, stage) + '">3 · COMPARA Y ELIGE</div>' +
      '</div>' +
      '<div class="apulab-l2-guide-copy"><strong>' + copy.title + '</strong><p>' + copy.body + '</p></div>';

    previousCount = count;
    previousStage = stage;
  };

  // 300 ms, lectura de un Map y solo re-renderiza cuando cambia 0/1/2/3.
  const timer = window.setInterval(() => render(false), 300);
  render(true);

  const syncAria = () => {
    shell.setAttribute('aria-hidden', panel.classList.contains('is-guide') ? 'false' : 'true');
  };
  document.getElementById('kawsay-guide')?.addEventListener('click', () => window.setTimeout(syncAria, 0));

  const cleanup = () => {
    window.clearInterval(timer);
    if (audioContext && audioContext.state !== 'closed') audioContext.close().catch(() => {});
  };
  window.addEventListener('pagehide', cleanup, { once: true });
  window.addEventListener('beforeunload', cleanup, { once: true });
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'apulab-dispose') cleanup();
  });
})();
</script>`;

if (!html.includes('</head>') || !html.includes('</body>')) {
  throw new Error('mission01_level2_progress_guide_invalid_html');
}
html = html.replace('</head>', `${css}\n</head>`);
html = html.replace('</body>', `${runtime}\n</body>`);
await writeFile(LEVEL2_PATH, html, 'utf8');
console.info('[mission01] Level 2 · GUÍA progresiva optimizada sin MutationObserver global');

// Último parche: EXPLORAR 4/4 pasa directamente a GUÍA en Niveles 1 y 2.
await import('./patch-mission01-level12-auto-guide.mjs');
