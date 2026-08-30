import * as THREE from 'three';

export interface CameraShot {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export class CinematicCamera {
  private readonly currentTarget = new THREE.Vector3();

  constructor(private readonly camera: THREE.PerspectiveCamera) {}

  set(shot: CameraShot): void {
    this.camera.position.copy(shot.position);
    this.currentTarget.copy(shot.target);
    this.camera.lookAt(this.currentTarget);
  }

  blend(from: CameraShot, to: CameraShot, amount: number): void {
    const p = this.smooth(amount);
    this.camera.position.copy(from.position).lerp(to.position, p);
    this.currentTarget.copy(from.target).lerp(to.target, p);
    this.camera.lookAt(this.currentTarget);
  }

  dynamic(position: THREE.Vector3, target: THREE.Vector3): void {
    this.camera.position.copy(position);
    this.currentTarget.copy(target);
    this.camera.lookAt(this.currentTarget);
  }

  private smooth(value: number): number {
    const p = THREE.MathUtils.clamp(value, 0, 1);
    return p * p * (3 - 2 * p);
  }
}
