import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT=resolve(process.cwd(),'public/missions/mission01');
const patterns=[
  /function\s+(?:runProgram|executeProgram|run|execute|startRun|simulate)[^{]*\{[\s\S]{0,2600}/gi,
  /(?:async\s+)?function\s+(?:moveRover|moveForward|turnLeft|turnRight|stepRover|executeCommand)[^{]*\{[\s\S]{0,2200}/gi,
  /(?:collision|blocked|obstacle|rock)[^\n]{0,420}/gi,
  /(?:repeat|REPETIR)[^\n]{0,520}/g,
  /(?:program|workspace|sequence)[^\n]{0,420}/gi,
  /class=["'][^"']*(?:block|command|program)[^"']*["']/gi,
  /id=["'][^"']*(?:run|program|workspace|block)[^"']*["']/gi,
  /setTimeout\([^\n]{0,500}/g,
  /rover\.(?:position|rotation)[^\n]{0,500}/g,
];
for(const level of [3,4,5]){
  const html=await readFile(resolve(OUT,`level${level}.html`),'utf8');
  console.info(`[runner-inspect] ===== LEVEL ${level} =====`);
  for(const re of patterns){
    const hits=html.match(re)||[];
    console.info(`[runner-inspect] ${re} count=${hits.length}`);
    hits.slice(0,18).forEach((hit,i)=>console.info(`[runner-inspect] ${i+1}: ${hit.replace(/\s+/g,' ').slice(0,2800)}`));
  }
}
