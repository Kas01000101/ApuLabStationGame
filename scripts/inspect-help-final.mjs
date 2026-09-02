import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const OUT=resolve(process.cwd(),'public/missions/mission01');
const needles=[
  'function setGuideMode',
  'function finishExplanation',
  'function advanceExplanation',
  'explanationButton.addEventListener',
  'guideButton.addEventListener',
  'conceptPanel.hidden',
  'conceptPanel.classList',
  'kawsay-concept-close',
  'concept-close',
  'Cerrar explicación',
  "document.getElementById('explore-btn')",
  "document.getElementById('guide-btn')",
  'function closeInfo',
  "document.getElementById('info-close')"
];
for (const level of [1,2,3,4,5]) {
  const html=await readFile(resolve(OUT,`level${level}.html`),'utf8');
  console.info(`\n[help-final] ===== LEVEL ${level} =====`);
  for (const needle of needles) {
    let from=0, count=0;
    while (count<6) {
      const i=html.indexOf(needle, from);
      if (i<0) break;
      count++;
      const start=Math.max(0,i-500);
      const end=Math.min(html.length,i+3200);
      console.info(`[help-final] ${needle} #${count}: ${html.slice(start,end).replace(/\s+/g,' ')}`);
      from=i+needle.length;
    }
  }
}
