import * as THREE from 'three';

type TextStyle = {
  width: number;
  height: number;
  fontSize: number;
  topColor: string;
  bottomColor: string;
  sideColor: string;
  deepSideColor: string;
  stroke: string;
};

/**
 * Crea el lettering del logo por código. No usa una imagen de logo.
 * El tratamiento busca el estilo chunky/arcade del arte de referencia:
 * frente claro, borde oscuro, bisel luminoso y extrusion de color.
 */
function makeTextTexture(text: string, options: TextStyle): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = options.width;
  canvas.height = options.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('ApuLab menu logo canvas context unavailable.');

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2 - 8;
  const font = `900 ${options.fontSize}px "Arial Black", Impact, Arial, sans-serif`;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = font;
  ctx.lineJoin = 'miter';
  ctx.miterLimit = 3;

  // Extrusion profunda: crea el lateral grueso propio de un logo de videojuego.
  for (let depth = 18; depth >= 7; depth -= 1) {
    const amount = (depth - 6) / 12;
    ctx.fillStyle = options.deepSideColor;
    ctx.strokeStyle = options.stroke;
    ctx.lineWidth = Math.max(12, options.fontSize * 0.072);
    ctx.strokeText(text, centerX + depth * 0.72, centerY + depth * 0.88);
    ctx.globalAlpha = 0.45 + amount * 0.35;
    ctx.fillText(text, centerX + depth * 0.72, centerY + depth * 0.88);
    ctx.globalAlpha = 1;
  }

  // Lateral dorado/cyan inmediatamente detrás del frente.
  for (let depth = 7; depth >= 1; depth -= 1) {
    ctx.fillStyle = options.sideColor;
    ctx.strokeStyle = options.stroke;
    ctx.lineWidth = Math.max(11, options.fontSize * 0.065);
    ctx.strokeText(text, centerX + depth * 0.72, centerY + depth * 0.88);
    ctx.fillText(text, centerX + depth * 0.72, centerY + depth * 0.88);
  }

  // Frente: borde azul oscuro grueso.
  ctx.shadowColor = 'rgba(11,14,38,.50)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
  ctx.strokeStyle = options.stroke;
  ctx.lineWidth = Math.max(11, options.fontSize * 0.064);
  ctx.strokeText(text, centerX, centerY);

  // Cara frontal con degradado vertical para simular iluminación/bisel.
  const face = ctx.createLinearGradient(0, centerY - options.fontSize * 0.56, 0, centerY + options.fontSize * 0.56);
  face.addColorStop(0, '#FFFFFF');
  face.addColorStop(0.18, options.topColor);
  face.addColorStop(0.7, options.topColor);
  face.addColorStop(1, options.bottomColor);
  ctx.fillStyle = face;
  ctx.shadowColor = 'transparent';
  ctx.fillText(text, centerX, centerY);

  // Línea de brillo superior muy sutil: da sensación de borde biselado.
  ctx.save();
  ctx.globalAlpha = 0.34;
  ctx.translate(0, -2.4);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = Math.max(2.5, options.fontSize * 0.014);
  ctx.strokeText(text, centerX, centerY);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function makeTextPlane(
  text: string,
  width: number,
  height: number,
  textureWidth: number,
  fontSize: number,
  style: Pick<TextStyle, 'topColor' | 'bottomColor' | 'sideColor' | 'deepSideColor'>,
): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  const texture = makeTextTexture(text, {
    width: textureWidth,
    height: 340,
    fontSize,
    ...style,
    stroke: '#17133A',
  });

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });

  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
}

export class MenuLogo3D {
  private readonly host = document.createElement('div');
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-5.6, 5.6, 1.65, -1.65, 0.1, 20);
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
    this.renderer.domElement.className = 'menu-logo3d-canvas';
    this.host.appendChild(this.renderer.domElement);

    this.camera.position.set(0, 0, 10);
    this.camera.lookAt(0, 0, 0);

    this.scene.add(this.group);
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
      materials.forEach((material) => {
        if ('map' in material && material.map instanceof THREE.Texture) material.map.dispose();
        material.dispose();
      });
    });
    this.renderer.dispose();
    this.host.remove();
  }

  private buildTextLogo(): void {
    // Solo las letras. La posición se conserva; cambia únicamente el estilo tipográfico.
    const apulab = makeTextPlane('ApuLab', 5.5, 1.38, 1250, 202, {
      topColor: '#FFF7E8',
      bottomColor: '#F7DCA0',
      sideColor: '#EAA62D',
      deepSideColor: '#9C5B19',
    });
    apulab.position.set(-1.55, 0, 0);
    this.group.add(apulab);

    const station = makeTextPlane('Station', 3.9, 1.16, 1050, 184, {
      topColor: '#76EDF4',
      bottomColor: '#35B8D2',
      sideColor: '#1687AE',
      deepSideColor: '#164976',
    });
    station.position.set(3.12, -0.08, 0.01);
    this.group.add(station);

    this.group.scale.setScalar(0.78);
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

      // Mantiene el logo quieto; solo respira casi imperceptiblemente.
      const pulse = 1 + Math.sin(t * 1.65) * 0.004;
      this.group.scale.setScalar(0.78 * pulse);
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
