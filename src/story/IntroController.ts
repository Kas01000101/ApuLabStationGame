import * as THREE from 'three';
import { ThreeEngine } from '../three/ThreeEngine';
import { MarsWorld } from '../three/worlds/MarsWorld';
import { ApuLabWorld } from '../three/worlds/ApuLabWorld';
import { Yachay } from '../three/characters/Yachay';
import { MariaLuisaAguilar } from '../three/characters/MariaLuisaAguilar';
import { Ayni } from '../three/characters/Ayni';
import { FailureEffects } from '../three/effects/FailureEffects';
import { TelemetryEffects } from '../three/effects/TelemetryEffects';
import { IntroAudio } from '../three/effects/IntroAudio';
import { CinematicCamera, type CameraShot } from '../three/camera/CinematicCamera';
import { CanonicalStationFx } from '../three/effects/CanonicalStationFx';
import { IntroOverlay } from '../ui/IntroOverlay';

export type IntroState =
  | 'mars-exploration'
  | 'mars-failure'
  | 'telemetry'
  | 'apulab-arrival'
  | 'scientist-introduction'
  | 'nickname'
  | 'post-nickname'
  | 'ayni-entrance'
  | 'ayni-introduction'
  | 'mission-briefing'
  | 'telemetry-simulation'
  | 'intro-completed'
  | 'complete';

export interface IntroControllerOptions { onComplete?: () => void; }

const SCIENTIST_TALK = new THREE.Vector3(5.85, 0.02, 0.45);
const SCIENTIST_WORK = new THREE.Vector3(5.35, 0.02, -0.78);
const SCIENTIST_SAFE = new THREE.Vector3(6.65, 0.02, 1.10);
const SCIENTIST_BENCH = new THREE.Vector3(4.35, 0.02, 1.35);
const AYNI_PRESENT_Z0 = 0;

function shot(px:number,py:number,pz:number,tx:number,ty:number,tz:number): CameraShot {
  return { position:new THREE.Vector3(px,py,pz), target:new THREE.Vector3(tx,ty,tz) };
}

const SHOTS = {
  marsA: shot(-1.5,4.15,14.8,-2.0,1.42,.15),
  marsB: shot(1.2,4.35,12.9,1.2,1.65,0),
  marsDetail: shot(2.8,3.15,7.0,.2,1.75,.20),
  marsStop: shot(6.0,1.95,3.65,1.10,1.70,.15),
  marsTelemetry: shot(3.6,5.2,13.8,2.0,2.5,0),
  signal: shot(5.8,6.65,12.5,4.8,5.5,-.40),
  stationGeneral: shot(13.0,7.4,16.2,2.2,3.2,0),
  scientist: shot(10.4,6.8,12.4,5.70,3.72,.22),
  scientistPresent: shot(13.65,5.95,15.55,5.72,3.08,.30),
  scientistMonitorWide: shot(13.45,6.15,15.20,3.65,4.15,-6.35),
  scientistTeam: shot(12.95,6.55,15.05,5.72,3.08,.30),
  hatch: shot(11.5,6.8,14.7,.4,7.7,0),
  ayniDrop: shot(12.0,6.3,14.5,2.2,3.5,0),
  team: shot(13.1,7.2,15.1,2.65,3.0,.05),
  diagnostic: shot(11.8,7.0,14.2,1.7,3.1,-1.7),
  bench: shot(5.7,4.25,9.4,-2.85,1.85,2.28),
} satisfies Record<string,CameraShot>;

const clamp = (v:number):number => THREE.MathUtils.clamp(v,0,1);
const smooth = (v:number):number => { const p=clamp(v); return p*p*(3-2*p); };

export class IntroController {
  private state: IntroState = 'mars-exploration';
  private elapsed = 0;
  private stateEntered = true;
  private totalElapsed = 0;
  private playerNickname = '';
  private readonly cues = new Set<string>();
  private stationSwitched = false;

  private readonly camera: CinematicCamera;
  private readonly overlay: IntroOverlay;
  private readonly audio = new IntroAudio();
  private readonly mars = new MarsWorld();
  private readonly station = new ApuLabWorld();
  private readonly yachay = new Yachay();
  private readonly scientist = new MariaLuisaAguilar();
  private readonly ayni = new Ayni();
  private readonly failure = new FailureEffects(this.yachay, this.mars.group);
  private readonly telemetry = new TelemetryEffects(this.yachay);
  private readonly stationFx: CanonicalStationFx;

  constructor(
    private readonly engine: ThreeEngine,
    uiRoot: HTMLElement,
    private readonly options: IntroControllerOptions = {},
  ) {
    this.camera = new CinematicCamera(engine.camera);
    this.overlay = new IntroOverlay(uiRoot, { onSkip: () => this.skip() });
    this.mars.group.add(this.telemetry.group);
    this.stationFx = new CanonicalStationFx(this.station.group);
  }

  start(): void {
    this.audio.unlock();
    this.audio.startDriveHum();
    this.state = 'mars-exploration';
    this.elapsed = 0;
    this.totalElapsed = 0;
    this.stateEntered = true;
    this.cues.clear();
    this.playerNickname = '';
    this.stationSwitched = false;
    this.failure.reset();
    this.telemetry.reset();
    this.stationFx.reset();
    this.yachay.resetDynamicPose();
    this.yachay.group.position.set(-8.8, 1.8, 0.15);
    this.yachay.group.rotation.set(0, Math.PI / 2, 0);
    this.showMars();
    this.overlay.setTransition(0);
    this.overlay.showLocation('SECTOR APU-07 · VALLE DE EXPLORACIÓN');
    this.camera.set(SHOTS.marsA);
  }

  destroy(): void {
    this.audio.stopDriveHum();
    this.overlay.destroy();
    this.engine.clear();
  }

  update(dt: number): void {
    this.totalElapsed += dt;
    if (this.state !== 'nickname' && this.state !== 'complete') this.elapsed += dt;
    switch (this.state) {
      case 'mars-exploration': this.updateMarsExploration(dt); break;
      case 'mars-failure': this.updateMarsFailure(dt); break;
      case 'telemetry': this.updateTelemetry(); break;
      case 'apulab-arrival': this.updateApuLabArrival(dt); break;
      case 'scientist-introduction': this.updateScientistIntroduction(dt); break;
      case 'nickname': this.updateNickname(dt); break;
      case 'post-nickname': this.updatePostNickname(dt); break;
      case 'ayni-entrance': this.updateAyniEntrance(); break;
      case 'ayni-introduction': this.updateAyniIntroduction(); break;
      case 'mission-briefing': this.updateMissionBriefing(dt); break;
      case 'telemetry-simulation': this.updateTelemetrySimulation(); break;
      case 'intro-completed': this.updateIntroCompleted(); break;
      case 'complete': this.station.updateAmbient(this.totalElapsed,.72); this.scientist.updateIdle(dt); this.ayni.update(dt); break;
    }
  }

  skip(): void {
    if(this.state==='complete')return;
    this.audio.stopDriveHum();
    this.overlay.closeNickname();
    this.showStation();
    this.station.practiceBench.visible=true;
    this.station.setBenchReveal(1);
    this.scientist.group.position.copy(SCIENTIST_BENCH);
    this.ayni.group.visible=true;
    this.ayni.settleAtTeamPosition();
    this.camera.set(SHOTS.bench);
    this.overlay.hideDialogue();this.overlay.hideBeat();this.overlay.hideSfx();this.overlay.hideLocation();this.overlay.setTransition(0);this.overlay.showMission();
    this.setState('complete');
    this.options.onComplete?.();
  }

  private updateMarsExploration(dt:number):void{
    if(this.enterState()){
      this.showMars();this.yachay.group.position.set(-8.8,1.8,.15);this.yachay.group.rotation.set(0,Math.PI/2,0);this.yachay.setPower(1);this.yachay.setEyesGlow(.45);this.overlay.showLocation('SECTOR APU-07 · VALLE DE EXPLORACIÓN');this.audio.startDriveHum();
    }
    const t=this.elapsed;let speed=.72;let scan=0;
    if(t<2){const p=smooth(t/2);this.yachay.group.position.x=THREE.MathUtils.lerp(-8.8,-5,p);speed=.88;this.camera.blend(SHOTS.marsA,SHOTS.marsB,p*.48);this.overlay.showDialogue('mars-objective','YACHAY','¡Objetivo a la vista! Voy a investigar esas rocas.');}
    else if(t<4.5){const p=smooth((t-2)/2.5);this.yachay.group.position.x=THREE.MathUtils.lerp(-5,-4.45,p);speed=.14;scan=Math.sin(Math.PI*clamp((t-2.2)/1.7));this.yachay.scan(t,scan);this.mars.updateScan(this.yachay,scan,t);this.camera.blend(SHOTS.marsA,SHOTS.marsDetail,.34);this.overlay.showDialogue(t<3.5?'mars-scan':'mars-scan-joke','YACHAY',t<3.5?'Veamos… cámaras listas, sensores listos…':'…creo.');this.cue('scan-beep-a',t>2.45,()=>this.audio.beep());this.cue('scan-beep-b',t>2.78,()=>this.audio.beep(true));}
    else{const p=smooth((t-4.5)/3.3);this.yachay.group.position.x=THREE.MathUtils.lerp(-4.45,.95,p);speed=THREE.MathUtils.lerp(.62,.44,p);this.mars.updateScan(this.yachay,0,t);this.camera.blend(SHOTS.marsA,SHOTS.marsB,smooth((t-4.5)/1.15));if(t<6.15)this.overlay.showDialogue('mars-go','YACHAY','¡Sigamos!');else this.overlay.hideDialogue();}
    this.yachay.group.position.y=1.8+Math.sin(t*3.7)*.024*speed+Math.sin(t*6.4)*.01*speed;this.yachay.group.rotation.z=Math.sin(t*2.5)*.012*speed;this.yachay.animateWheels(.55+speed,dt);this.mars.updateDriveDust(this.yachay,t,.14+.55*speed);if(scan<.02&&t>4.5)this.yachay.pointMast(Math.sin(t*.85)*.09,0);this.audio.setDriveHum(.045+.035*speed,78+26*speed);if(t>2.7)this.overlay.hideLocation();if(t>=7.8)this.setState('mars-failure');
  }

  private updateMarsFailure(dt:number):void{
    if(this.enterState()){this.failure.reset();this.overlay.hideLocation();this.overlay.hideDialogue();this.overlay.hideSfx();}
    const t=this.elapsed,advance=t<8.8?smooth(t/8.8):1;this.yachay.group.position.x=THREE.MathUtils.lerp(.95,3.05,advance);this.yachay.group.position.y=1.8+Math.sin(t*3.2)*.014*(1-clamp(t/9));this.yachay.group.rotation.y=Math.PI/2;this.yachay.group.rotation.z=Math.sin(t*2.3)*.007*(1-clamp(t/9));this.failure.update(t);
    if(t<2.4){const p=smooth(t/2.4);this.yachay.animateWheels(THREE.MathUtils.lerp(.95,.68,p),dt);this.mars.updateDriveDust(this.yachay,t,.42-.16*p);const flicker=(t>.45&&t<.65)||(t>1.55&&t<1.76);this.yachay.setPower(flicker?.18:THREE.MathUtils.lerp(1,.86,p));this.audio.setDriveHum(.055-.012*p,92-12*p);this.cue('failure-bip-1',t>.46,()=>this.audio.beep());this.cue('failure-bip-2',t>1.25,()=>this.audio.beep());if(t<1.15){this.useWheelCloseup(smooth((t-.1)/.48));this.overlay.hideDialogue();}else{this.useEyeCloseup(smooth((t-1.15)/.48));this.yachay.lookConcerned(t,smooth((t-1.15)/.48));if(t<1.72)this.overlay.hideDialogue();else this.overlay.showDialogue('failure-eh','YACHAY','¿Eh?');}}
    else if(t<4.6){const p=smooth((t-2.4)/2.2);this.yachay.animateWheels(THREE.MathUtils.lerp(.58,.42,p),dt);this.mars.updateDriveDust(this.yachay,t,.23-.07*p);const flicker=(t>3&&t<3.16)||(t>3.72&&t<3.9);this.yachay.setPower(flicker?.08:THREE.MathUtils.lerp(.82,.62,p));this.yachay.setEyesGlow(.32);this.audio.setDriveHum(.038-.010*p,74-10*p);this.camera.dynamic(SHOTS.marsDetail.position,new THREE.Vector3(this.yachay.group.position.x+.2,1.7,.15));if(t>2.95&&t<3.65){this.overlay.showSfx('PFF',1-clamp((t-3.05)/.72));this.cue('failure-pff-1',t>3.02,()=>this.audio.pff());}else this.overlay.hideSfx();if(t<3.35)this.overlay.hideDialogue();else this.overlay.showDialogue('failure-panel','YACHAY','Eso no debería salir de ahí…');}
    else if(t<6.7){const p=smooth((t-4.6)/2.1);this.yachay.animateWheels(THREE.MathUtils.lerp(.42,.28,p),dt);this.mars.updateDriveDust(this.yachay,t,.16-.05*p);this.yachay.setPower(THREE.MathUtils.lerp(.58,.38,p));this.yachay.setEyesGlow(.24);this.audio.setDriveHum(.028-.008*p,62-8*p);this.camera.dynamic(SHOTS.marsDetail.position,new THREE.Vector3(this.yachay.group.position.x+.25,1.7,.15));if(t<5.2)this.overlay.showDialogue('failure-push','YACHAY','Vamos…');else if(t<5.55){this.overlay.hideDialogue();this.overlay.showSfx('CLANK',.75);this.cue('solar-clank',t>5.25,()=>this.audio.clank());}else{this.overlay.hideSfx();this.overlay.showDialogue('failure-solar','YACHAY','…eso tampoco debería soltarse.');}}
    else if(t<8.9){const p=smooth((t-6.7)/2.2);this.yachay.animateWheels(THREE.MathUtils.lerp(.28,.1,p),dt);this.mars.updateDriveDust(this.yachay,t,.1*(1-p));const flicker=(t>7.25&&t<7.42)||(t>8.05&&t<8.22);this.yachay.setPower(flicker?0:THREE.MathUtils.lerp(.34,.06,p));this.yachay.setEyesGlow(THREE.MathUtils.lerp(.2,.04,p));this.audio.setDriveHum(.018-.012*p,52-18*p);this.useEyeCloseup(smooth((t-7.65)/.62));this.cue('debris-clink-a',t>7.08,()=>this.audio.clink());this.cue('debris-clink-b',t>8.02,()=>this.audio.clink());if(t>7.7&&t<8.34){this.overlay.showSfx('PFF',1-clamp((t-7.78)/.64));this.cue('failure-pff-2',t>7.78,()=>this.audio.pff());}else this.overlay.hideSfx();if(t<7.45)this.overlay.hideDialogue();else this.overlay.showDialogue('failure-stop','YACHAY','Algo está fallando. No puedo continuar.');}
    else if(t<10.5){const off=smooth((t-8.9)/.65);this.yachay.animateWheels(.02*(1-off),dt);this.mars.updateDriveDust(this.yachay,t,0);this.yachay.setPower(1-off);this.yachay.setEyesGlow(.08*(1-off));this.audio.setDriveHum(.006*(1-off),34);this.yachay.pointMast(THREE.MathUtils.lerp(.04,0,off),THREE.MathUtils.lerp(.02,.1,off));this.camera.dynamic(SHOTS.marsStop.position,new THREE.Vector3(3.05,1.7,.15));if(t<9.45)this.overlay.hideDialogue();else this.overlay.showDialogue('failure-safe','YACHAY','Mejor no voy a forzar mis sistemas.');}
    else{this.audio.stopDriveHum();this.yachay.setPower(0);this.yachay.setEyesGlow(0);this.mars.updateDriveDust(this.yachay,t,0);const antenna=smooth((t-10.5)/.85);this.yachay.pointMast(THREE.MathUtils.lerp(0,.42,antenna),THREE.MathUtils.lerp(.1,.02,antenna));this.yachay.pointDish(THREE.MathUtils.lerp(.02,.18,antenna));this.camera.dynamic(SHOTS.marsStop.position,new THREE.Vector3(3.05,1.7,.15));this.overlay.showDialogue('failure-send','YACHAY','Enviaré mis datos a ApuLab.');}
    if(t>=12.3)this.setState('telemetry');
  }

  private updateTelemetry():void{
    if(this.enterState()){this.telemetry.reset();this.yachay.setPower(0);this.yachay.setEyesGlow(0);this.overlay.hideSfx();this.cue('telemetry-start',true,()=>this.audio.telemetry());}
    const t=this.elapsed;this.yachay.telemetry(t);this.telemetry.update(t);const hero=this.telemetry.getHeroWorldPosition(new THREE.Vector3()),camSignal=smooth((t-1.45)/1.1);this.camera.dynamic(SHOTS.marsTelemetry.position.clone().lerp(SHOTS.signal.position,camSignal),SHOTS.marsTelemetry.target.clone().lerp(hero,camSignal*.68));if(t<1.95){this.overlay.showDialogue('telem1','YACHAY','ApuLab… les envío mis datos.');this.overlay.showBeat('ENVIANDO TELEMETRÍA…');}else if(t<3.45){this.overlay.showDialogue('telem2','YACHAY','Espero que descubran qué ocurrió.');this.overlay.showBeat('TRANSMISIÓN COMPLETA');}else{this.overlay.hideDialogue();this.overlay.hideBeat();}if(t>=3.9)this.setState('apulab-arrival');
  }

  private updateApuLabArrival(dt:number):void{
    if(this.enterState()){this.stationSwitched=false;this.overlay.hideDialogue();this.overlay.hideLocation();this.overlay.setTransition(0);this.stationFx.setMonitorPulse(0);this.camera.set(SHOTS.signal);}
    const t=this.elapsed;
    if(t<1.2){this.showMars();const p=smooth(t/1.2);this.overlay.setTransition(p);const hero=this.telemetry.heroPulse;hero.visible=true;const material=hero.material as THREE.MeshBasicMaterial;material.opacity=THREE.MathUtils.lerp(.92,.15,p);hero.position.set(THREE.MathUtils.lerp(7.2,9,p),THREE.MathUtils.lerp(8.4,9.4,p),THREE.MathUtils.lerp(-1.2,-1.6,p));this.camera.dynamic(SHOTS.signal.position,hero.getWorldPosition(new THREE.Vector3()));}
    else{if(!this.stationSwitched){this.stationSwitched=true;this.showStation();this.scientist.group.position.copy(SCIENTIST_WORK);this.scientist.resetPose();this.scientist.group.rotation.y=-.40;this.ayni.group.visible=false;this.overlay.showLocation('APULAB STATION · PERÚ',true);this.audio.transition();}const q=smooth((t-1.2)/1.8);this.overlay.setTransition(1-q);this.stationFx.setMonitorPulse(q<.70?1-q:0,THREE.MathUtils.lerp(2.1,.45,q));this.camera.set(SHOTS.stationGeneral);this.scientist.moveBetween(SCIENTIST_TALK,SCIENTIST_WORK,q);this.scientist.group.rotation.y=-.40;this.scientist.headRoot.rotation.y=-.32+.025*Math.sin(t*2.2);this.scientist.headRoot.rotation.x=.02;this.scientist.rightShoulder.rotation.z=.12*Math.sin(t*3.4);this.scientist.rightShoulder.rotation.x=-.08+.04*Math.sin(t*2.7);this.station.updateAmbient(this.totalElapsed,1.15-q*.15);this.stationFx.drawMonitor('YACHAY',['TELEMETRÍA RECIBIDA','UBICACIÓN: MARTE','ESTADO: DETENIDO','CAUSA: DESCONOCIDA']);}
    if(t>2.25)this.overlay.hideLocation();if(t>=3)this.setState('scientist-introduction');else this.scientist.updateIdle(dt*.15);
  }

  private updateScientistIntroduction(dt:number):void{
    if(this.enterState()){
      this.showStation();this.ayni.group.visible=false;this.station.practiceBench.visible=false;
      this.camera.set(SHOTS.scientistPresent);this.scientist.resetPose();
      this.scientist.group.position.copy(SCIENTIST_WORK);
      this.overlay.hideDialogue();this.overlay.hideBeat();this.stationFx.setStemOpacity(0);
    }
    const t=this.elapsed;this.station.updateAmbient(this.totalElapsed,1);
    this.scientist.moveBetween(SCIENTIST_WORK,SCIENTIST_TALK,t/1.2);
    const rise=smooth((t-.1)/.85),fade=1-smooth((t-35)/3.5);
    this.station.setScientistSpot(rise*fade,this.scientist.group.position);
    if(t<39.3)this.camera.blend(SHOTS.stationGeneral,SHOTS.scientistPresent,smooth(t/1.18));
    else if(t<51)this.camera.blend(SHOTS.scientistPresent,SHOTS.scientistMonitorWide,smooth((t-39.3)/1.15));
    else this.camera.blend(SHOTS.scientistMonitorWide,SHOTS.scientistTeam,smooth((t-51)/1.2));
    if(t<1.45)this.scientist.greeting(t);else this.scientist.updateIdle(dt);
    if(t>=12&&t<35){this.scientist.openTeamPose(smooth((t-12)/1.2));this.stationFx.setStemOpacity(t<26?.20:.33,t);}
    if(t>=39.3){this.stationFx.setStemOpacity(0);this.scientist.lookAtMonitor(smooth((t-39.3)/.7));
      this.stationFx.drawMonitor('YACHAY',['TELEMETRÍA RECIBIDA','UBICACIÓN: MARTE','ESTADO: DETENIDO','CAUSA: DESCONOCIDA']);}
    if(t<5.0)this.overlay.showDialogue('r1','MARÍA LUISA','¡Hola! Soy una guía digital creada en homenaje a María Luisa Aguilar Hurtado.');
    else if(t<12)this.overlay.showDialogue('r2','MARÍA LUISA','Ella fue la primera astrónoma profesional del Perú. Su curiosidad la llevó a explorar los misterios del universo.');
    else if(t<18)this.overlay.showDialogue('r3','MARÍA LUISA','Dedicó su vida a investigar las estrellas y a compartir su pasión por la ciencia.');
    else if(t<26)this.overlay.showDialogue('r4','MARÍA LUISA','Su historia nos recuerda que los grandes descubrimientos comienzan con una pregunta y el valor de buscar respuestas.');
    else if(t<35)this.overlay.showDialogue('r5','MARÍA LUISA','Y ahora es tu turno. No necesitas tener todas las respuestas para ser una científica. ¡Solo necesitas atreverte a descubrirlas!');
    else if(t<39.3)this.overlay.showDialogue('r6','MARÍA LUISA','Y hablando de preguntas… ¡tenemos un misterio que resolver!');
    else if(t<44.5)this.overlay.showDialogue('r7','MARÍA LUISA','Yachay estaba explorando Marte cuando, de pronto, algo lo obligó a detenerse.');
    else if(t<51)this.overlay.showDialogue('r8','MARÍA LUISA','Nos envió sus datos. En ellos podrían estar las pistas, pero todavía no sabemos qué ocurrió.');
    else if(t<57)this.overlay.showDialogue('r9','MARÍA LUISA','¿Nos ayudarás a descubrirlo? Antes de comenzar, ¿cómo te gusta que te llamen?');
    else this.overlay.hideDialogue();
    if(t>=57)this.setState('nickname');
  }

  private updateNickname(dt:number):void{if(this.enterState()){this.overlay.hideDialogue();this.overlay.hideBeat();this.station.setScientistSpot(0,this.scientist.group.position);this.overlay.requestNickname((nickname)=>{this.playerNickname=nickname;this.setState('post-nickname');});}this.station.updateAmbient(this.totalElapsed,.72);this.scientist.updateIdle(dt);this.camera.set(SHOTS.scientistPresent);}

  private updatePostNickname(dt:number):void{
    if(this.enterState()){this.scientist.resetPose();this.camera.set(SHOTS.scientistPresent);this.overlay.hideSfx();}
    const t=this.elapsed;this.station.updateAmbient(this.totalElapsed,1);
    const retreat=smooth((t-9.1)/.85);
    this.scientist.moveBetween(SCIENTIST_TALK,SCIENTIST_SAFE,retreat);this.scientist.lookUp(retreat);
    if(t<2.2)this.overlay.showDialogue('post-nick-hello','MARÍA LUISA',`¡Mucho gusto, ${this.playerNickname}!`);
    else if(t<8.1)this.overlay.showDialogue('post-nick-team','MARÍA LUISA','Desde ahora, formas parte del equipo de ApuLab. Tu curiosidad puede ayudarnos a encontrar nuevas pistas.');
    else if(t<10.8)this.overlay.showDialogue('post-nick-missing','MARÍA LUISA','Aunque… parece que todavía nos falta alguien.');
    else this.overlay.hideDialogue();
    this.cue('ayni-clank',t>=10.1,()=>{this.audio.clank();this.overlay.showSfx('CLANK',.9);});
    if(t>10.9)this.overlay.hideSfx();
    if(t>=11.3)this.setState('ayni-entrance');else this.scientist.updateIdle(dt*.2);
  }

  private updateAyniEntrance():void{
    if(this.enterState()){this.ayni.group.visible=false;this.ayni.group.position.set(0,8.25,0);this.ayni.group.rotation.set(0,0,0);this.station.setHatchOpen(0);this.stationFx.setAyniPeek(false);this.scientist.group.position.copy(SCIENTIST_SAFE);this.overlay.hideDialogue();this.overlay.hideSfx();}
    const t=this.elapsed;this.station.updateAmbient(this.totalElapsed,1);
    if(t<.35){this.station.setHatchOpen(0);this.scientist.lookUp(1);this.camera.set(SHOTS.hatch);}else if(t<1.15){const p=smooth((t-.35)/.8);this.station.setHatchOpen(p);this.camera.blend(SHOTS.scientist,SHOTS.hatch,p);this.scientist.lookUp(p);this.stationFx.setAyniPeek(t>.72,t);}else if(t<1.62){this.station.setHatchOpen(1);this.stationFx.setAyniPeek(true,t);this.camera.set(SHOTS.hatch);this.overlay.hideDialogue();}else if(t<3.15){this.stationFx.setAyniPeek(false);const p=clamp((t-1.62)/1.53),fall=Math.pow(p,1.55);this.ayni.group.visible=true;this.ayni.group.position.set(0,THREE.MathUtils.lerp(8.2,1.8,fall),0);this.camera.blend(SHOTS.hatch,SHOTS.ayniDrop,smooth(p));this.overlay.showDialogue('ayni-permission','AYNI','¡Permisoooooo!');this.overlay.showSfx('¡WOOO!',Math.sin(p*Math.PI));this.cue('ayni-whoosh',true,()=>this.audio.whoosh());}else if(t<3.70){const p=clamp((t-3.15)/.55);this.ayni.group.position.set(0,1.8,0);this.ayni.group.scale.set(1,THREE.MathUtils.lerp(.8,1,smooth(p)),1);this.ayni.group.rotation.z=THREE.MathUtils.lerp(.065,.035,smooth(p));this.station.updateLandingPulse(p);this.camera.set(SHOTS.ayniDrop);this.overlay.hideDialogue();this.overlay.showSfx('BOOM!',1-p*.55);this.cue('ayni-boom',true,()=>this.audio.boom());}else{const p=smooth((t-3.70)/1.7);this.ayni.group.scale.set(1,1,1);this.ayni.group.position.set(0,1.8+Math.sin(p*Math.PI*2.5)*.07*(1-p),0);this.ayni.group.rotation.z=THREE.MathUtils.lerp(.035,0,p);this.camera.set(SHOTS.team);this.overlay.hideSfx();if(t<4.15)this.overlay.hideDialogue();else if(t<4.65)this.overlay.showDialogue('ayni-arrived','AYNI','…¡Llegué!');else if(t<5.10)this.overlay.showDialogue('scientist-noticed','MARÍA LUISA','Eso noté.');else if(t<5.65)this.overlay.showDialogue('ayni-perfect','AYNI','Aterrizaje perfectamente calculado.');else{this.ayni.pointMast(THREE.MathUtils.lerp(0,-.42,smooth((t-5.65)/.32)),.08);const clink=1-clamp((t-5.65)/.28);if(clink>0){this.overlay.showSfx('CLINK',.68*clink);this.cue('ayni-clink',true,()=>this.audio.clink());}else this.overlay.hideSfx();if(t<6.02)this.overlay.hideDialogue();else this.overlay.showDialogue('ayni-almost','AYNI','…casi perfectamente.');}}if(t>=6.50)this.setState('ayni-introduction');
  }

  private updateAyniIntroduction():void{
    if(this.enterState()){
      this.ayni.group.visible=true;this.ayni.group.position.set(0,1.8,AYNI_PRESENT_Z0);
      this.ayni.group.rotation.set(0,0,0);this.station.setHatchOpen(1);
      this.overlay.hideSfx();this.camera.set(SHOTS.team);
    }
    const t=this.elapsed;this.station.updateAmbient(this.totalElapsed,1);
    this.ayni.updatePresentation(t);
    const movement=smooth(t/1.35),camera=SHOTS.team.position.clone(),target=SHOTS.team.target.clone();
    camera.z-=.30*movement;target.z=THREE.MathUtils.lerp(SHOTS.team.target.z,.42,movement);
    this.camera.dynamic(camera,target);
    const nick=this.playerNickname||'compañera';
    if(t<3.6)this.overlay.showDialogue('ai1','AYNI',`¡Hola, ${nick}! Soy AYNI.`);
    else if(t<8.3)this.overlay.showDialogue('ai2','AYNI','Yachay es mi hermano gemelo… ¡literalmente nacimos del mismo código!');
    else if(t<11)this.overlay.showDialogue('ai3','AYNI','Aunque, claro, yo salí más guapo.');
    else if(t<16.6)this.overlay.showDialogue('ai4','AYNI','Él está en Marte y yo estoy aquí. ¡Y no pienso dejarlo solo con ese misterio!');
    else if(t<23.5)this.overlay.showDialogue('ai5','AYNI','Con sus datos y tu ayuda, podemos descubrir qué ocurrió y ayudarlo a volver a explorar.');
    else this.overlay.hideDialogue();
    if(t>=24){this.ayni.settleAtTeamPosition();this.setState('mission-briefing');}
  }

  private updateMissionBriefing(dt:number):void{
    if(this.enterState()){
      this.ayni.settleAtTeamPosition();this.scientist.resetPose();
      this.camera.set(SHOTS.team);this.overlay.hideBeat();
      this.stationFx.drawMonitor('YACHAY',['TELEMETRÍA RECIBIDA','CAUSA: DESCONOCIDA']);
    }
    const t=this.elapsed;this.station.updateAmbient(this.totalElapsed,1);this.scientist.updateIdle(dt);
    if(t<5)this.overlay.showDialogue('mb1','MARÍA LUISA','Tenemos pistas, pero todavía no sabemos por qué se detuvo Yachay.');
    else if(t<11)this.overlay.showDialogue('mb2','MARÍA LUISA','En la ciencia no se trata de adivinar, sino de investigar y buscar evidencias.');
    else if(t<16){
      this.stationFx.drawMonitor('OBSERVAR',['DATOS RECIBIDOS DE MARTE']);
      this.overlay.showDialogue('mb3','MARÍA LUISA','Primero, observaremos los datos que nos envió.');
    }else if(t<23){
      if(t<19.5)this.stationFx.drawMonitor('MEDIR',['OBTENER UNA BUENA MEDICIÓN']);
      else this.stationFx.drawMonitor('COMPARAR',['BUSCAR DIFERENCIAS']);
      this.overlay.showDialogue('mb4','MARÍA LUISA','Después, aprenderemos a medir con cuidado y a comparar los resultados.');
    }else if(t<29.5){
      this.stationFx.drawMonitor('SEGUIR LAS PISTAS',['CAUSA: AÚN DESCONOCIDA']);
      this.overlay.showDialogue('mb5','MARÍA LUISA','Cada pista nos acerca un poco más a la respuesta. ¡Vamos a descubrir qué ocurrió!');
    }else this.overlay.hideDialogue();
    if(t>=30)this.setState('telemetry-simulation');
  }

  private updateTelemetrySimulation():void{
    if(this.enterState()){this.overlay.hideSfx();this.camera.set(SHOTS.diagnostic);}
    const t=this.elapsed;this.station.updateAmbient(this.totalElapsed,1);
    if(t<2.8){
      this.stationFx.drawMonitor('TELEMETRÍA DE YACHAY CARGADA',['PREPARANDO SISTEMA DE PRUEBAS']);
      this.overlay.showDialogue('ts1','AYNI','Creo que ya estoy listo.');
    }else if(t<5.3){
      this.stationFx.drawMonitor('TELEMETRÍA DE YACHAY CARGADA',['PREPARANDO SISTEMA DE PRUEBAS…']);
      this.overlay.showDialogue('ts2','AYNI','…eso espero.');
      this.cue('telemetry-sim-beep',t>3,()=>this.audio.telemetry());
    }else if(t<12)this.overlay.showDialogue('ts3','MARÍA LUISA','Antes de investigar lo que ocurrió en Marte, necesitamos aprender algo importante: medir correctamente.');
    else this.overlay.hideDialogue();
    if(t>=12.5)this.setState('intro-completed');
  }

  private updateIntroCompleted():void{
    if(this.enterState()){
      this.showStation();this.ayni.group.visible=true;this.scientist.group.visible=true;
      this.station.practiceBench.visible=true;this.station.setBenchReveal(0);
      this.scientist.resetPose();this.camera.set(SHOTS.diagnostic);
      this.overlay.hideMission();this.overlay.setTransition(0);this.audio.success();
    }
    const t=this.elapsed;this.station.updateAmbient(this.totalElapsed,1);
    const walk=smooth(t/1.25);this.scientist.moveBetween(SCIENTIST_SAFE,SCIENTIST_BENCH,walk);
    this.scientist.group.rotation.y=THREE.MathUtils.lerp(-.08,-.24,walk);
    this.ayni.pointMast(THREE.MathUtils.lerp(0,.34,walk),THREE.MathUtils.lerp(0,.05,walk));
    this.station.setBenchReveal(smooth((t-.35)/.78));
    this.camera.blend(SHOTS.diagnostic,SHOTS.bench,smooth(t/1.55));
    if(t<.8)this.overlay.hideDialogue();
    else if(t<3.9)this.overlay.showDialogue('ic1','AYNI','Espera… ¿esa es mi batería?');
    else if(t<7.1)this.overlay.showDialogue('ic2','MARÍA LUISA','¡No te preocupes, AYNI! Es una batería de práctica.');
    else if(t<9.5)this.overlay.showDialogue('ic4','AYNI','¡Uf! …menos mal.');
    else if(t<17.2)this.overlay.showDialogue('ic5','MARÍA LUISA','En la ciencia, cada descubrimiento comienza aprendiendo algo nuevo. ¡Vamos a realizar nuestra primera medición!');
    else{this.overlay.hideDialogue();this.overlay.markIntroSeen();const p=smooth((t-17.2)/1.3);this.overlay.setTransition(.93*p);this.overlay.showMission();}
    if(t>=19.7){
      this.overlay.hideDialogue();this.overlay.markIntroSeen();this.overlay.showMission();
      this.setState('complete');this.options.onComplete?.();
    }
  }

  private useWheelCloseup(amount:number):void{const target=this.yachay.getWorldWheelPosition(3,new THREE.Vector3());target.y+=.28;const camera=target.clone().add(new THREE.Vector3(4.10,1.55,5.10)),p=smooth(amount);this.camera.dynamic(SHOTS.marsB.position.clone().lerp(camera,p),SHOTS.marsB.target.clone().lerp(target,p));}
  private useEyeCloseup(amount:number):void{const target=this.yachay.getWorldEyePosition(new THREE.Vector3());target.z+=.18;const camera=target.clone().add(new THREE.Vector3(2.45,.30,3.35)),wheelTarget=this.yachay.getWorldWheelPosition(3,new THREE.Vector3());wheelTarget.y+=.28;const wheelCamera=wheelTarget.clone().add(new THREE.Vector3(4.10,1.55,5.10)),p=smooth(amount);this.camera.dynamic(wheelCamera.lerp(camera,p),wheelTarget.lerp(target,p));}
  private showMars():void{this.engine.clear();this.mars.applySceneEnvironment(this.engine.scene);this.engine.scene.add(this.mars.group,this.yachay.group);this.yachay.group.visible=true;this.scientist.group.visible=false;this.ayni.group.visible=false;}
  private showStation():void{this.engine.clear();this.station.applySceneEnvironment(this.engine.scene);this.station.reset();this.stationFx.reset();this.engine.scene.add(this.station.group,this.scientist.group,this.ayni.group);this.scientist.group.visible=true;this.ayni.group.visible=false;this.yachay.group.visible=false;}
  private setState(state:IntroState):void{this.state=state;this.elapsed=0;this.stateEntered=true;this.cues.clear();document.documentElement.dataset.apulabState=state;}
  private enterState():boolean{if(!this.stateEntered)return false;this.stateEntered=false;return true;}
  private cue(key:string,condition:boolean,callback:()=>void):void{if(!condition||this.cues.has(key))return;this.cues.add(key);callback();}
}
