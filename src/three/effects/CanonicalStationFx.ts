import * as THREE from 'three';

export class CanonicalStationFx {
  readonly group = new THREE.Group();
  readonly monitorPulse: THREE.Mesh;
  readonly ayniPeek = new THREE.Group();
  readonly stemVisuals = new THREE.Group();

  private readonly monitorCanvas = document.createElement('canvas');
  private readonly monitorTexture: THREE.CanvasTexture;
  private readonly stemMaterials: THREE.MeshBasicMaterial[] = [];
  private readonly monitorPulseMat = new THREE.MeshBasicMaterial({
    color: 0xbff8ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  private readonly peekMaterial = new THREE.MeshStandardMaterial({
    color: 0x39cfe5,
    emissive: 0x16889b,
    emissiveIntensity: 2,
    roughness: 0.42,
    metalness: 0.08,
    flatShading: true,
  });

  constructor(parent: THREE.Object3D) {
    this.group.name = 'CanonicalStationFx';
    parent.add(this.group);

    this.monitorCanvas.width = 1024;
    this.monitorCanvas.height = 560;
    this.monitorTexture = new THREE.CanvasTexture(this.monitorCanvas);
    this.monitorTexture.colorSpace = THREE.SRGBColorSpace;
    this.monitorTexture.minFilter = THREE.LinearFilter;
    this.monitorTexture.magFilter = THREE.LinearFilter;

    const shell = new THREE.Mesh(
      new THREE.BoxGeometry(5.05, 3.15, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x5b566f, roughness: 0.72, metalness: 0.18, flatShading: true }),
    );
    shell.position.set(3.10, 4.45, -10.48);
    this.group.add(shell);

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(4.65, 2.72),
      new THREE.MeshBasicMaterial({ map: this.monitorTexture }),
    );
    screen.position.set(3.10, 4.45, -10.33);
    this.group.add(screen);

    this.monitorPulse = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), this.monitorPulseMat);
    this.monitorPulse.visible = false;
    this.monitorPulse.position.set(3.10, 4.45, -10.12);
    this.group.add(this.monitorPulse);

    this.ayniPeek.visible = false;
    for (const x of [-0.34, 0.34]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.105, 10, 8), this.peekMaterial);
      eye.position.set(x, 0, 0);
      this.ayniPeek.add(eye);
    }
    this.ayniPeek.position.set(0, 8.78, 0.34);
    this.group.add(this.ayniPeek);

    const symbols = ['{}', '⚙', '✦', '◌', '◇'];
    symbols.forEach((symbol, index) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#45405B';
      ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = index % 2 ? '#7565C7' : '#39CFE5';
      ctx.lineWidth = 5;
      ctx.strokeRect(7, 7, 114, 114);
      ctx.fillStyle = '#D8D9E3';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 48px Arial';
      ctx.fillText(symbol, 64, 67);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0 });
      this.stemMaterials.push(material);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.75), material);
      mesh.position.set(-7.7 + index * 1.05, 6.35, -10.30);
      this.stemVisuals.add(mesh);
    });
    this.group.add(this.stemVisuals);

    this.drawMonitor('APULAB STATION', ['BAHÍA DE SISTEMAS ROBÓTICOS', 'SISTEMA EN ESPERA']);
  }

  reset(): void {
    this.setMonitorPulse(0, 0.45);
    this.setAyniPeek(false);
    this.setStemOpacity(0);
    this.drawMonitor('APULAB STATION', ['BAHÍA DE SISTEMAS ROBÓTICOS', 'SISTEMA EN ESPERA']);
  }

  drawMonitor(title: string, rows: string[] = [], mode: 'cyan' | 'amber' = 'cyan'): void {
    const ctx = this.monitorCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 1024, 560);
    ctx.fillStyle = '#211D31';
    ctx.fillRect(0, 0, 1024, 560);
    ctx.strokeStyle = mode === 'amber' ? '#EFA73A' : '#39CFE5';
    ctx.lineWidth = 8;
    ctx.strokeRect(24, 24, 976, 512);
    ctx.fillStyle = '#D8D9E3';
    ctx.font = '700 48px Poppins, Arial';
    ctx.fillText(title, 64, 92);
    ctx.font = '600 34px Poppins, Arial';
    let y = 178;
    rows.forEach((row) => {
      ctx.fillStyle = row.includes('DETENIDO') ? '#EFA73A' : '#BFC7D8';
      ctx.fillText(row, 66, y);
      y += 72;
    });
    this.monitorTexture.needsUpdate = true;
  }

  setMonitorPulse(amount: number, scale = 0.45): void {
    const p = THREE.MathUtils.clamp(amount, 0, 1);
    this.monitorPulse.visible = p > 0.01;
    this.monitorPulseMat.opacity = p * 0.95;
    this.monitorPulse.scale.setScalar(scale);
  }

  setAyniPeek(visible: boolean, bob = 0): void {
    this.ayniPeek.visible = visible;
    if (visible) this.ayniPeek.position.y = 8.78 + Math.sin(bob * 5.5) * 0.035;
  }

  setStemOpacity(amount: number, elapsed = 0): void {
    const p = THREE.MathUtils.clamp(amount, 0, 1);
    this.stemMaterials.forEach((material, index) => {
      material.opacity = p > 0 ? Math.max(0, p + 0.05 * Math.sin(elapsed * 2 + index)) : 0;
    });
  }
}
