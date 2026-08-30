export interface IntroOverlayOptions {
  onSkip?: () => void;
}

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* storage can be blocked */ }
}

export class IntroOverlay {
  readonly root: HTMLDivElement;
  private readonly skipButton: HTMLButtonElement;
  private readonly dialogue: HTMLDivElement;
  private readonly speaker: HTMLDivElement;
  private readonly dialogueText: HTMLDivElement;
  private readonly sfx: HTMLDivElement;
  private readonly location: HTMLDivElement;
  private readonly beat: HTMLDivElement;
  private readonly mission: HTMLDivElement;
  private readonly transition: HTMLDivElement;
  private readonly nicknamePanel: HTMLDivElement;
  private readonly nicknameInput: HTMLInputElement;
  private readonly nicknameError: HTMLDivElement;
  private nicknameSubmit?: (nickname: string) => void;
  private lastDialogueKey = '';

  constructor(parent: HTMLElement, options: IntroOverlayOptions = {}) {
    this.root = document.createElement('div');
    this.root.className = 'intro-overlay';
    this.root.innerHTML = `
      <div class="intro-transition"></div>
      <button class="intro-skip" type="button">OMITIR INTRO</button>
      <div class="intro-location"></div>
      <div class="intro-dialogue" aria-live="polite"><div class="intro-speaker"></div><div class="intro-dialogue-text"></div></div>
      <div class="intro-sfx"></div><div class="intro-beat"></div>
      <div class="intro-mission"><div class="intro-mission-small">MISIÓN 01</div><div class="intro-mission-big">1 / 3 · MEDIR</div></div>
      <div class="nickname-overlay"><div class="nickname-card">
        <div class="nickname-title">¿CÓMO TE GUSTA QUE TE LLAMEN?</div>
        <div class="nickname-copy">Escribe el apodo que quieres usar dentro de ApuLab.</div>
        <input class="nickname-input" type="text" maxlength="24" autocomplete="off" placeholder="Tu apodo" />
        <div class="nickname-error"></div><button class="nickname-continue" type="button">CONTINUAR</button>
      </div></div>`;
    parent.appendChild(this.root);
    this.skipButton=this.require<HTMLButtonElement>('.intro-skip');
    this.dialogue=this.require<HTMLDivElement>('.intro-dialogue');
    this.speaker=this.require<HTMLDivElement>('.intro-speaker');
    this.dialogueText=this.require<HTMLDivElement>('.intro-dialogue-text');
    this.sfx=this.require<HTMLDivElement>('.intro-sfx');
    this.location=this.require<HTMLDivElement>('.intro-location');
    this.beat=this.require<HTMLDivElement>('.intro-beat');
    this.mission=this.require<HTMLDivElement>('.intro-mission');
    this.transition=this.require<HTMLDivElement>('.intro-transition');
    this.nicknamePanel=this.require<HTMLDivElement>('.nickname-overlay');
    this.nicknameInput=this.require<HTMLInputElement>('.nickname-input');
    this.nicknameError=this.require<HTMLDivElement>('.nickname-error');
    this.hideDialogue();this.hideSfx();this.hideLocation();this.hideBeat();this.hideMission();this.setTransition(0);
    this.nicknamePanel.classList.remove('show');
    this.skipButton.style.display=safeGet('apulabIntroSeen')==='1'?'block':'none';
    this.skipButton.addEventListener('click',()=>options.onSkip?.());
    this.require<HTMLButtonElement>('.nickname-continue').addEventListener('click',()=>this.commitNickname());
    this.nicknameInput.addEventListener('keydown',(event)=>{event.stopPropagation();if(event.key==='Enter'){event.preventDefault();this.commitNickname();}});
    this.nicknameInput.addEventListener('keyup',(event)=>event.stopPropagation());
    this.nicknameInput.addEventListener('input',()=>{this.nicknameError.textContent='';});
  }

  markIntroSeen():void{safeSet('apulabIntroSeen','1');this.skipButton.style.display='block';}
  showDialogue(key:string,speaker:string,text:string):void{if(this.lastDialogueKey!==key){this.lastDialogueKey=key;this.speaker.textContent=speaker;this.dialogueText.textContent=text;}this.dialogue.classList.add('show');}
  hideDialogue():void{this.dialogue.classList.remove('show');}
  showSfx(text:string,strength=1):void{this.sfx.textContent=text;this.sfx.style.opacity=String(Math.max(0,Math.min(1,strength)));this.sfx.style.transform=`translate(-50%,-50%) scale(${.82+.25*strength}) rotate(-2deg)`;}
  hideSfx():void{this.sfx.textContent='';this.sfx.style.opacity='0';}
  showLocation(text:string,station=false):void{this.location.textContent=text;this.location.classList.toggle('station',station);this.location.classList.add('show');}
  hideLocation():void{this.location.classList.remove('show','station');}
  showBeat(text:string):void{this.beat.textContent=text;this.beat.classList.add('show');}
  hideBeat():void{this.beat.classList.remove('show');}
  showMission():void{this.mission.classList.add('show');}
  hideMission():void{this.mission.classList.remove('show');}
  setTransition(opacity:number):void{const p=Math.max(0,Math.min(1,opacity));this.transition.style.opacity=String(p);}
  requestNickname(onSubmit:(nickname:string)=>void):void{this.nicknameSubmit=onSubmit;this.nicknameError.textContent='';this.nicknameInput.value='';this.nicknamePanel.classList.add('show');requestAnimationFrame(()=>this.nicknameInput.focus());}
  closeNickname():void{this.nicknamePanel.classList.remove('show');this.nicknameInput.blur();this.nicknameInput.value='';this.nicknameSubmit=undefined;}
  destroy():void{this.root.remove();}
  private commitNickname():void{const nickname=this.nicknameInput.value.trim();if(!nickname){this.nicknameError.textContent='Escribe un apodo para continuar.';this.nicknameInput.focus();return;}const submit=this.nicknameSubmit;if(!submit)return;this.closeNickname();submit(nickname);}
  private require<T extends Element>(selector:string):T{const element=this.root.querySelector<T>(selector);if(!element)throw new Error(`intro_overlay_missing:${selector}`);return element;}
}
