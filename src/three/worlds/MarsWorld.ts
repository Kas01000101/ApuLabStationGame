import * as THREE from 'three';

export class MarsWorld {
  readonly group = new THREE.Group();
  constructor() {
    const soil = new THREE.MeshStandardMaterial({ color: 0xA95F43, roughness: 1 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(46, 34, 24, 18), soil);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);
    const hemi = new THREE.HemisphereLight(0xC9A188, 0x593D3D, 1.2);
    const sun = new THREE.DirectionalLight(0xFFE2B8, 3);
    sun.position.set(9, 11, 7);
    this.group.add(hemi, sun);
  }
}
