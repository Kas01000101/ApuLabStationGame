import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'public/missions/mission01');

function fail(code, detail = '') {
  throw new Error(`mission01_help_lifecycle_contract:${code}${detail ? `:${detail}` : ''}`);
}

function between(source, start, end, label) {
  const a = source.indexOf(start);
  if (a < 0) fail('marker_start', label);
  const b = source.indexOf(end, a + start.length);
  if (b < 0) fail('marker_end', label);
  return source.slice(a + start.length, b);
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
    this.listeners = new Map();
    this.classList = new FakeClassList();
    this.attrs = new Map();
    this.hidden = false;
    this.textContent = '';
    this.disabled = false;
    this.onclick = null;
  }
  addEventListener(type, fn, options = {}) {
    const list = this.listeners.get(type) || [];
    list.push({ fn, capture: Boolean(options && options.capture) });
    this.listeners.set(type, list);
  }
  setAttribute(name, value) { this.attrs.set(name, String(value)); }
  getAttribute(name) { return this.attrs.get(name) ?? null; }
  removeAttribute(name) { this.attrs.delete(name); }
  async dispatch(type) {
    const list = this.listeners.get(type) || [];
    for (const listener of list.filter((x) => x.capture)) listener.fn({ type, target: this });
    if (type === 'click' && typeof this.onclick === 'function') this.onclick({ type, target: this });
    for (const listener of list.filter((x) => !x.capture)) listener.fn({ type, target: this });
  }
}

async function contractLevels12(level, html) {
  const start = '/* APULAB_HELP_LIFECYCLE_START */';
  const end = '/* APULAB_HELP_LIFECYCLE_END */';
  const lifecycle = between(html, start, end, `l${level}`);

  const execute = new Function('lifecycle', 'FakeTarget', `
    return (async () => {
      const explanationButton = new FakeTarget();
      const guideButton = new FakeTarget();
      const conceptPanel = new FakeTarget();
      const document = new FakeTarget();
      let explanationMode = false;
      let explanationIndex = -1;
      let guideActive = false;
      const getComputedStyle = (node) => ({ display: node.hidden ? 'none' : 'block', visibility: 'visible', pointerEvents: 'auto', opacity: '1' });
      const queueMicrotask = globalThis.queueMicrotask;
      eval(lifecycle);
      explanationButton.addEventListener('click', () => {
        if (!explanationMode) { explanationMode = true; explanationIndex = 0; conceptPanel.hidden = false; conceptPanel.setAttribute('aria-hidden', 'false'); return; }
        conceptPanel.hidden = true; conceptPanel.setAttribute('aria-hidden', 'true');
      });
      guideButton.addEventListener('click', () => {
        guideActive = !guideActive; conceptPanel.hidden = !guideActive; conceptPanel.setAttribute('aria-hidden', guideActive ? 'false' : 'true');
      });
      const click = async (target) => { await target.dispatch('click'); await document.dispatch('click'); await Promise.resolve(); await Promise.resolve(); };
      conceptPanel.hidden = true; conceptPanel.setAttribute('aria-hidden', 'true');
      await click(explanationButton);
      if (!explanationMode || explanationIndex !== 0 || conceptPanel.hidden) throw new Error('explore_first_open');
      conceptPanel.hidden = true; conceptPanel.setAttribute('aria-hidden', 'true'); await document.dispatch('click'); await Promise.resolve();
      if (explanationMode || explanationIndex !== -1) throw new Error('explore_close_reset');
      await click(explanationButton);
      if (!explanationMode || explanationIndex !== 0 || conceptPanel.hidden) throw new Error('explore_reopen');
      conceptPanel.hidden = true; conceptPanel.setAttribute('aria-hidden', 'true'); await document.dispatch('click'); await Promise.resolve();
      await click(guideButton);
      if (!guideActive || conceptPanel.hidden) throw new Error('guide_first_open');
      conceptPanel.hidden = true; conceptPanel.setAttribute('aria-hidden', 'true'); await document.dispatch('click'); await Promise.resolve();
      if (guideActive) throw new Error('guide_close_reset');
      await click(guideButton);
      if (!guideActive || conceptPanel.hidden) throw new Error('guide_reopen');
      return true;
    })();
  `);
  try { await execute(lifecycle, FakeTarget); } catch (error) { fail('cycle12', `l${level}:${error?.message || error}`); }
}

async function contractLevels34(level, html) {
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

async function contractLevel5(html) {
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
await contractLevels12(1,levels.get(1));
await contractLevels12(2,levels.get(2));
await contractLevels34(3,levels.get(3));
await contractLevels34(4,levels.get(4));
await contractLevel5(levels.get(5));
console.info('[mission01] HELP LIFECYCLE CONTRACT OK · abrir → cerrar → reabrir ejecutado en niveles 1–5');
