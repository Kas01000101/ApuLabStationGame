import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const LEVEL1_PATH = resolve(process.cwd(), 'public/missions/mission01/level1.html');
let html = await readFile(LEVEL1_PATH, 'utf8');

const STYLE_MARKER = '</style>\n</head>';
const JS_MARKER = '  function dismissExploreAttention() {';

if (!html.includes(STYLE_MARKER)) throw new Error('level1_three_arrow_missing:style-marker');
if (!html.includes(JS_MARKER)) throw new Error('level1_three_arrow_missing:js-marker');
if (!html.includes('id="kawsay-explore-attention"')) throw new Error('level1_three_arrow_missing:container');

const arrowCss = `
/* NIVEL 1 · FLECHA EXPLORAR 3D · THREE.JS */
#kawsay-explore-attention {
  left: 1138px !important;
  top: 35px !important;
  width: 82px !important;
  height: 46px !important;
  filter: none !important;
  animation: none !important;
  overflow: visible;
}
#kawsay-explore-attention::before,
#kawsay-explore-attention::after {
  display: none !important;
  content: none !important;
}
#kawsay-explore-attention > canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
  overflow: visible;
  pointer-events: none;
}
`;

html = html.replace(STYLE_MARKER, `${arrowCss}${STYLE_MARKER}`);

const arrowJs = `  // NIVEL 1 ÚNICAMENTE · Flecha 3D inspirada en la composición aprobada.
  function createExploreAttentionThreeArrow() {
    if (!exploreAttention || exploreAttention.dataset.threeArrowReady === "1") return;
    exploreAttention.dataset.threeArrowReady = "1";

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-2.8, 2.8, 1.55, -1.55, 0.1, 20);
    camera.position.set(0, 0, 7);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(82, 46, false);
    renderer.domElement.setAttribute("aria-hidden", "true");
    exploreAttention.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xfff7e8, 0x2d2654, 2.2));
    const key = new THREE.DirectionalLight(0xffffff, 3.0);
    key.position.set(-3, 4, 6);
    scene.add(key);

    const group = new THREE.Group();
    group.position.set(0.12, 0, 0);
    scene.add(group);

    const shape = new THREE.Shape();
    shape.moveTo(-2.0, 0.42);
    shape.lineTo(0.18, 0.42);
    shape.lineTo(0.18, 0.88);
    shape.lineTo(1.70, 0);
    shape.lineTo(0.18, -0.88);
    shape.lineTo(0.18, -0.42);
    shape.lineTo(-2.0, -0.42);
    shape.quadraticCurveTo(-2.18, -0.42, -2.18, -0.22);
    shape.lineTo(-2.18, 0.22);
    shape.quadraticCurveTo(-2.18, 0.42, -2.0, 0.42);

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.36,
      bevelEnabled: true,
      bevelSegments: 5,
      bevelSize: 0.08,
      bevelThickness: 0.06,
    });
    geometry.center();

    const material = new THREE.MeshStandardMaterial({
      color: 0xF4C75E,
      emissive: 0xDDB047,
      emissiveIntensity: 0.5,
      roughness: 0.35,
      metalness: 0.08,
    });
    group.add(new THREE.Mesh(geometry, material));

    const edgeGeometry = new THREE.EdgesGeometry(geometry, 18);
    const blackEdgeMaterial = new THREE.LineBasicMaterial({
      color: 0x111111,
      transparent: true,
      opacity: 0.98,
    });
    const blackEdges = new THREE.LineSegments(edgeGeometry, blackEdgeMaterial);
    blackEdges.position.z = 0.012;
    group.add(blackEdges);

    const highlightMaterial = new THREE.LineBasicMaterial({
      color: 0xFFF3C8,
      transparent: true,
      opacity: 0.28,
    });
    const highlightEdges = new THREE.LineSegments(edgeGeometry, highlightMaterial);
    highlightEdges.position.z = 0.018;
    group.add(highlightEdges);

    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = 256;
    glowCanvas.height = 256;
    const glowContext = glowCanvas.getContext("2d");
    if (glowContext) {
      const gradient = glowContext.createRadialGradient(128, 128, 0, 128, 128, 128);
      gradient.addColorStop(0, "rgba(255,247,210,.95)");
      gradient.addColorStop(0.25, "rgba(244,199,94,.65)");
      gradient.addColorStop(0.58, "rgba(244,199,94,.20)");
      gradient.addColorStop(1, "rgba(244,199,94,0)");
      glowContext.fillStyle = gradient;
      glowContext.fillRect(0, 0, 256, 256);
    }

    const glowTexture = new THREE.CanvasTexture(glowCanvas);
    const glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    const glow = new THREE.Sprite(glowMaterial);
    glow.scale.set(5.8, 2.7, 1);
    glow.position.z = -0.5;
    group.add(glow);

    const clock = new THREE.Clock();
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    let frameId = 0;
    let disposed = false;

    const render = () => {
      if (disposed) return;
      if (!reduceMotion) {
        const t = clock.getElapsedTime();
        group.position.x = 0.12 + Math.sin(t * 3) * 0.10;
        const scale = 1 + Math.sin(t * 3.2) * 0.025;
        group.scale.setScalar(scale);
        material.emissiveIntensity = 0.46 + (Math.sin(t * 2.8) + 1) * 0.07;
        glowMaterial.opacity = 0.56 + (Math.sin(t * 2.6) + 1) * 0.07;
      }
      renderer.render(scene, camera);
      if (!reduceMotion) frameId = requestAnimationFrame(render);
    };
    render();

    const disposeArrow = () => {
      if (disposed) return;
      disposed = true;
      if (frameId) cancelAnimationFrame(frameId);
      geometry.dispose();
      edgeGeometry.dispose();
      material.dispose();
      blackEdgeMaterial.dispose();
      highlightMaterial.dispose();
      glowTexture.dispose();
      glowMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };

    // La flecha desaparece al primer uso de EXPLORAR; liberar su contexto WebGL
    // en ese mismo instante evita mantener un segundo renderer durante el nivel.
    document.getElementById("kawsay-explanation")?.addEventListener("click", disposeArrow, { once: true });
    window.addEventListener("pagehide", disposeArrow, { once: true });
    window.addEventListener("beforeunload", disposeArrow, { once: true });
    window.addEventListener("message", (event) => {
      if (event.data && event.data.type === "apulab-dispose") disposeArrow();
    });
  }

  createExploreAttentionThreeArrow();

`;

html = html.replace(JS_MARKER, `${arrowJs}${JS_MARKER}`);

if (!html.includes('createExploreAttentionThreeArrow();')) throw new Error('level1_three_arrow_failed:js');
if (!html.includes('new THREE.ExtrudeGeometry(shape')) throw new Error('level1_three_arrow_failed:geometry');
if (!html.includes('color: 0x111111')) throw new Error('level1_three_arrow_failed:black-edge');
if (!html.includes('addEventListener("click", disposeArrow, { once: true })')) throw new Error('level1_three_arrow_failed:early-dispose');

await writeFile(LEVEL1_PATH, html, 'utf8');
console.info('[mission01] Level 1 · flecha EXPLORAR Three.js con dispose inmediato al usarla');
