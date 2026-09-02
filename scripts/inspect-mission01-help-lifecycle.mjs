import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const OUT=resolve(process.cwd(),'public/missions/mission01');
const patterns=[
 /function\s+advanceExplanation\([^)]*\)\{[\s\S]{0,2600}/g,
 /function\s+setGuideMode\([^)]*\)\{[\s\S]{0,2600}/g,
 /(?:info-close|concept-close|guide-close|closeInfo|closeConcept|closeGuide)[^\n]{0,1800}/gi,
 /(?:explanationIndex|explanationActive|guideActive|guideStage|exploreIndex|exploreActive)[^\n]{0,1000}/g,
 /(?:kawsay-explanation|kawsay-guide|explore-btn|guide-btn)[^\n]{0,1200}/g,
];
for(const level of [1,2,3,4,5]){
 const html=await readFile(resolve(OUT,`level${level}.html`),'utf8');
 console.info(`[help-lifecycle] ===== LEVEL ${level} =====`);
 for(const re of patterns){const hits=html.match(re)||[]; console.info(`[help-lifecycle] ${re} count=${hits.length}`); hits.slice(0,12).forEach((h,i)=>console.info(`[help-lifecycle] ${i+1}: ${h.replace(/\s+/g,' ').slice(0,3000)}`));}
}
