import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT=resolve(process.cwd(),'public/missions/mission01');
const LEVEL6=resolve(OUT,'level6.html');
const LEVEL7=resolve(OUT,'level7.html');
const hash=(text)=>createHash('sha256').update(Buffer.from(text,'utf8')).digest('hex');
const l6Before=await readFile(LEVEL6,'utf8');
let html=await readFile(LEVEL7,'utf8');
if(!html.includes('APULAB_LEVEL7_FINAL_GDD_V1'))throw new Error('mission01_level7_final_labels:final_gdd_missing');
html=html.replaceAll('MUESTRA DE INTERÉS','MUESTRA DESCONOCIDA');
await writeFile(LEVEL7,html,'utf8');
if(hash(await readFile(LEVEL6,'utf8'))!==hash(l6Before))throw new Error('mission01_level7_final_labels:level6_mutated');
if(html.includes('MUESTRA DE INTERÉS'))throw new Error('mission01_level7_final_labels:legacy_sample_label');
console.info('[mission01] N7 final labels OK · MUESTRA DESCONOCIDA · N6 intacto');
