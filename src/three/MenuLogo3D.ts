import * as THREE from 'three';

function makeTextTexture(
  text: string,
  options: {
    width: number;
    height: number;
    fontSize: number;
    leftColor: string;
    rightColor: string;
    stroke: string;
  },
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = options.width;
  canvas.height = options.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('ApuLab menu logo canvas context unavailable.');

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${options.fontSize}px Poppins, Arial Black, Arial, sans-serif`;
  ctx.lineJoin = 'round';

  // Sombra/contorno para dar volumen sin añadir ningún elemento alrededor del logo.
  ctx.lineWidth = Math.max(8, options.fontSize * 0.05);
  ctx.strokeStyle = options.stroke;
  ctx.shadowColor = 'rgba(11, 14, 38, .72)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 9;
  ctx.strokeText(text, canvas.width / 2, canvas.height / 2 + 2);

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, options.leftColor);
  gradient.addColorStop(1, options.rightColor);
  ctx.fillStyle = gradient;
  ctx.shadowColor = 'transparent';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  // Highlight superior muy fino para que parezca una letra 3D iluminada.
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = '#FFFFFF';
  ctx.save();
  ctx.translate(0, -3);
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  ctx.restore();
  ctx.globalAlpha = 1;

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
  leftColor: string,
  rightColor: string,
): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  const texture = makeTextTexture(text, {
    width: textureWidth,
    height: 280,
    fontSize,
    leftColor,
    rightColor,
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
    // Solo letras. Mantiene la identidad cromática del logo canónico.
    const apulab = makeTextPlane(
      'ApuLab',
      5.5,
      1.38,
      1150,
      205,
      '#FFF7E8',
      '#F4C75E',
    );
    apulab.position.set(-1.55, 0, 0);
    this.group.add(apulab);

    const station = makeTextPlane(
      'Station',
      3.9,
      1.16,
      950,
      188,
      '#72E5EE',
      '#49C9D7',
    );
    station.position.set(3.12, -0.08, 0.01);
    this.group.add(station);

    // Escala general pequeña para respetar la composición del fondo 1672×941.
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

      // Microanimación: solo un leve pulso/respiración, sin mover el logo de sitio.
      const pulse = 1 + Math.sin(t * 1.65) * 0.006;
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
