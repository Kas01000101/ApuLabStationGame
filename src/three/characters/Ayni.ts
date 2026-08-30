import * as THREE from 'three';
import { Rover } from './Rover';

/** AYNI comparte exactamente la misma plataforma física que YACHAY. */
export class Ayni extends Rover {
  private idleTime=0;
  constructor(){super({name:'AYNI'});this.group.position.set(0,1.8,0);}
  update(dt:number):void{this.idleTime+=dt;this.group.position.y=1.8+Math.sin(this.idleTime*1.6)*.028;this.pointMast(Math.sin(this.idleTime*1.5)*.10,.02);}
  updatePresentation(elapsed:number):void{const smooth=(v:number)=>{const p=THREE.MathUtils.clamp(v,0,1);return p*p*(3-2*p);};const approach=smooth(elapsed/1.25);this.group.position.z=THREE.MathUtils.lerp(0,.88,approach);const hello=Math.sin(Math.PI*THREE.MathUtils.clamp(elapsed/1.2,0,1))*.13,codeBeat=Math.sin(Math.PI*THREE.MathUtils.clamp((elapsed-5.2)/.72,0,1))*.10;this.group.position.y=1.8+hello+codeBeat;this.group.rotation.z=Math.sin(Math.PI*THREE.MathUtils.clamp(elapsed/1.2,0,1))*.018-Math.sin(Math.PI*THREE.MathUtils.clamp((elapsed-5.2)/.72,0,1))*.022;const energy=elapsed<6.9?1:.42,helloNod=Math.sin(Math.PI*THREE.MathUtils.clamp(elapsed/.95,0,1))*.09,codeNod=Math.sin(Math.PI*THREE.MathUtils.clamp((elapsed-5.2)/.70,0,1))*.13;this.pointMast(Math.sin(elapsed*(2.6*energy+1))*.12*energy,(elapsed>6.9?.035:0)-helloNod-codeNod);this.animateWheels(.22*(1-approach),1/60);}
  settleAtTeamPosition():void{this.group.position.set(0,1.8,.88);this.group.rotation.set(0,0,0);this.pointMast(0,.02);}
}
