import * as THREE from 'three';

export class ApuLabWorld {
  readonly group = new THREE.Group();
  constructor() {
    const floor = new THREE.Mesh(new THREE.BoxGeometry(25, .26, 22), new THREE.MeshStandardMaterial({ color: 0x39374A, roughness: .9 }));
    floor.receiveShadow = true;
    this.group.add(floor);
    const hemi = new THREE.HemisphereLight(0x9284D2, 0x0B0E26, 1.5);
    this.group.add(hemi);
  }
}
