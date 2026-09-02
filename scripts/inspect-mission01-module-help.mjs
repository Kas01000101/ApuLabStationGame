import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');
const tokens = [
  'advanceExplanation',
  'setGuideMode',
  'explanationButton.addEventListener',
  'guideButton.addEventListener',
  'explanationIndex = -1',
  'guideActive = false',
  'conceptPanel',
  'kawsay-concept-panel',
];

for (const level of [1, 2]) {
  const html = await readFile(resolve(OUT, `level${level}.html`), 'utf8');
  const modules = [...html.matchAll(/<script\b[^>]*type=["']module["'][^>]*>([\s\S]*?)<\/script>/gi)];
  console.info(`[module-help] ===== LEVEL ${level} modules=${modules.length} =====`);
  modules.forEach((match, moduleIndex) => {
    const code = match[1];
    console.info(`[module-help] -- module ${moduleIndex + 1} bytes=${Buffer.byteLength(code, 'utf8')} --`);
    for (const token of tokens) {
      let from = 0;
      let hit = 0;
      while (true) {
        const index = code.indexOf(token, from);
        if (index < 0) break;
        hit += 1;
        const start = Math.max(0, index - 900);
        const end = Math.min(code.length, index + token.length + 2200);
        console.info(`[module-help] token=${JSON.stringify(token)} hit=${hit}\n${code.slice(start, end)}\n[module-help] END token=${JSON.stringify(token)} hit=${hit}`);
        from = index + token.length;
        if (hit >= 5) break;
      }
    }
  });
}
