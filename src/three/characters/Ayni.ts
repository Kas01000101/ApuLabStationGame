import * as THREE from 'three';
import { Rover } from './Rover';

export class Ayni extends Rover {
  private idleTime = 0;

  constructor() {
    super({ name: 'Ayni', bodyTint: 0xd6d0c8 });
    this.group.position.set(0, 1.8, 0);
  }

  update(dt: number): void {
    this.idleTime += dt;
    this.group.position.y = 1.8 + Math.sin(this.idleTime * 1.6) * 0.028;
    this.pointMast(Math.sin(this.idleTime * 1.5) * 0.10, 0.02);
  }

  updatePresentation(elapsed: number): void {
    const smooth = (v: number): number => {
      const p = THREE.MathUtils.clamp(v, 0, 1);
      return p * p * (3 - 2 * p);
    };

    const approach = smooth(elapsed / 1.25);
    this.group.position.z = THREE.MathUtils.lerp(0, 0.88, approach);

    const hello = Math.sin(Math.PI * THREE.MathUtils.clamp(elapsed / 1.2, 0, 1)) * 0.13;
    const codeBeat = Math.sin(
      Math.PI * THREE.MathUtils.clamp((elapsed - 5.2) / 0.72, 0, 1),
    ) * 0.10;

    this.group.position.y = 1.8 + hello + codeBeat;
    this.group.rotation.z =
      Math.sin(Math.PI * THREE.MathUtils.clamp(elapsed / 1.2, 0, 1)) * 0.018 -
      Math.sin(Math.PI * THREE.MathUtils.clamp((elapsed - 5.2) / 0.72, 0, 1)) * 0.022;

    const energy = elapsed < 6.9 ? 1 : 0.42;
    const helloNod = Math.sin(Math.PI * THREE.MathUtils.clamp(elapsed / 0.95, 0, 1)) * 0.09;
    const codeNod = Math.sin(
      Math.PI * THREE.MathUtils.clamp((elapsed - 5.2) / 0.70, 0, 1),
    ) * 0.13;

    this.pointMast(
      Math.sin(elapsed * (2.6 * energy + 1)) * 0.12 * energy,
      (elapsed > 6.9 ? 0.035 : 0) - helloNod - codeNod,
    );
    this.animateWheels(0.22 * (1 - approach), 1 / 60);
  }

  settleAtTeamPosition(): void {
    this.group.position.set(0, 1.8, 0.88);
    this.group.rotation.set(0, 0, 0);
    this.pointMast(0, 0.02);
  }
}
