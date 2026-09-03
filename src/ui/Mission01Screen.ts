type Mission01Callbacks = {
  onUnavailableLevel?: (level: number) => void;
};

type PendingTransition = {
  level: number;
  frameIndex: number;
  token: number;
  ready: boolean;
  onLoad: () => void;
};

type Mission01LegacyBridgeWindow = Window & {
  apulabCompleteLevel?: (completedLevel: number, nextLevel?: number) => void;
  apulabLevelReady?: (level: number) => void;
};

const TOTAL_LEVELS = 7;
const MAX_AVAILABLE_LEVEL = 7;
const TRANSITION_MS = 240;
const SEQUENCE_MIGRATION_KEY = 'apulab.mission01.sequence7.v1';

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
    // El juego sigue funcionando aunque localStorage esté bloqueado.
  }
}

export class Mission01Screen {
  private readonly element = document.createElement('section');
  private readonly frames: HTMLIFrameElement[] = [];
  private readonly unavailableToast = document.createElement('div');

  private activeFrameIndex = 0;
  private activeLevel = 1;
  private visible = false;
  private transitionToken = 0;
  private pending?: PendingTransition;
  private transitionTimer?: number;
  private unavailableTimer?: number;
  private prefetchLink?: HTMLLinkElement;
  private previousLegacyComplete?: Mission01LegacyBridgeWindow['apulabCompleteLevel'];
  private previousLegacyReady?: Mission01LegacyBridgeWindow['apulabLevelReady'];

  constructor(
    private readonly root: HTMLElement,
    private readonly callbacks: Mission01Callbacks = {},
  ) {
    migrateMission01LocalProgressOnce();

    this.element.className = 'mission01-screen hidden';
    this.element.setAttribute('aria-label', 'Misión 01');

    // APULAB_TRANSITION_NATIVE_UNLOAD_V4
    // Mission 01 usa un único iframe. Para avanzar no enviamos mensajes de
    // dispose: navegar el mismo browsing context dispara pagehide/beforeunload
    // del documento anterior antes de inicializar el nuevo nivel. Así evitamos
    // que un mensaje de dispose atrasado alcance accidentalmente al documento
    // recién cargado y destruya su WebGLRenderer.
    this.frames.push(this.createFrame('A'));
    this.frames[0].classList.add('is-active');
    this.frames[0].setAttribute('aria-hidden', 'false');

    this.unavailableToast.className = 'mission01-unavailable-toast';
    this.unavailableToast.setAttribute('role', 'status');
    this.unavailableToast.setAttribute('aria-live', 'polite');

    this.element.append(...this.frames, this.unavailableToast);
    this.root.appendChild(this.element);
    window.addEventListener('message', this.handleMessage);
    this.installLegacyNavigationBridge();
  }

  start(level = 1): void {
    this.setVisible(true);

    if (!this.isAvailable(level)) {
      this.showUnavailableLevel(level);
      return;
    }

    this.cancelPendingTransition();
    const activeFrame = this.frames[this.activeFrameIndex];
    const path = this.levelPath(level);
    this.activeLevel = level;

    activeFrame.classList.remove('is-loading', 'is-leaving', 'is-entering');
    activeFrame.classList.add('is-active');
    activeFrame.setAttribute('aria-hidden', 'false');
    activeFrame.title = `ApuLab · Misión 01 · Nivel ${level} de ${TOTAL_LEVELS}`;

    if (activeFrame.getAttribute('src') !== path) {
      activeFrame.addEventListener(
        'load',
        () => {
          if (this.activeFrameIndex === 0 && this.activeLevel === level) {
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
    this.removeLegacyNavigationBridge();
    this.cancelPendingTransition();
    this.clearTimers();
    this.removePrefetch();
    for (const frame of this.frames) this.disposeFrame(frame);
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

  private requestLevel(level: number): void {
    if (!this.isAvailable(level)) {
      this.showUnavailableLevel(level);
      return;
    }
    if (level === this.activeLevel || this.pending?.level === level) return;

    this.cancelPendingTransition();
    const token = ++this.transitionToken;
    const frameIndex = this.activeFrameIndex;
    const frame = this.frames[frameIndex];
    const path = this.levelPath(level);

    // APULAB_TRANSITION_NATIVE_UNLOAD_V4
    // Cambio directo entre niveles: no existe tarjeta/overlay de transición.
    // El mismo iframe navega al siguiente documento y el navegador ejecuta
    // pagehide/beforeunload del nivel saliente para liberar RAF/WebGL.
    frame.classList.remove('is-active', 'is-entering', 'is-leaving');
    frame.classList.add('is-loading');
    frame.setAttribute('aria-hidden', 'true');

    const onLoad = (): void => {
      const pending = this.pending;
      if (!pending || pending.token !== token || pending.level !== level || pending.frameIndex !== frameIndex) return;

      let loadedPath = '';
      try {
        loadedPath = frame.contentWindow?.location.pathname || '';
      } catch (_) {
        return;
      }
      if (loadedPath !== path) return;
      frame.removeEventListener('load', onLoad);
      this.markPendingReady(token, level, frameIndex);
    };

    this.pending = { level, frameIndex, token, ready: false, onLoad };
    frame.addEventListener('load', onLoad);
    frame.src = path;
  }

  private markPendingReady(token: number, level: number, frameIndex: number): void {
    const pending = this.pending;
    if (!pending || pending.token !== token || pending.level !== level || pending.frameIndex !== frameIndex) return;
    if (pending.ready) return;

    pending.ready = true;
    this.frames[frameIndex].removeEventListener('load', pending.onLoad);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.commitTransition(token));
    });
  }

  private commitTransition(token: number): void {
    const pending = this.pending;
    if (!pending || pending.token !== token || !pending.ready) return;

    const frame = this.frames[pending.frameIndex];
    try {
      if (frame.contentWindow?.location.pathname !== this.levelPath(pending.level)) return;
    } catch (_) {
      return;
    }

    frame.classList.remove('is-loading');
    frame.classList.add('is-active', 'is-entering');
    frame.setAttribute('aria-hidden', 'false');

    this.activeFrameIndex = pending.frameIndex;
    this.activeLevel = pending.level;
    this.pending = undefined;

    this.prefetchLevel(this.activeLevel + 1);

    if (this.transitionTimer) window.clearTimeout(this.transitionTimer);
    this.transitionTimer = window.setTimeout(() => {
      frame.classList.remove('is-entering');
      this.transitionTimer = undefined;
    }, TRANSITION_MS);
  }

  private cancelPendingTransition(): void {
    const pending = this.pending;
    if (!pending) return;

    const frame = this.frames[pending.frameIndex];
    frame.removeEventListener('load', pending.onLoad);
    frame.classList.remove('is-loading', 'is-entering', 'is-leaving');
    frame.classList.add('is-active');
    frame.setAttribute('aria-hidden', 'false');
    this.pending = undefined;
  }

  // APULAB_LEGACY_NAV_BRIDGE_V1
  // Los niveles 3–5 aún provienen de plantillas históricas que primero intentan
  // llamar funciones directas del padre y luego hacen fallback a postMessage.
  // Exponer ambas funciones elimina esa dependencia frágil y hace que 3→4 sea
  // determinista incluso si el fallback se pierde o llega fuera de orden.
  private readonly handleLegacyLevelComplete = (completedValue: number, nextValue?: number): void => {
    if (!this.visible) return;

    const completedLevel = Number(completedValue);
    const requestedNext = Number(nextValue);
    if (!Number.isInteger(completedLevel) || completedLevel !== this.activeLevel) return;
    if (completedLevel >= TOTAL_LEVELS) return;
    if (Number.isInteger(requestedNext) && requestedNext !== this.activeLevel + 1) return;

    this.requestLevel(this.activeLevel + 1);
  };

  private readonly handleLegacyLevelReady = (levelValue: number): void => {
    if (!this.visible) return;

    const level = Number(levelValue);
    const pending = this.pending;
    if (!pending || !Number.isInteger(level) || level !== pending.level) return;

    this.markPendingReady(pending.token, pending.level, pending.frameIndex);
  };

  private installLegacyNavigationBridge(): void {
    const bridgeWindow = window as Mission01LegacyBridgeWindow;
    this.previousLegacyComplete = bridgeWindow.apulabCompleteLevel;
    this.previousLegacyReady = bridgeWindow.apulabLevelReady;
    bridgeWindow.apulabCompleteLevel = this.handleLegacyLevelComplete;
    bridgeWindow.apulabLevelReady = this.handleLegacyLevelReady;
  }

  private removeLegacyNavigationBridge(): void {
    const bridgeWindow = window as Mission01LegacyBridgeWindow;

    if (bridgeWindow.apulabCompleteLevel === this.handleLegacyLevelComplete) {
      if (this.previousLegacyComplete) bridgeWindow.apulabCompleteLevel = this.previousLegacyComplete;
      else delete bridgeWindow.apulabCompleteLevel;
    }

    if (bridgeWindow.apulabLevelReady === this.handleLegacyLevelReady) {
      if (this.previousLegacyReady) bridgeWindow.apulabLevelReady = this.previousLegacyReady;
      else delete bridgeWindow.apulabLevelReady;
    }
  }

  private signalFrameDispose(frame: HTMLIFrameElement): void {
    try {
      frame.contentWindow?.postMessage({ type: 'apulab-dispose' }, window.location.origin);
    } catch (_) {
      // pagehide/beforeunload del nivel actúa como respaldo.
    }
  }

  private clearFrame(frame: HTMLIFrameElement): void {
    try {
      const src = frame.getAttribute('src');
      if (src && src !== 'about:blank') frame.src = 'about:blank';
    } catch (_) {
      // El iframe puede estar navegando; about:blank se aplicará en el próximo ciclo.
    }

    frame.classList.remove('is-loading', 'is-entering', 'is-active', 'is-leaving');
    frame.setAttribute('aria-hidden', 'true');
  }

  private disposeFrame(frame: HTMLIFrameElement): void {
    this.signalFrameDispose(frame);
    this.clearFrame(frame);
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

    this.unavailableToast.textContent = `NIVEL ${level} DE ${TOTAL_LEVELS} · NO DISPONIBLE`;
    this.unavailableToast.classList.add('show');
    this.unavailableTimer = window.setTimeout(() => {
      this.unavailableToast.classList.remove('show');
      this.unavailableTimer = undefined;
    }, 2600);
  }

  private clearTimers(): void {
    if (this.transitionTimer) window.clearTimeout(this.transitionTimer);
    if (this.unavailableTimer) window.clearTimeout(this.unavailableTimer);
    this.transitionTimer = undefined;
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
    if (completedLevel >= TOTAL_LEVELS) return;

    this.requestLevel(this.activeLevel + 1);
  };
}
