import * as THREE from 'three';
import { Rover } from '../characters/Rover';

interface DroppedPart {
  mesh: THREE.Mesh;
  started: boolean;
  start?: THREE.Vector3;
}

interface DeckPartState {
  part: THREE.Object3D;
  basePosition: THREE.Vector3;
  baseRotation: THREE.Euler;
  baseScale: THREE.Vector3;
  detached: boolean;
  start?: THREE.Vector3;
  startTime: number;
  vx: number;
  vz: number;
  spinX: number;
  spinZ: number;
}

export class FailureEffects {
  readonly debrisGroup = new THREE.Group();

  private readonly failureRig = new THREE.Group();
  private readonly panelHinge = new THREE.Group();
  private readonly smokeMaterial = new THREE.MeshStandardMaterial({
    color: 0xc8c1bc,
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0,
    flatShading: true,
  });
  private readonly smokePuffs: THREE.Mesh[] = [];
  private readonly debris: DroppedPart[] = [];
  private readonly extraDeckParts: DeckPartState[] = [];
  private solarDetached = false;
  private readonly solarDropStart = new THREE.Vector3();
  private readonly tempWorld = new THREE.Vector3();

  constructor(private readonly rover: Rover, private readonly worldRoot: THREE.Object3D) {
    this.rover.group.add(this.failureRig);
    this.worldRoot.add(this.debrisGroup);

    this.panelHinge.position.set(1.52, 0.56, 0.54);
    this.failureRig.add(this.panelHinge);
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.24, 0.07),
      new THREE.MeshStandardMaterial({ color: 0x4b4e57, roughness: 0.8, metalness: 0.12, flatShading: true }),
    );
    panel.position.set(0.24, 0, 0);
    panel.castShadow = true;
    this.panelHinge.add(panel);

    for (let i = 0; i < 11; i += 1) {
      const puff = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.14 + (i % 3) * 0.045, 0),
        this.smokeMaterial,
      );
      puff.visible = false;
      puff.castShadow = false;
      this.failureRig.add(puff);
      this.smokePuffs.push(puff);
    }

    const materials = [
      new THREE.MeshStandardMaterial({ color: 0x666159, roughness: 0.72, metalness: 0.22, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: 0x181a20, roughness: 0.88, metalness: 0.05, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: 0x252831, roughness: 0.88, metalness: 0.05, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: 0xc86f10, roughness: 0.74, metalness: 0.05, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: 0x4b4e57, roughness: 0.80, metalness: 0.12, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: 0xe7e0d6, roughness: 0.80, metalness: 0.02, flatShading: true }),
    ];

    const pieces: THREE.Mesh[] = [
      new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 6), materials[0]),
      new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.12), materials[1]),
      new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.07, 0.16), materials[2]),
      new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.20, 6), materials[3]),
      new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.09, 0.10), materials[4]),
      new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.15, 0.08), materials[5]),
    ];
    pieces[0].rotation.z = Math.PI / 2;
    pieces[3].rotation.z = Math.PI / 2;
    pieces.forEach((mesh) => {
      mesh.visible = false;
      mesh.castShadow = true;
      this.debrisGroup.add(mesh);
      this.debris.push({ mesh, started: false });
    });

    // Además del panel central desmontable, dos paneles mariposa reales se
    // desprenden. El mástil y la antena quedan intactos para la telemetría.
    const panelCandidates = this.rover.deck.children.filter(
      (child) => child instanceof THREE.Group && child !== this.rover.detachableSolarPanel,
    );
    const selected = [panelCandidates[1], panelCandidates[3]].filter(Boolean);
    selected.forEach((part, index) => {
      this.extraDeckParts.push({
        part,
        basePosition: part.position.clone(),
        baseRotation: part.rotation.clone(),
        baseScale: part.scale.clone(),
        detached: false,
        startTime: index === 0 ? 6.35 : 7.72,
        vx: index === 0 ? -0.22 : 0.18,
        vz: index === 0 ? 0.38 : -0.31,
        spinX: index === 0 ? 2.5 : -2.8,
        spinZ: index === 0 ? 3.8 : -3.4,
      });
    });

    this.reset();
  }

  reset(): void {
    this.panelHinge.rotation.set(0, 0, 0);
    this.smokeMaterial.opacity = 0;
    this.smokePuffs.forEach((puff) => {
      puff.visible = false;
      puff.position.set(1.62, 0.76, 0.46);
      puff.scale.setScalar(1);
    });

    this.debris.forEach((part) => {
      part.started = false;
      part.start = undefined;
      part.mesh.visible = false;
      part.mesh.position.set(0, 0, 0);
      part.mesh.rotation.set(0, 0, 0);
    });

    this.extraDeckParts.forEach((state) => {
      if (state.part.parent !== this.rover.deck) this.rover.deck.add(state.part);
      state.part.position.copy(state.basePosition);
      state.part.rotation.copy(state.baseRotation);
      state.part.scale.copy(state.baseScale);
      state.part.visible = true;
      state.detached = false;
      state.start = undefined;
    });

    this.rover.restoreSolarPanel();
    this.solarDetached = false;
  }

  update(t: number): void {
    this.updatePanel(t);
    this.updateSmoke(t);
    this.updateSolarPanel(t);
    this.extraDeckParts.forEach((part) => this.updateExtraDeckPart(part, t));

    // Caen piezas pequeñas una por una mientras Yachay TODAVÍA avanza.
    this.animateDroppedPart(this.debris[0], t, 4.95, new THREE.Vector3(1.20, 0.62, 0.55), -0.12, 0.19, 4.4, 5.2);
    this.animateDroppedPart(this.debris[1], t, 5.65, new THREE.Vector3(1.42, 0.52, 0.24), -0.06, -0.15, 3.7, 4.6);
    this.animateDroppedPart(this.debris[2], t, 6.25, new THREE.Vector3(1.54, 0.78, 0.02), 0.05, 0.12, 3.0, -4.0);
    this.animateDroppedPart(this.debris[3], t, 6.92, new THREE.Vector3(-0.82, 0.92, 0.48), -0.15, 0.08, -4.2, 3.2);
    this.animateDroppedPart(this.debris[4], t, 7.55, new THREE.Vector3(0.46, 0.84, -0.52), 0.13, -0.18, 3.5, 4.5);
    this.animateDroppedPart(this.debris[5], t, 8.20, new THREE.Vector3(-1.05, 0.66, -0.25), -0.09, -0.09, -3.3, -4.1);
  }

  private updatePanel(t: number): void {
    const clamp = (value: number): number => THREE.MathUtils.clamp(value, 0, 1);
    const shakeWindow = clamp((t - 1.55) / 0.40) * (1 - clamp((t - 3.0) / 0.65));
    const wiggle = Math.sin(t * 24) * 0.075 * shakeWindow;
    const openRaw = clamp((t - 2.75) / 0.72);
    const open = openRaw * openRaw * (3 - 2 * openRaw);
    this.panelHinge.rotation.z = -1.05 * open + wiggle;
  }

  private updateSmoke(t: number): void {
    const clamp = (value: number): number => THREE.MathUtils.clamp(value, 0, 1);
    const pulse = (start: number, duration: number): number =>
      Math.sin(Math.PI * clamp((t - start) / duration));
    const puff = Math.max(
      0,
      pulse(3.05, 1.05),
      pulse(5.55, 1.15),
      pulse(7.00, 1.05),
      pulse(8.05, 1.25),
    );
    this.smokeMaterial.opacity = 0.48 * puff;
    this.smokePuffs.forEach((mesh, index) => {
      const angle = (index / this.smokePuffs.length) * Math.PI * 2;
      mesh.visible = puff > 0.02;
      mesh.position.set(
        1.62 + Math.cos(angle) * (0.10 + 0.31 * puff),
        0.72 + 0.050 * index + puff * (0.36 + 0.025 * index),
        0.44 + Math.sin(angle) * (0.08 + 0.11 * puff),
      );
      mesh.scale.setScalar(0.72 + puff * (1 + index * 0.075));
    });
  }

  private updateSolarPanel(t: number): void {
    const panel = this.rover.detachableSolarPanel;
    if (!this.solarDetached) {
      const wobble = THREE.MathUtils.clamp((t - 3.90) / 0.65, 0, 1);
      panel.rotation.z = 0.012 + Math.sin(t * 16) * 0.055 * wobble;
      panel.rotation.x = Math.sin(t * 11) * 0.028 * wobble;
      const flapRaw = THREE.MathUtils.clamp((t - 4.55) / 0.72, 0, 1);
      const flap = flapRaw * flapRaw * (3 - 2 * flapRaw);
      panel.rotation.x -= 0.34 * flap;
      if (t >= 5.25) {
        this.rover.detachSolarPanelTo(this.worldRoot);
        this.solarDropStart.copy(panel.position);
        this.solarDetached = true;
      }
      return;
    }

    const dt = t - 5.25;
    const floorY = 0.10;
    panel.position.set(
      this.solarDropStart.x - 0.12 * dt,
      Math.max(floorY, this.solarDropStart.y + 0.30 * dt - 1.05 * dt * dt),
      this.solarDropStart.z + 0.30 * dt,
    );
    if (panel.position.y > floorY + 0.02) {
      panel.rotation.x += 0.055;
      panel.rotation.z += 0.072;
    }
  }

  private updateExtraDeckPart(state: DeckPartState, t: number): void {
    if (t < state.startTime) return;

    if (!state.detached) {
      this.worldRoot.attach(state.part);
      state.start = state.part.position.clone();
      state.detached = true;
    }
    if (!state.start) return;

    const dt = t - state.startTime;
    const floorY = 0.09;
    const y = Math.max(floorY, state.start.y + 0.38 * dt - 1.08 * dt * dt);
    state.part.position.set(
      state.start.x + state.vx * dt,
      y,
      state.start.z + state.vz * dt,
    );
    if (y > floorY + 0.025) {
      state.part.rotation.x += state.spinX * 0.016;
      state.part.rotation.z += state.spinZ * 0.016;
    }
  }

  private animateDroppedPart(
    part: DroppedPart,
    t: number,
    startTime: number,
    localSource: THREE.Vector3,
    vx: number,
    vz: number,
    spinX: number,
    spinZ: number,
  ): void {
    if (t < startTime) {
      part.mesh.visible = false;
      return;
    }
    if (!part.started) {
      part.started = true;
      this.tempWorld.copy(localSource);
      this.rover.group.localToWorld(this.tempWorld);
      this.debrisGroup.worldToLocal(this.tempWorld);
      part.start = this.tempWorld.clone();
      part.mesh.visible = true;
    }
    if (!part.start) return;

    const dt = t - startTime;
    const floorY = 0.055;
    const y = Math.max(floorY, part.start.y + 0.22 * dt - 1.30 * dt * dt);
    part.mesh.position.set(part.start.x + vx * dt, y, part.start.z + vz * dt);
    const airborne = y > floorY + 0.01 ? 1 : 0.08;
    part.mesh.rotation.x = spinX * dt * airborne;
    part.mesh.rotation.z = spinZ * dt * airborne;
  }
}
