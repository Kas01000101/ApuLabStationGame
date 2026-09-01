const SOUND_SETTING_KEY = 'apulab.settings.sfx';
const AMBIENT_TRACK_URL = '/assets/audio/an-ocean-in-outer-space.ogg';
const AMBIENT_VOLUME = 0.2;
const FADE_IN_MS = 2500;
const FADE_OUT_MS = 250;

type SettingsChangedDetail = { sfxEnabled?: boolean };

/**
 * Música ambiental global de ApuLab Station.
 *
 * Los navegadores bloquean audio sin una interacción previa. Por eso la
 * pista queda preparada al iniciar la app y comienza en el primer clic o
 * pulsación de teclado de la jugadora.
 */
export class AmbientMusic {
  private readonly audio = new Audio(AMBIENT_TRACK_URL);
  private hasUserInteraction = false;
  private fadeFrame?: number;
  private fadeStartedAt = 0;
  private fadeStartVolume = 0;
  private fadeTargetVolume = 0;
  private fadeDuration = 0;
  private pauseAfterFade = false;
  private armed = false;

  constructor() {
    this.audio.loop = true;
    this.audio.preload = 'auto';
    this.audio.volume = 0;

    window.addEventListener('apulab-settings-changed', this.handleSettingsChanged as EventListener);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  arm(): void {
    if (this.armed || this.hasUserInteraction) return;
    this.armed = true;
    window.addEventListener('pointerdown', this.handleFirstInteraction, { capture: true, once: true });
    window.addEventListener('keydown', this.handleFirstInteraction, { capture: true, once: true });
  }

  destroy(): void {
    this.cancelFade();
    this.disarm();
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    window.removeEventListener('apulab-settings-changed', this.handleSettingsChanged as EventListener);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private readonly handleFirstInteraction = (): void => {
    this.hasUserInteraction = true;
    this.disarm();
    if (this.isEnabled() && !document.hidden) void this.playWithFade();
  };

  private readonly handleSettingsChanged = (event: CustomEvent<SettingsChangedDetail>): void => {
    const enabled = event.detail?.sfxEnabled ?? this.isEnabled();
    if (!enabled) {
      this.fadeTo(0, FADE_OUT_MS, true);
      return;
    }

    if (this.hasUserInteraction && !document.hidden) {
      void this.playWithFade();
    } else {
      this.arm();
    }
  };

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.cancelFade();
      this.audio.pause();
      this.audio.volume = 0;
      return;
    }

    if (this.hasUserInteraction && this.isEnabled()) void this.playWithFade();
  };

  private async playWithFade(): Promise<void> {
    this.cancelFade();
    this.audio.volume = 0;

    try {
      await this.audio.play();
      this.fadeTo(AMBIENT_VOLUME, FADE_IN_MS);
    } catch {
      // Si el navegador aún exige un gesto válido, volvemos a esperar uno.
      this.hasUserInteraction = false;
      this.arm();
    }
  }

  private fadeTo(targetVolume: number, durationMs: number, pauseAfterFade = false): void {
    this.cancelFade();
    this.fadeStartedAt = performance.now();
    this.fadeStartVolume = this.audio.volume;
    this.fadeTargetVolume = targetVolume;
    this.fadeDuration = Math.max(1, durationMs);
    this.pauseAfterFade = pauseAfterFade;
    this.fadeFrame = requestAnimationFrame(this.stepFade);
  }

  private readonly stepFade = (now: number): void => {
    const progress = Math.min(1, (now - this.fadeStartedAt) / this.fadeDuration);
    const eased = 1 - Math.pow(1 - progress, 3);
    this.audio.volume = this.fadeStartVolume
      + (this.fadeTargetVolume - this.fadeStartVolume) * eased;

    if (progress < 1) {
      this.fadeFrame = requestAnimationFrame(this.stepFade);
      return;
    }

    this.fadeFrame = undefined;
    if (this.pauseAfterFade) this.audio.pause();
  };

  private cancelFade(): void {
    if (this.fadeFrame !== undefined) cancelAnimationFrame(this.fadeFrame);
    this.fadeFrame = undefined;
    this.pauseAfterFade = false;
  }

  private disarm(): void {
    window.removeEventListener('pointerdown', this.handleFirstInteraction, true);
    window.removeEventListener('keydown', this.handleFirstInteraction, true);
    this.armed = false;
  }

  private isEnabled(): boolean {
    try {
      return window.localStorage.getItem(SOUND_SETTING_KEY) !== 'off';
    } catch {
      return true;
    }
  }
}
