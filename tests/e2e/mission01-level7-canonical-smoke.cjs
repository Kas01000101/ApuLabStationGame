const { chromium } = require('playwright');
const { mkdir } = require('node:fs/promises');
const { resolve } = require('node:path');
const BASE_URL = process.env.APULAB_BASE_URL || 'http://127.0.0.1:4173';
const OUT = resolve(process.cwd(), 'test-results/level7-canonical-smoke');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
(async()=>{
  await mkdir(OUT,{recursive:true}); const browser=await chromium.launch({headless:true}); const page=await browser.newPage({viewport:{width:1672,height:941}});
  try {
    await page.goto(`${BASE_URL}/missions/mission01/level7.html`,{waitUntil:'networkidle'});
    const body=await page.locator('body').textContent()||'';
    assert((await page.locator('.btn-progress').textContent()||'').includes('7 / 7'),'N7 progress must be 7 / 7');
    assert(body.includes('PUNTO FINAL'),'N7 must preserve PUNTO FINAL'); assert(body.includes('ANALIZAR MUESTRA'),'N7 must preserve ANALIZAR MUESTRA');
    assert(await page.locator('.command-block[data-command="send"]').count()===0,'N7 must not expose ENVIAR DATOS'); assert(!body.includes('PUNTO DE COMUNICACIÓN'),'N7 communication semantics leaked');
  } finally { await browser.close(); }
})().catch((error)=>{console.error(error);process.exit(1)});
