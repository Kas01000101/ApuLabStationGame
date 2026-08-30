import * as THREE from 'three';

function mat(color: number, roughness = 0.82, metalness = 0.02): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: true });
}

function addBox(
  parent: THREE.Object3D,
  width: number,
  height: number,
  depth: number,
  material: THREE.Material,
  position: THREE.Vector3,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.copy(position);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function canvasTexture(draw: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_context_missing');
  draw(ctx, canvas);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

export class Ruth {
  readonly group = new THREE.Group();
  readonly headRoot = new THREE.Group();
  readonly rightShoulder = new THREE.Group();
  readonly leftShoulder = new THREE.Group();

  private readonly rightForearm = new THREE.Group();
  private readonly leftForearm = new THREE.Group();
  private idleTime = 0;

  constructor() {
    this.group.name = 'Ruth Manzanares Grados';
    this.group.position.set(5.85, 0.02, 0.45);
    this.group.rotation.y = -0.08;

    const suit = mat(0x0b4ea8, 0.74, 0.02);
    const suitDark = mat(0x07336f, 0.78, 0.03);
    const suitLight = mat(0x1768c8, 0.72, 0.02);
    const skin = mat(0xc98058, 0.84, 0);
    const skinLight = mat(0xe2a071, 0.82, 0);
    const hair = mat(0x2f2b31, 0.92, 0.01);
    const hair2 = mat(0x6a646a, 0.90, 0.01);
    const glasses = mat(0x77757d, 0.20, 0.82);
    const eyeWhite = mat(0xf7f4ef, 0.72, 0.01);
    const iris = mat(0x5a3d2d, 0.72, 0.02);
    const pupil = mat(0x241d1b, 0.66, 0.03);
    const white = mat(0xe8e1d7, 0.8, 0.02);
    const red = mat(0xd62e34, 0.70, 0.01);

    const leftLeg = addBox(this.group, 0.72, 2.45, 0.72, suitDark, new THREE.Vector3(-0.42, 1.22, 0));
    const rightLeg = addBox(this.group, 0.72, 2.45, 0.72, suitDark, new THREE.Vector3(0.42, 1.22, 0));
    leftLeg.rotation.z = 0.01;
    rightLeg.rotation.z = -0.01;

    const leftBoot = addBox(this.group, 0.82, 0.45, 1.0, mat(0x182742, 0.9, 0.03), new THREE.Vector3(-0.42, 0.20, 0.13));
    const rightBoot = addBox(this.group, 0.82, 0.45, 1.0, mat(0x182742, 0.9, 0.03), new THREE.Vector3(0.42, 0.20, 0.13));
    leftBoot.position.z = 0.15;
    rightBoot.position.z = 0.15;

    const torso = addBox(this.group, 1.65, 2.45, 0.88, suit, new THREE.Vector3(0, 3.42, 0));
    const torsoFront = addBox(this.group, 1.52, 1.85, 0.09, suitLight, new THREE.Vector3(0, 3.52, 0.49));
    torsoFront.castShadow = false;

    const belt = addBox(this.group, 1.72, 0.24, 0.92, suitDark, new THREE.Vector3(0, 2.55, 0));
    belt.castShadow = true;

    this.buildArm(this.leftShoulder, this.leftForearm, -1, suit, suitDark, skin);
    this.buildArm(this.rightShoulder, this.rightForearm, 1, suit, suitDark, skin);
    this.leftShoulder.position.set(-0.97, 4.26, 0);
    this.rightShoulder.position.set(0.97, 4.26, 0);
    this.group.add(this.leftShoulder, this.rightShoulder);

    this.headRoot.position.set(0, 5.48, 0.05);
    this.group.add(this.headRoot);

    const head = addBox(this.headRoot, 1.52, 1.62, 1.40, skin, new THREE.Vector3(0, 0, 0));
    head.geometry.computeVertexNormals();

    addBox(this.headRoot, 1.68, 0.40, 1.52, hair, new THREE.Vector3(0, 0.70, -0.04));
    addBox(this.headRoot, 1.66, 1.15, 0.30, hair, new THREE.Vector3(0, 0.20, -0.77));
    addBox(this.headRoot, 0.30, 1.16, 1.30, hair2, new THREE.Vector3(-0.86, 0.20, -0.10));
    addBox(this.headRoot, 0.30, 1.16, 1.30, hair2, new THREE.Vector3(0.86, 0.20, -0.10));
    addBox(this.headRoot, 0.74, 0.28, 0.28, hair2, new THREE.Vector3(-0.31, 0.56, 0.67));
    addBox(this.headRoot, 0.52, 0.22, 0.28, hair, new THREE.Vector3(0.34, 0.61, 0.67));

    this.buildEye(-0.34, 0.18, eyeWhite, iris, pupil);
    this.buildEye(0.34, 0.18, eyeWhite, iris, pupil);

    this.buildGlassesFrame(-0.34, 0.20, glasses);
    this.buildGlassesFrame(0.34, 0.20, glasses);
    const bridge = addBox(this.headRoot, 0.18, 0.035, 0.035, glasses, new THREE.Vector3(0, 0.20, 0.735));
    bridge.castShadow = false;

    const mouth = addBox(this.headRoot, 0.48, 0.16, 0.035, mat(0x5e2e2b, 0.8, 0), new THREE.Vector3(0, -0.34, 0.72));
    mouth.castShadow = false;
    const teeth = addBox(this.headRoot, 0.34, 0.055, 0.025, white, new THREE.Vector3(0, -0.295, 0.742));
    teeth.castShadow = false;
    addBox(this.headRoot, 0.09, 0.035, 0.028, skinLight, new THREE.Vector3(-0.27, -0.29, 0.74));
    addBox(this.headRoot, 0.09, 0.035, 0.028, skinLight, new THREE.Vector3(0.27, -0.29, 0.74));

    const nameTexture = canvasTexture((ctx, canvas) => {
      ctx.fillStyle = '#0a2f68';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#6fa6e8';
      ctx.lineWidth = 12;
      ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
      ctx.strokeStyle = 'rgba(111,166,232,.65)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(30, 120);
      ctx.lineTo(canvas.width - 30, 120);
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 76px Arial';
      ctx.fillText('RUTH', canvas.width / 2, 67);
      ctx.fillStyle = '#bcd7ff';
      ctx.font = '700 52px Arial';
      ctx.fillText('MANZANARES', canvas.width / 2, 172);
    });
    const tag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.92, 0.43),
      new THREE.MeshBasicMaterial({ map: nameTexture, transparent: true }),
    );
    tag.position.set(0.27, 3.83, 0.53);
    this.group.add(tag);

    const flagRoot = new THREE.Group();
    flagRoot.position.set(1.17, 4.22, 0.42);
    flagRoot.rotation.y = -0.22;
    this.group.add(flagRoot);

    const usaBase = addBox(flagRoot, 0.28, 0.20, 0.035, white, new THREE.Vector3(0, 0.08, 0));
    usaBase.castShadow = false;
    for (let i = 0; i < 3; i += 1) {
      addBox(flagRoot, 0.28, 0.032, 0.038, red, new THREE.Vector3(0, 0.15 - i * 0.065, 0.02));
    }
    addBox(flagRoot, 0.10, 0.09, 0.04, mat(0x21468b, 0.7, 0), new THREE.Vector3(-0.09, 0.12, 0.025));

    const peruBase = addBox(flagRoot, 0.28, 0.18, 0.035, white, new THREE.Vector3(0, -0.17, 0));
    peruBase.castShadow = false;
    addBox(flagRoot, 0.075, 0.18, 0.038, red, new THREE.Vector3(-0.10, -0.17, 0.02));
    addBox(flagRoot, 0.075, 0.18, 0.038, red, new THREE.Vector3(0.10, -0.17, 0.02));

    this.resetPose();
  }

  resetPose(): void {
    this.leftShoulder.rotation.set(0, 0, 0);
    this.rightShoulder.rotation.set(0, 0, 0);
    this.leftForearm.rotation.set(0, 0, 0);
    this.rightForearm.rotation.set(0, 0, 0);
    this.headRoot.rotation.set(0, 0, 0);
    this.group.rotation.y = -0.08;
  }

  updateIdle(dt: number): void {
    this.idleTime += dt;
    this.group.rotation.y = -0.08 + Math.sin(this.idleTime * 0.7) * 0.02;
    this.headRoot.rotation.y = Math.sin(this.idleTime * 0.95) * 0.025;
  }

  greeting(elapsed: number): void {
    const up = this.smooth(elapsed / 0.42);
    const down = this.smooth((elapsed - 1.02) / 0.32);
    const hold = up * (1 - down);

    this.rightShoulder.rotation.z = 1.72 * hold + Math.sin(elapsed * 11) * 0.10 * hold;
    this.rightShoulder.rotation.x = -0.16 * hold + Math.sin(elapsed * 8) * 0.025 * hold;
    this.leftShoulder.rotation.z = -0.08 * hold;
    this.headRoot.rotation.y = -0.05 + Math.sin(elapsed * 3.2) * 0.018;
  }

  lookAtMonitor(amount: number): void {
    const p = this.smooth(amount);
    this.group.rotation.y = THREE.MathUtils.lerp(-0.08, -0.42, p);
    this.headRoot.rotation.y = THREE.MathUtils.lerp(-0.03, -0.30, p);
  }

  openTeamPose(amount: number): void {
    const p = this.smooth(amount);
    this.group.rotation.y = THREE.MathUtils.lerp(-0.16, -0.02, p);
    this.leftShoulder.rotation.z = THREE.MathUtils.lerp(0, -0.34, p);
    this.rightShoulder.rotation.z = THREE.MathUtils.lerp(0, 0.28, p);
    this.headRoot.rotation.y = THREE.MathUtils.lerp(-0.08, 0.02, p);
  }

  lookUp(amount: number): void {
    const p = this.smooth(amount);
    this.headRoot.rotation.x = -0.17 * p;
    this.headRoot.rotation.y = -0.34 * p;
  }

  moveBetween(from: THREE.Vector3, to: THREE.Vector3, amount: number): void {
    this.group.position.copy(from).lerp(to, this.smooth(amount));
  }

  private buildArm(
    shoulder: THREE.Group,
    forearm: THREE.Group,
    side: -1 | 1,
    suit: THREE.Material,
    suitDark: THREE.Material,
    skin: THREE.Material,
  ): void {
    const upper = addBox(shoulder, 0.58, 1.50, 0.64, suit, new THREE.Vector3(0, -0.68, 0));
    upper.castShadow = true;
    forearm.position.set(0, -1.37, 0);
    shoulder.add(forearm);
    const lower = addBox(forearm, 0.52, 1.34, 0.58, suitDark, new THREE.Vector3(0, -0.58, 0));
    lower.castShadow = true;
    const hand = addBox(forearm, 0.48, 0.46, 0.54, skin, new THREE.Vector3(0, -1.38, 0));
    hand.castShadow = true;
    shoulder.rotation.z = side * 0.02;
  }

  private buildEye(
    x: number,
    y: number,
    eyeWhite: THREE.Material,
    iris: THREE.Material,
    pupil: THREE.Material,
  ): void {
    addBox(this.headRoot, 0.455, 0.265, 0.035, eyeWhite, new THREE.Vector3(x, y, 0.716));
    addBox(this.headRoot, 0.185, 0.180, 0.041, iris, new THREE.Vector3(x, y - 0.005, 0.737));
    addBox(this.headRoot, 0.110, 0.108, 0.046, pupil, new THREE.Vector3(x, y - 0.005, 0.760));
    addBox(this.headRoot, 0.035, 0.035, 0.050, mat(0xffffff, 0.4, 0), new THREE.Vector3(x - 0.028, y + 0.034, 0.785));
  }

  private buildGlassesFrame(x: number, y: number, glasses: THREE.Material): void {
    const width = 0.61;
    const height = 0.405;
    const thickness = 0.026;
    const z = 0.790;
    addBox(this.headRoot, width, thickness, 0.025, glasses, new THREE.Vector3(x, y + height / 2, z));
    addBox(this.headRoot, width, thickness, 0.025, glasses, new THREE.Vector3(x, y - height / 2, z));
    addBox(this.headRoot, thickness, height, 0.025, glasses, new THREE.Vector3(x - width / 2, y, z));
    addBox(this.headRoot, thickness, height, 0.025, glasses, new THREE.Vector3(x + width / 2, y, z));
  }

  private smooth(value: number): number {
    const p = THREE.MathUtils.clamp(value, 0, 1);
    return p * p * (3 - 2 * p);
  }
}
