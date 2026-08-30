import * as THREE from 'three';

export const STAGE_WIDTH = 1672;
export const STAGE_HEIGHT = 941;

/**
 * Renderer canónico de ApuLab Station.
 * Mantiene la óptica aprobada del prototipo V38/V42:
 * FOV 36, ACES exposure .93 y stage lógico fijo 1672×941.
 */
export class ThreeEngine {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(36, STAGE_WIDTH / STAGE_HEIGHT, 0.1, 100);
  readonly renderer: THREE.WebGLRenderer;
  private last = performance.now();
  private animationFrame = 0;
  private runtimeErrorLogged = false;

  constructor(private readonly root: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setSize(STAGE_WIDTH, STAGE_HEIGHT, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.93;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute('aria-label', 'Escena 3D de ApuLab Station');
    this.root.appendChild(this.renderer.domElement);
    this.camera.position.set(13.2, 7.5, 16.8);
  }

  start(update: (dt: number) => void): void {
    this.stop();
    this.last = performance.now();

    const loop = (now: number) => {
      // Programamos primero el siguiente frame: un error aislado no mata el loop.
      this.animationFrame = requestAnimationFrame(loop);
      const dt = Math.min(Math.max((now - this.last) / 1000, 0), 0.05);
      this.last = now;

      try {
        update(dt);
        this.renderer.render(this.scene, this.camera);
        this.runtimeErrorLogged = false;
      } catch (error) {
        if (!this.runtimeErrorLogged) {
          this.runtimeErrorLogged = true;
          console.error('[ApuLab ThreeEngine] runtime frame recovered', error);
        }
      }
    };

    this.animationFrame = requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = 0;
  }

  clear(): void {
    while (this.scene.children.length) this.scene.remove(this.scene.children[0]);
    this.scene.fog = null;
  }

  dispose(): void {
    this.stop();
    this.clear();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
