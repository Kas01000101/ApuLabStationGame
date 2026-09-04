const MUSIC_VOLUME_SETTING_KEY = 'apulab.settings.musicVolume';
const AMBIENT_TRACK_URL = '/assets/audio/specular-city.mp3';
const DEFAULT_MUSIC_VOLUME = 15;
const FADE_IN_MS = 900;
const FADE_OUT_MS = 250;
const INTRO_DUCK_VOLUME = 10;
const INTRO_DUCK_FADE_MS = 110;
const INTRO_DUCK_RESTORE_MS = 420;

type SettingsChangedDetail = { musicVolume?: number };
type IntroMusicDuckDetail = { durationMs?: number; volume?: number };

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
  private duckRestoreTimer?: number;

  constructor() {
    this.audio.loop = true;
    this.audio.preload = 'auto';
    this.audio.volume = 0;

    window.addEventListener('apulab-settings-changed', this.handleSettingsChanged as EventListener);
    window.addEventListener('apulab-intro-music-duck', this.handleIntroMusicDuck as EventListener);
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
    this.clearDuckRestoreTimer();
    this.disarm();
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    window.removeEventListener('apulab-settings-changed', this.handleSettingsChanged as EventListener);
    window.removeEventListener('apulab-intro-music-duck', this.handleIntroMusicDuck as EventListener);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private readonly handleFirstInteraction = (): void => {
    this.hasUserInteraction = true;
    this.disarm();
    if (this.getTargetVolume() > 0 && !document.hidden) void this.playWithFade();
  };

  private readonly handleSettingsChanged = (event: CustomEvent<SettingsChangedDetail>): void => {
    this.clearDuckRestoreTimer();
    const targetVolume = this.normalizeVolume(event.detail?.musicVolume ?? this.readVolumeSetting());
    if (targetVolume === 0) {
      this.fadeTo(0, FADE_OUT_MS, true);
      return;
    }

    if (this.hasUserInteraction && !document.hidden) {
      if (this.audio.paused) void this.playWithFade();
      else this.fadeTo(targetVolume, FADE_OUT_MS);
    } else {
      this.arm();
    }
  };

  /**
   * Los golpes importantes de la intro pueden pedir espacio en la mezcla.
   * Nunca subimos la música: si la jugadora ya la tiene por debajo del 10%,
   * conservamos ese nivel. Después restauramos su volumen configurado.
   */
  private readonly handleIntroMusicDuck = (event: CustomEvent<IntroMusicDuckDetail>): void => {
    if (!this.hasUserInteraction || this.audio.paused) return;

    this.clearDuckRestoreTimer();
    const requestedPercent = Number.isFinite(event.detail?.volume)
      ? Math.max(0, Math.min(100, Number(event.detail.volume)))
      : INTRO_DUCK_VOLUME;
    const userTarget = this.getTargetVolume();
    const duckTarget = Math.min(userTarget, this.normalizeVolume(requestedPercent));
    const durationMs = Math.max(250, event.detail?.durationMs ?? 900);

    this.fadeTo(duckTarget, INTRO_DUCK_FADE_MS);
    this.duckRestoreTimer = window.setTimeout(() => {
      this.duckRestoreTimer = undefined;
      if (!this.audio.paused) this.fadeTo(this.getTargetVolume(), INTRO_DUCK_RESTORE_MS);
    }, durationMs);
  };

  private readonly handleVisibilityChange = (): void => {
    // No pausamos la música al cambiar de pestaña. Los elementos HTMLAudio
    // pueden seguir reproduciéndose en segundo plano y así evitamos que el
    // navegador exija un gesto nuevo al volver a ApuLab Station.
    if (document.hidden) return;

    // Si el navegador suspendió el audio por su cuenta, intentamos reanudarlo
    // al recuperar la pestaña. Si la política de autoplay lo impide,
    // playWithFade vuelve a armar el siguiente gesto de la jugadora.
    if (this.hasUserInteraction && this.getTargetVolume() > 0 && this.audio.paused) {
      void this.playWithFade();
    }
  };

  private async playWithFade(): Promise<void> {
    this.cancelFade();
    this.audio.volume = 0;

    try {
      await this.audio.play();
      this.fadeTo(this.getTargetVolume(), FADE_IN_MS);
    } catch {
      // Si el navegador aún exige un gesto válido, volvemos a esperar uno.
      this.hasUserInteraction = false;
      this.arm();
    }
  }

  private fadeTo(targetVolume: number, durationMs: number, pauseAfterFade = false): void {
    this.cancelFade();
    this.fadeStartedAt = performance.now();
    this.fadeStartVolume = this.clampPlaybackVolume(this.audio.volume);
    this.fadeTargetVolume = this.clampPlaybackVolume(targetVolume);
    this.fadeDuration = Math.max(1, durationMs);
    this.pauseAfterFade = pauseAfterFade;
    this.fadeFrame = requestAnimationFrame(this.stepFade);
  }

  private readonly stepFade = (now: number): void => {
    const progress = Math.min(1, Math.max(0, (now - this.fadeStartedAt) / this.fadeDuration));
    const eased = 1 - Math.pow(1 - progress, 3);
    const nextVolume = this.fadeStartVolume
      + (this.fadeTargetVolume - this.fadeStartVolume) * eased;

    // HTMLMediaElement.volume lanza IndexSizeError fuera de [0, 1].
    // Los fades encadenados (duck/restore/transition) pueden acumular un error
    // flotante mínimo, así que limitamos siempre el valor antes de asignarlo.
    this.audio.volume = this.clampPlaybackVolume(nextVolume);

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

  private clearDuckRestoreTimer(): void {
    if (this.duckRestoreTimer !== undefined) window.clearTimeout(this.duckRestoreTimer);
    this.duckRestoreTimer = undefined;
  }

  private disarm(): void {
    window.removeEventListener('pointerdown', this.handleFirstInteraction, true);
    window.removeEventListener('keydown', this.handleFirstInteraction, true);
    this.armed = false;
  }

  private getTargetVolume(): number {
    return this.normalizeVolume(this.readVolumeSetting());
  }

  private readVolumeSetting(): number {
    try {
      const stored = window.localStorage.getItem(MUSIC_VOLUME_SETTING_KEY);
      if (stored === null) return DEFAULT_MUSIC_VOLUME;
      const parsed = Number(stored);
      return Number.isFinite(parsed) ? parsed : DEFAULT_MUSIC_VOLUME;
    } catch {
      return DEFAULT_MUSIC_VOLUME;
    }
  }

  private normalizeVolume(value: number): number {
    return this.clampPlaybackVolume(value / 100);
  }

  private clampPlaybackVolume(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.min(1, Math.max(0, value));
  }
}
