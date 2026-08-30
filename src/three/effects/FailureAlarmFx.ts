export function installFailureAlarmFx(uiRoot: HTMLElement): () => void {
  const indicator = document.createElement('div');
  indicator.className = 'failure-alarm-pi';
  indicator.setAttribute('aria-hidden', 'true');
  uiRoot.appendChild(indicator);

  let audioContext: AudioContext | undefined;
  let timers: number[] = [];
  let hideTimer = 0;

  const unlock = (): void => {
    audioContext ??= new AudioContext();
    if (audioContext.state === 'suspended') void audioContext.resume();
  };

  const beep = (high: boolean): void => {
    if (!audioContext || audioContext.state !== 'running') return;
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(high ? 930 : 720, now);
    osc.frequency.exponentialRampToValueAtTime(high ? 1120 : 860, now + 0.085);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.055, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.10);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  };

  const clear = (): void => {
    timers.forEach((timer) => window.clearTimeout(timer));
    timers = [];
    if (hideTimer) window.clearTimeout(hideTimer);
    indicator.classList.remove('show');
    indicator.textContent = '';
  };

  const flash = (index: number): void => {
    indicator.textContent = `PI${index < 3 ? ' ·' : ''}`;
    indicator.dataset.step = String(index + 1);
    indicator.classList.remove('show');
    void indicator.offsetWidth;
    indicator.classList.add('show');
    hideTimer = window.setTimeout(() => indicator.classList.remove('show'), 170);

    // IntroController ya produce el primer y último pitido canónico.
    // Añadimos solo los dos intermedios para obtener PI · PI · PI · PI.
    if (index === 1 || index === 2) beep(index === 2);
  };

  const runAlarm = (): void => {
    clear();
    [460, 760, 1060, 1360].forEach((delay, index) => {
      timers.push(window.setTimeout(() => flash(index), delay));
    });
  };

  const syncState = (): void => {
    if (document.documentElement.dataset.apulabState === 'mars-failure') runAlarm();
    else clear();
  };

  const observer = new MutationObserver(syncState);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-apulab-state'],
  });

  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);

  return () => {
    clear();
    observer.disconnect();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
    indicator.remove();
    void audioContext?.close();
  };
}
