import * as THREE from 'three';

type Glyph = readonly string[];

const FONT: Record<string, Glyph> = {
  A: ['01110','10001','10001','11111','10001','10001','10001'],
  B: ['11110','10001','10001','11110','10001','10001','11110'],
  I: ['11111','00100','00100','00100','00100','00100','11111'],
  L: ['10000','10000','10000','10000','10000','10000','11111'],
  N: ['10001','11001','11001','10101','10011','10011','10001'],
  O: ['01110','10001','10001','10001','10001','10001','01110'],
  P: ['11110','10001','10001','11110','10000','10000','10000'],
  S: ['01111','10000','10000','01110','00001','00001','11110'],
  T: ['11111','00100','00100','00100','00100','00100','00100'],
  U: ['10001','10001','10001','10001','10001','10001','01110'],
};

type WordPalette = {
  front: number;
  top: number;
  side: number;
  deep: number;
  emissive: number;
};

const APULAB: WordPalette = {
  front: 0xfff7e8,
  top: 0xffffff,
  side: 0xe2a72f,
  deep: 0x8e5418,
  emissive: 0x4d2c08,
};

const STATION: WordPalette = {
  front: 0x67e1eb,
  top: 0xb7f7fb,
  side: 0x1789ad,
  deep: 0x174e75,
  emissive: 0x0b5365,
};

function glyphWidth(glyph: Glyph): number {
  return glyph.reduce((width, row) => Math.max(width, row.length), 0);
}

function wordColumns(text: string, spacing = 1): number {
  let width = 0;
  for (let i = 0; i < text.length; i += 1) {
    const glyph = FONT[text[i]];
    if (!glyph) continue;
    width += glyphWidth(glyph);
    if (i < text.length - 1) width += spacing;
  }
  return width;
}

function activePixels(text: string): number {
  let count = 0;
  for (const char of text) {
    const glyph = FONT[char];
    if (!glyph) continue;
    for (const row of glyph) for (const cell of row) if (cell === '1') count += 1;
  }
  return count;
}

function createFaceMaterials(palette: WordPalette): THREE.MeshStandardMaterial[] {
  const side = new THREE.MeshStandardMaterial({
    color: palette.side,
    roughness: 0.34,
    metalness: 0.2,
  });
  const deep = new THREE.MeshStandardMaterial({
    color: palette.deep,
    roughness: 0.42,
    metalness: 0.16,
  });
  const top = new THREE.MeshStandardMaterial({
    color: palette.top,
    emissive: palette.emissive,
    emissiveIntensity: 0.2,
    roughness: 0.24,
    metalness: 0.08,
  });
  const bottom = new THREE.MeshStandardMaterial({
    color: palette.deep,
    roughness: 0.46,
    metalness: 0.12,
  });
  const front = new THREE.MeshStandardMaterial({
    color: palette.front,
    emissive: palette.emissive,
    emissiveIntensity: 0.12,
    roughness: 0.22,
    metalness: 0.05,
  });
  const back = deep;

  // BoxGeometry: +X, -X, +Y, -Y, +Z, -Z.
  return [side, deep, top, bottom, front, back];
}

function createShadowMaterials(): THREE.MeshStandardMaterial[] {
  const shadow = new THREE.MeshStandardMaterial({
    color: 0x17133a,
    roughness: 0.55,
    metalness: 0.18,
  });
  return [shadow, shadow, shadow, shadow, shadow, shadow];
}

function createVoxelWord(
  text: string,
  palette: WordPalette,
  unit: number,
  depth: number,
): THREE.Group {
  const word = new THREE.Group();
  const columns = wordColumns(text);
  const pixelCount = activePixels(text);
  const cube = new THREE.BoxGeometry(unit * 0.91, unit * 0.91, depth);
  const shadowCube = new THREE.BoxGeometry(unit * 0.95, unit * 0.95, depth * 1.08);

  const faceMaterials = createFaceMaterials(palette);
  const shadowMaterials = createShadowMaterials();

  const letters = new THREE.InstancedMesh(cube, faceMaterials, pixelCount);
  const shadow = new THREE.InstancedMesh(shadowCube, shadowMaterials, pixelCount);
  letters.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  shadow.instanceMatrix.setUsage(THREE.StaticDrawUsage);

  const matrix = new THREE.Matrix4();
  let cursor = 0;
  let index = 0;

  for (let letterIndex = 0; letterIndex < text.length; letterIndex += 1) {
    const glyph = FONT[text[letterIndex]];
    if (!glyph) continue;
    const width = glyphWidth(glyph);

    for (let row = 0; row < glyph.length; row += 1) {
      for (let col = 0; col < glyph[row].length; col += 1) {
        if (glyph[row][col] !== '1') continue;

        const x = (cursor + col - (columns - 1) / 2) * unit;
        const y = (3 - row) * unit;

        matrix.makeTranslation(x, y, 0);
        letters.setMatrixAt(index, matrix);

        // Contorno/sombra desplazada hacia abajo-derecha como en un logo arcade extruido.
        matrix.makeTranslation(x + unit * 0.24, y - unit * 0.24, -depth * 0.72);
        shadow.setMatrixAt(index, matrix);
        index += 1;
      }
    }

    cursor += width + 1;
  }

  letters.instanceMatrix.needsUpdate = true;
  shadow.instanceMatrix.needsUpdate = true;
  shadow.renderOrder = 0;
  letters.renderOrder = 1;

  word.add(shadow, letters);
  return word;
}

/**
 * Logo tipográfico procedural del menú.
 * No usa PNG/SVG del logo: cada letra se arma con bloques 3D reales en Three.js,
 * inspirados en lettering arcade/voxel extruido.
 */
export class MenuLogo3D {
  private readonly host = document.createElement('div');
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-6.1, 6.1, 2.2, -2.2, 0.1, 30);
  private readonly group = new THREE.Group();
  private readonly clock = new THREE.Clock();
  private readonly resizeObserver: ResizeObserver;
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
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.domElement.className = 'menu-logo3d-canvas';
    this.host.appendChild(this.renderer.domElement);

    this.camera.position.set(0, 0, 12);
    this.camera.lookAt(0, 0, 0);

    this.scene.add(this.group);
    this.buildLights();
    this.buildTextLogo();

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
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    });
    this.renderer.dispose();
    this.host.remove();
  }

  private buildLights(): void {
    this.scene.add(new THREE.AmbientLight(0xffffff, 2.1));

    const key = new THREE.DirectionalLight(0xffffff, 3.6);
    key.position.set(-4, 6, 8);
    this.scene.add(key);

    const cyan = new THREE.PointLight(0x49c9d7, 2.4, 11, 2);
    cyan.position.set(4.4, 1.8, 5);
    this.scene.add(cyan);

    const warm = new THREE.PointLight(0xf4c75e, 2.2, 10, 2);
    warm.position.set(-3.8, 2.2, 4.5);
    this.scene.add(warm);
  }

  private buildTextLogo(): void {
    const apulab = createVoxelWord('APULAB', APULAB, 0.145, 0.34);
    apulab.position.set(-2.05, 0.04, 0);
    apulab.rotation.x = 0.06;
    apulab.rotation.y = -0.16;
    this.group.add(apulab);

    const station = createVoxelWord('STATION', STATION, 0.105, 0.28);
    station.position.set(3.05, -0.04, 0.04);
    station.rotation.x = 0.06;
    station.rotation.y = -0.16;
    this.group.add(station);

    // Mantiene la composición/posición general ya aprobada; cambia el tipo de letra.
    this.group.scale.setScalar(0.92);
  }

  private start(): void {
    if (this.frame || !this.visible) return;

    const tick = () => {
      if (!this.visible) {
        this.frame = 0;
        return;
      }

      this.frame = requestAnimationFrame(tick);
      const t = this.clock.getElapsedTime();

      // Respiración mínima, sin desplazar la posición del logo.
      const pulse = 1 + Math.sin(t * 1.5) * 0.003;
      this.group.scale.setScalar(0.92 * pulse);
      this.renderer.render(this.scene, this.camera);
    };

    this.frame = requestAnimationFrame(tick);
  }

  private stop(): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  private resize(): void {
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(width, height, false);
  }
}
