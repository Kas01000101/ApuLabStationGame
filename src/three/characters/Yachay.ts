import * as THREE from 'three';
import { Rover } from './Rover';

export class Yachay extends Rover {
  constructor() {
    super({ name: 'Yachay' });
    this.group.position.set(-8.8, 1.8, 0.15);
  }

  drive(speed: number, dt: number): void {
    this.advance(speed, dt);
  }

  scan(elapsed: number, intensity = 1): void {
    this.pointMast(0.22 + Math.sin(elapsed * 3.2) * 0.07 * intensity, -0.015);
    this.pointDish(0.08 + Math.sin(elapsed * 1.9) * 0.04 * intensity);
    this.setEyesGlow(0.42 + 0.30 * intensity);
  }

  telemetry(elapsed: number): void {
    this.pointMast(0.44 + Math.sin(elapsed * 1.7) * 0.025, 0);
    this.pointDish(0.14 + Math.sin(elapsed * 2.1) * 0.035);
  }

  happyIdle(elapsed: number): void {
    this.group.position.y = 1.8 + Math.sin(elapsed * 3.7) * 0.025;
    this.group.rotation.z = Math.sin(elapsed * 2.5) * 0.008;
    this.pointMast(Math.sin(elapsed * 0.85) * 0.09, 0);
    this.setEyesGlow(0.38 + 0.12 * Math.sin(elapsed * 2.4));
  }

  lookConcerned(elapsed: number, amount: number): void {
    const p = THREE.MathUtils.clamp(amount, 0, 1);
    this.pointMast(
      0.10 * p + Math.sin(elapsed * 4.2) * 0.022 * p,
      -0.035 * p,
    );
    this.setEyesGlow(0.28 + 0.72 * p);
  }
}
