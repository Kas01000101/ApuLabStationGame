import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const path = resolve(process.cwd(), 'public/missions/mission01/level3.html');
let html = await readFile(path, 'utf8');

if (!html.includes('data-mission-level="3"') || !html.includes('apulab-level3-redesign-style')) {
  throw new Error('l3_approved_reference_wrong_output');
}
if (html.includes('id="apulab-level3-approved-reference-style"')) {
  throw new Error('l3_approved_reference_duplicate');
}

const requireReplace = (before, after, label) => {
  if (!html.includes(before)) throw new Error(`l3_approved_reference_missing:${label}`);
  html = html.replace(before, after);
};

const css = `<style id="apulab-level3-approved-reference-style">
/* NIVEL 3 ÚNICAMENTE · composición aprobada */
#kawsay-concept-panel.apulab-l3-guide{
  width:304px!important;
  min-height:404px!important;
  padding:18px 18px 20px!important;
  border-radius:12px!important;
}
#kawsay-concept-panel.apulab-l3-guide .apulab-l3-guide-list{
  gap:10px!important;
}
#kawsay-concept-panel.apulab-l3-guide .apulab-l3-guide-step{
  min-height:46px!important;
  padding:11px 10px!important;
  display:flex!important;
  align-items:center!important;
  line-height:1.28!important;
}
#kawsay-concept-panel.apulab-l3-guide .apulab-l3-guide-step.is-active{
  min-height:54px!important;
  border-left-width:4px!important;
}
#kawsay-concept-panel.apulab-l3-guide .apulab-l3-active-copy{
  margin-top:10px!important;
  padding:10px 11px!important;
  line-height:1.42!important;
}
#kawsay-concept-panel.apulab-l3-guide .apulab-l3-guide-reminder{
  margin-top:12px!important;
  padding-top:11px!important;
  line-height:1.45!important;
}
#kawsay-concept-panel.apulab-l3-guide .apulab-l3-conclusion{
  margin-top:11px!important;
  padding:10px 11px!important;
  line-height:1.45!important;
}
</style>`;
requireReplace('</head>', `${css}\n</head>`, 'guide-style');

// Texto pedagógico exacto aprobado.
requireReplace('title:"UNA PUNTA FIJA, OTRA RASTREA"', 'title:"SEGUIMOS USANDO DOS PUNTAS"', 'explore-4-title');
requireReplace('PUNTA NEGRA · REFERENCIA FIJA', 'PUNTA NEGRA · FIJA', 'black-label');
requireReplace('PUNTA ROJA · RASTREA', 'PUNTA ROJA · ARRASTRA ESTA', 'red-label');
requireReplace(
  '<span class="apulab-l3-guide-reminder"><strong>RECUERDA:</strong> La punta negra se queda fija y la roja es la que se mueve.</span>',
  '<span class="apulab-l3-guide-reminder"><strong>RECUERDA:</strong> Seguimos usando dos puntas. La negra se queda fija y la roja es la que se mueve.</span>',
  'guide-reminder',
);

// Etiquetas más pequeñas: la señal principal debe ser el aro, no el texto flotante.
html = html
  .replace('blackFixedLabel.scale.set(1.46,0.20,1);', 'blackFixedLabel.scale.set(1.08,0.18,1);')
  .replace('redTraceLabel.scale.set(1.12,0.20,1);', 'redTraceLabel.scale.set(0.94,0.18,1);');

// La fuente alimenta conceptualmente la pista fija: no mostramos cables flexibles extra
// que puedan confundirse con los DOS cables del multímetro.
requireReplace(
  'negativeReferenceCable.renderOrder = 12;',
  `negativeReferenceCable.renderOrder = 12;
sourceCable.visible = false;
negativeReferenceCable.visible = false;`,
  'hide-source-flex-cables',
);

// Marcadores de aceptación de esta versión.
const requiredMarkers = [
  'SEGUIMOS USANDO DOS PUNTAS',
  'PUNTA NEGRA · FIJA',
  'PUNTA ROJA · ARRASTRA ESTA',
  'TP1 = <b>28.0 V</b>, TP2 = <b>28.0 V</b> y TP3 = <b>0.0 V</b>',
  'INTERRUPCIÓN ENTRE TP2 Y TP3',
  'sourceCable.visible = false',
  'negativeReferenceCable.visible = false',
];
for (const marker of requiredMarkers) {
  if (!html.includes(marker)) throw new Error(`l3_approved_reference_acceptance_missing:${marker}`);
}

await writeFile(path, html, 'utf8');
console.info('[mission01] Level 3 APPROVED · dos puntas · guía vertical · solo cables del multímetro · TP1→TP2→TP3');
