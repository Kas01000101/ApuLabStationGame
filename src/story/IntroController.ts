import { ThreeEngine } from '../three/ThreeEngine';
import { MarsWorld } from '../three/worlds/MarsWorld';
import { ApuLabWorld } from '../three/worlds/ApuLabWorld';
import { Yachay } from '../three/characters/Yachay';
import { Ruth } from '../three/characters/Ruth';
import { Ayni } from '../three/characters/Ayni';
import { FailureEffects } from '../three/effects/FailureEffects';

export type IntroState = 'mars-entry' | 'mars-scan' | 'mars-failure' | 'telemetry' | 'station';

export class IntroController {
  private state: IntroState = 'mars-entry';
  private elapsed = 0;
  private mars = new MarsWorld();
  private station = new ApuLabWorld();
  private yachay = new Yachay();
  private ruth = new Ruth();
  private ayni = new Ayni();
  private failure = new FailureEffects(this.yachay);

  constructor(private readonly engine: ThreeEngine) {}

  start(): void {
    this.engine.clear();
    this.engine.scene.add(this.mars.group, this.yachay.group);
    this.engine.camera.position.set(10, 4.2, 12);
    this.engine.camera.lookAt(0, 1.5, 0);
  }

  update(dt: number): void {
    this.elapsed += dt;
    switch (this.state) {
      case 'mars-entry': this.updateMarsEntry(dt); break;
      case 'mars-scan': this.updateMarsScan(dt); break;
      case 'mars-failure': this.updateMarsFailure(dt); break;
      case 'telemetry': this.updateTelemetry(dt); break;
      case 'station': this.updateStation(dt); break;
    }
  }

  destroy(): void { this.engine.clear(); }

  private setState(state: IntroState): void { this.state = state; this.elapsed = 0; }

  private updateMarsEntry(dt: number): void {
    this.yachay.drive(1, dt);
    if (this.elapsed > 2.4) this.setState('mars-scan');
  }

  private updateMarsScan(dt: number): void {
    this.yachay.scan(dt);
    if (this.elapsed > 2.2) this.setState('mars-failure');
  }

  private updateMarsFailure(dt: number): void {
    this.yachay.drive(Math.max(0.08, 1 - this.elapsed / 9), dt);
    this.failure.update(this.elapsed);
    if (this.elapsed > 10.5) this.setState('telemetry');
  }

  private updateTelemetry(dt: number): void {
    this.yachay.telemetry(dt);
    if (this.elapsed > 2.8) {
      this.engine.clear();
      this.engine.scene.add(this.station.group, this.ruth.group, this.ayni.group);
      this.setState('station');
    }
  }

  private updateStation(dt: number): void {
    this.ruth.update(dt);
    this.ayni.update(dt);
  }
}
