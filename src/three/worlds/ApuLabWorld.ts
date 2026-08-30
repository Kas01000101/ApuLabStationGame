import * as THREE from 'three';

const COLORS = {
  wall: 0x322d46,
  panel: 0x45405b,
  floor: 0x39374a,
  metal: 0x5b566f,
  cyan: 0x49c9d7,
  violet: 0x7565c7,
  amber: 0xefa73a,
  white: 0xd8d9e3,
  dark: 0x242033,
};

function material(color: number, roughness = 0.86, metalness = 0.06): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: true });
}

function addBox(
  parent: THREE.Object3D,
  width: number,
  height: number,
  depth: number,
  mat: THREE.Material,
  cast = false,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
  mesh.castShadow = cast;
  mesh.receiveShadow = !cast;
  parent.add(mesh);
  return mesh;
}

export class ApuLabWorld {
  readonly group = new THREE.Group();
  readonly practiceBench = new THREE.Group();
  readonly landingGroup = new THREE.Group();

  private readonly hatchDoorLeft: THREE.Mesh;
  private readonly hatchDoorRight: THREE.Mesh;
  private readonly hatchLeftClosed = -1.35;
  private readonly hatchRightClosed = 1.35;
  private readonly hatchLeftOpen = -4.25;
  private readonly hatchRightOpen = 4.25;
  private readonly ambientIndicators: Array<{ mat: THREE.MeshStandardMaterial; phase: number }> = [];
  private readonly ceilingLights: THREE.PointLight[] = [];
  private readonly serviceJoint1 = new THREE.Group();
  private readonly serviceJoint2 = new THREE.Group();
  private readonly ventRotor = new THREE.Group();
  private readonly ruthSpot: THREE.SpotLight;
  private readonly benchSpot: THREE.SpotLight;
  private readonly landingPulseMat = new THREE.MeshBasicMaterial({
    color: COLORS.amber,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  private landingPulse!: THREE.Mesh;
  private readonly impactDustMat = new THREE.MeshStandardMaterial({
    color: 0xb8b0b8,
    transparent: true,
    opacity: 0,
    roughness: 1,
    flatShading: true,
  });
  private readonly impactDust: THREE.Mesh[] = [];
  private readonly toolGroups: THREE.Group[] = [];

  constructor() {
    this.group.name = 'ApuLabWorld';

    const floorMat = material(COLORS.floor, 0.98, 0.02);
    const wallMat = material(COLORS.wall, 0.96, 0.02);
    const panelMat = material(COLORS.panel, 0.88, 0.05);
    const metalMat = material(COLORS.metal, 0.72, 0.18);
    const darkMat = material(COLORS.dark, 0.92, 0.06);
    const violetMat = material(COLORS.violet, 0.70, 0.08);
    const whiteMat = material(COLORS.white, 0.72, 0.06);
    const cyanMat = new THREE.MeshStandardMaterial({
      color: COLORS.cyan,
      emissive: 0x16889b,
      emissiveIntensity: 1.35,
      roughness: 0.42,
      metalness: 0.08,
      flatShading: true,
    });
    const amberMat = new THREE.MeshStandardMaterial({
      color: COLORS.amber,
      emissive: 0x8a4d0b,
      emissiveIntensity: 0.34,
      roughness: 0.48,
      metalness: 0.05,
      flatShading: true,
    });

    const floor = addBox(this.group, 25, 0.26, 22, floorMat);
    floor.position.set(0, -0.14, 0);
    floor.receiveShadow = true;

    const seamMat = material(0x2c293a, 0.98, 0);
    for (const x of [-8, -4, 0, 4, 8]) {
      const seam = addBox(this.group, 0.035, 0.012, 21.4, seamMat);
      seam.position.set(x, 0.006, 0);
    }
    for (const z of [-7, -2.5, 2.5, 7]) {
      const seam = addBox(this.group, 24.4, 0.012, 0.035, seamMat);
      seam.position.set(0, 0.006, z);
    }

    const backWall = addBox(this.group, 25, 9.6, 0.36, wallMat);
    backWall.position.set(0, 4.65, -10.8);
    const leftWall = addBox(this.group, 0.36, 9.6, 22, wallMat);
    leftWall.position.set(-12.3, 4.65, 0);
    const rightWall = addBox(this.group, 0.36, 9.6, 22, wallMat);
    rightWall.position.set(12.3, 4.65, 0);

    const backBase = addBox(this.group, 24.4, 0.35, 0.28, metalMat);
    backBase.position.set(0, 0.20, -10.50);

    const ceilY = 9.25;
    const hatchW = 5.4;
    const hatchD = 4.6;
    const ceilLeft = addBox(this.group, (25 - hatchW) / 2, 0.30, 22, panelMat);
    ceilLeft.position.set(-(25 + hatchW) / 4, ceilY, 0);
    const ceilRight = addBox(this.group, (25 - hatchW) / 2, 0.30, 22, panelMat);
    ceilRight.position.set((25 + hatchW) / 4, ceilY, 0);
    const ceilBack = addBox(this.group, hatchW, 0.30, (22 - hatchD) / 2, panelMat);
    ceilBack.position.set(0, ceilY, -(22 + hatchD) / 4);
    const ceilFront = addBox(this.group, hatchW, 0.30, (22 - hatchD) / 2, panelMat);
    ceilFront.position.set(0, ceilY, (22 + hatchD) / 4);

    this.hatchDoorLeft = addBox(this.group, hatchW / 2 - 0.08, 0.16, hatchD - 0.18, darkMat);
    this.hatchDoorRight = addBox(this.group, hatchW / 2 - 0.08, 0.16, hatchD - 0.18, darkMat);
    this.hatchDoorLeft.position.set(this.hatchLeftClosed, ceilY - 0.22, 0);
    this.hatchDoorRight.position.set(this.hatchRightClosed, ceilY - 0.22, 0);

    for (const [x, z] of [
      [-hatchW / 2 - 0.25, -hatchD / 2 - 0.25],
      [hatchW / 2 + 0.25, -hatchD / 2 - 0.25],
      [-hatchW / 2 - 0.25, hatchD / 2 + 0.25],
      [hatchW / 2 + 0.25, hatchD / 2 + 0.25],
    ]) {
      const lamp = addBox(this.group, 0.34, 0.12, 0.34, amberMat);
      lamp.position.set(x, ceilY - 0.34, z);
    }

    for (const x of [-7.6, 0, 7.6]) {
      const strip = addBox(this.group, 3.2, 0.10, 0.22, cyanMat);
      strip.position.set(x, ceilY - 0.40, -5.4);
      const point = new THREE.PointLight(COLORS.cyan, 0.58, 9, 2);
      point.position.set(x, ceilY - 0.72, -4.8);
      this.group.add(point);
      this.ceilingLights.push(point);
    }

    this.buildDiagnosticPanel(-7.4, 4.5, 3.6, 2.5, panelMat, cyanMat, whiteMat, violetMat, amberMat);
    this.buildDiagnosticPanel(7.5, 4.2, 3.2, 2.2, panelMat, cyanMat, whiteMat, violetMat, amberMat);

    const serviceArm = new THREE.Group();
    serviceArm.position.set(-8.7, 5.55, -9.95);
    this.group.add(serviceArm);
    addBox(serviceArm, 0.52, 0.60, 0.48, metalMat);
    this.serviceJoint1.position.set(0, 0.12, 0.12);
    serviceArm.add(this.serviceJoint1);
    const seg1 = addBox(this.serviceJoint1, 0.34, 2.15, 0.34, metalMat);
    seg1.position.y = -1.02;
    this.serviceJoint2.position.set(0, -2.02, 0);
    this.serviceJoint1.add(this.serviceJoint2);
    const seg2 = addBox(this.serviceJoint2, 0.30, 1.65, 0.30, panelMat);
    seg2.position.y = -0.77;
    const tool = addBox(this.serviceJoint2, 0.54, 0.28, 0.38, cyanMat);
    tool.position.set(0, -1.58, 0.04);

    for (let i = 0; i < 3; i += 1) {
      const indicatorMat = cyanMat.clone();
      indicatorMat.emissiveIntensity = 0.42;
      const lamp = addBox(this.group, 0.18, 0.18, 0.05, indicatorMat);
      lamp.position.set(-6.2 + i * 0.42, 6.92, -10.28);
      this.ambientIndicators.push({ mat: indicatorMat, phase: i * 1.7 });
    }

    this.ventRotor.position.set(9.15, 7.05, -10.18);
    this.group.add(this.ventRotor);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.16, 12), metalMat);
    hub.rotation.x = Math.PI / 2;
    this.ventRotor.add(hub);
    for (let i = 0; i < 4; i += 1) {
      const blade = addBox(this.ventRotor, 0.10, 0.78, 0.06, panelMat);
      blade.position.y = 0.46;
      blade.rotation.z = i * Math.PI / 2;
    }

    this.buildLandingArea(amberMat, metalMat, violetMat, whiteMat);
    this.buildPracticeBench(panelMat, metalMat, cyanMat, amberMat, whiteMat);

    this.ruthSpot = new THREE.SpotLight(0xdff8ff, 0, 18, Math.PI / 6, 0.42, 1.25);
    this.ruthSpot.position.set(5.95, 8.6, 1.10);
    this.ruthSpot.target.position.set(5.85, 1.25, 0.45);
    this.group.add(this.ruthSpot, this.ruthSpot.target);

    this.benchSpot = new THREE.SpotLight(0xfff0d2, 0, 12, Math.PI / 5, 0.46, 1.65);
    this.benchSpot.position.set(-2.9, 7.9, 4.2);
    this.benchSpot.target.position.set(-2.9, 1.55, 2.35);
    this.group.add(this.benchSpot, this.benchSpot.target);

    const hemi = new THREE.HemisphereLight(0x9284d2, 0x0b0e26, 1.25);
    const key = new THREE.DirectionalLight(0xdfe8ff, 1.35);
    key.position.set(6, 10, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    this.group.add(hemi, key);

    this.reset();
  }

  applySceneEnvironment(scene: THREE.Scene): void {
    scene.background = new THREE.Color(0x322d46);
    scene.fog = new THREE.Fog(0x322d46, 21, 48);
  }

  reset(): void {
    this.setHatchOpen(0);
    this.setRuthSpot(0, new THREE.Vector3(5.85, 1.25, 0.45));
    this.setBenchReveal(0);
    this.practiceBench.visible = false;
    this.landingPulseMat.opacity = 0;
    this.landingPulse.scale.setScalar(0.4);
    this.resetImpactDust();
  }

  setHatchOpen(amount: number): void {
    const p = this.smooth(amount);
    this.hatchDoorLeft.position.x = THREE.MathUtils.lerp(this.hatchLeftClosed, this.hatchLeftOpen, p);
    this.hatchDoorRight.position.x = THREE.MathUtils.lerp(this.hatchRightClosed, this.hatchRightOpen, p);
  }

  setRuthSpot(amount: number, targetPosition: THREE.Vector3): void {
    const p = THREE.MathUtils.clamp(amount, 0, 1);
    this.ruthSpot.intensity = 2.9 * p;
    this.ruthSpot.position.set(targetPosition.x + 0.18, 8.55, targetPosition.z + 1.05);
    this.ruthSpot.target.position.set(targetPosition.x, 1.15, targetPosition.z + 0.05);
    this.ruthSpot.target.updateMatrixWorld();
  }

  setBenchReveal(amount: number): void {
    const p = this.smooth(amount);
    this.practiceBench.visible = p > 0.01;
    this.benchSpot.intensity = 4.4 * p;
    this.ceilingLights.forEach((light) => {
      light.intensity = THREE.MathUtils.lerp(0.44, 0.66, p);
    });
  }

  updateAmbient(elapsed: number, intensity = 1): void {
    this.serviceJoint1.rotation.z = -0.18 + Math.sin(elapsed * 0.42) * 0.10 * intensity;
    this.serviceJoint2.rotation.z = 0.30 + Math.sin(elapsed * 0.55 + 1.1) * 0.13 * intensity;
    this.ambientIndicators.forEach((indicator, index) => {
      const wave = 0.5 + 0.5 * Math.sin(elapsed * (1.25 + index * 0.13) + indicator.phase);
      indicator.mat.emissiveIntensity = 0.25 + wave * 0.95 * intensity;
    });
    this.ventRotor.rotation.z += 0.006 * intensity;
  }

  updateLandingPulse(progress: number): void {
    const p = THREE.MathUtils.clamp(progress, 0, 1);
    this.landingPulseMat.opacity = 0.66 * (1 - p);
    const scale = 0.55 + p * 2.1;
    this.landingPulse.scale.setScalar(scale);
    this.updateImpactDust(p);
    this.toolGroups.forEach((tool, index) => {
      tool.rotation.z = Math.sin(p * 26 + index) * 0.08 * (1 - p);
    });
  }

  private buildDiagnosticPanel(x: number, y: number, width: number, height: number, panelMat: THREE.Material, cyanMat: THREE.Material, whiteMat: THREE.Material, violetMat: THREE.Material, amberMat: THREE.Material): void {
    const shell = addBox(this.group, width, height, 0.22, panelMat);
    shell.position.set(x, y, -10.54);
    const screen = addBox(this.group, width * 0.70, height * 0.30, 0.035, cyanMat);
    screen.position.set(x, y + height * 0.17, -10.31);
    const line1 = addBox(this.group, width * 0.50, 0.045, 0.025, whiteMat);
    line1.position.set(x - width * 0.08, y - height * 0.18, -10.30);
    const line2 = addBox(this.group, width * 0.34, 0.045, 0.025, violetMat);
    line2.position.set(x - width * 0.16, y - height * 0.29, -10.30);
    const amber = addBox(this.group, 0.22, 0.22, 0.028, amberMat);
    amber.position.set(x + width * 0.34, y - height * 0.26, -10.29);
  }

  private buildLandingArea(amberMat: THREE.Material, metalMat: THREE.Material, violetMat: THREE.Material, whiteMat: THREE.Material): void {
    this.group.add(this.landingGroup);
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.65, 2.82, 32), new THREE.MeshStandardMaterial({ color: COLORS.metal, roughness: 0.88, metalness: 0.08, emissive: 0x1e1a2b, emissiveIntensity: 0.12, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.018;
    this.landingGroup.add(ring);
    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2;
      const mark = addBox(this.landingGroup, 0.58, 0.018, 0.13, amberMat);
      mark.position.set(Math.cos(angle) * 3.18, 0.022, Math.sin(angle) * 3.18);
      mark.rotation.y = -angle;
    }
    this.landingPulse = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.36, 32), this.landingPulseMat);
    this.landingPulse.rotation.x = -Math.PI / 2;
    this.landingPulse.position.y = 0.03;
    this.landingPulse.scale.setScalar(0.4);
    this.landingGroup.add(this.landingPulse);
    const rack = addBox(this.group, 2.5, 0.16, 0.35, metalMat);
    rack.position.set(-4.6, 2.75, -10.28);
    for (const x of [-5.15, -4.15]) {
      const tool = new THREE.Group();
      tool.position.set(x, 3.25, -10.05);
      this.group.add(tool);
      const handle = addBox(tool, 0.12, 1.05, 0.10, whiteMat);
      handle.position.y = -0.12;
      const head = addBox(tool, 0.48, 0.20, 0.18, violetMat);
      head.position.y = 0.42;
      this.toolGroups.push(tool);
    }
    for (let i = 0; i < 18; i += 1) {
      const dust = new THREE.Mesh(new THREE.OctahedronGeometry(0.08 + (i % 3) * 0.03, 0), this.impactDustMat);
      dust.visible = false;
      dust.position.set(0, 0.05, 0);
      this.landingGroup.add(dust);
      this.impactDust.push(dust);
    }
  }

  private buildPracticeBench(panelMat: THREE.Material, metalMat: THREE.Material, cyanMat: THREE.Material, amberMat: THREE.Material, whiteMat: THREE.Material): void {
    this.practiceBench.position.set(-2.85, 0, 2.28);
    this.group.add(this.practiceBench);
    const top = addBox(this.practiceBench, 5.5, 0.22, 2.35, panelMat, true);
    top.position.y = 1.32;
    for (const x of [-2.2, 2.2]) {
      const leg = addBox(this.practiceBench, 0.34, 1.3, 0.34, metalMat);
      leg.position.set(x, 0.65, 0);
    }
    const battery = addBox(this.practiceBench, 1.55, 0.86, 0.92, material(0x2d2654, 0.72, 0.08), true);
    battery.position.set(1.15, 1.86, 0);
    const batteryTop = addBox(this.practiceBench, 1.35, 0.10, 0.76, whiteMat);
    batteryTop.position.set(1.15, 2.34, 0);
    const plus = addBox(this.practiceBench, 0.18, 0.18, 0.18, amberMat);
    plus.position.set(0.80, 2.48, 0);
    const minus = addBox(this.practiceBench, 0.18, 0.18, 0.18, metalMat);
    minus.position.set(1.50, 2.48, 0);
    const meter = addBox(this.practiceBench, 1.25, 1.55, 0.46, material(0x252831, 0.75, 0.05), true);
    meter.position.set(-1.25, 2.08, 0);
    const display = addBox(this.practiceBench, 0.88, 0.34, 0.035, cyanMat);
    display.position.set(-1.25, 2.48, 0.25);
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.12, 12), material(0x4b4e57, 0.75, 0.10));
    dial.rotation.x = Math.PI / 2;
    dial.position.set(-1.25, 1.90, 0.28);
    this.practiceBench.add(dial);
  }

  private resetImpactDust(): void {
    this.impactDustMat.opacity = 0;
    this.impactDust.forEach((dust) => {
      dust.visible = false;
      dust.position.set(0, 0.05, 0);
      dust.scale.setScalar(1);
    });
  }

  private updateImpactDust(progress: number): void {
    const p = THREE.MathUtils.clamp(progress, 0, 1);
    this.impactDustMat.opacity = 0.42 * (1 - p);
    this.impactDust.forEach((dust, index) => {
      const angle = (index / this.impactDust.length) * Math.PI * 2;
      const radius = 0.35 + p * (1.7 + (index % 4) * 0.12);
      dust.visible = p < 0.98;
      dust.position.set(Math.cos(angle) * radius, 0.05 + p * 0.42, Math.sin(angle) * radius);
      const scale = 0.7 + p * 1.1;
      dust.scale.setScalar(scale);
    });
  }

  private smooth(value: number): number {
    const p = THREE.MathUtils.clamp(value, 0, 1);
    return p * p * (3 - 2 * p);
  }
}
