import { MenuScreen } from '../ui/MenuScreen';
import { AccessModal } from '../ui/AccessModal';
import { ThreeEngine } from '../three/ThreeEngine';
import { SessionService } from '../systems/SessionService';
import { IntroController } from '../story/IntroController';

export type AppState = 'menu' | 'intro' | 'mission01' | 'final';

export class ApuLabApp {
  private readonly engine: ThreeEngine;
  private readonly menu: MenuScreen;
  private readonly sessions = new SessionService();
  private state: AppState = 'menu';
  private intro?: IntroController;

  constructor(private readonly roots: { threeRoot: HTMLElement; uiRoot: HTMLElement }) {
    this.engine = new ThreeEngine(roots.threeRoot);
    this.menu = new MenuScreen(roots.uiRoot, {
      onStart: () => this.openAccess(),
      onSettings: () => window.alert('Ajustes próximamente.'),
      onCredits: () => window.alert('ApuLab Station · Three.js'),
    });
  }

  start(): void {
    window.addEventListener('pointerdown', () => undefined, { once: true });
    this.engine.start((dt) => this.update(dt));
    this.goTo('menu');
  }

  private openAccess(): void {
    new AccessModal(this.roots.uiRoot, {
      onDemo: async () => {
        const ok = await this.sessions.startDemo();
        if (ok) this.goTo('intro');
        return ok;
      },
      onStudy: async (code, credential) => {
        const result = await this.sessions.startStudy(code, credential);
        if (result.success) this.goTo('intro');
        return result;
      },
    });
  }

  private goTo(state: AppState): void {
    if (this.state === 'intro' && state !== 'intro') {
      this.intro?.destroy();
      this.intro = undefined;
    }
    this.state = state;
    this.menu.setVisible(state === 'menu');
    if (state === 'intro') {
      this.intro?.destroy();
      this.intro = new IntroController(this.engine, this.roots.uiRoot);
      this.intro.start();
    }
  }

  private update(dt: number): void {
    if (this.state === 'intro') this.intro?.update(dt);
  }
}
