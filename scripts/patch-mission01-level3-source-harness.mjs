import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const path = resolve(process.cwd(), 'public/missions/mission01/level3.html');
let html = await readFile(path, 'utf8');

if (!html.includes('data-mission-level="3"') || !html.includes('apulab-level3-approved-reference-style')) {
  throw new Error('l3_source_harness_wrong_output');
}
if (html.includes('LEVEL 3 · SOURCE HARNESS FIXED')) {
  throw new Error('l3_source_harness_duplicate');
}

const before = `sourceCable.visible = false;
negativeReferenceCable.visible = false;`;
if (!html.includes(before)) throw new Error('l3_source_harness_anchor_missing');

const fixedHarness = `sourceCable.visible = false;
negativeReferenceCable.visible = false;

// LEVEL 3 · SOURCE HARNESS FIXED
// La fuente SÍ alimenta eléctricamente el recorrido, pero mediante un harness
// corto de dos polos + pistas rígidas integradas al panel. No son sondas.
const sourceConnectorCenter = new THREE.Vector3(
  (selectedPositive.x + selectedNegative.x) * 0.5,
  tpWorld.TP1.y - 0.035,
  tpWorld.TP1.z - 0.82
);
const sourcePlusEntry = sourceConnectorCenter.clone().add(new THREE.Vector3(-0.32,0,0));
const sourceMinusEntry = sourceConnectorCenter.clone().add(new THREE.Vector3(0.32,0,0));

const makeFixedHarnessTrace = (points, material, radius=0.038) => {
  const curve = new THREE.CatmullRomCurve3(points.map((p)=>p.clone()), false, 'centripetal', 0.20);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 28, radius, 9, false), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.renderOrder = 14;
  scene.add(mesh);
  return mesh;
};

const sourcePlusHarnessMat = new THREE.MeshStandardMaterial({
  color:0xE74C5B,
  emissive:0xA92F3B,
  emissiveIntensity:0.16,
  metalness:0.28,
  roughness:0.42
});
const sourceMinusHarnessMat = new THREE.MeshStandardMaterial({
  color:0x252B3E,
  emissive:0x141938,
  emissiveIntensity:0.06,
  metalness:0.22,
  roughness:0.52
});

const plusMid = selectedPositive.clone().lerp(sourcePlusEntry,0.55).add(new THREE.Vector3(0,0.02,-0.04));
const minusMid = selectedNegative.clone().lerp(sourceMinusEntry,0.55).add(new THREE.Vector3(0,0.02,-0.04));
const sourcePlusHarness = makeFixedHarnessTrace([
  selectedPositive,
  selectedPositive.clone().add(new THREE.Vector3(0,0,0.16)),
  plusMid,
  sourcePlusEntry.clone().add(new THREE.Vector3(0,0,-0.12)),
  sourcePlusEntry
], sourcePlusHarnessMat, 0.045);
const sourceMinusHarness = makeFixedHarnessTrace([
  selectedNegative,
  selectedNegative.clone().add(new THREE.Vector3(0,0,0.16)),
  minusMid,
  sourceMinusEntry.clone().add(new THREE.Vector3(0,0,-0.12)),
  sourceMinusEntry
], sourceMinusHarnessMat, 0.045);

// Conector fijo de dos polos integrado al borde superior del panel.
const sourceHarnessConnector = new THREE.Group();
sourceHarnessConnector.position.copy(sourceConnectorCenter);
const connectorBodyMat = new THREE.MeshStandardMaterial({
  color:0x3B425A, metalness:0.42, roughness:0.38
});
const connectorBody = new THREE.Mesh(new THREE.BoxGeometry(0.92,0.11,0.34), connectorBodyMat);
connectorBody.position.y = 0.03;
connectorBody.castShadow = true;
sourceHarnessConnector.add(connectorBody);
const plusPortMat = new THREE.MeshStandardMaterial({color:0xE74C5B,emissive:0xA92F3B,emissiveIntensity:0.22});
const minusPortMat = new THREE.MeshStandardMaterial({color:0x1A1F30,emissive:0x0B0E26,emissiveIntensity:0.04});
const makeHarnessPort = (x,mat) => {
  const port = new THREE.Mesh(new THREE.CylinderGeometry(0.105,0.105,0.075,28),mat);
  port.position.set(x,0.105,0);
  port.castShadow = true;
  sourceHarnessConnector.add(port);
};
makeHarnessPort(-0.32,plusPortMat);
makeHarnessPort(0.32,minusPortMat);
scene.add(sourceHarnessConnector);

// Pistas internas: rígidas y técnicas, no cables flexibles.
const sourceInternalPlusMat = new THREE.MeshStandardMaterial({
  color:0x4D4288, emissive:0x49C9D7, emissiveIntensity:0.16,
  metalness:0.14, roughness:0.58
});
const sourceInternalReturnMat = new THREE.MeshStandardMaterial({
  color:0x2D3650, emissive:0x49C9D7, emissiveIntensity:0.035,
  metalness:0.10, roughness:0.64
});
const sourceFeedTrace = makeFixedHarnessTrace([
  sourcePlusEntry,
  sourcePlusEntry.clone().add(new THREE.Vector3(-0.18,0,0.18)),
  tpWorld.TP1.clone().add(new THREE.Vector3(0,0,-0.16)),
  tpWorld.TP1
], sourceInternalPlusMat, 0.031);

const returnCornerA = sourceMinusEntry.clone().add(new THREE.Vector3(0.34,0,0.24));
const returnCornerB = new THREE.Vector3(commonRefWorld.x, sourceMinusEntry.y, returnCornerA.z);
const sourceReturnTrace = makeFixedHarnessTrace([
  sourceMinusEntry,
  returnCornerA,
  returnCornerB,
  commonRefWorld.clone().add(new THREE.Vector3(0,0,-0.14)),
  commonRefWorld
], sourceInternalReturnMat, 0.027);

// Etiquetas mínimas: aclaran polaridad sin competir con las puntas del multímetro.
const sourcePlusLabel = makeSpriteLabel('+28 V',300,78,'#FFFFFF','rgba(231,76,91,.96)');
sourcePlusLabel.position.copy(sourcePlusEntry).add(new THREE.Vector3(-0.20,0.34,0));
sourcePlusLabel.scale.set(0.54,0.14,1);
scene.add(sourcePlusLabel);
const sourceMinusLabel = makeSpriteLabel('− RETORNO',360,78,'#F8F9FA','rgba(20,25,56,.94)');
sourceMinusLabel.position.copy(sourceMinusEntry).add(new THREE.Vector3(0.24,0.34,0));
sourceMinusLabel.scale.set(0.68,0.14,1);
scene.add(sourceMinusLabel);
`;

html = html.replace(before, fixedHarness);

// EXPLORAR 1/4 explica la conexión sin introducir una tercera sonda.
html = html.replace(
  'text:"La batería verde tiene 28.0 V. Ahora será la fuente de energía del recorrido de AYNI."',
  'text:"La fuente entrega 28.0 V y alimenta el recorrido mediante un conector fijo de +28 V y retorno."',
);

const required = [
  'LEVEL 3 · SOURCE HARNESS FIXED',
  'sourcePlusEntry',
  'sourceMinusEntry',
  "makeSpriteLabel('+28 V'",
  "makeSpriteLabel('− RETORNO'",
  'sourceFeedTrace',
  'sourceReturnTrace',
  'sourceCable.visible = false',
  'negativeReferenceCable.visible = false',
];
for (const marker of required) {
  if (!html.includes(marker)) throw new Error(`l3_source_harness_acceptance_missing:${marker}`);
}

await writeFile(path, html, 'utf8');
console.info('[mission01] Level 3 · fuente 28 V conectada por harness fijo rojo/negro + pistas internas · sin cables flexibles extra');
