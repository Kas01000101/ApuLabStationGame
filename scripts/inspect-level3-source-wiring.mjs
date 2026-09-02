import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const path=resolve(process.cwd(),'public/missions/mission01/level3.html');
const html=await readFile(path,'utf8');
for(const needle of ['sourceCable','negativeReferenceCable','sourcePositive','sourceNegative','sourceGroup','batteryGroup','powerSource']){
  const i=html.indexOf(needle);
  if(i>=0){
    console.info(`[l3-wiring:${needle}] ${html.slice(Math.max(0,i-900),Math.min(html.length,i+1700)).replace(/\s+/g,' ')}`);
  }
}
