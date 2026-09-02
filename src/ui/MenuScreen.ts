type MenuCallbacks = { onStart: () => void };

const SFX_SETTING_KEY = 'apulab.settings.sfx';
const MUSIC_VOLUME_SETTING_KEY = 'apulab.settings.musicVolume';
const DEFAULT_MUSIC_VOLUME = 15;

export class MenuScreen {
  private readonly element = document.createElement('section');
  private sfxEnabled = true;
  private musicVolume = DEFAULT_MUSIC_VOLUME;

  constructor(private readonly root: HTMLElement, callbacks: MenuCallbacks) {
    this.sfxEnabled = this.readSetting(SFX_SETTING_KEY) !== 'off';
    this.musicVolume = this.readMusicVolume();
    this.element.className = 'menu-screen';
    this.element.innerHTML = `
      <img class="menu-bg-canonical" src="/assets/menu/Fondo_menu.png" alt="" aria-hidden="true" />
      <div class="menu-actions" aria-label="Menú principal">
        <button data-action="start" class="btn-game btn-game--yellow btn-game--menu">INICIAR MISIÓN</button>
        <button data-action="settings" class="btn-game btn-game--purple btn-game--menu">AJUSTES</button>
        <button data-action="credits" class="btn-game btn-game--lavender btn-game--menu">CRÉDITOS</button>
      </div>

      <div class="menu-settings-overlay" data-settings-panel aria-hidden="true">
        <section class="menu-settings-panel" role="dialog" aria-modal="true" aria-labelledby="menu-settings-title">
          <button class="menu-settings-close" data-settings-close type="button" aria-label="Cerrar ajustes">×</button>
          <div class="menu-settings-kicker">APULAB STATION</div>
          <h2 id="menu-settings-title">AJUSTES</h2>

          <div class="menu-settings-row">
            <div class="menu-settings-copy">
              <strong>MÚSICA</strong>
              <span>Volumen de la música ambiental</span>
            </div>
            <div class="menu-settings-volume">
              <input
                data-music-volume
                id="music-volume"
                type="range"
                min="0"
                max="100"
                step="5"
                value="${DEFAULT_MUSIC_VOLUME}"
                aria-label="Volumen de la música"
              />
              <output data-music-volume-label for="music-volume">${DEFAULT_MUSIC_VOLUME}%</output>
            </div>
          </div>

          <div class="menu-settings-row">
            <div class="menu-settings-copy">
              <strong>EFECTOS</strong>
              <span>Sonidos de botones y misiones</span>
            </div>
            <button class="menu-settings-toggle" data-sfx-toggle type="button" aria-pressed="true">
              <span class="menu-settings-toggle-knob" aria-hidden="true"></span>
              <span data-sfx-label>ON</span>
            </button>
          </div>

          <div class="menu-settings-row">
            <div class="menu-settings-copy">
              <strong>IDIOMA</strong>
              <span>Idioma actual</span>
            </div>
            <div class="menu-settings-language" aria-label="Idioma: Español">ESPAÑOL</div>
          </div>

          <button class="menu-settings-reset" data-settings-reset type="button">RESTABLECER AJUSTES</button>
        </section>
      </div>

      <div class="menu-settings-overlay" data-credits-panel aria-hidden="true">
        <section class="menu-settings-panel menu-credits-panel" role="dialog" aria-modal="true" aria-labelledby="menu-credits-title">
          <button class="menu-settings-close" data-credits-close type="button" aria-label="Cerrar créditos">×</button>
          <div class="menu-settings-kicker">APULAB STATION</div>
          <h2 id="menu-credits-title">CRÉDITOS</h2>

          <div class="menu-settings-row menu-credits-row">
            <div class="menu-settings-copy menu-credits-copy">
              <strong>MÚSICA</strong>
              <span class="menu-credits-track">“Specular City” — Vitalezzz</span>
              <span>Música con licencia CC0 1.0.</span>
              <span>Fuente: OpenGameArt.</span>
            </div>
          </div>
        </section>
      </div>
    `;

    this.root.appendChild(this.element);

    this.element.querySelector('[data-action="start"]')?.addEventListener('click', callbacks.onStart);
    this.element.querySelector('[data-action="settings"]')?.addEventListener('click', this.openSettings);
    this.element.querySelector('[data-action="credits"]')?.addEventListener('click', this.openCredits);
    this.element.querySelector('[data-settings-close]')?.addEventListener('click', this.closeSettings);
    this.element.querySelector('[data-credits-close]')?.addEventListener('click', this.closeCredits);
    this.element.querySelector('[data-sfx-toggle]')?.addEventListener('click', this.toggleSfx);
    this.element.querySelector('[data-music-volume]')?.addEventListener('input', this.changeMusicVolume);
    this.element.querySelector('[data-settings-reset]')?.addEventListener('click', this.resetSettings);
    this.element.querySelector('[data-settings-panel]')?.addEventListener('click', (event) => {
      if (event.target === event.currentTarget) this.closeSettings();
    });
    this.element.querySelector('[data-credits-panel]')?.addEventListener('click', (event) => {
      if (event.target === event.currentTarget) this.closeCredits();
    });
    window.addEventListener('keydown', this.handleKeydown);
    this.syncSettingsUi();
  }

  setVisible(value: boolean): void {
    this.element.classList.toggle('hidden', !value);
    if (!value) {
      this.closeSettings();
      this.closeCredits();
    }
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeydown);
    this.element.remove();
  }

  private readonly openSettings = (): void => {
    this.closeCredits();
    const panel = this.element.querySelector<HTMLElement>('[data-settings-panel]');
    panel?.classList.add('visible');
    panel?.setAttribute('aria-hidden', 'false');
    this.syncSettingsUi();
  };

  private readonly closeSettings = (): void => {
    const panel = this.element.querySelector<HTMLElement>('[data-settings-panel]');
    panel?.classList.remove('visible');
    panel?.setAttribute('aria-hidden', 'true');
  };

  private readonly openCredits = (): void => {
    this.closeSettings();
    const panel = this.element.querySelector<HTMLElement>('[data-credits-panel]');
    panel?.classList.add('visible');
    panel?.setAttribute('aria-hidden', 'false');
  };

  private readonly closeCredits = (): void => {
    const panel = this.element.querySelector<HTMLElement>('[data-credits-panel]');
    panel?.classList.remove('visible');
    panel?.setAttribute('aria-hidden', 'true');
  };

  private readonly toggleSfx = (): void => {
    this.sfxEnabled = !this.sfxEnabled;
    this.saveSettings();
  };

  private readonly resetSettings = (): void => {
    this.sfxEnabled = true;
    this.musicVolume = DEFAULT_MUSIC_VOLUME;
    this.saveSettings();
  };

  private readonly changeMusicVolume = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    this.musicVolume = this.clampVolume(Number(input.value));
    this.saveSettings();
  };

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    this.closeSettings();
    this.closeCredits();
  };

  private saveSettings(): void {
    localStorage.setItem(SFX_SETTING_KEY, this.sfxEnabled ? 'on' : 'off');
    localStorage.setItem(MUSIC_VOLUME_SETTING_KEY, String(this.musicVolume));
    this.syncSettingsUi();
    window.dispatchEvent(
      new CustomEvent('apulab-settings-changed', {
        detail: {
          sfxEnabled: this.sfxEnabled,
          musicVolume: this.musicVolume,
          language: 'es',
        },
      }),
    );
  }

  private syncSettingsUi(): void {
    const toggle = this.element.querySelector<HTMLButtonElement>('[data-sfx-toggle]');
    const label = this.element.querySelector<HTMLElement>('[data-sfx-label]');
    const volume = this.element.querySelector<HTMLInputElement>('[data-music-volume]');
    const volumeLabel = this.element.querySelector<HTMLOutputElement>('[data-music-volume-label]');
    toggle?.classList.toggle('is-off', !this.sfxEnabled);
    toggle?.setAttribute('aria-pressed', String(this.sfxEnabled));
    if (label) label.textContent = this.sfxEnabled ? 'ON' : 'OFF';
    if (volume) {
      volume.value = String(this.musicVolume);
      volume.style.setProperty('--music-volume', `${this.musicVolume}%`);
    }
    if (volumeLabel) volumeLabel.textContent = `${this.musicVolume}%`;
  }

  private readMusicVolume(): number {
    const stored = this.readSetting(MUSIC_VOLUME_SETTING_KEY);
    if (stored === null) return DEFAULT_MUSIC_VOLUME;
    const parsed = Number(stored);
    return Number.isFinite(parsed) ? this.clampVolume(parsed) : DEFAULT_MUSIC_VOLUME;
  }

  private readSetting(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private clampVolume(value: number): number {
    return Math.min(100, Math.max(0, Math.round(value / 5) * 5));
  }
}
