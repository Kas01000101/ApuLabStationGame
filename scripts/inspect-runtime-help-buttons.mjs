import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const needles = [
  'let guideActive',
  'let explanationIndex',
  'let explanationMode',
  'function advanceExplanation',
  'function setGuideMode',
  'explanationButton.disabled',
  'guideButton.disabled',
  'explanationButton.hidden',
  'APULAB_HELP_LIFECYCLE_START',
  'explanationButton.addEventListener("click", advanceExplanation)',
  'guideButton.addEventListener',
  'setGuideMode(!guideActive)',
];

for (const level of [1, 2]) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  console.info(`[runtime-help] ===== LEVEL ${level} =====`);
  for (const needle of needles) {
    let from = 0;
    let n = 0;
    while (true) {
      const i = html.indexOf(needle, from);
      if (i < 0) break;
      n += 1;
      const start = Math.max(0, i - 1800);
      const end = Math.min(html.length, i + needle.length + 4200);
      console.info(`[runtime-help] needle=${JSON.stringify(needle)} hit=${n}\n${html.slice(start, end)}\n[runtime-help] END`);
      from = i + needle.length;
      if (n >= 5) break;
    }
  }
}
