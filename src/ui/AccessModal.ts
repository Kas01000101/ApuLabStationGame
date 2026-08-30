type StudyResult = { success: boolean; error?: string };
type Options = {
  onStudy: (code: string, credential: string) => Promise<StudyResult>;
  onDemo: () => Promise<boolean>;
};

export class AccessModal {
  private readonly overlay = document.createElement('div');
  private busy = false;

  constructor(private readonly root: HTMLElement, private readonly options: Options) {
    this.overlay.className = 'access-overlay';
    this.overlay.innerHTML = `
      <div class="access-card" role="dialog" aria-modal="true" aria-labelledby="access-title">
        <button class="close" type="button" aria-label="Cerrar">×</button>
        <h2 id="access-title">INICIAR MISIÓN</h2>

        <label for="participant-code">
          Código de participante
          <input id="participant-code" maxlength="32" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Ingresa tu código">
        </label>

        <label for="participant-credential">
          Contraseña
          <input id="participant-credential" type="password" maxlength="64" autocomplete="off" spellcheck="false" placeholder="Ingresa tu contraseña">
        </label>

        <p class="error" aria-live="polite"></p>
        <button class="btn primary continue" type="button">CONTINUAR</button>
        <p class="support">¿No tienes credenciales?</p>
        <button class="btn utility-light demo" type="button">MODO DEMO</button>
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
    this.overlay.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !this.busy) this.destroy();
    });

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
    this.overlay.remove();
  }
}
