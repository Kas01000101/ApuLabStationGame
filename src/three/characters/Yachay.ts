import * as THREE from 'three';

export class Yachay {
  readonly group = new THREE.Group();
  private wheelSpin = 0;
  private mast = new THREE.Group();
  private wheels: THREE.Mesh[] = [];
  private power = 1;

  constructor() {
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1, 2.2), new THREE.MeshStandardMaterial({ color: 0xCAC2B7, roughness: .85 }));
    body.position.y = 1.4;
    body.castShadow = true;
    this.group.add(body);
    this.mast.position.set(0, 2.4, 0);
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.7, .45, .55), new THREE.MeshStandardMaterial({ color: 0xE7E0D6 }));
    this.mast.add(head);
    this.group.add(this.mast);
    for (const x of [-1.55, 1.55]) for (const z of [-.8, .8, 0]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.48, .48, .38, 12), new THREE.MeshStandardMaterial({ color: 0x24252A }));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, .55, z);
      this.group.add(wheel);
      this.wheels.push(wheel);
    }
  }

  drive(speed: number, dt: number): void {
    this.group.position.x += speed * dt * 2.2;
    this.wheelSpin -= speed * dt * 3.4;
    this.wheels.forEach(w => w.rotation.x = this.wheelSpin);
  }

  scan(dt: number): void { this.mast.rotation.y += dt * .7; }
  telemetry(dt: number): void { this.mast.rotation.y += dt * .4; }
  setPower(amount: number): void { this.power = Math.max(0, Math.min(1, amount)); }
  get powerLevel(): number { return this.power; }
}
