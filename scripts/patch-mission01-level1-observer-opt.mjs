import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const LEVEL1_PATH = resolve(process.cwd(), 'public/missions/mission01/level1.html');
let html = await readFile(LEVEL1_PATH, 'utf8');

const oldSync = `  const syncFlow = () => {
    const text = document.body.textContent || '';
    const finalStepVisible = text.includes('AHORA PRUÉBALO · 4 / 4');`;
const newSync = `  const syncFlow = () => {
    const titleText = conceptTitle?.textContent || '';
    const finalStepVisible = !conceptPanel.hidden && titleText.includes('AHORA PRUÉBALO · 4 / 4');`;

const oldObserver = `  const flowObserver = new MutationObserver(syncFlow);
  flowObserver.observe(document.body, { childList: true, subtree: true, characterData: true });`;
const newObserver = `  const flowObserver = new MutationObserver(syncFlow);
  flowObserver.observe(conceptPanel, {
    attributes: true,
    attributeFilter: ['class', 'hidden'],
    childList: true,
    subtree: true,
    characterData: true,
  });`;

if (!html.includes(oldSync)) {
  throw new Error('mission01_level1_observer_opt_missing_sync');
}
if (!html.includes(oldObserver)) {
  throw new Error('mission01_level1_observer_opt_missing_global_observer');
}

html = html.replace(oldSync, newSync).replace(oldObserver, newObserver);

if (html.includes('flowObserver.observe(document.body')) {
  throw new Error('mission01_level1_observer_opt_global_observer_remains');
}

await writeFile(LEVEL1_PATH, html, 'utf8');
console.info('[mission01] Level 1 · observer pedagógico acotado al panel contextual');
