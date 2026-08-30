import * as THREE from 'three';
import { Rover } from './Rover';

/** AYNI comparte exactamente la misma plataforma física que YACHAY. */
export class Ayni extends Rover {
  private idleTime = 0;
  private readonly solarMaterials: THREE.MeshStandardMaterial[] = [];

  constructor() {
    super({ name: 'AYNI' });
    this.group.position.set(0, 1.8, 0);

    const seen = new Set<THREE.MeshStandardMaterial>();
    this.deck.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        if (!(material instanceof THREE.MeshStandardMaterial)) return;
        // Los paneles canónicos son los materiales texturizados del deck.
        if (!material.map || seen.has(material)) return;
        seen.add(material);
        this.solarMaterials.push(material);
      });
    });
  }

  update(dt: number): void {
    this.idleTime += dt;
    this.group.position.y = 1.8 + Math.sin(this.idleTime * 1.6) * 0.028;
    this.group.rotation.y = Math.sin(this.idleTime * 0.7) * 0.012;
    this.pointMast(Math.sin(this.idleTime * 1.5) * 0.10, 0.02);
    this.setCelebrationGlow(0.10, this.idleTime);
  }

  updatePresentation(elapsed: number): void {
    const smooth = (value: number): number => {
      const p = THREE.MathUtils.clamp(value, 0, 1);
      return p * p * (3 - 2 * p);
    };
    const pulse = (start: number, duration: number): number =>
      Math.sin(Math.PI * THREE.MathUtils.clamp((elapsed - start) / duration, 0, 1));

    const approach = smooth(elapsed / 1.25);
    const hello = pulse(0, 1.25);
    const danceIn = smooth((elapsed - 0.35) / 0.45);
    const danceOut = 1 - smooth((elapsed - 4.15) / 1.0);
    const dance = danceIn * danceOut;
    const codeBeat = pulse(5.2, 0.78);

    // Avanza hacia la jugadora y después hace un saludo/baile corto.
    this.group.position.z = THREE.MathUtils.lerp(0, 0.88, approach);
    this.group.position.x = Math.sin(elapsed * 4.8) * 0.10 * dance;
    this.group.position.y =
      1.8 +
      hello * 0.13 +
      Math.abs(Math.sin(elapsed * 5.6)) * 0.075 * dance +
      codeBeat * 0.11;

    this.group.rotation.y = Math.sin(elapsed * 4.1) * 0.085 * dance;
    this.group.rotation.z =
      Math.sin(elapsed * 5.0) * 0.040 * dance -
      codeBeat * 0.025;

    const helloNod = pulse(0, 0.95) * 0.10;
    const codeNod = pulse(5.2, 0.72) * 0.14;
    const mastWave = Math.sin(elapsed * 6.2) * 0.17 * dance;
    this.pointMast(mastWave, 0.025 - helloNod - codeNod);

    // Las ruedas acompañan apenas el baile; no parece que esté conduciendo.
    this.animateWheels(0.13 * dance + 0.18 * (1 - approach), 1 / 60);

    // Ojos y paneles responden a la emoción de la presentación.
    const glow = THREE.MathUtils.clamp(0.36 + 0.55 * dance + 0.38 * hello + 0.50 * codeBeat, 0, 1);
    this.setCelebrationGlow(glow, elapsed);
  }

  setCelebrationGlow(amount: number, elapsed = 0): void {
    const p = THREE.MathUtils.clamp(amount, 0, 1);
    const shimmer = 0.72 + 0.28 * Math.sin(elapsed * 7.2);

    this.setEyesGlow(0.25 + 0.75 * p * shimmer);
    this.solarMaterials.forEach((material, index) => {
      material.emissive.setHex(0x153d77);
      material.emissiveIntensity = 0.12 + p * (0.62 + 0.28 * Math.sin(elapsed * 6.4 + index * 0.7));
    });
    this.powerMaterials.forEach((material, index) => {
      material.emissiveIntensity = 1.45 + p * (1.0 + 0.35 * Math.sin(elapsed * 8 + index));
    });
  }

  settleAtTeamPosition(): void {
    this.group.position.set(0, 1.8, 0.88);
    this.group.rotation.set(0, 0, 0);
    this.pointMast(0, 0.02);
    this.setCelebrationGlow(0.12, 0);
  }
}
