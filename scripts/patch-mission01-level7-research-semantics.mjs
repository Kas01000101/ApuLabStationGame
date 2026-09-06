import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT=resolve(process.cwd(),'public/missions/mission01');
const LEVEL7=resolve(OUT,'level7.html');
const MANIFEST=resolve(OUT,'manifest.json');
const hash=(text)=>createHash('sha256').update(Buffer.from(text,'utf8')).digest('hex');
const fail=(code)=>{throw new Error(`mission01_level7_research_semantics:${code}`)};
let html=await readFile(LEVEL7,'utf8');
if(!html.includes('APULAB_LEVEL7_FINAL_GDD_V1'))fail('final_gdd_missing');
if(html.includes('APULAB_LEVEL7_EXACT_SAMPLE_RESEARCH_V1'))fail('already_applied');

const adjacentEmission="if(!sampleCheckpointReached){sampleCheckpointReached=true;recordLevel7Event('sample_reached',{c:roverState.c,r:roverState.r})}";
if(!html.includes(adjacentEmission))fail('analyze_adjacent_sample_emission_missing');
html=html.replace(adjacentEmission,'');

const wrapperEmission="if(isAdjacentToSample()&&!sampleCheckpointReached){sampleCheckpointReached=true;recordLevel7Event('sample_reached',{rover_x:roverState.c,rover_y:roverState.r})}";
if(!html.includes(wrapperEmission))fail('wrapper_sample_emission_missing');
html=html.replace(wrapperEmission,"if(roverState.c===sampleCell.c&&roverState.r===sampleCell.r&&!sampleCheckpointReached){sampleCheckpointReached=true;recordLevel7Event('sample_reached',{rover_x:roverState.c,rover_y:roverState.r,sample_x:sampleCell.c,sample_y:sampleCell.r,exact_cell:true})}");

html=html.replace('</head>',`<meta name="apulab-level7-research-semantics" content="APULAB_LEVEL7_EXACT_SAMPLE_RESEARCH_V1">\n</head>`);
if((html.match(/recordLevel7Event\('sample_reached'/g)||[]).length!==1)fail('sample_reached_must_have_single_emitter');
if(!html.includes('roverState.c===sampleCell.c&&roverState.r===sampleCell.r'))fail('exact_sample_condition_missing');
await writeFile(LEVEL7,html,'utf8');
const manifest=JSON.parse(await readFile(MANIFEST,'utf8'));
const entry=(manifest.levels||[]).find((x)=>Number(x.level)===7);if(entry){entry.bytes=Buffer.byteLength(html,'utf8');entry.sha256=hash(html)}
await writeFile(MANIFEST,JSON.stringify(manifest,null,2)+'\n','utf8');
console.info('[mission01] LEVEL 7 RESEARCH SEMANTICS OK · sample_reached only on exact sample cell');
