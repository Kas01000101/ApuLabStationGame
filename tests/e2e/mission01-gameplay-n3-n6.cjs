const { chromium } = require('playwright');
const { mkdir, writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');

const BASE_URL = process.env.APULAB_BASE_URL || 'http://127.0.0.1:4173';
const EVIDENCE_DIR = resolve(process.cwd(), 'test-results/gameplay-n3-n6');
let browser, context, currentPage;
const runtimeErrors = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function openLevel(level) {
  currentPage = await context.newPage();
  currentPage.on('pageerror', (error) => runtimeErrors.push(`L${level} pageerror: ${error.stack || error}`));
  currentPage.on('console', (msg) => { if (msg.type() === 'error') runtimeErrors.push(`L${level} console.error: ${msg.text()}`); });
  await currentPage.goto(`${BASE_URL}/missions/mission01/level${level}.html`, { waitUntil: 'networkidle' });
  await currentPage.locator('canvas').first().waitFor({ state: 'visible', timeout: 10_000 });
  return currentPage;
}
async function closeLevel(){if(currentPage){await currentPage.close();currentPage=null}}
async function addAccessibleCommands(page, sequence){for(const command of sequence){const block=page.locator(`.command-block[data-command="${command}"]`);await block.focus();await block.press('Enter')}}
async function addLegacyCommandsByDoubleClick(page,sequence){for(const command of sequence)await page.locator(`.command-block[data-command="${command}"]`).dblclick()}
async function pointerDrag(page,source,target){await source.scrollIntoViewIfNeeded();await target.scrollIntoViewIfNeeded();const a=await source.boundingBox(),b=await target.boundingBox();assert(a&&b,'pointer drag target/source not visible');await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:12});await page.mouse.up()}

async function level3(){const page=await openLevel(3);for(let i=0;i<5;i+=1)await page.locator('#explore-btn').click();await addAccessibleCommands(page,['forward','forward','forward','right','forward','forward']);assert(await page.locator('.program-block').count()===6,'L3: program did not receive six real commands');await page.locator('#run-btn').click();await page.locator('#success-overlay.visible').waitFor({timeout:20000});await closeLevel()}

async function level4(){const page=await openLevel(4);const solution=['forward','right','forward','forward','left','forward','forward','forward'];await addAccessibleCommands(page,solution);assert(await page.locator('.program-block').count()===solution.length,'L4: program command count mismatch');await page.locator('#run-btn').click();await page.locator('#success-overlay.visible').waitFor({timeout:25000});await closeLevel()}

async function level5(){const page=await openLevel(5);assert(await page.locator('#repeat-palette').isHidden(),'L5: REPETIR must start locked');const firstSolution=['left','forward','forward','forward','forward','forward','forward','right','forward','forward','forward','forward','forward','forward'];await addLegacyCommandsByDoubleClick(page,firstSolution);await page.locator('#run-btn').click();await page.locator('#repeat-palette').waitFor({state:'visible',timeout:30000});await page.locator('#clear-btn').click();await page.locator('.command-block[data-command="left"]').dblclick();await page.locator('#repeat-palette').dblclick();await pointerDrag(page,page.locator('.command-block[data-command="forward"]'),page.locator('.repeat-body[data-repeat-body="1"]'));for(let i=0;i<4;i+=1)await page.locator('[data-count="1:1"]').click();await page.locator('.command-block[data-command="right"]').dblclick();await page.locator('#repeat-palette').dblclick();await pointerDrag(page,page.locator('.command-block[data-command="forward"]'),page.locator('.repeat-body[data-repeat-body="3"]'));for(let i=0;i<4;i+=1)await page.locator('[data-count="3:1"]').click();await page.locator('#run-btn').click();await page.locator('#success-overlay.visible').waitFor({timeout:30000});await closeLevel()}

async function level6(){const page=await openLevel(6);assert(await page.locator('#repeat-palette').isVisible(),'L6: REPETIR must remain available');await addAccessibleCommands(page,['analyze']);await page.locator('#run-btn').click();await page.waitForFunction(()=>(document.getElementById('feedback')?.textContent||'').includes('todavía no tiene datos'));assert(await page.locator('.program-block').count()===1,'L6: premature ANALIZAR erased program');await page.locator('#clear-btn').click();const solution=['forward','forward','forward','scan','analyze','left','forward','forward','forward','send'];await addAccessibleCommands(page,solution);await page.locator('#run-btn').click();await page.locator('#success-overlay.visible').waitFor({timeout:30000});const telemetry=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('apulab.level6.telemetry')||'[]'));const names=telemetry.map(x=>x.event);for(const event of ['premature_action','science_action','data_sent','level_completed'])assert(names.includes(event),`L6: telemetry missing ${event}`);await closeLevel()}

(async()=>{browser=await chromium.launch({headless:true});context=await browser.newContext({viewport:{width:1672,height:941},reducedMotion:'reduce'});await context.addInitScript(()=>{try{localStorage.setItem('apulab.settings.sfx','off')}catch(_){}});await level3();await level4();await level5();await level6();assert(runtimeErrors.length===0,`runtime errors detected:\n${runtimeErrors.join('\n')}`);await browser.close();console.log('[e2e] Mission 01 gameplay N3→N6 OK · N7 covered by dedicated instrument-choice contract')})().catch(async(error)=>{console.error(error);await mkdir(EVIDENCE_DIR,{recursive:true});await writeFile(resolve(EVIDENCE_DIR,'runtime.log'),`${String(error?.stack||error)}\n\n${runtimeErrors.join('\n')}\n`,'utf8');try{if(currentPage)await currentPage.screenshot({path:resolve(EVIDENCE_DIR,'failure.png'),fullPage:true})}catch(_){}try{await browser?.close()}catch(_){}process.exitCode=1});
