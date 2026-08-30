import { MenuScreen } from '../ui/MenuScreen';
import { AccessModal } from '../ui/AccessModal';
import { Mission01Screen } from '../ui/Mission01Screen';
import { ThreeEngine } from '../three/ThreeEngine';
import { SessionService } from '../systems/SessionService';
import { GameState } from '../systems/GameState';
import { IntroController } from '../story/IntroController';

export type AppState = 'menu' | 'intro' | 'mission01' | 'final';

export class ApuLabApp {
  private readonly engine: ThreeEngine;
  private readonly menu: MenuScreen;
  private readonly mission01: Mission01Screen;
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
    this.mission01 = new Mission01Screen(roots.uiRoot, {
      onUnavailableLevel: (level) => {
        if (level >= 4) window.alert(`Nivel ${level} próximamente.`);
      },
    });
  }

  start(): void {
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

  /**
   * Única salida válida de la introducción.
   * Se usa tanto al finalizarla normalmente como al pulsar OMITIR INTRO,
   * para garantizar que ambos caminos abran el Nivel 1 de Misión 01.
   */
  private readonly enterMission01 = (): void => {
    this.goTo('mission01');
  };

  private goTo(state: AppState): void {
    if (this.state === 'intro' && state !== 'intro') {
      this.intro?.destroy();
      this.intro = undefined;
    }

    this.state = state;
    GameState.getInstance().setScene(
      state === 'menu' ? 'main-menu' : state === 'intro' ? 'intro' : state,
    );

    this.menu.setVisible(state === 'menu');
    this.mission01.setVisible(state === 'mission01');
    this.roots.threeRoot.style.visibility = state === 'mission01' ? 'hidden' : 'visible';

    if (state === 'intro') {
      this.intro?.destroy();
      this.intro = new IntroController(this.engine, this.roots.uiRoot, {
        onComplete: this.enterMission01,
      });
      this.intro.start();
      return;
    }

    if (state === 'mission01') {
      this.mission01.start(1);
    }
  }

  private update(dt: number): void {
    if (this.state === 'intro') this.intro?.update(dt);
  }
}
