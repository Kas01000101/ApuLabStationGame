import * as THREE from 'three';

const COLORS = {
  deep: 0x17133a,
  panel: 0x2d2654,
  raised: 0x3b326b,
  border: 0x4d4288,
  lavender: 0x8e7dce,
  cyan: 0x49c9d7,
  cream: 0xfff7e8,
  yellow: 0xf4c75e,
  orange: 0xe86b20,
};

function techPlateShape(width: number, height: number, cut = 0.62): THREE.Shape {
  const hw = width / 2;
  const hh = height / 2;
  const s = new THREE.Shape();
  s.moveTo(-hw + cut, hh);
  s.lineTo(hw - cut, hh);
  s.lineTo(hw, hh - cut);
  s.lineTo(hw, -hh + cut);
  s.lineTo(hw - cut, -hh);
  s.lineTo(-hw + cut, -hh);
  s.lineTo(-hw, -hh + cut);
  s.lineTo(-hw, hh - cut);
  s.closePath();
  return s;
}

function starShape(points = 5, outer = 0.42, inner = 0.19): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i < points * 2; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function triangleShape(size = 1): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(0, size * 0.62);
  shape.lineTo(-size * 0.58, -size * 0.42);
  shape.lineTo(size * 0.58, -size * 0.42);
  shape.closePath();
  return shape;
}

function makeTextTexture(
  text: string,
  options: {
    width?: number;
    height?: number;
    fontSize?: number;
    leftColor: string;
    rightColor: string;
    stroke?: string;
  },
): THREE.CanvasTexture {
  const width = options.width ?? 1400;
  const height = options.height ?? 300;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('ApuLab menu logo canvas context unavailable.');

  const fontSize = options.fontSize ?? 190;
  ctx.clearRect(0, 0, width, height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${fontSize}px Poppins, Arial Black, Arial, sans-serif`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(10, fontSize * 0.055);
  ctx.strokeStyle = options.stroke ?? '#17133A';
  ctx.shadowColor = 'rgba(9, 8, 32, .86)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 15;
  ctx.strokeText(text, width / 2, height / 2 + 4);

  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, options.leftColor);
  gradient.addColorStop(1, options.rightColor);
  ctx.fillStyle = gradient;
  ctx.shadowColor = 'transparent';
  ctx.fillText(text, width / 2, height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function addTextPlane(
  parent: THREE.Object3D,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  leftColor: string,
  rightColor: string,
  fontSize: number,
): THREE.Mesh {
  const texture = makeTextTexture(text, { leftColor, rightColor, fontSize });
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.position.set(x, y, 0.72);
  parent.add(mesh);
  return mesh;
}

export class MenuLogo3D {
  private readonly host = document.createElement('div');
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-7, 7, 2.8, -2.8, 0.1, 50);
  private readonly logo = new THREE.Group();
  private readonly clock = new THREE.Clock();
  private readonly resizeObserver: ResizeObserver;
  private readonly pulseMaterials: THREE.MeshStandardMaterial[] = [];
  private mars?: THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshStandardMaterial>;
  private orbit?: THREE.Mesh<THREE.TorusGeometry, THREE.MeshStandardMaterial>;
  private frame = 0;
  private visible = true;

  constructor(private readonly container: HTMLElement) {
    this.host.className = 'menu-logo3d';
    this.host.setAttribute('aria-hidden', 'true');
    this.container.appendChild(this.host);

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.domElement.className = 'menu-logo3d-canvas';
    this.host.appendChild(this.renderer.domElement);

    this.camera.position.set(0, 0, 20);
    this.camera.lookAt(0, 0, 0);

    this.scene.add(this.logo);
    this.buildLights();
    this.buildLogo();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.host);
    this.resize();
    this.start();
  }

  setVisible(value: boolean): void {
    this.visible = value;
    this.host.classList.toggle('hidden', !value);
    if (value) {
      this.clock.getDelta();
      this.resize();
      this.start();
    } else {
      this.stop();
    }
  }

  destroy(): void {
    this.stop();
    this.resizeObserver.disconnect();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          if ('map' in material && material.map instanceof THREE.Texture) material.map.dispose();
          material.dispose();
        });
      }
    });
    this.renderer.dispose();
    this.host.remove();
  }

  private buildLights(): void {
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.55));

    const key = new THREE.DirectionalLight(0xe6e0ff, 4.1);
    key.position.set(-4, 6, 10);
    this.scene.add(key);

    const cyan = new THREE.PointLight(COLORS.cyan, 7.5, 14, 2);
    cyan.position.set(4.5, 1.8, 5.5);
    this.scene.add(cyan);

    const warm = new THREE.PointLight(COLORS.yellow, 5, 10, 2);
    warm.position.set(-2, 3.2, 4.5);
    this.scene.add(warm);
  }

  private buildLogo(): void {
    const deepMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.deep,
      metalness: 0.66,
      roughness: 0.28,
    });
    const panelMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.panel,
      metalness: 0.58,
      roughness: 0.3,
    });
    const lavenderMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.lavender,
      emissive: 0x261a55,
      emissiveIntensity: 0.72,
      metalness: 0.62,
      roughness: 0.22,
    });
    const cyanMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.cyan,
      emissive: 0x116d78,
      emissiveIntensity: 1.45,
      metalness: 0.4,
      roughness: 0.2,
    });
    const yellowMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.yellow,
      emissive: 0x6f4500,
      emissiveIntensity: 1.1,
      metalness: 0.34,
      roughness: 0.24,
    });
    this.pulseMaterials.push(cyanMaterial, yellowMaterial, lavenderMaterial);

    const outerGeometry = new THREE.ExtrudeGeometry(techPlateShape(12.5, 3.45, 0.7), {
      depth: 0.3,
      bevelEnabled: true,
      bevelThickness: 0.12,
      bevelSize: 0.12,
      bevelSegments: 3,
    });
    const outer = new THREE.Mesh(outerGeometry, lavenderMaterial);
    outer.position.z = -0.34;
    this.logo.add(outer);

    const panelGeometry = new THREE.ExtrudeGeometry(techPlateShape(11.95, 3.02, 0.58), {
      depth: 0.34,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.09,
      bevelSegments: 2,
    });
    const panel = new THREE.Mesh(panelGeometry, panelMaterial);
    panel.position.z = -0.03;
    this.logo.add(panel);

    const innerGeometry = new THREE.ExtrudeGeometry(techPlateShape(10.9, 2.3, 0.43), {
      depth: 0.16,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 2,
    });
    const inner = new THREE.Mesh(innerGeometry, deepMaterial);
    inner.position.set(0.35, -0.05, 0.31);
    this.logo.add(inner);

    // Emblema hexagonal de ApuLab.
    const hexOuter = new THREE.Mesh(
      new THREE.CylinderGeometry(1.22, 1.22, 0.36, 6),
      lavenderMaterial,
    );
    hexOuter.rotation.x = Math.PI / 2;
    hexOuter.position.set(-4.93, 0.02, 0.48);
    this.logo.add(hexOuter);

    const hexInner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.96, 0.96, 0.39, 6),
      cyanMaterial,
    );
    hexInner.rotation.x = Math.PI / 2;
    hexInner.position.set(-4.93, 0.02, 0.54);
    this.logo.add(hexInner);

    const triangle = new THREE.Mesh(
      new THREE.ExtrudeGeometry(triangleShape(1.05), {
        depth: 0.16,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.035,
      }),
      deepMaterial,
    );
    triangle.position.set(-4.93, -0.04, 0.73);
    this.logo.add(triangle);

    const star = new THREE.Mesh(
      new THREE.ExtrudeGeometry(starShape(), {
        depth: 0.16,
        bevelEnabled: true,
        bevelThickness: 0.045,
        bevelSize: 0.04,
        bevelSegments: 2,
      }),
      yellowMaterial,
    );
    star.position.set(-4.93, 0.08, 0.88);
    this.logo.add(star);

    // Detalles tecnológicos alrededor de la placa.
    const accentGeometry = new THREE.BoxGeometry(0.88, 0.14, 0.18);
    const accents: Array<[number, number, number, THREE.Material]> = [
      [-2.95, 1.22, 0.54, cyanMaterial],
      [-1.68, -1.22, 0.54, cyanMaterial],
      [2.74, -1.21, 0.54, yellowMaterial],
      [4.65, 1.18, 0.54, cyanMaterial],
      [5.35, -0.9, 0.54, yellowMaterial],
    ];
    accents.forEach(([x, y, z, material], index) => {
      const accent = new THREE.Mesh(accentGeometry, material);
      accent.position.set(x, y, z);
      if (index === 3) accent.rotation.z = Math.PI / 2;
      this.logo.add(accent);
    });

    // Tubería cyan superior.
    const pipeMaterial = cyanMaterial;
    const pipeA = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.0, 14), pipeMaterial);
    pipeA.rotation.z = Math.PI / 2;
    pipeA.position.set(2.65, 1.06, 0.55);
    this.logo.add(pipeA);
    const pipeB = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.72, 14), pipeMaterial);
    pipeB.rotation.z = Math.PI / 2;
    pipeB.position.set(4.0, 0.76, 0.55);
    this.logo.add(pipeB);
    const connector = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.34, 0.26), yellowMaterial);
    connector.position.set(3.55, 1.06, 0.6);
    this.logo.add(connector);

    // Texto generado por código, sin PNG de logo.
    addTextPlane(this.logo, 'ApuLab', -0.65, -0.02, 5.9, 1.32, '#FFF7E8', '#F4C75E', 205);
    addTextPlane(this.logo, 'Station', 3.45, -0.12, 3.75, 1.05, '#72E5EE', '#20A8CD', 178);

    // Marte low-poly y su órbita.
    const marsMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.orange,
      emissive: 0x542100,
      emissiveIntensity: 0.42,
      roughness: 0.67,
      metalness: 0.03,
      flatShading: true,
    });
    this.mars = new THREE.Mesh(new THREE.IcosahedronGeometry(0.78, 2), marsMaterial);
    this.mars.position.set(-0.35, 1.68, 0.82);
    this.logo.add(this.mars);

    this.orbit = new THREE.Mesh(
      new THREE.TorusGeometry(1.08, 0.035, 10, 72),
      yellowMaterial,
    );
    this.orbit.position.copy(this.mars.position);
    this.orbit.rotation.x = 1.08;
    this.orbit.rotation.z = -0.2;
    this.logo.add(this.orbit);

    const asteroidMaterial = new THREE.MeshStandardMaterial({
      color: 0xff8b2b,
      emissive: 0x421800,
      emissiveIntensity: 0.3,
      flatShading: true,
      roughness: 0.8,
    });
    [
      [-1.42, 1.58, 0.71, 0.16],
      [0.78, 1.93, 0.69, 0.13],
      [0.94, 1.25, 0.7, 0.11],
    ].forEach(([x, y, z, r]) => {
      const asteroid = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), asteroidMaterial);
      asteroid.position.set(x, y, z);
      this.logo.add(asteroid);
    });

    // Tornillos visuales.
    const screwMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4d9e7,
      metalness: 0.95,
      roughness: 0.23,
    });
    [-5.78, -3.35, 3.7, 5.65].forEach((x, index) => {
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.08, 16), screwMaterial);
      screw.rotation.x = Math.PI / 2;
      screw.position.set(x, index % 2 === 0 ? 1.15 : -1.13, 0.6);
      this.logo.add(screw);
    });

    this.logo.rotation.x = -0.04;
    this.logo.rotation.y = 0.035;
    this.logo.position.y = -0.08;
  }

  private resize(): void {
    const width = Math.max(this.host.clientWidth, 1);
    const height = Math.max(this.host.clientHeight, 1);
    this.renderer.setSize(width, height, false);
    const aspect = width / height;
    const halfHeight = 2.8;
    this.camera.left = -halfHeight * aspect;
    this.camera.right = halfHeight * aspect;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();
  }

  private start(): void {
    if (this.frame || !this.visible) return;
    this.clock.start();

    const loop = () => {
      if (!this.visible) {
        this.frame = 0;
        return;
      }
      this.frame = requestAnimationFrame(loop);
      const elapsed = this.clock.getElapsedTime();
      this.update(elapsed);
      this.renderer.render(this.scene, this.camera);
    };

    this.frame = requestAnimationFrame(loop);
  }

  private stop(): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.clock.stop();
  }

  private update(elapsed: number): void {
    if (this.mars) {
      this.mars.rotation.y = elapsed * 0.22;
      this.mars.rotation.x = Math.sin(elapsed * 0.35) * 0.06;
    }
    if (this.orbit) this.orbit.rotation.z = -0.2 + elapsed * 0.055;

    this.logo.position.y = -0.08 + Math.sin(elapsed * 1.15) * 0.035;
    this.logo.rotation.y = 0.035 + Math.sin(elapsed * 0.72) * 0.012;

    const pulse = 1 + Math.sin(elapsed * 2.15) * 0.12;
    this.pulseMaterials.forEach((material, index) => {
      const base = index === 0 ? 1.45 : index === 1 ? 1.1 : 0.72;
      material.emissiveIntensity = base * pulse;
    });
  }
}
