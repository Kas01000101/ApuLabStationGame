import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');

function fail(code, detail = '') {
  throw new Error(`mission01_help_lifecycle_contract:${code}${detail ? `:${detail}` : ''}`);
}

function balancedBody(source, anchor, label) {
  const anchorIndex = source.indexOf(anchor);
  if (anchorIndex < 0) fail('anchor', label);
  const brace = source.indexOf('{', anchorIndex + anchor.length);
  if (brace < 0) fail('brace', label);
  let depth = 0;
  let quote = null;
  let escaped = false;
  let templateDepth = 0;
  for (let i = brace; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (quote === '`' && ch === '$' && next === '{') { templateDepth += 1; i += 1; continue; }
      if (quote === '`' && ch === '}' && templateDepth > 0) { templateDepth -= 1; continue; }
      if (ch === quote && templateDepth === 0) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '/' && next === '/') {
      const nl = source.indexOf('\n', i + 2);
      if (nl < 0) break;
      i = nl;
      continue;
    }
    if (ch === '/' && next === '*') {
      const close = source.indexOf('*/', i + 2);
      if (close < 0) fail('comment', label);
      i = close + 1;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(brace + 1, i);
    }
  }
  fail('unbalanced', label);
}

class FakeClassList {
  constructor(...values) { this.values = new Set(values); }
  add(...values) { values.forEach((v) => this.values.add(v)); }
  remove(...values) { values.forEach((v) => this.values.delete(v)); }
  contains(value) { return this.values.has(value); }
}

class FakeTarget {
  constructor() {
    this.classList = new FakeClassList();
    this.attrs = new Map();
    this.hidden = false;
    this.textContent = '';
    this.disabled = false;
  }
  setAttribute(name, value) { this.attrs.set(name, String(value)); }
  getAttribute(name) { return this.attrs.get(name) ?? null; }
  removeAttribute(name) { this.attrs.delete(name); }
}

function contractNativeLevels12(level, html) {
  if (html.includes('APULAB_HELP_LIFECYCLE_START') || html.includes('apulabHelpPanelClosed')) {
    fail('l12_interceptor_present', `l${level}`);
  }

  const advance = balancedBody(html, 'function advanceExplanation()', `l${level}:advanceExplanation`);
  const finish = balancedBody(html, 'function finishExplanation()', `l${level}:finishExplanation`);
  const guide = balancedBody(html, 'function setGuideMode(enabled)', `l${level}:setGuideMode`);

  if (!advance.includes('explanationMode = true;') || !advance.includes('explanationIndex = 0;')) {
    fail('l12_explore_open', `l${level}`);
  }
  if (!finish.includes('explanationMode = false;') || !finish.includes('explanationIndex = -1;')) {
    fail('l12_explore_finish_reset', `l${level}`);
  }
  if (!guide.includes('guideActive = enabled;')) fail('l12_guide_assignment', `l${level}`);
  if (!html.includes('explanationButton.addEventListener("click", advanceExplanation)')) {
    fail('l12_explore_listener', `l${level}`);
  }
  if (!html.includes('setGuideMode(!guideActive)')) fail('l12_guide_toggle', `l${level}`);

  if (advance.includes('if (cameraTween) return;') || advance.includes('if (cameraTween || batterySwapAnimating) return;')) {
    fail('l12_explore_drops_click_during_animation', `l${level}`);
  }
  if (!advance.includes('if (cameraTween) cameraTween = null;')) {
    fail('l12_explore_does_not_interrupt_camera', `l${level}`);
  }

  // Mantener la cadencia nativa es parte del contrato de interacción de la mesa.
  if (!html.includes('lowPowerDevice ? 22 : 16')) fail('l12_native_frame_cadence', `l${level}`);

  if (level === 1) {
    if (!finish.includes('guideButton.disabled = false;')) fail('l1_guide_reenable');
    if (finish.includes('setGuideMode(true)')) fail('l1_guide_auto_open_regression');
    if (!finish.includes('setGuideMode(false)')) fail('l1_guide_not_normalized_after_explore');

    const guideClick = balancedBody(html, 'guideButton.addEventListener("click", () =>', 'l1:guideClick');
    if (!guideClick.includes('setGuideMode(!guideActive)')) fail('l1_guide_click_missing_toggle');

    if (!html.includes('lastArrowRenderAt') || !html.includes('timestamp - lastArrowRenderAt < 50')) {
      fail('l1_arrow_frame_budget');
    }
  }

  if (level === 2) {
    // Nivel 2 debe permitir manipular la mesa desde el inicio; las ayudas son opcionales.
    if (!html.includes('explanationButton.hidden = false;')) fail('l2_explore_visible');
    if (!html.includes('guideButton.disabled = false;')) fail('l2_guide_enabled');
    if (!html.includes('gameplayUnlocked = true;')) fail('l2_gameplay_not_unlocked');
    if (!html.includes('pendingExploreAfterSwap = true;') || !advance.includes('window.setTimeout')) {
      fail('l2_explore_swap_retry');
    }
    if (!advance.includes('!guideActive && !explanationMode')) {
      fail('l2_pending_explore_can_close_guide');
    }
  }
}

function contractLevels34(level, html) {
  const closeBody = balancedBody(html, 'function closeInfo()', `l${level}:closeInfo`);
  const exploreBody = balancedBody(html, "exploreBtn.addEventListener('click',()=>", `l${level}:explore`);
  const guideBody = balancedBody(html, "guideBtn.addEventListener('click',()=>", `l${level}:guide`);

  const execute = new Function('closeBody', 'exploreBody', 'guideBody', 'FakeTarget', `
    return (() => {
      const info = new FakeTarget(), infoProgress = new FakeTarget(), exploreBtn = new FakeTarget(), guideBtn = new FakeTarget(), kicker = new FakeTarget();
      const elements = new Map([['info-kicker', kicker],['info-title',new FakeTarget()],['info-text',new FakeTarget()],['info-hint',new FakeTarget()],['info-progress',infoProgress],['explore-btn',exploreBtn],['guide-btn',guideBtn]]);
      const document = { getElementById: (id) => elements.get(id) || new FakeTarget() };
      let exploreActive=true, exploreIndex=2, exploreDone=true, guideOpened=true, guideStage=2, hintCount=0, collisionCount=0;
      const exploreSteps=[{title:'A',text:'a',hint:'',focus:'board'},{title:'B',text:'b',hint:'',focus:'board'},{title:'C',text:'c',hint:'',focus:'board'},{title:'D',text:'d',hint:'',focus:'board'}];
      const clearFocus=()=>{}, showInfo=(kind)=>{kicker.textContent=kind;info.classList.add('visible')}, focusStep=()=>{}, showStatus=()=>{}, telemetry=()=>{}, renderStructuredGuide=()=>{kicker.textContent='GUÍA';info.classList.add('visible')};
      eval('function closeInfo(){'+closeBody+'}');
      const openExplore=new Function('state','body','with(state){ return eval("(()=>{"+body+"})()") }');
      const openGuide=new Function('state','body','with(state){ return eval("(()=>{"+body+"})()") }');
      kicker.textContent='EXPLORAR';info.classList.add('visible');closeInfo();
      if(info.classList.contains('visible')||exploreActive||exploreIndex!==0)throw new Error('explore_close_reset');
      const state={exploreActive,exploreIndex,exploreDone,guideOpened,guideStage,hintCount,collisionCount,exploreSteps,exploreBtn,guideBtn,info,infoProgress,document,clearFocus,showInfo,focusStep,showStatus,telemetry,renderStructuredGuide};
      openExplore(state,exploreBody); exploreActive=state.exploreActive; exploreIndex=state.exploreIndex;
      if(!info.classList.contains('visible'))throw new Error('explore_reopen');
      kicker.textContent='GUÍA';info.classList.add('visible');guideStage=2;closeInfo();
      if(info.classList.contains('visible')||guideStage!==0)throw new Error('guide_close_reset');
      state.guideStage=guideStage;state.exploreDone=true;state.collisionCount=0;openGuide(state,guideBody);
      if(!info.classList.contains('visible'))throw new Error('guide_reopen');
      return true;
    })();
  `);
  try { execute(closeBody, exploreBody, guideBody, FakeTarget); } catch (error) { fail('cycle34', `l${level}:${error?.message || error}`); }
}

function contractLevel5(html) {
  const closeBody = balancedBody(html, "document.getElementById('info-close').onclick=()=>", 'l5:close');
  const exploreBody = balancedBody(html, "document.getElementById('explore-btn').onclick=()=>", 'l5:explore');
  const guideBody = balancedBody(html, "document.getElementById('guide-btn').onclick=()=>", 'l5:guide');
  const execute = new Function('closeBody','exploreBody','guideBody','FakeTarget', `
    return (()=>{
      const info=new FakeTarget(),infoProgress=new FakeTarget(),kicker=new FakeTarget(),exploreBtn=new FakeTarget(),guideBtn=new FakeTarget();
      const elements=new Map([['info-kicker',kicker],['info-title',new FakeTarget()],['info-text',new FakeTarget()],['info-hint',new FakeTarget()],['info-progress',infoProgress],['info-close',new FakeTarget()],['explore-btn',exploreBtn],['guide-btn',guideBtn]]);
      const document={getElementById:(id)=>elements.get(id)||new FakeTarget()};
      let exploreIndex=2,exploreDone=true,guideOpened=true,guideStage=2,repeatUnlocked=true;
      const exploreSteps=[{title:'A',text:'a',hint:'',focus:'board'},{title:'B',text:'b',hint:'',focus:'board'},{title:'C',text:'c',hint:'',focus:'board'},{title:'D',text:'d',hint:'',focus:'board'}];
      const clearFocus=()=>{},showInfo=(kind)=>{kicker.textContent=kind;info.classList.add('visible')},focusStep=()=>{},showStatus=()=>{},renderStructuredGuide=()=>{kicker.textContent='GUÍA';info.classList.add('visible')};
      const run=(body)=>eval('(()=>{'+body+'})()');
      kicker.textContent='EXPLORAR';info.classList.add('visible');run(closeBody);
      if(info.classList.contains('visible')||exploreIndex!==-1)throw new Error('explore_close_reset');
      run(exploreBody);if(!info.classList.contains('visible')||exploreIndex!==0)throw new Error('explore_reopen');
      kicker.textContent='GUÍA';info.classList.add('visible');guideStage=2;run(closeBody);
      if(info.classList.contains('visible')||guideStage!==0)throw new Error('guide_close_reset');
      run(guideBody);if(!info.classList.contains('visible'))throw new Error('guide_reopen');
      return true;
    })();
  `);
  try { execute(closeBody,exploreBody,guideBody,FakeTarget); } catch(error) { fail('cycle5',error?.message||String(error)); }
}

const levels=new Map();
for(let level=1;level<=5;level+=1)levels.set(level,await readFile(resolve(OUT,`level${level}.html`),'utf8'));
contractNativeLevels12(1,levels.get(1));
contractNativeLevels12(2,levels.get(2));
contractLevels34(3,levels.get(3));
contractLevels34(4,levels.get(4));
contractLevel5(levels.get(5));
console.info('[mission01] HELP LIFECYCLE CONTRACT OK · L1 GUÍA manual · L2 mesa desbloqueada · frame principal nativo · L3–L5 abrir → cerrar → reabrir');
