import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT=resolve(process.cwd(),'public/missions/mission01');
const patterns=[
  /function\s+animateMove\([^)]*\)\{[\s\S]{0,1800}/g,
  /function\s+animateTurn\([^)]*\)\{[\s\S]{0,1800}/g,
  /function\s+pulseObstacle\([^)]*\)\{[\s\S]{0,1800}/g,
  /function\s+renderProgram\([^)]*\)\{[\s\S]{0,2800}/g,
  /function\s+blockHTML\([^)]*\)\{[\s\S]{0,2600}/g,
];
for(const level of [3,4,5]){
  const html=await readFile(resolve(OUT,`level${level}.html`),'utf8');
  console.info(`[runner-inspect] ===== LEVEL ${level} =====`);
  for(const re of patterns){
    const hits=html.match(re)||[];
    console.info(`[runner-inspect] ${re} count=${hits.length}`);
    hits.slice(0,6).forEach((hit,i)=>console.info(`[runner-inspect] ${i+1}: ${hit.replace(/\s+/g,' ').slice(0,3000)}`));
  }
}
