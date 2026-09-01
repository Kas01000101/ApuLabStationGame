type MenuCallbacks = { onStart: () => void; onCredits: () => void };

const SFX_SETTING_KEY = 'apulab.settings.sfx';

export class MenuScreen {
  private readonly element = document.createElement('section');
  private sfxEnabled = true;

  constructor(private readonly root: HTMLElement, callbacks: MenuCallbacks) {
    this.sfxEnabled = localStorage.getItem(SFX_SETTING_KEY) !== 'off';
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
              <strong>SONIDO</strong>
              <span>Música ambiental y efectos</span>
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
    `;

    this.root.appendChild(this.element);

    this.element.querySelector('[data-action="start"]')?.addEventListener('click', callbacks.onStart);
    this.element.querySelector('[data-action="settings"]')?.addEventListener('click', this.openSettings);
    this.element.querySelector('[data-action="credits"]')?.addEventListener('click', callbacks.onCredits);
    this.element.querySelector('[data-settings-close]')?.addEventListener('click', this.closeSettings);
    this.element.querySelector('[data-sfx-toggle]')?.addEventListener('click', this.toggleSfx);
    this.element.querySelector('[data-settings-reset]')?.addEventListener('click', this.resetSettings);
    this.element.querySelector('[data-settings-panel]')?.addEventListener('click', (event) => {
      if (event.target === event.currentTarget) this.closeSettings();
    });
    window.addEventListener('keydown', this.handleKeydown);
    this.syncSettingsUi();
  }

  setVisible(value: boolean): void {
    this.element.classList.toggle('hidden', !value);
    if (!value) this.closeSettings();
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeydown);
    this.element.remove();
  }

  private readonly openSettings = (): void => {
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

  private readonly toggleSfx = (): void => {
    this.sfxEnabled = !this.sfxEnabled;
    this.saveSettings();
  };

  private readonly resetSettings = (): void => {
    this.sfxEnabled = true;
    this.saveSettings();
  };

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') this.closeSettings();
  };

  private saveSettings(): void {
    localStorage.setItem(SFX_SETTING_KEY, this.sfxEnabled ? 'on' : 'off');
    this.syncSettingsUi();
    window.dispatchEvent(
      new CustomEvent('apulab-settings-changed', {
        detail: { sfxEnabled: this.sfxEnabled, language: 'es' },
      }),
    );
  }

  private syncSettingsUi(): void {
    const toggle = this.element.querySelector<HTMLButtonElement>('[data-sfx-toggle]');
    const label = this.element.querySelector<HTMLElement>('[data-sfx-label]');
    toggle?.classList.toggle('is-off', !this.sfxEnabled);
    toggle?.setAttribute('aria-pressed', String(this.sfxEnabled));
    if (label) label.textContent = this.sfxEnabled ? 'ON' : 'OFF';
  }
}
