import * as THREE from 'three';
import { Rover } from '../characters/Rover';

const MARS = {
  sky: 0xc9a188,
  soil: 0xa95f43,
  dust: 0xc77a55,
  shadow: 0x593d3d,
  rockDark: 0x4c4142,
  rockMid: 0x765047,
  scan: 0x49c9d7,
};

function standard(color: number, roughness = 0.96, metalness = 0.02): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: true });
}

export class MarsWorld {
  readonly group = new THREE.Group();
  readonly targetFormation = new THREE.Group();
  readonly scanGroup = new THREE.Group();

  private readonly scanMaterial = new THREE.MeshBasicMaterial({
    color: MARS.scan,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  private readonly scanDots: THREE.Mesh[] = [];
  private readonly driveDust = new THREE.Group();
  private readonly driveDustMaterial = new THREE.MeshStandardMaterial({
    color: MARS.dust,
    transparent: true,
    opacity: 0,
    roughness: 1,
    flatShading: true,
  });
  private readonly driveDustParticles: THREE.Mesh[] = [];

  constructor() {
    this.group.name = 'MarsWorld';
    this.buildTerrain();
    this.buildRocks();
    this.buildDunes();
    this.buildTracks();
    this.buildScan();
    this.buildDriveDust();
    this.buildLights();
  }

  applySceneEnvironment(scene: THREE.Scene): void {
    scene.background = new THREE.Color(MARS.sky);
    scene.fog = new THREE.Fog(MARS.sky, 22, 58);
  }

  updateScan(rover: Rover, amount: number, elapsed: number): void {
    const p = THREE.MathUtils.clamp(amount, 0, 1);
    this.scanGroup.visible = p > 0.02;
    this.scanMaterial.opacity = 0.58 * p;

    const start = rover.getWorldEyePosition(new THREE.Vector3());
    this.group.worldToLocal(start);

    const end = this.targetFormation.position.clone();
    end.x -= 0.35;
    end.y = 1.95;
    end.z += 0.08;

    this.scanDots.forEach((dot, index) => {
      const q = index / Math.max(1, this.scanDots.length - 1);
      dot.position.set(
        THREE.MathUtils.lerp(start.x, end.x, q),
        THREE.MathUtils.lerp(start.y, end.y, q) + Math.sin(q * Math.PI * 3 + elapsed * 8) * 0.04,
        THREE.MathUtils.lerp(start.z, end.z, q),
      );
      const s = 0.75 + 0.35 * Math.sin(Math.PI * q);
      dot.scale.setScalar(s);
    });
  }

  updateDriveDust(rover: Rover, elapsed: number, amount: number): void {
    const p = THREE.MathUtils.clamp(amount, 0, 1);
    this.driveDust.visible = p > 0.02;
    this.driveDustMaterial.opacity = 0.34 * p;

    this.driveDustParticles.forEach((particle, index) => {
      const cycle = (elapsed * 1.45 + index * 0.071) % 1;
      const back = 1.8 + cycle * 2.5;
      const side = (index % 2 ? 1 : -1) * (1.65 + (index % 3) * 0.18);
      particle.position.set(
        rover.group.position.x - back,
        0.08 + cycle * 0.25,
        rover.group.position.z + side,
      );
      const scale = (0.55 + cycle * 0.55) * p;
      particle.scale.setScalar(scale);
    });
  }

  getTargetWorldPosition(target = new THREE.Vector3()): THREE.Vector3 {
    this.targetFormation.getWorldPosition(target);
    target.y += 1.2;
    return target;
  }

  private buildTerrain(): void {
    const geometry = new THREE.PlaneGeometry(46, 34, 24, 18);
    const positions = geometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < positions.count; i += 1) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const valley = 0.09 * Math.sin(x * 0.55) + 0.07 * Math.cos(y * 0.42);
      const sideRise = Math.max(0, Math.abs(y) - 7) * 0.075;
      const eroded = 0.035 * Math.sin((x + y) * 1.3);
      positions.setZ(i, valley + sideRise + eroded);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();

    const ground = new THREE.Mesh(geometry, standard(MARS.soil, 1, 0));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);

    for (let i = 0; i < 8; i += 1) {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.45 + (i % 3) * 0.18, 0),
        standard(i % 2 ? MARS.rockMid : MARS.rockDark),
      );
      rock.scale.set(1.5 + (i % 2) * 0.35, 0.55 + (i % 3) * 0.08, 1.1);
      rock.position.set(-0.6 + i * 0.65, 0.30 + (i % 2) * 0.08, -3.6 + Math.sin(i) * 0.45);
      rock.rotation.set(0.12 * i, 0.38 * i, 0.05 * i);
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.group.add(rock);
    }
  }

  private buildRocks(): void {
    const dark = standard(MARS.rockDark);
    const mid = standard(MARS.rockMid);

    for (let i = 0; i < 34; i += 1) {
      const radius = 0.10 + (i % 5) * 0.055;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(radius, 0), i % 3 ? mid : dark);
      const laneOffset = i < 18 ? 5.5 : 8.8;
      rock.position.set(
        -10 + (i * 1.61) % 21,
        radius * 0.65,
        (i % 2 ? 1 : -1) * laneOffset + Math.sin(i * 1.7) * 2.4,
      );
      rock.rotation.set(i * 0.23, i * 0.47, i * 0.17);
      rock.scale.y = 0.68 + (i % 4) * 0.08;
      rock.castShadow = true;
      this.group.add(rock);
    }

    for (let i = 0; i < 9; i += 1) {
      const chunk = new THREE.Mesh(new THREE.DodecahedronGeometry(1.25 + (i % 3) * 0.3, 0), i % 2 ? mid : dark);
      chunk.position.set(-11 + i * 2.8, 1.0 + (i % 3) * 0.35, -13.4 + Math.sin(i) * 0.35);
      chunk.scale.set(1.15, 1.05 + (i % 2) * 0.35, 0.82);
      chunk.rotation.y = i * 0.31;
      chunk.castShadow = true;
      this.group.add(chunk);
    }

    this.targetFormation.position.set(11.8, 0, -1.1);
    this.group.add(this.targetFormation);
    const targetSizes = [1.15, 0.82, 0.66];
    targetSizes.forEach((size, i) => {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), i === 0 ? dark : mid);
      rock.position.set(i * 0.95 - 0.65, size * 0.72, (i - 1) * 0.48);
      rock.scale.set(1.08, 1.18 + i * 0.10, 0.92);
      rock.rotation.set(0.17 * i, 0.65 * i, -0.09 * i);
      rock.castShadow = true;
      this.targetFormation.add(rock);
    });

    const landmark = new THREE.Mesh(new THREE.DodecahedronGeometry(1.18, 0), dark);
    landmark.position.set(4.7, 0.92, -4.15);
    landmark.scale.set(1.45, 1.05, 1.08);
    landmark.rotation.set(0.16, 0.55, 0.08);
    landmark.castShadow = true;
    this.group.add(landmark);
  }

  private buildDunes(): void {
    const duneMat = standard(MARS.dust, 1, 0);
    for (const [x, z, sx, sz] of [
      [-7.5, 7.8, 2.8, 1.1],
      [6.8, 8.4, 3.3, 1.25],
      [0.5, -8.1, 2.7, 1.0],
    ] as Array<[number, number, number, number]>) {
      const dune = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 7), duneMat);
      dune.scale.set(sx, 0.22, sz);
      dune.position.set(x, 0.06, z);
      dune.receiveShadow = true;
      this.group.add(dune);
    }
  }

  private buildTracks(): void {
    const trackMat = new THREE.MeshStandardMaterial({
      color: MARS.shadow,
      roughness: 1,
      transparent: true,
      opacity: 0.48,
      flatShading: true,
    });

    for (let i = 0; i < 32; i += 1) {
      const x = -10 + i * 0.38;
      for (const z of [-2.72, 2.72]) {
        const mark = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.018, 0.12), trackMat);
        mark.position.set(x, 0.025, z);
        mark.rotation.y = (i % 2 ? 1 : -1) * 0.12;
        this.group.add(mark);
      }
    }
  }

  private buildScan(): void {
    this.scanGroup.visible = false;
    this.group.add(this.scanGroup);
    for (let i = 0; i < 14; i += 1) {
      const dot = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.075, 0.075), this.scanMaterial);
      this.scanGroup.add(dot);
      this.scanDots.push(dot);
    }
  }

  private buildDriveDust(): void {
    this.group.add(this.driveDust);
    for (let i = 0; i < 18; i += 1) {
      const particle = new THREE.Mesh(new THREE.OctahedronGeometry(0.10 + (i % 3) * 0.025, 0), this.driveDustMaterial);
      particle.castShadow = false;
      this.driveDust.add(particle);
      this.driveDustParticles.push(particle);
    }
  }

  private buildLights(): void {
    const hemi = new THREE.HemisphereLight(0xe2b79b, MARS.shadow, 0.95);
    const sun = new THREE.DirectionalLight(0xffe2b8, 3.0);
    sun.position.set(9, 11, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -18;
    sun.shadow.camera.right = 18;
    sun.shadow.camera.top = 18;
    sun.shadow.camera.bottom = -18;
    this.group.add(hemi, sun);
  }
}
