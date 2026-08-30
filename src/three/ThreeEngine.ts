import * as THREE from 'three';

export const STAGE_WIDTH = 1672;
export const STAGE_HEIGHT = 941;

export class ThreeEngine {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(45, STAGE_WIDTH / STAGE_HEIGHT, 0.1, 1000);
  readonly renderer: THREE.WebGLRenderer;
  private last = performance.now();
  private animationFrame = 0;

  constructor(private readonly root: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setSize(STAGE_WIDTH, STAGE_HEIGHT, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute('aria-label', 'Escena 3D de ApuLab Station');
    this.root.appendChild(this.renderer.domElement);
    this.camera.position.set(0, 4, 12);
  }

  start(update: (dt: number) => void): void {
    const loop = (now: number) => {
      const dt = Math.min((now - this.last) / 1000, 0.05);
      this.last = now;
      update(dt);
      this.renderer.render(this.scene, this.camera);
      this.animationFrame = requestAnimationFrame(loop);
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
