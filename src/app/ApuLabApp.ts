import { MenuScreen } from '../ui/MenuScreen';
import { AccessModal } from '../ui/AccessModal';
import { Mission01Screen } from '../ui/Mission01Screen';
import { SessionService } from '../systems/SessionService';
import { GameState } from '../systems/GameState';
import { AmbientMusic } from '../three/effects/AmbientMusic';
import type { ThreeEngine } from '../three/ThreeEngine';
import type { ReadableIntroController } from '../story/ReadableIntroController';

export type AppState = 'menu' | 'intro' | 'mission01' | 'final';

export class ApuLabApp {
  private engine?: ThreeEngine;
  private engineLoad?: Promise<ThreeEngine>;
  private readonly menu: MenuScreen;
  private readonly mission01: Mission01Screen;
  private readonly sessions = new SessionService();
  private readonly ambientMusic = new AmbientMusic();
  private state: AppState = 'menu';
  private intro?: ReadableIntroController;
  private engineRunning = false;

  /**
   * Los navegadores modernos deciden el texto de esta confirmación y no
   * permiten personalizarlo. El objetivo aquí es impedir una recarga/salida
   * accidental mientras existe progreso de una sesión activa.
   */
  private readonly handleBeforeUnload = (event: BeforeUnloadEvent): void => {
    if (!this.hasProgressAtRisk()) return;

    event.preventDefault();
    // Compatibilidad con navegadores que todavía requieren returnValue.
    event.returnValue = '';
  };

  constructor(private readonly roots: { threeRoot: HTMLElement; uiRoot: HTMLElement }) {
    this.menu = new MenuScreen(roots.uiRoot, {
      onStart: () => this.openAccess(),
    });

    // Mission01Screen maneja los niveles aún no integrados dentro de la propia
    // interfaz para no romper la inmersión con un alert nativo del navegador.
    this.mission01 = new Mission01Screen(roots.uiRoot);

    window.addEventListener('beforeunload', this.handleBeforeUnload);
  }

  start(): void {
    this.ambientMusic.arm();
    // El menú es 2D: Three.js se carga recién cuando la usuaria entra a la intro.
    // Así evitamos descargar ~500 kB de runtime y renderizar una escena vacía a
    // 60 FPS mientras solo se muestra el menú principal.
    void this.goTo('menu');
  }

  private async ensureThreeEngine(): Promise<ThreeEngine> {
    if (this.engine) return this.engine;

    const pending = this.engineLoad ??= import('../three/ThreeEngine').then(({ ThreeEngine }) => {
      return new ThreeEngine(this.roots.threeRoot);
    });

    try {
      const engine = await pending;
      this.engine ??= engine;
      return this.engine;
    } finally {
      if (this.engineLoad === pending) this.engineLoad = undefined;
    }
  }

  private startThreeEngine(): void {
    if (!this.engine || this.engineRunning) return;
    this.engine.start((dt) => this.update(dt));
    this.engineRunning = true;
  }

  private stopThreeEngine(): void {
    if (!this.engineRunning) return;
    this.engine?.stop();
    this.engineRunning = false;
  }

  private disposeThreeEngine(): void {
    this.stopThreeEngine();
    this.engine?.dispose();
    this.engine = undefined;
  }

  private openAccess(): void {
    new AccessModal(this.roots.uiRoot, {
      onDemo: async () => {
        const ok = await this.sessions.startDemo();
        if (ok) await this.goTo('intro');
        return ok;
      },
      onStudy: async (code, credential) => {
        const result = await this.sessions.startStudy(code, credential);
        if (result.success) await this.goTo('intro');
        return result;
      },
    });
  }

  /**
   * Solo protegemos estados donde una recarga haría perder progreso.
   * En menú y al finalizar no debe aparecer una alerta innecesaria.
   */
  private hasProgressAtRisk(): boolean {
    return this.state === 'intro' || this.state === 'mission01';
  }

  /**
   * Única salida válida de la introducción.
   * Se usa tanto al finalizarla normalmente como al pulsar OMITIR INTRO,
   * para garantizar que ambos caminos abran el Nivel 1 de Misión 01.
   * Mantener esta ruta única evita regresiones entre ambos flujos.
   */
  private readonly enterMission01 = (): void => {
    void this.goTo('mission01');
  };

  private async goTo(state: AppState): Promise<void> {
    if (state === 'intro') {
      // Cargar Three + la coreografía pesada únicamente después de una acción
      // explícita de inicio. El modal permanece en estado busy mientras carga,
      // por lo que no aparece una pantalla vacía entre menú e introducción.
      const [engine, introModule] = await Promise.all([
        this.ensureThreeEngine(),
        import('../story/ReadableIntroController'),
      ]);

      this.state = 'intro';
      GameState.getInstance().setScene('intro');
      this.menu.setVisible(false);
      this.mission01.setVisible(false);
      this.roots.threeRoot.style.visibility = 'visible';

      this.intro?.destroy();
      this.intro = new introModule.ReadableIntroController(engine, this.roots.uiRoot, {
        onComplete: this.enterMission01,
      });
      this.startThreeEngine();
      this.intro.start();
      return;
    }

    if (this.state === 'intro') {
      this.intro?.destroy();
      this.intro = undefined;
      // Mission 01 usa su propio WebGL dentro del iframe. Al salir de la intro
      // liberamos también el renderer global para no conservar contexto GPU.
      this.disposeThreeEngine();
    }

    this.state = state;
    GameState.getInstance().setScene(state === 'menu' ? 'main-menu' : state);

    this.menu.setVisible(state === 'menu');
    this.mission01.setVisible(state === 'mission01');
    this.roots.threeRoot.style.visibility = state === 'mission01' ? 'hidden' : 'visible';

    // Menú/final son 2D y Mission 01 tiene su propio WebGL; el renderer global
    // solo debe correr durante la introducción.
    this.stopThreeEngine();

    if (state === 'mission01') {
      this.mission01.start(1);
    }
  }

  private update(dt: number): void {
    if (this.state === 'intro') this.intro?.update(dt);
  }
}
