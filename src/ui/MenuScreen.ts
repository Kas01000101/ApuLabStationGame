type MenuCallbacks = { onStart: () => void; onSettings: () => void; onCredits: () => void };

const CANONICAL_STAGE_WIDTH = 1672;
const CANONICAL_STAGE_HEIGHT = 941;
const CANONICAL_BG_X = 910;
const CANONICAL_BG_Y = 355;
const CANONICAL_BG_SCALE_X = 1.2353018166619714;
const CANONICAL_BG_SCALE_Y = 1.2585167201281886;

export class MenuScreen {
  private readonly element = document.createElement('section');
  private readonly background: HTMLImageElement;
  private readonly resizeObserver: ResizeObserver;

  constructor(private readonly root: HTMLElement, callbacks: MenuCallbacks) {
    this.element.className = 'menu-screen';
    this.element.innerHTML = `
      <img class="menu-bg-canonical" src="/assets/menu/apulab-menu-bg-hd.png" alt="" aria-hidden="true" />
      <div class="menu-actions" aria-label="Menú principal">
        <button data-action="start" class="btn-game btn-game--yellow btn-game--menu">INICIAR MISIÓN</button>
        <button data-action="settings" class="btn-game btn-game--purple btn-game--menu">AJUSTES</button>
        <button data-action="credits" class="btn-game btn-game--lavender btn-game--menu">CRÉDITOS</button>
      </div>
    `;

    this.root.appendChild(this.element);
    this.background = this.element.querySelector<HTMLImageElement>('.menu-bg-canonical')!;
    this.resizeObserver = new ResizeObserver(() => this.syncCanonicalBackground());
    this.resizeObserver.observe(this.element);
    this.background.addEventListener('load', () => this.syncCanonicalBackground(), { once: true });
    if (this.background.complete) this.syncCanonicalBackground();

    this.element.querySelector('[data-action="start"]')?.addEventListener('click', callbacks.onStart);
    this.element.querySelector('[data-action="settings"]')?.addEventListener('click', callbacks.onSettings);
    this.element.querySelector('[data-action="credits"]')?.addEventListener('click', callbacks.onCredits);
  }

  setVisible(value: boolean): void {
    this.element.classList.toggle('hidden', !value);
    if (value) requestAnimationFrame(() => this.syncCanonicalBackground());
  }

  private syncCanonicalBackground(): void {
    const width = this.element.clientWidth;
    const height = this.element.clientHeight;
    if (!width || !height || !this.background.naturalWidth || !this.background.naturalHeight) return;

    const stageScaleX = width / CANONICAL_STAGE_WIDTH;
    const stageScaleY = height / CANONICAL_STAGE_HEIGHT;

    this.background.style.width = `${this.background.naturalWidth * CANONICAL_BG_SCALE_X * stageScaleX}px`;
    this.background.style.height = `${this.background.naturalHeight * CANONICAL_BG_SCALE_Y * stageScaleY}px`;
    this.background.style.left = `${CANONICAL_BG_X * stageScaleX}px`;
    this.background.style.top = `${CANONICAL_BG_Y * stageScaleY}px`;
  }
}
