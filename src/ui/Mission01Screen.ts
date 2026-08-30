type Mission01Callbacks = {
  onUnavailableLevel?: (level: number) => void;
};

export class Mission01Screen {
  private readonly element = document.createElement('section');
  private readonly frame = document.createElement('iframe');
  private activeLevel = 1;
  private visible = false;

  constructor(
    private readonly root: HTMLElement,
    private readonly callbacks: Mission01Callbacks = {},
  ) {
    this.element.className = 'mission01-screen hidden';
    this.element.setAttribute('aria-label', 'Misión 01');

    this.frame.className = 'mission01-frame';
    this.frame.title = 'ApuLab · Misión 01';
    this.frame.setAttribute('allow', 'fullscreen');
    this.frame.setAttribute('referrerpolicy', 'same-origin');

    this.element.appendChild(this.frame);
    this.root.appendChild(this.element);
    window.addEventListener('message', this.handleMessage);
  }

  start(level = 1): void {
    this.loadLevel(level);
    this.setVisible(true);
  }

  setVisible(value: boolean): void {
    this.visible = value;
    this.element.classList.toggle('hidden', !value);
  }

  destroy(): void {
    window.removeEventListener('message', this.handleMessage);
    this.frame.src = 'about:blank';
    this.element.remove();
  }

  private loadLevel(level: number): void {
    if (level < 1 || level > 3) {
      this.callbacks.onUnavailableLevel?.(level);
      return;
    }

    this.activeLevel = level;
    const path = `/missions/mission01/level${level}.html`;
    if (this.frame.getAttribute('src') !== path) this.frame.src = path;
    this.frame.title = `ApuLab · Misión 01 · Nivel ${level} de 8`;
  }

  private readonly handleMessage = (event: MessageEvent): void => {
    if (!this.visible || event.source !== this.frame.contentWindow) return;
    if (event.origin !== window.location.origin) return;

    const payload = event.data as { type?: unknown; nextLevel?: unknown } | null;
    if (!payload || payload.type !== 'apulab-level-complete') return;

    const nextLevel = Number(payload.nextLevel);
    if (!Number.isInteger(nextLevel)) return;

    if (nextLevel >= 1 && nextLevel <= 3) {
      this.loadLevel(nextLevel);
      return;
    }

    this.callbacks.onUnavailableLevel?.(nextLevel);
  };
}
