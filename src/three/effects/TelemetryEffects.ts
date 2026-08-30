import * as THREE from 'three';
import { Rover } from '../characters/Rover';

export class TelemetryEffects {
  readonly group = new THREE.Group();
  readonly heroPulse: THREE.Mesh;

  private readonly pulseMaterial = new THREE.MeshBasicMaterial({ color: 0xbff8ff, transparent: true, opacity: 0, depthWrite: false });
  private readonly trailMaterial = new THREE.MeshBasicMaterial({ color: 0x49c9d7, transparent: true, opacity: 0, depthWrite: false });
  private readonly pulses: THREE.Mesh[] = [];

  constructor(private readonly rover: Rover) {
    this.group.name = 'TelemetryEffects';
    this.heroPulse = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), this.pulseMaterial);
    this.heroPulse.visible = false;
    this.group.add(this.heroPulse);
    for (let i = 0; i < 8; i += 1) {
      const pulse = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.10), this.trailMaterial);
      pulse.visible = false;
      this.group.add(pulse);
      this.pulses.push(pulse);
    }
  }

  reset(): void {
    this.heroPulse.visible = false;
    this.pulseMaterial.opacity = 0;
    this.trailMaterial.opacity = 0;
    this.pulses.forEach((pulse) => {
      pulse.visible = false;
      pulse.scale.setScalar(1);
    });
  }

  update(elapsed: number): void {
    const origin = this.rover.getWorldAntennaTip(new THREE.Vector3());
    this.group.parent?.worldToLocal(origin);
    this.pulses.forEach((pulse, index) => {
      const phase = (elapsed * 0.95 + index * 0.13) % 1;
      pulse.visible = true;
      pulse.position.set(origin.x + 0.35 * Math.sin(index * 1.3), origin.y + phase * 4.8, origin.z + 0.28 * Math.cos(index * 1.6));
      pulse.scale.setScalar(0.65 + 0.35 * (1 - phase));
    });
    this.trailMaterial.opacity = 0.45;
    const p = this.smooth((elapsed - 0.55) / 2.55);
    this.heroPulse.visible = elapsed > 0.45;
    this.pulseMaterial.opacity = Math.sin(THREE.MathUtils.clamp(p, 0, 1) * Math.PI) * 0.95;
    this.heroPulse.position.set(THREE.MathUtils.lerp(origin.x, origin.x + 6.1, p), THREE.MathUtils.lerp(origin.y, origin.y + 5.25, p), THREE.MathUtils.lerp(origin.z, origin.z - 1.2, p));
    this.heroPulse.scale.setScalar(0.72 + p * 0.85);
  }

  getHeroWorldPosition(target = new THREE.Vector3()): THREE.Vector3 {
    this.heroPulse.getWorldPosition(target);
    return target;
  }

  private smooth(value: number): number {
    const p = THREE.MathUtils.clamp(value, 0, 1);
    return p * p * (3 - 2 * p);
  }
}
