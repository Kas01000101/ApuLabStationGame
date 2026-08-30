import * as THREE from 'three';

export interface RoverOptions {
  name: string;
  bodyTint?: number;
}

const palette = {
  panel: 0x13213c,
  panel2: 0xa1adbf,
  frame: 0x1d212a,
  tan: 0xcac2b7,
  cream: 0xe7e0d6,
  dark: 0x252831,
  metal: 0x666159,
  bronze: 0xc86f10,
  wheel: 0x24252a,
  black: 0x111318,
  gray: 0x4b4e57,
  orange: 0xe08b18,
  hubDark: 0x181a20,
  cyan: 0x49c9d7,
};

function material(color: number, roughness = 0.8, metalness = 0.05): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    flatShading: true,
  });
}

function meshBox(
  width: number,
  height: number,
  depth: number,
  mat: THREE.Material,
  parent: THREE.Object3D,
  castShadow = true,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = false;
  parent.add(mesh);
  return mesh;
}

function meshCylinder(
  radius: number,
  height: number,
  segments: number,
  mat: THREE.Material,
  parent: THREE.Object3D,
  castShadow = true,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), mat);
  mesh.castShadow = castShadow;
  parent.add(mesh);
  return mesh;
}

function addBeam(
  parent: THREE.Object3D,
  a: THREE.Vector3,
  b: THREE.Vector3,
  thickness: number,
  mat: THREE.Material,
): THREE.Mesh {
  const length = a.distanceTo(b);
  const beam = meshBox(thickness, length, thickness, mat, parent);
  beam.position.copy(a).add(b).multiplyScalar(0.5);
  beam.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    b.clone().sub(a).normalize(),
  );
  return beam;
}

export class Rover {
  readonly group = new THREE.Group();
  readonly deck = new THREE.Group();
  readonly mast = new THREE.Group();
  readonly dish = new THREE.Group();
  readonly antenna = new THREE.Group();
  readonly wheelGroups: THREE.Group[] = [];
  readonly eyeMaterials: THREE.MeshStandardMaterial[] = [];
  readonly powerMaterials: THREE.MeshStandardMaterial[] = [];
  readonly cameraBar: THREE.Mesh;
  readonly detachableSolarPanel: THREE.Group;

  private readonly wheelPositions: THREE.Vector3[] = [];
  private readonly detachableBasePosition: THREE.Vector3;
  private readonly detachableBaseRotation: THREE.Euler;
  private readonly detachableBaseScale: THREE.Vector3;
  private wheelSpin = 0;
  private currentPower = 1;

  constructor(options: RoverOptions) {
    this.group.name = options.name;
    this.group.position.y = 1.8;

    const mats = {
      panel: material(palette.panel, 0.6, 0.04),
      panel2: material(palette.panel2, 0.55, 0.12),
      frame: material(palette.frame, 0.76, 0.12),
      tan: material(options.bodyTint ?? palette.tan, 0.82, 0.03),
      cream: material(palette.cream, 0.8, 0.02),
      dark: material(palette.dark, 0.88, 0.05),
      metal: material(palette.metal, 0.72, 0.22),
      bronze: material(palette.bronze, 0.74, 0.05),
      wheel: material(palette.wheel, 0.9, 0.04),
      black: material(palette.black, 0.92, 0.01),
      gray: material(palette.gray, 0.8, 0.12),
      orange: material(palette.orange, 0.7, 0.03),
      hubDark: material(palette.hubDark, 0.88, 0.05),
    };

    const lower = meshBox(3.55, 0.78, 2.25, mats.dark, this.group);
    lower.position.set(0, -0.1, 0.03);

    const belly = meshBox(2.8, 0.45, 1.72, mats.frame, this.group);
    belly.position.set(0, -0.55, -0.02);

    const frontBox = meshBox(1.25, 0.6, 1.72, mats.tan, this.group);
    frontBox.position.set(-1.22, 0.35, 0.05);

    const rearBox = meshBox(1.15, 0.55, 1.62, mats.cream, this.group);
    rearBox.position.set(1.26, 0.34, 0.04);

    this.deck.position.y = 0.58;
    this.group.add(this.deck);

    const solarMat = new THREE.MeshStandardMaterial({
      color: 0x183767,
      roughness: 0.35,
      metalness: 0.06,
      emissive: 0x071426,
      emissiveIntensity: 0.12,
      flatShading: true,
    });

    const makePanel = (
      width: number,
      depth: number,
      x: number,
      z: number,
      ry = 0,
      rz = 0,
    ): THREE.Group => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.rotation.y = ry;
      g.rotation.z = rz;
      this.deck.add(g);

      const frame = meshBox(width + 0.08, 0.09, depth + 0.08, mats.frame, g, false);
      frame.position.y = 0.01;

      const face = meshBox(width, 0.035, depth, solarMat, g, false);
      face.position.y = 0.075;

      const lineMat = new THREE.MeshBasicMaterial({ color: 0x86a7d2, transparent: true, opacity: 0.42 });
      for (let ix = 1; ix < 6; ix += 1) {
        const line = meshBox(0.012, 0.006, depth * 0.96, lineMat, g, false);
        line.position.set(-width / 2 + (width / 6) * ix, 0.097, 0);
      }
      for (let iz = 1; iz < 4; iz += 1) {
        const line = meshBox(width * 0.96, 0.006, 0.012, lineMat, g, false);
        line.position.set(0, 0.097, -depth / 2 + (depth / 4) * iz);
      }

      return g;
    };

    makePanel(2.35, 1.72, 0, 0.05);
    makePanel(2.25, 1.62, -2.18, 0.56, 0.06, 0.015);
    makePanel(2.30, 1.62, -2.20, -1.08, -0.04, -0.018);
    makePanel(2.25, 1.62, 2.18, 0.56, -0.06, -0.015);
    makePanel(2.30, 1.62, 2.20, -1.08, 0.04, 0.018);
    makePanel(2.12, 1.42, 0, 1.66, 0, -0.01);
    this.detachableSolarPanel = makePanel(2.18, 1.42, 0, -1.63, 0, 0.012);

    this.detachableBasePosition = this.detachableSolarPanel.position.clone();
    this.detachableBaseRotation = this.detachableSolarPanel.rotation.clone();
    this.detachableBaseScale = this.detachableSolarPanel.scale.clone();

    this.mast.position.set(-0.72, 0.58, 0.22);
    this.group.add(this.mast);

    const mastBase = meshCylinder(0.46, 0.2, 10, mats.bronze, this.mast);
    mastBase.position.y = 0.12;
    const lowerMount = meshBox(0.48, 0.55, 0.48, mats.gray, this.mast);
    lowerMount.position.y = 0.61;
    const column = meshBox(0.36, 2.18, 0.36, mats.cream, this.mast);
    column.position.y = 1.83;
    const tilt = meshCylinder(0.31, 1.3, 10, mats.cream, this.mast);
    tilt.position.set(0, 3.28, 0);
    tilt.rotation.z = Math.PI / 2;

    this.cameraBar = meshBox(1.95, 0.42, 0.46, mats.tan, this.mast);
    this.cameraBar.position.set(0, 3.8, 0.02);

    const sensorXs = [-0.74, -0.38, 0, 0.38, 0.74];
    sensorXs.forEach((x, index) => {
      const mainEye = index === 0 || index === sensorXs.length - 1;
      const frame = meshBox(mainEye ? 0.34 : 0.30, mainEye ? 0.31 : 0.28, 0.11, mainEye ? mats.cream : mats.gray, this.mast, false);
      frame.position.set(x, 3.8, 0.28);

      const lensMat = (mainEye ? mats.black : mats.dark).clone();
      if (mainEye) {
        lensMat.emissive = new THREE.Color(0x163c49);
        lensMat.emissiveIntensity = 0.12;
        this.eyeMaterials.push(lensMat);
      }

      const lens = meshCylinder(mainEye ? 0.135 : 0.1, 0.14, 10, lensMat, this.mast, false);
      lens.position.set(x, 3.8, 0.36);
      lens.rotation.x = Math.PI / 2;
    });

    this.antenna.position.set(0.58, 0.64, 0.08);
    this.group.add(this.antenna);
    const antLower = meshCylinder(0.075, 0.65, 8, mats.metal, this.antenna);
    antLower.position.y = 0.6;
    const antMid = meshCylinder(0.1, 0.22, 8, mats.dark, this.antenna);
    antMid.position.y = 1.04;
    const antUpper = meshCylinder(0.06, 1.15, 8, mats.metal, this.antenna);
    antUpper.position.y = 1.72;

    this.dish.position.set(1.35, 0.66, -0.1);
    this.group.add(this.dish);
    const stem = meshBox(0.20, 0.52, 0.20, mats.cream, this.dish);
    stem.position.y = 0.48;
    const disk = new THREE.Mesh(
      new THREE.ConeGeometry(0.63, 0.18, 12, 1, true),
      new THREE.MeshStandardMaterial({
        color: palette.black,
        roughness: 0.85,
        metalness: 0.05,
        side: THREE.DoubleSide,
        flatShading: true,
      }),
    );
    disk.position.set(0.1, 1.16, 0.06);
    disk.rotation.set(Math.PI / 2 + 0.12, -0.22, 0.08);
    this.dish.add(disk);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.63, 0.035, 6, 12), mats.bronze);
    rim.position.copy(disk.position);
    rim.rotation.copy(disk.rotation);
    this.dish.add(rim);

    for (const z of [-0.48, 0.48]) {
      const indicatorMat = new THREE.MeshStandardMaterial({
        color: palette.cyan,
        emissive: palette.cyan,
        emissiveIntensity: 1.85,
        roughness: 0.35,
        metalness: 0.03,
        flatShading: true,
      });
      const indicator = meshBox(0.11, 0.18, 0.28, indicatorMat, this.group, false);
      indicator.position.set(-1.83, 0.18, z);
      this.powerMaterials.push(indicatorMat);
    }

    this.createSuspension(mats);
    this.createWheels(mats);
    this.setPower(1);
    this.setEyesGlow(0.25);
  }

  private createSuspension(mats: Record<string, THREE.MeshStandardMaterial>): void {
    const sideMaterial = mats.metal;
    for (const side of [-1, 1]) {
      const suspension = new THREE.Group();
      this.group.add(suspension);
      const bodyPivot = new THREE.Vector3(side * 1.66, -0.12, 0.1);
      const frontElbow = new THREE.Vector3(side * 2.08, -0.53, 1.05);
      const frontHub = new THREE.Vector3(side * 2.82, -1.05, 1.95);
      const bogie = new THREE.Vector3(side * 2.04, -0.49, -0.72);
      const middleHub = new THREE.Vector3(side * 2.62, -1.05, -0.03);
      const rearHub = new THREE.Vector3(side * 2.80, -1.05, -1.82);

      addBeam(suspension, bodyPivot, frontElbow, 0.15, sideMaterial);
      addBeam(suspension, frontElbow, frontHub, 0.13, sideMaterial);
      addBeam(suspension, bodyPivot, bogie, 0.15, sideMaterial);
      addBeam(suspension, bogie, middleHub, 0.13, sideMaterial);
      addBeam(suspension, bogie, rearHub, 0.13, sideMaterial);
      addBeam(suspension, new THREE.Vector3(side * 1.9, -0.48, 1.22), frontHub, 0.1, mats.cream);
      addBeam(suspension, new THREE.Vector3(side * 1.95, -0.48, -0.82), rearHub, 0.1, mats.cream);
    }
  }

  private createWheels(mats: Record<string, THREE.MeshStandardMaterial>): void {
    const wheelPositions: THREE.Vector3[] = [];
    for (const x of [-2.82, 2.82]) {
      wheelPositions.push(
        new THREE.Vector3(x, -1.05, 1.95),
        new THREE.Vector3(x, -1.05, -0.03),
        new THREE.Vector3(x, -1.05, -1.82),
      );
    }
    this.wheelPositions.push(...wheelPositions);

    const tireGeo = new THREE.CylinderGeometry(0.66, 0.66, 0.52, 12, 1, true);
    const sideGeo = new THREE.RingGeometry(0.39, 0.655, 12, 1);
    const rimGeo = new THREE.TorusGeometry(0.425, 0.060, 6, 12);
    const hubGeo = new THREE.CylinderGeometry(0.285, 0.285, 0.58, 12);
    const capGeo = new THREE.CylinderGeometry(0.115, 0.115, 0.63, 8);

    for (const position of wheelPositions) {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.copy(position);
      this.group.add(wheelGroup);
      this.wheelGroups.push(wheelGroup);

      const tire = new THREE.Mesh(tireGeo, mats.wheel);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wheelGroup.add(tire);

      for (const side of [-1, 1]) {
        const sidewall = new THREE.Mesh(sideGeo, mats.wheel);
        sidewall.rotation.y = Math.PI / 2;
        sidewall.position.x = side * 0.266;
        wheelGroup.add(sidewall);

        const rim = new THREE.Mesh(rimGeo, mats.orange);
        rim.rotation.y = Math.PI / 2;
        rim.position.x = side * 0.28;
        wheelGroup.add(rim);
      }

      const hub = new THREE.Mesh(hubGeo, mats.hubDark);
      hub.rotation.z = Math.PI / 2;
      wheelGroup.add(hub);

      const cap = new THREE.Mesh(capGeo, mats.metal);
      cap.rotation.z = Math.PI / 2;
      wheelGroup.add(cap);

      for (let i = 0; i < 12; i += 1) {
        const angle = (i / 12) * Math.PI * 2;
        const tread = meshBox(0.32, 0.12, 0.19, mats.gray, wheelGroup, false);
        tread.position.set(0, Math.sin(angle) * 0.68, Math.cos(angle) * 0.68);
        tread.rotation.x = angle;
        tread.rotation.z = i % 2 === 0 ? 0.18 : -0.18;
      }
    }
  }

  advance(speed: number, dt: number): void {
    this.group.position.x += speed * dt * 2.2;
    this.animateWheels(speed, dt);
  }

  animateWheels(speed: number, dt: number): void {
    this.wheelSpin -= speed * dt * 3.7;
    this.wheelGroups.forEach((wheel) => {
      wheel.rotation.x = this.wheelSpin;
    });
  }

  setPower(amount: number): void {
    const p = THREE.MathUtils.clamp(amount, 0, 1);
    this.currentPower = p;
    const off = new THREE.Color(0x11151a);
    const on = new THREE.Color(palette.cyan);
    this.powerMaterials.forEach((mat) => {
      mat.color.copy(off).lerp(on, p);
      mat.emissive.setHex(palette.cyan);
      mat.emissiveIntensity = 1.85 * p;
    });
  }

  setEyesGlow(amount: number): void {
    const p = THREE.MathUtils.clamp(amount, 0, 1);
    this.eyeMaterials.forEach((mat, index) => {
      mat.emissive.setHex(0x163c49);
      mat.emissiveIntensity = 0.12 + p * (1.2 + index * 0.12);
    });
  }

  pointMast(yaw: number, pitch = 0): void {
    this.mast.rotation.y = yaw;
    this.mast.rotation.x = pitch;
  }

  pointDish(yaw: number): void {
    this.dish.rotation.y = yaw;
  }

  getWorldEyePosition(target = new THREE.Vector3()): THREE.Vector3 {
    this.cameraBar.getWorldPosition(target);
    target.z += 0.18;
    return target;
  }

  getWorldWheelPosition(index = 3, target = new THREE.Vector3()): THREE.Vector3 {
    const wheel = this.wheelGroups[index] ?? this.wheelGroups[0];
    wheel.getWorldPosition(target);
    target.y += 0.28;
    target.z -= 0.1;
    return target;
  }

  getWorldAntennaTip(target = new THREE.Vector3()): THREE.Vector3 {
    target.set(0.58, 3.2, 0.08);
    return this.group.localToWorld(target);
  }

  detachSolarPanelTo(parent: THREE.Object3D): void {
    if (this.detachableSolarPanel.parent === parent) return;
    parent.attach(this.detachableSolarPanel);
  }

  restoreSolarPanel(): void {
    if (this.detachableSolarPanel.parent !== this.deck) {
      this.deck.attach(this.detachableSolarPanel);
    }
    this.detachableSolarPanel.position.copy(this.detachableBasePosition);
    this.detachableSolarPanel.rotation.copy(this.detachableBaseRotation);
    this.detachableSolarPanel.scale.copy(this.detachableBaseScale);
    this.detachableSolarPanel.visible = true;
  }

  resetDynamicPose(): void {
    this.wheelSpin = 0;
    this.wheelGroups.forEach((wheel) => wheel.rotation.set(0, 0, 0));
    this.mast.rotation.set(0, 0, 0);
    this.dish.rotation.set(0, 0, 0);
    this.setPower(1);
    this.setEyesGlow(0.25);
    this.restoreSolarPanel();
  }

  get powerLevel(): number {
    return this.currentPower;
  }
}
