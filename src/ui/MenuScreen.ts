type MenuCallbacks = { onStart: () => void; onSettings: () => void; onCredits: () => void };

export class MenuScreen {
  private readonly element = document.createElement('section');

  constructor(private readonly root: HTMLElement, callbacks: MenuCallbacks) {
    this.element.className = 'menu-screen';
    this.element.innerHTML = `
      <div class="menu-actions" aria-label="Menú principal">
        <button data-action="start" class="btn primary">INICIAR MISIÓN</button>
        <button data-action="settings" class="btn utility-dark">AJUSTES</button>
        <button data-action="credits" class="btn utility-light">CRÉDITOS</button>
      </div>
    `;

    this.root.appendChild(this.element);
    this.element.querySelector('[data-action="start"]')?.addEventListener('click', callbacks.onStart);
    this.element.querySelector('[data-action="settings"]')?.addEventListener('click', callbacks.onSettings);
    this.element.querySelector('[data-action="credits"]')?.addEventListener('click', callbacks.onCredits);
  }

  setVisible(value: boolean): void {
    this.element.classList.toggle('hidden', !value);
  }
}
