type StudyResult = { success: boolean; error?: string };
type Options = { onStudy: (code: string, credential: string) => Promise<StudyResult>; onDemo: () => Promise<boolean> };

export class AccessModal {
  private readonly overlay = document.createElement('div');
  constructor(private readonly root: HTMLElement, private readonly options: Options) {
    this.overlay.className = 'access-overlay';
    this.overlay.innerHTML = `<div class="access-card" role="dialog" aria-modal="true"><button class="close" aria-label="Cerrar">×</button><h2>INICIAR MISIÓN</h2><label>Código de participante<input id="participant-code" maxlength="32" autocomplete="off" placeholder="Ingresa tu código"></label><label>Contraseña<input id="participant-credential" type="password" maxlength="64" autocomplete="off" placeholder="Ingresa tu contraseña"></label><p class="error"></p><button class="btn primary continue">Continuar</button><p class="support">¿No tienes credenciales?</p><button class="btn demo">Modo demo</button></div>`;
    this.root.appendChild(this.overlay);
    this.overlay.querySelector('.close')?.addEventListener('click', () => this.destroy());
    this.overlay.querySelector('.continue')?.addEventListener('click', () => void this.study());
    this.overlay.querySelector('.demo')?.addEventListener('click', () => void this.demo());
  }
  private get code(): HTMLInputElement { return this.overlay.querySelector('#participant-code')!; }
  private get credential(): HTMLInputElement { return this.overlay.querySelector('#participant-credential')!; }
  private setError(message: string): void { const el = this.overlay.querySelector('.error'); if (el) el.textContent = message; }
  private async study(): Promise<void> {
    const result = await this.options.onStudy(this.code.value.trim(), this.credential.value);
    if (result.success) this.destroy(); else this.setError(result.error ?? 'No se pudo iniciar la sesión.');
  }
  private async demo(): Promise<void> { if (await this.options.onDemo()) this.destroy(); }
  private destroy(): void { this.overlay.remove(); }
}
