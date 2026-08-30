import * as THREE from 'three';
import { Yachay } from '../characters/Yachay';

export class FailureEffects {
  private smoke = new THREE.Group();
  private initialized = false;
  constructor(private readonly yachay: Yachay) {}
  update(t: number): void {
    if (!this.initialized) {
      this.initialized = true;
      this.yachay.group.add(this.smoke);
      for (let i = 0; i < 6; i++) {
        const puff = new THREE.Mesh(new THREE.OctahedronGeometry(.12, 0), new THREE.MeshStandardMaterial({ color: 0xC8C1BC, transparent: true, opacity: .35 }));
        puff.position.set(1.5, .8 + i * .08, .4);
        this.smoke.add(puff);
      }
    }
    this.smoke.visible = t > 2.6 && t < 8.5;
    this.smoke.children.forEach((p, i) => {
      p.position.y += .004 * (i + 1);
      p.scale.setScalar(1 + Math.sin(t * 2 + i) * .12);
    });
    this.yachay.setPower(Math.max(0, 1 - t / 9));
  }
}
