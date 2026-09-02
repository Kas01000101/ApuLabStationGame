type Mission01Callbacks = {
  onUnavailableLevel?: (level: number) => void;
};

type PendingTransition = {
  level: number;
  frameIndex: number;
  token: number;
  ready: boolean;
  startedAt: number;
  onLoad: () => void;
};

const TOTAL_LEVELS = 7;
// En esta rama existen fuentes reales hasta el antiguo Nivel 6, que tras retirar
// el antiguo Nivel 3 corresponde al nuevo Nivel 5. No se inventan niveles 6/7.
const MAX_AVAILABLE_LEVEL = 5;
const TRANSITION_MS = 240;
const DISPOSE_GRACE_MS = 48;
const LEVEL_CURTAIN_MIN_MS = 760;
const SEQUENCE_MIGRATION_KEY = 'apulab.mission01.sequence7.v1';
const LEVEL_TITLES: Record<number, string> = {
  1: 'MEDIR',
  2: 'COMPARAR',
  3: 'ENTRENAMIENTO DE MOVIMIENTO',
  4: 'PLANIFICAR Y CORREGIR',
  5: 'PATRONES Y BUCLES',
};

function migrateMission01LocalProgressOnce(): void {
  try {
    if (localStorage.getItem(SEQUENCE_MIGRATION_KEY) === '1') return;

    const moveKey = (oldKey: string, newKey: string): void => {
      const oldValue = localStorage.getItem(oldKey);
      if (oldValue === null) return;
      if (localStorage.getItem(newKey) === null) localStorage.setItem(newKey, oldValue);
      localStorage.removeItem(oldKey);
    };

    moveKey('apulab.level4.successProgram', 'apulab.level3.successProgram');
    moveKey('apulab.level5.finalProgram', 'apulab.level4.finalProgram');

    localStorage.setItem(SEQUENCE_MIGRATION_KEY, '1');
  } catch (_) {
    // El juego sigue funcionando cuando localStorage está bloqueado.
  }
}

export class Mission01Screen {
  private readonly element = document.createElement('section');
  private readonly frames: HTMLIFrameElement[] = [];
  private readonly unavailableToast = document.createElement('div');
  private readonly transitionCurtain = document.createElement('div');
  private readonly transitionLevel = document.createElement('strong');
  private readonly transitionTitle = document.createElement('span');
  private activeFrameIndex = 0;
  private activeLevel = 1;
  private visible = false;
  private transitionToken = 0;
  private pending?: PendingTransition;
  private transitionTimer?: number;
  private curtainTimer?: number;
  private unavailableTimer?: number;
  private prefetchLink?: HTMLLinkElement;

  constructor(
    private readonly root: HTMLElement,
    private readonly callbacks: Mission01Callbacks = {},
  ) {
    migrateMission01LocalProgressOnce();

    this.element.className = 'mission01-screen hidden';
    this.element.setAttribute('aria-label', 'Misión 01');

    this.frames.push(this.createFrame('A'), this.createFrame('B'));
    this.frames[0].classList.add('is-active');
    this.frames[0].setAttribute('aria-hidden', 'false');
    this.frames[1].setAttribute('aria-hidden', 'true');

    this.transitionCurtain.className = 'mission01-level-transition';
    this.transitionCurtain.setAttribute('aria-hidden', 'true');
    this.transitionCurtain.setAttribute('role', 'status');
    this.transitionCurtain.setAttribute('aria-live', 'polite');
    const transitionKicker = document.createElement('small');
    transitionKicker.textContent = 'MISIÓN 01';
    this.transitionLevel.className = 'mission01-level-transition__level';
    this.transitionTitle.className = 'mission01-level-transition__title';
    this.transitionCurtain.append(transitionKicker, this.transitionLevel, this.transitionTitle);

    this.unavailableToast.className = 'mission01-unavailable-toast';
    this.unavailableToast.setAttribute('role', 'status');
    this.unavailableToast.setAttribute('aria-live', 'polite');

    this.element.append(...this.frames, this.transitionCurtain, this.unavailableToast);
    this.root.appendChild(this.element);
    window.addEventListener('message', this.handleMessage);
  }

  start(level = 1): void {
    this.setVisible(true);

    if (!this.isAvailable(level)) {
      this.showUnavailableLevel(level);
      return;
    }

    const activeFrame = this.frames[this.activeFrameIndex];
    const path = this.levelPath(level);
    this.activeLevel = level;
    this.cancelPendingTransition();

    activeFrame.classList.remove('is-loading', 'is-leaving', 'is-entering');
    activeFrame.classList.add('is-active');
    activeFrame.setAttribute('aria-hidden', 'false');
    activeFrame.title = `ApuLab · Misión 01 · Nivel ${level} de ${TOTAL_LEVELS}`;

    if (activeFrame.getAttribute('src') !== path) {
      activeFrame.addEventListener(
        'load',
        () => {
          if (this.activeFrameIndex === this.frames.indexOf(activeFrame) && this.activeLevel === level) {
            this.prefetchLevel(level + 1);
          }
        },
        { once: true },
      );
      activeFrame.src = path;
    } else {
      this.prefetchLevel(level + 1);
    }
  }

  setVisible(value: boolean): void {
    this.visible = value;
    this.element.classList.toggle('hidden', !value);
  }

  destroy(): void {
    window.removeEventListener('message', this.handleMessage);
    this.cancelPendingTransition();
    this.clearTimers();
    this.removePrefetch();

    for (const frame of this.frames) this.disposeFrame(frame, true);
    this.element.remove();
  }

  private createFrame(slot: string): HTMLIFrameElement {
    const frame = document.createElement('iframe');
    frame.className = 'mission01-frame';
    frame.dataset.slot = slot;
    frame.title = 'ApuLab · Misión 01';
    frame.setAttribute('allow', 'fullscreen');
    frame.setAttribute('referrerpolicy', 'same-origin');
    frame.setAttribute('loading', 'eager');
    return frame;
  }

  private isAvailable(level: number): boolean {
    return Number.isInteger(level) && level >= 1 && level <= MAX_AVAILABLE_LEVEL;
  }

  private levelPath(level: number): string {
    return `/missions/mission01/level${level}.html`;
  }

  private showLevelTransition(level: number): void {
    if (this.curtainTimer) window.clearTimeout(this.curtainTimer);
    this.curtainTimer = undefined;
    this.transitionLevel.textContent = `NIVEL ${level}`;
    this.transitionTitle.textContent = LEVEL_TITLES[level] ?? 'SIGUIENTE RETO';
    this.transitionCurtain.classList.add('show');
    this.transitionCurtain.setAttribute('aria-hidden', 'false');
  }

  private hideLevelTransition(delay = 0): void {
    if (this.curtainTimer) window.clearTimeout(this.curtainTimer);
    this.curtainTimer = window.setTimeout(() => {
      this.transitionCurtain.classList.remove('show');
      this.transitionCurtain.setAttribute('aria-hidden', 'true');
      this.curtainTimer = undefined;
    }, Math.max(0, delay));
  }

  private requestLevel(level: number): void {
    if (!this.isAvailable(level)) {
      this.showUnavailableLevel(level);
      return;
    }

    if (level === this.activeLevel || this.pending?.level === level) return;

    this.cancelPendingTransition();
    const token = ++this.transitionToken;
    const frameIndex = this.activeFrameIndex === 0 ? 1 : 0;
    const incoming = this.frames[frameIndex];
    const path = this.levelPath(level);
    const startedAt = performance.now();

    this.showLevelTransition(level);

    // El iframe de reserva puede disparar un load tardío de about:blank al ser
    // reciclado. Ese load NO debe confirmar la transición al siguiente nivel.
    this.disposeFrame(incoming, true);
    incoming.classList.remove('is-active', 'is-leaving', 'is-entering');
    incoming.classList.add('is-loading');
    incoming.setAttribute('aria-hidden', 'true');
    incoming.title = `ApuLab · Misión 01 · Nivel ${level} de ${TOTAL_LEVELS}`;

    const onLoad = (): void => {
      const pending = this.pending;
      if (!pending || pending.token !== token || pending.level !== level || pending.frameIndex !== frameIndex) {
        return;
      }

      let loadedPath = '';
      try {
        loadedPath = incoming.contentWindow?.location.pathname || '';
      } catch (_) {
        return;
      }

      // Solo el documento solicitado puede activar el fallback de READY.
      if (loadedPath !== path) return;
      incoming.removeEventListener('load', onLoad);
      this.markPendingReady(token, level, frameIndex);
    };

    this.pending = { level, frameIndex, token, ready: false, startedAt, onLoad };
    incoming.addEventListener('load', onLoad);
    incoming.src = path;
  }

  private markPendingReady(token: number, level: number, frameIndex: number): void {
    const pending = this.pending;
    if (!pending || pending.token !== token || pending.level !== level || pending.frameIndex !== frameIndex) {
      return;
    }
    if (pending.ready) return;
    pending.ready = true;

    const frame = this.frames[frameIndex];
    frame.removeEventListener('load', pending.onLoad);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.commitTransition(token));
    });
  }

  private commitTransition(token: number): void {
    const pending = this.pending;
    if (!pending || pending.token !== token || !pending.ready) return;

    const oldFrameIndex = this.activeFrameIndex;
    const oldFrame = this.frames[oldFrameIndex];
    const incoming = this.frames[pending.frameIndex];

    // Última defensa: nunca promover un iframe que no sea realmente el nivel
    // solicitado. Esto impide que about:blank o un documento anterior se vea como
    // un "reinicio" del nivel recién completado.
    try {
      if (incoming.contentWindow?.location.pathname !== this.levelPath(pending.level)) return;
    } catch (_) {
      return;
    }

    incoming.classList.remove('is-loading');
    incoming.classList.add('is-active', 'is-entering');
    incoming.setAttribute('aria-hidden', 'false');

    oldFrame.classList.remove('is-active');
    oldFrame.classList.add('is-leaving');
    oldFrame.setAttribute('aria-hidden', 'true');

    this.activeFrameIndex = pending.frameIndex;
    this.activeLevel = pending.level;
    const curtainElapsed = performance.now() - pending.startedAt;
    this.pending = undefined;
    this.prefetchLevel(this.activeLevel + 1);
    this.hideLevelTransition(Math.max(140, LEVEL_CURTAIN_MIN_MS - curtainElapsed));

    if (this.transitionTimer) window.clearTimeout(this.transitionTimer);
    this.transitionTimer = window.setTimeout(() => {
      incoming.classList.remove('is-entering');
      oldFrame.classList.remove('is-leaving');
      this.disposeFrame(oldFrame);
      this.transitionTimer = undefined;
    }, TRANSITION_MS);
  }

  private cancelPendingTransition(): void {
    const pending = this.pending;
    if (!pending) return;

    const frame = this.frames[pending.frameIndex];
    frame.removeEventListener('load', pending.onLoad);
    frame.classList.remove('is-loading', 'is-entering', 'is-active', 'is-leaving');
    frame.setAttribute('aria-hidden', 'true');
    this.disposeFrame(frame, true);
    this.pending = undefined;
    this.hideLevelTransition();
  }

  private disposeFrame(frame: HTMLIFrameElement, immediate = false): void {
    const clear = (): void => {
      try {
        const src = frame.getAttribute('src');
        if (src && src !== 'about:blank') frame.src = 'about:blank';
      } catch (_) {
        // El iframe puede estar navegando; dejarlo desmontar es suficiente.
      }
      frame.classList.remove('is-loading', 'is-entering', 'is-active', 'is-leaving');
      frame.setAttribute('aria-hidden', 'true');
    };

    try {
      frame.contentWindow?.postMessage({ type: 'apulab-dispose' }, window.location.origin);
    } catch (_) {
      // El listener pagehide/beforeunload del nivel actúa como respaldo.
    }

    if (immediate) {
      clear();
      return;
    }

    window.setTimeout(clear, DISPOSE_GRACE_MS);
  }

  private prefetchLevel(level: number): void {
    this.removePrefetch();
    if (!this.isAvailable(level)) return;

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'document';
    link.href = this.levelPath(level);
    link.dataset.apulabMissionPrefetch = String(level);
    document.head.appendChild(link);
    this.prefetchLink = link;
  }

  private removePrefetch(): void {
    this.prefetchLink?.remove();
    this.prefetchLink = undefined;
  }

  private showUnavailableLevel(level: number): void {
    this.callbacks.onUnavailableLevel?.(level);

    if (this.unavailableTimer) window.clearTimeout(this.unavailableTimer);
    this.unavailableToast.textContent = `NIVEL ${level} DE ${TOTAL_LEVELS} · AÚN NO ESTÁ INTEGRADO`;
    this.unavailableToast.classList.add('show');
    this.unavailableTimer = window.setTimeout(() => {
      this.unavailableToast.classList.remove('show');
      this.unavailableTimer = undefined;
    }, 2600);
  }

  private clearTimers(): void {
    if (this.transitionTimer) window.clearTimeout(this.transitionTimer);
    if (this.curtainTimer) window.clearTimeout(this.curtainTimer);
    if (this.unavailableTimer) window.clearTimeout(this.unavailableTimer);
    this.transitionTimer = undefined;
    this.curtainTimer = undefined;
    this.unavailableTimer = undefined;
  }

  private readonly handleMessage = (event: MessageEvent): void => {
    if (!this.visible || event.origin !== window.location.origin) return;

    const payload = event.data as { type?: unknown; level?: unknown; nextLevel?: unknown } | null;
    if (!payload) return;

    if (payload.type === 'apulab-level-ready') {
      const level = Number(payload.level);
      const pending = this.pending;
      if (!pending || !Number.isInteger(level) || level !== pending.level) return;
      if (event.source !== this.frames[pending.frameIndex].contentWindow) return;
      this.markPendingReady(pending.token, pending.level, pending.frameIndex);
      return;
    }

    if (payload.type !== 'apulab-level-complete') return;

    const activeFrame = this.frames[this.activeFrameIndex];
    if (event.source !== activeFrame.contentWindow) return;

    const completedLevel = Number(payload.level);
    if (!Number.isInteger(completedLevel) || completedLevel !== this.activeLevel) return;

    // La secuencia es lineal. El padre es la autoridad: un nivel completado solo
    // puede avanzar a activeLevel + 1. Ignoramos nextLevel heredado del iframe.
    const expectedNextLevel = this.activeLevel + 1;
    this.requestLevel(expectedNextLevel);
  };
}
