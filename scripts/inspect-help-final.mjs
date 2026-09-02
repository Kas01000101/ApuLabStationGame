import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const OUT=resolve(process.cwd(),'public/missions/mission01');
for (const level of [1,2]) {
  const html=await readFile(resolve(OUT,`level${level}.html`),'utf8');
  console.info(`\n[help-close] ===== LEVEL ${level} =====`);
  const needles=['id="kawsay-concept-panel"','id="kawsay-guide-container"','setHudNormal();','setHudNormal)','conceptPanel.addEventListener','conceptPanel.onclick','hidden = true','hidden=true','aria-label="Cerrar','>×</button>'];
  for(const needle of needles){
    let pos=0,c=0;
    while(c<8){const i=html.indexOf(needle,pos);if(i<0)break;c++;console.info(`[help-close] ${needle} #${c}: ${html.slice(Math.max(0,i-900),Math.min(html.length,i+2200)).replace(/\s+/g,' ')}`);pos=i+needle.length;}
  }
}
