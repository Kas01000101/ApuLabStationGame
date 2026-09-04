type StudyResult = { success: boolean; error?: string };
type Options = {
  onStudy: (code: string, credential: string) => Promise<StudyResult>;
  onDemo: () => Promise<boolean>;
};

export class AccessModal {
  private readonly overlay = document.createElement('div');
  private readonly returnFocus: HTMLElement | null;
  private busy = false;

  constructor(private readonly root: HTMLElement, private readonly options: Options) {
    this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.overlay.className = 'access-overlay ui-modal-backdrop';
    this.overlay.innerHTML = `
      <div class="ui-modal access-modal" role="dialog" aria-modal="true" aria-labelledby="access-title">
        <button class="ui-modal__close close" type="button" aria-label="Cerrar">×</button>
        <h2 id="access-title" class="ui-modal__title">INICIAR MISIÓN</h2>

        <div class="ui-modal__body">
          <div class="ui-field-wrap">
            <label class="ui-label" for="participant-code">Código de participante</label>
            <input
              id="participant-code"
              class="ui-field"
              maxlength="32"
              autocomplete="off"
              autocapitalize="none"
              spellcheck="false"
              placeholder="Ingresa tu código"
            >
          </div>

          <div class="ui-field-wrap">
            <label class="ui-label" for="participant-credential">Contraseña</label>
            <input
              id="participant-credential"
              class="ui-field"
              type="password"
              maxlength="64"
              autocomplete="off"
              spellcheck="false"
              placeholder="Ingresa tu contraseña"
            >
          </div>

          <p class="error ui-modal__error" aria-live="polite"></p>

          <div class="ui-modal__actions">
            <button class="btn-game btn-game--yellow btn-game--md continue" type="button">CONTINUAR</button>
            <p class="ui-modal__helper">¿No tienes credenciales?</p>
            <button class="btn-game btn-game--lavender btn-game--md demo" type="button">MODO DEMO</button>
          </div>
        </div>
      </div>
    `;

    this.root.appendChild(this.overlay);
    this.closeButton.addEventListener('click', () => this.destroy());
    this.continueButton.addEventListener('click', () => void this.study());
    this.demoButton.addEventListener('click', () => void this.demo());

    this.code.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') this.credential.focus();
    });
    this.credential.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') void this.study();
    });
    this.overlay.addEventListener('keydown', this.handleDialogKeydown);

    this.code.focus();
  }

  private get code(): HTMLInputElement {
    return this.overlay.querySelector('#participant-code')!;
  }

  private get credential(): HTMLInputElement {
    return this.overlay.querySelector('#participant-credential')!;
  }

  private get continueButton(): HTMLButtonElement {
    return this.overlay.querySelector('.continue')!;
  }

  private get demoButton(): HTMLButtonElement {
    return this.overlay.querySelector('.demo')!;
  }

  private get closeButton(): HTMLButtonElement {
    return this.overlay.querySelector('.close')!;
  }

  private readonly handleDialogKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && !this.busy) {
      event.preventDefault();
      this.destroy();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = [...this.overlay.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    )].filter((element) => element.offsetParent !== null);

    if (!focusable.length) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (!this.overlay.contains(active)) {
      event.preventDefault();
      first.focus();
      return;
    }
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  private setError(message: string): void {
    const element = this.overlay.querySelector('.error');
    if (element) element.textContent = message;
  }

  private setBusy(value: boolean): void {
    this.busy = value;
    this.continueButton.disabled = value;
    this.demoButton.disabled = value;
    this.closeButton.disabled = value;
    this.code.disabled = value;
    this.credential.disabled = value;
  }

  private async study(): Promise<void> {
    if (this.busy) return;
    const code = this.code.value.trim();
    const credential = this.credential.value;

    if (!code || !credential) {
      this.setError('Completa código y contraseña.');
      return;
    }

    this.setError('');
    this.setBusy(true);
    try {
      const result = await this.options.onStudy(code, credential);
      if (result.success) {
        this.destroy();
        return;
      }
      this.setError(result.error ?? 'No se pudo iniciar la sesión.');
    } finally {
      if (this.overlay.isConnected) this.setBusy(false);
    }
  }

  private async demo(): Promise<void> {
    if (this.busy) return;
    this.setError('');
    this.setBusy(true);
    try {
      if (await this.options.onDemo()) {
        this.destroy();
        return;
      }
      this.setError('No se pudo iniciar el modo demo.');
    } finally {
      if (this.overlay.isConnected) this.setBusy(false);
    }
  }

  private destroy(): void {
    this.code.value = '';
    this.credential.value = '';
    this.overlay.removeEventListener('keydown', this.handleDialogKeydown);
    this.overlay.remove();
    if (this.returnFocus?.isConnected) this.returnFocus.focus({ preventScroll: true });
  }
}
