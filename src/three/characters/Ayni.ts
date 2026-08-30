import * as THREE from 'three';

export class Ayni {
  readonly group = new THREE.Group();
  private t = 0;
  constructor() {
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.7, .9, 1.9), new THREE.MeshStandardMaterial({ color: 0xE7E0D6 }));
    body.position.y = 1.25;
    this.group.add(body);
    this.group.position.set(-1.5, 0, 1.2);
  }
  update(dt: number): void {
    this.t += dt;
    this.group.position.y = Math.sin(this.t * 2) * .035;
  }
}
