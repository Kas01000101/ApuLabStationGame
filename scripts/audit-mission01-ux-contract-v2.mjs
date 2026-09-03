import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT=resolve(process.cwd(),'public/missions/mission01');
function fail(code,detail=''){throw new Error(`mission01_ux_contract_v2:${code}${detail?`:${detail}`:''}`)}
function arrayBody(source,marker,label){const start=source.indexOf(marker);if(start<0)fail('array_start',label);const bracket=source.indexOf('[',start);let depth=0,quote=null,escaped=false;for(let i=bracket;i<source.length;i++){const ch=source[i];if(quote){if(escaped){escaped=false;continue}if(ch==='\\'){escaped=true;continue}if(ch===quote)quote=null;continue}if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue}if(ch==='[')depth++;else if(ch===']'&&--depth===0)return source.slice(bracket+1,i)}fail('array_end',label)}
function exploreCount(level,html){const body=arrayBody(html,level<=2?'const guidedExplanation = [':'const exploreSteps=[',`l${level}`);return(body.match(/\btitle\s*:/g)||[]).length}
const levels=new Map();for(let level=1;level<=5;level++)levels.set(level,await readFile(resolve(OUT,`level${level}.html`),'utf8'));
for(const [level,html] of levels){if(!html.includes(`${level} / 7`))fail('progress',`l${level}`);if(html.includes(`${level} / 8`)||html.includes(`${level}/8`))fail('legacy_progress',`l${level}`);const steps=exploreCount(level,html);if(steps<1||steps>4)fail('explore_max4',`l${level}:${steps}`)}
{
 const html=levels.get(1);
 for(const marker of ['let explanationCompleted = true; // APULAB_HELP_OPTIONAL_GLOBAL','let guideOpenedOnce = true; // APULAB_HELP_OPTIONAL_GLOBAL','let gameplayUnlocked = true; // APULAB_HELP_OPTIONAL_GLOBAL'])if(!html.includes(marker))fail('l1_optional_state',marker);
 if(/id="kawsay-guide"[^>]*disabled/.test(html))fail('l1_guide_disabled');
 if(!html.includes('APULAB_NATIVE_GUIDE_CHECKLIST_V4')||!html.includes('GUÍA · 3 PASOS'))fail('l1_guide_checklist');
}
{
 const html=levels.get(2);
 if(!html.includes('gameplayUnlocked = true;'))fail('l2_gameplay_locked');
 if(/id="kawsay-guide"[^>]*disabled/.test(html))fail('l2_guide_disabled');
 if(!html.includes('EXPLORAR y GUÍA están disponibles como ayudas opcionales'))fail('l2_optional_copy');
 if(!html.includes('APULAB_NATIVE_GUIDE_CHECKLIST_L2')||!html.includes('1 · MIDE LAS 3 BATERÍAS'))fail('l2_guide_checklist');
}
for(const level of [3,4,5]){
 const html=levels.get(level);
 if(/if\s*\(\s*!exploreDone\s*\)/.test(html))fail('optional_explore_gate',`l${level}`);
 if(/if\s*\(\s*!guideOpened\s*\)/.test(html))fail('optional_guide_gate',`l${level}`);
 if(/id="guide-btn"[^>]*disabled/.test(html))fail('optional_guide_disabled',`l${level}`);
 if(!html.includes(`id="apulab-l${level}-explore-yellow-style"`))fail('explore_yellow',`l${level}`);
 if(!html.includes('AYNI_FRONT_ORIENTATION'))fail('ayni_front',`l${level}`);
 if(!html.includes(`id="apulab-l${level}-guide-structure"`)||!html.includes('apulab-guide-strike')||!html.includes("textContent='GUÍA · 3 PASOS'"))fail('guide_structure',`l${level}`);
}
for(const level of [6,7]){try{await access(resolve(OUT,`level${level}.html`));const html=await readFile(resolve(OUT,`level${level}.html`),'utf8');const steps=exploreCount(level,html);if(steps<1||steps>4)fail('explore_max4',`l${level}:${steps}`)}catch(error){if(error?.code!=='ENOENT')throw error}}
const expected=[[1,2,'Nivel 1'],[2,3,'Nivel 2'],[3,4,'Nivel 3'],[4,5,'Nivel 4'],[5,6,'Nivel 5']];for(const [level,next,label] of expected){const html=levels.get(level);if(!html.includes(label))fail('level_label',`l${level}`);if(!html.includes(`nextLevel: ${next}`)&&!html.includes(`nextLevel:${next}`)&&!html.includes(`CONTINUAR AL NIVEL ${next}`))fail('next_level',`l${level}->${next}`)}
console.info('[mission01] UX CONTRACT V2 OK · ayudas opcionales L1–L5 · EXPLORAR máximo 4 · GUÍA checklist/tachado en cada nivel activo');
