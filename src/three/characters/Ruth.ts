import * as THREE from 'three';

export class Ruth {
  readonly group = new THREE.Group();
  private t = 0;
  constructor() {
    const suit = new THREE.MeshStandardMaterial({ color: 0x0B48A8, roughness: .85 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xB87855, roughness: .9 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, .75), suit);
    torso.position.y = 2.6;
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.45, 1.2), skin);
    head.position.y = 4.5;
    this.group.add(torso, head);
    this.group.position.set(4.5, 0, .5);
  }
  update(dt: number): void {
    this.t += dt;
    this.group.rotation.y = -.08 + Math.sin(this.t * .7) * .02;
  }
}
