import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const U = 0.23;
const px = (n:number):number => n*U;

function mat(color:number,roughness=.82,metalness=.05):THREE.MeshStandardMaterial{
  return new THREE.MeshStandardMaterial({color,roughness,metalness,flatShading:true});
}

const M={
  white:mat(0xe8e1d7,.80,.02),white2:mat(0xcfc8bf,.84,.03),
  suit:mat(0x0b4ea8,.74,.02),suitDark:mat(0x07336f,.78,.03),suitLight:mat(0x1768c8,.72,.02),
  cyan:new THREE.MeshStandardMaterial({color:0x3f8fca,emissive:0x123a58,emissiveIntensity:.22,roughness:.48,flatShading:true}),
  skin:mat(0xc98058,.84,0),skinLight:mat(0xe2a071,.82,0),hair:mat(0x2f2b31,.92,.01),hair2:mat(0x6a646a,.90,.01),
  glasses:new THREE.MeshStandardMaterial({color:0x77757d,roughness:.20,metalness:.82,flatShading:true}),
  dark:mat(0x252831,.88,.05),red:mat(0xd62e34,.70,.01),yellow:mat(0xe7b73c,.70,.05),gold:mat(0xb9872e,.54,.34),
};

function box(w:number,h:number,d:number,material:THREE.Material,parent:THREE.Object3D,shadow=true):THREE.Mesh{
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.castShadow=shadow;mesh.receiveShadow=shadow;parent.add(mesh);return mesh;
}
function rbox(w:number,h:number,d:number,radius:number,material:THREE.Material,parent:THREE.Object3D,shadow=true):THREE.Mesh{
  const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,1,radius),material);mesh.castShadow=shadow;mesh.receiveShadow=shadow;parent.add(mesh);return mesh;
}
function voxelBox(w:number,h:number,d:number,material:THREE.Material,parent:THREE.Object3D,shadow=true):THREE.Mesh{return box(px(w),px(h),px(d),material,parent,shadow);}
function cylinder(radius:number,height:number,material:THREE.Material,parent:THREE.Object3D,shadow=true):THREE.Mesh{
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,10),material);mesh.castShadow=shadow;mesh.receiveShadow=shadow;parent.add(mesh);return mesh;
}

function nameTagTexture():THREE.CanvasTexture{
  const c=document.createElement('canvas');c.width=512;c.height=240;const ctx=c.getContext('2d');if(!ctx)throw new Error('ruth_name_tag_context_missing');
  ctx.fillStyle='#0a2f68';ctx.fillRect(0,0,c.width,c.height);ctx.lineWidth=8;ctx.strokeStyle='#6fa6e8';ctx.strokeRect(8,8,c.width-16,c.height-16);
  ctx.fillStyle='rgba(140,185,235,.35)';ctx.fillRect(42,c.height/2-2,c.width-84,4);ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 76px Arial';ctx.fillText('RUTH',c.width/2,78);ctx.fillStyle='#dcecff';ctx.font='700 52px Arial';ctx.fillText('MANZANARES',c.width/2,170);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.minFilter=THREE.LinearFilter;t.magFilter=THREE.LinearFilter;return t;
}
function usFlagTexture():THREE.CanvasTexture{
  const c=document.createElement('canvas');c.width=128;c.height=80;const ctx=c.getContext('2d');if(!ctx)throw new Error('us_flag_context_missing');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);const h=c.height/13;ctx.fillStyle='#c9323b';for(let i=0;i<13;i+=2)ctx.fillRect(0,i*h,c.width,h);ctx.fillStyle='#21468b';ctx.fillRect(0,0,c.width*.42,h*7);ctx.fillStyle='#fff';for(let y=0;y<4;y++)for(let x=0;x<5;x++)ctx.fillRect(8+x*10,7+y*10,3,3);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.minFilter=THREE.LinearFilter;t.magFilter=THREE.NearestFilter;return t;
}
function peruFlagTexture():THREE.CanvasTexture{
  const c=document.createElement('canvas');c.width=120;c.height=80;const ctx=c.getContext('2d');if(!ctx)throw new Error('peru_flag_context_missing');ctx.fillStyle='#d91023';ctx.fillRect(0,0,c.width/3,c.height);ctx.fillStyle='#fff';ctx.fillRect(c.width/3,0,c.width/3,c.height);ctx.fillStyle='#d91023';ctx.fillRect(c.width*2/3,0,c.width/3,c.height);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.minFilter=THREE.LinearFilter;t.magFilter=THREE.NearestFilter;return t;
}

export class Ruth{
  readonly group=new THREE.Group();readonly headRoot=new THREE.Group();readonly rightShoulder=new THREE.Group();readonly leftShoulder=new THREE.Group();
  private readonly rightForearm=new THREE.Group();private readonly leftForearm=new THREE.Group();private idleTime=0;
  private presentationEnergy=0;
  private readonly presentationHaloMat=new THREE.MeshBasicMaterial({color:0x8e7dce,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
  private readonly presentationHalo=new THREE.Mesh(new THREE.RingGeometry(.32,1.35,36),this.presentationHaloMat);
  private readonly presentationFill=new THREE.PointLight(0x9284d2,0,5.5,2);
  private readonly presentationRim=new THREE.PointLight(0x49c9d7,0,4.5,2);

  constructor(){
    this.group.name='Ruth Manzanares Grados';this.group.position.set(5.85,.02,.45);this.group.rotation.set(0,-.08,0);
    this.createLeg(-1);this.createLeg(1);
    const torsoRoot=new THREE.Group();torsoRoot.position.set(0,px(12),0);this.group.add(torsoRoot);
    const torso=voxelBox(8,12,4,M.suit,torsoRoot);torso.position.y=px(6);const belt=voxelBox(8.35,1.05,4.18,M.dark,torsoRoot);belt.position.y=px(.55);const buckle=voxelBox(2.15,1.35,.48,M.white2,torsoRoot,false);buckle.position.set(0,px(.60),px(2.28));
    const collar=voxelBox(5.35,1.10,4.12,M.suitDark,torsoRoot);collar.position.y=px(11.42);const collarL=voxelBox(2.2,.75,.38,M.suitLight,torsoRoot,false);collarL.position.set(-px(1.45),px(10.95),px(2.20));collarL.rotation.z=-.16;const collarR=voxelBox(2.2,.75,.38,M.suitLight,torsoRoot,false);collarR.position.set(px(1.45),px(10.95),px(2.20));collarR.rotation.z=.16;
    const undershirt=voxelBox(2.6,.78,.45,M.dark,torsoRoot,false);undershirt.position.set(0,px(11.62),px(2.22));const zipper=voxelBox(.38,8,.28,M.white2,torsoRoot,false);zipper.position.set(0,px(6.25),px(2.16));const zipperPull=voxelBox(.72,.72,.30,M.white2,torsoRoot,false);zipperPull.position.set(0,px(8.15),px(2.30));
    for(const side of [-1,1]){const strip=voxelBox(.62,6.2,.30,M.cyan,torsoRoot,false);strip.position.set(side*px(2.55),px(5.75),px(2.18));const p1=voxelBox(1.4,.62,.35,M.suitDark,torsoRoot,false);p1.position.set(side*px(3.1),px(2.4),px(2.15));const p2=voxelBox(1.4,.62,.35,M.suitDark,torsoRoot,false);p2.position.set(side*px(3.1),px(1.55),px(2.15));}
    const goldPatch=new THREE.Group();goldPatch.position.set(-px(2.35),px(8.55),px(2.24));torsoRoot.add(goldPatch);const gd=cylinder(.20,.055,M.gold,goldPatch,false);gd.rotation.x=Math.PI/2;const gc=cylinder(.11,.060,M.dark,goldPatch,false);gc.position.z=.015;gc.rotation.x=Math.PI/2;
    const sp=voxelBox(1.75,1.75,.26,M.suitDark,torsoRoot,false);sp.position.set(px(2.40),px(8.30),px(2.20));const sc=voxelBox(.58,.58,.29,M.white,torsoRoot,false);sc.position.set(px(2.40),px(8.30),px(2.37));
    const tag=new THREE.Mesh(new THREE.PlaneGeometry(px(4.35),px(1.95)),new THREE.MeshBasicMaterial({map:nameTagTexture(),side:THREE.DoubleSide,transparent:true}));tag.position.set(0,px(9.75),px(2.36));torsoRoot.add(tag);
    this.buildArm(this.leftShoulder,this.leftForearm,-1);this.buildArm(this.rightShoulder,this.rightForearm,1);this.leftShoulder.position.set(-px(5.5),px(24),0);this.rightShoulder.position.set(px(5.5),px(24),0);this.group.add(this.leftShoulder,this.rightShoulder);
    const us=new THREE.Mesh(new THREE.PlaneGeometry(px(2.55),px(1.55)),new THREE.MeshBasicMaterial({map:usFlagTexture(),side:THREE.DoubleSide}));us.position.set(0,-px(2.35),px(2.08));this.rightShoulder.add(us);const pe=new THREE.Mesh(new THREE.PlaneGeometry(px(2.55),px(1.55)),new THREE.MeshBasicMaterial({map:peruFlagTexture(),side:THREE.DoubleSide}));pe.position.set(0,-px(4.20),px(2.08));this.rightShoulder.add(pe);
    this.headRoot.position.set(0,px(24),0);this.group.add(this.headRoot);this.buildHead();

    // Halo y luces de presentación; siguen a Ruth sin alterar su geometría.
    this.presentationHalo.rotation.x=-Math.PI/2;this.presentationHalo.position.set(0,.018,0);this.group.add(this.presentationHalo);
    this.presentationFill.position.set(.15,2.9,1.0);this.presentationRim.position.set(-.55,2.1,-1.0);this.group.add(this.presentationFill,this.presentationRim);
    this.resetPose();
  }

  resetPose():void{this.leftShoulder.rotation.set(0,0,0);this.rightShoulder.rotation.set(0,0,0);this.leftForearm.rotation.set(0,0,0);this.rightForearm.rotation.set(0,0,0);this.headRoot.rotation.set(0,0,0);this.group.rotation.y=-.08;this.presentationEnergy=0;this.updatePresentationLight(0);}
  updateIdle(dt:number):void{this.idleTime+=dt;this.group.rotation.y=-.08+Math.sin(this.idleTime*.70)*.018;this.headRoot.rotation.y=Math.sin(this.idleTime*.95)*.022;this.presentationEnergy=Math.max(0,this.presentationEnergy-dt*1.35);this.updatePresentationLight(this.idleTime);}

  greeting(elapsed:number):void{
    const up=this.smooth(elapsed/.34),down=this.smooth((elapsed-1.08)/.30),hold=up*(1-down);
    const wave=Math.sin(elapsed*12.5)*.10*hold;
    // Saludo con AMBOS brazos levantados.
    this.rightShoulder.rotation.z=1.58*hold+wave;
    this.leftShoulder.rotation.z=-1.58*hold-wave;
    this.rightShoulder.rotation.x=-.12*hold+Math.sin(elapsed*8)*.025*hold;
    this.leftShoulder.rotation.x=-.12*hold-Math.sin(elapsed*8)*.025*hold;
    this.headRoot.rotation.y=-.04+Math.sin(elapsed*3.2)*.028;
    this.headRoot.rotation.x=-.035*hold;

    // Saltito corto de bienvenida. moveBetween() fija la base en cada frame,
    // así que este offset no se acumula.
    const jump=Math.sin(Math.PI*THREE.MathUtils.clamp((elapsed-.18)/.72,0,1))*.14;
    this.group.position.y+=jump;
    this.presentationHalo.position.y=.018-jump;

    this.presentationEnergy=Math.max(this.presentationEnergy,hold,.55*Math.sin(Math.PI*THREE.MathUtils.clamp(elapsed/1.35,0,1)));
    this.updatePresentationLight(elapsed);
  }

  lookAtMonitor(amount:number):void{const p=this.smooth(amount);this.group.rotation.y=THREE.MathUtils.lerp(-.08,-.42,p);this.headRoot.rotation.y=THREE.MathUtils.lerp(-.03,-.30,p);}
  openTeamPose(amount:number):void{const p=this.smooth(amount);this.group.rotation.y=THREE.MathUtils.lerp(-.16,-.02,p);this.leftShoulder.rotation.z=THREE.MathUtils.lerp(0,-.34,p);this.rightShoulder.rotation.z=THREE.MathUtils.lerp(0,.28,p);this.headRoot.rotation.y=THREE.MathUtils.lerp(-.08,.02,p);}
  lookUp(amount:number):void{const p=this.smooth(amount);this.headRoot.rotation.x=-.17*p;this.headRoot.rotation.y=-.34*p;}
  moveBetween(from:THREE.Vector3,to:THREE.Vector3,amount:number):void{this.group.position.copy(from).lerp(to,this.smooth(amount));}

  private updatePresentationLight(elapsed:number):void{
    const p=THREE.MathUtils.clamp(this.presentationEnergy,0,1),breath=.86+.14*Math.sin(elapsed*4.1);
    this.presentationHaloMat.opacity=.20*p*breath;
    this.presentationHalo.scale.setScalar(.94+.08*Math.sin(elapsed*2.4));
    this.presentationFill.intensity=2.15*p*breath;
    this.presentationRim.intensity=1.15*p;
  }

  private createLeg(side:-1|1):void{const root=new THREE.Group();root.position.set(side*px(2),0,0);this.group.add(root);const leg=voxelBox(4,12,4,M.suit,root);leg.position.y=px(6);const bootUpper=voxelBox(4.15,3.8,4.45,M.white,root);bootUpper.position.set(0,px(2),px(.22));const bootToe=voxelBox(4.2,2,1.15,M.suitDark,root,false);bootToe.position.set(0,px(2.3),px(2.35));const sole=voxelBox(4.3,.75,4.6,M.dark,root);sole.position.set(0,px(.38),px(.20));const yellowToe=voxelBox(4,.55,.75,M.yellow,root,false);yellowToe.position.set(0,px(.72),px(2.55));const cyanBand=voxelBox(4.10,.75,4.10,M.cyan,root,false);cyanBand.position.y=px(4.75);const knee=voxelBox(3.25,2.25,.52,M.dark,root,false);knee.position.set(0,px(7.2),px(2.24));const light=voxelBox(1.25,.42,.28,M.cyan,root,false);light.position.set(0,px(7.75),px(2.53));const pocket=voxelBox(2.7,2.6,.55,M.suitDark,root,false);pocket.position.set(side*px(1.15),px(9.35),px(2.15));const tool=voxelBox(.65,1.65,.30,M.yellow,root,false);tool.position.set(side*px(1.15),px(9),px(2.48));}
  private buildArm(shoulder:THREE.Group,forearm:THREE.Group,side:-1|1):void{const arm=voxelBox(3,12,4,M.suit,shoulder);arm.position.y=-px(6);const pad=voxelBox(3.15,2,4.15,M.suitLight,shoulder,false);pad.position.y=-px(1);const wrist=voxelBox(3.10,.75,4.08,M.cyan,shoulder,false);wrist.position.y=-px(8.65);const glove=voxelBox(3.20,3,4.18,M.dark,shoulder);glove.position.y=-px(10.5);const gl=voxelBox(1.45,.45,.28,M.cyan,shoulder,false);gl.position.set(0,-px(10.1),px(2.22));forearm.position.set(0,-px(7),0);shoulder.add(forearm);forearm.visible=false;shoulder.rotation.z=side*0;}

  private buildHead():void{
    const head=new THREE.Mesh(new RoundedBoxGeometry(1.48,1.58,1.38,1,.075),M.skinLight);head.position.set(0,.82,0);head.castShadow=true;head.receiveShadow=true;this.headRoot.add(head);for(const side of [-1,1]){const ear=rbox(.13,.26,.12,.025,M.skin,this.headRoot,false);ear.position.set(side*.77,.78,0);}
    const hairGray=mat(0x8f8a91,.90,.01),hairGrayLight=mat(0xb4afb5,.88,.01);const topMain=rbox(1.52,.26,1.38,.020,M.hair,this.headRoot);topMain.position.set(.02,1.53,0);const top2=rbox(1.28,.20,1.18,.018,M.hair2,this.headRoot);top2.position.set(-.07,1.67,.03);const top3=rbox(.92,.16,.86,.015,hairGray,this.headRoot);top3.position.set(-.16,1.79,.05);const back=rbox(1.40,1.06,.30,.018,M.hair,this.headRoot);back.position.set(0,1.03,-.62);const back2=rbox(1.22,.34,.36,.016,M.hair2,this.headRoot);back2.position.set(-.03,1.48,-.50);const sl=rbox(.28,1.08,1.20,.018,M.hair,this.headRoot);sl.position.set(-.69,1.02,0);const sr=rbox(.24,.96,1.15,.018,M.hair,this.headRoot);sr.position.set(.69,1.08,-.02);const sfl=rbox(.18,.64,.26,.015,M.hair2,this.headRoot);sfl.position.set(-.69,.90,.52);const sfr=rbox(.16,.56,.25,.015,M.hair2,this.headRoot);sfr.position.set(.69,.97,.49);
    const fringe:Array<[number,number,number,number,number,number,THREE.Material,number]>=[[-.48,1.36,.60,.28,.54,.18,M.hair2,-.06],[-.28,1.43,.64,.24,.46,.18,hairGray,-.10],[-.10,1.49,.66,.22,.40,.18,M.hair,-.02],[.08,1.50,.66,.20,.36,.18,hairGrayLight,.04],[.26,1.47,.64,.19,.34,.18,M.hair,.08],[.43,1.40,.60,.18,.42,.18,M.hair2,.12]];fringe.forEach(([x,y,z,w,h,d,material,rz])=>{const f=rbox(w,h,d,.015,material,this.headRoot);f.position.set(x,y,z);f.rotation.set(.02,0,rz);});
    const tufts:Array<[number,number,number,number,number,number,THREE.Material,number]>=[[-.38,1.63,.18,.42,.20,.56,hairGray,-.09],[-.08,1.69,.23,.46,.18,.54,M.hair,-.03],[.24,1.66,.19,.40,.18,.52,M.hair2,.07]];tufts.forEach(([x,y,z,w,h,d,material,rz])=>{const t=rbox(w,h,d,.015,material,this.headRoot);t.position.set(x,y,z);t.rotation.z=rz;});
    const strands=[[-.33,1.51,.52,.09,.34,.16,-.08],[-.12,1.57,.57,.08,.30,.16,-.04],[.12,1.57,.57,.08,.28,.16,.02],[.30,1.51,.52,.08,.26,.16,.07]] as const;strands.forEach(([x,y,z,w,h,d,rz],i)=>{const s=rbox(w,h,d,.012,i%2===0?hairGrayLight:hairGray,this.headRoot,false);s.position.set(x,y,z);s.rotation.z=rz;});
    this.createEye(-1);this.createEye(1);this.createGlasses(-.292,.835,.800);this.createGlasses(.292,.835,.800);
    const lensMat=new THREE.MeshPhysicalMaterial({color:0xe8f3ff,roughness:.03,metalness:0,transmission:.97,transparent:true,opacity:.065,thickness:.012,clearcoat:.65,clearcoatRoughness:.04,side:THREE.DoubleSide});const lensGeo=new RoundedBoxGeometry(.565,.365,.010,2,.075);for(const side of [-1,1]){const lens=new THREE.Mesh(lensGeo,lensMat);lens.position.set(side*.292,.835,.794);lens.renderOrder=3;this.headRoot.add(lens);const refl=rbox(.020,.095,.006,.003,M.white,this.headRoot,false);refl.position.set(side*.420,.900,.808);refl.rotation.z=-.16;}
    const bridge=rbox(.105,.014,.014,.004,M.glasses,this.headRoot,false);bridge.position.set(0,.842,.805);for(const side of [-1,1]){const curve=new THREE.LineCurve3(new THREE.Vector3(side*.585,.845,.790),new THREE.Vector3(side*.770,.820,.520));this.headRoot.add(new THREE.Mesh(new THREE.TubeGeometry(curve,5,.0042,4,false),M.glasses));}
    const nose=rbox(.085,.075,.040,.015,M.skin,this.headRoot,false);nose.position.set(0,.640,.748);const mouthDark=mat(0x5b2b2f,.72,0);const mouth=new THREE.Mesh(new THREE.CircleGeometry(.155,18),mouthDark);mouth.position.set(0,.487,.750);mouth.scale.set(1.52,.68,1);this.headRoot.add(mouth);const teeth=rbox(.330,.078,.028,.022,M.white,this.headRoot,false);teeth.position.set(0,.535,.769);const lip=new THREE.Mesh(new THREE.CircleGeometry(.066,12),mat(0xc66f73,.78,0));lip.position.set(0,.428,.770);lip.scale.set(1.35,.36,1);this.headRoot.add(lip);const smile=new THREE.QuadraticBezierCurve3(new THREE.Vector3(-.225,.535,.773),new THREE.Vector3(0,.455,.782),new THREE.Vector3(.225,.535,.773));this.headRoot.add(new THREE.Mesh(new THREE.TubeGeometry(smile,18,.008,5,false),mouthDark));for(const side of [-1,1]){const corner=rbox(.060,.025,.022,.008,mouthDark,this.headRoot,false);corner.position.set(side*.225,.540,.774);corner.rotation.z=-side*.32;}
    const blush=new THREE.MeshStandardMaterial({color:0xdf9a88,roughness:.84,transparent:true,opacity:.52,flatShading:true});for(const side of [-1,1]){const cheek=rbox(.145,.050,.018,.018,blush,this.headRoot,false);cheek.position.set(side*.455,.615,.744);const e=voxelBox(.42,.42,.42,M.white,this.headRoot,false);e.position.set(side*.815,.635,.045);}
  }

  private createEye(side:-1|1):void{const ew=rbox(.455,.265,.040,.032,M.white,this.headRoot,false);ew.position.set(side*.292,.835,.750);const iris=rbox(.185,.180,.044,.024,mat(0x5a321f,.52,0),this.headRoot,false);iris.position.set(side*.292,.830,.770);const pupil=rbox(.110,.108,.046,.014,mat(0x121113,.58,0),this.headRoot,false);pupil.position.set(side*.292,.827,.783);const a=rbox(.036,.036,.048,.008,M.white,this.headRoot,false);a.position.set(side*.252,.867,.794);const b=rbox(.018,.026,.048,.005,M.white,this.headRoot,false);b.position.set(side*.330,.810,.794);const lid=rbox(.300,.022,.020,.006,M.skin,this.headRoot,false);lid.position.set(side*.292,.720,.776);const brow=rbox(.340,.042,.034,.010,M.hair,this.headRoot,false);brow.position.set(side*.292,1.035,.750);}
  private createGlasses(cx:number,cy:number,cz:number):void{const width=.610,height=.405,r=.085,hw=width/2,hh=height/2,pts:THREE.Vector3[]=[];pts.push(new THREE.Vector3(-hw+r,hh,0),new THREE.Vector3(hw-r,hh,0));for(let i=0;i<=5;i++){const a=Math.PI/2-(Math.PI/2)*(i/5);pts.push(new THREE.Vector3(hw-r+Math.cos(a)*r,hh-r+Math.sin(a)*r,0));}pts.push(new THREE.Vector3(hw,-hh+r,0));for(let i=0;i<=5;i++){const a=-(Math.PI/2)*(i/5);pts.push(new THREE.Vector3(hw-r+Math.cos(a)*r,-hh+r+Math.sin(a)*r,0));}pts.push(new THREE.Vector3(-hw+r,-hh,0));for(let i=0;i<=5;i++){const a=-Math.PI/2-(Math.PI/2)*(i/5);pts.push(new THREE.Vector3(-hw+r+Math.cos(a)*r,-hh+r+Math.sin(a)*r,0));}pts.push(new THREE.Vector3(-hw,hh-r,0));for(let i=0;i<=5;i++){const a=Math.PI-(Math.PI/2)*(i/5);pts.push(new THREE.Vector3(-hw+r+Math.cos(a)*r,hh-r+Math.sin(a)*r,0));}const curve=new THREE.CatmullRomCurve3(pts,true,'centripetal',.15);const frame=new THREE.Mesh(new THREE.TubeGeometry(curve,72,.0052,5,true),M.glasses);frame.position.set(cx,cy,cz);this.headRoot.add(frame);}
  private smooth(value:number):number{const p=THREE.MathUtils.clamp(value,0,1);return p*p*(3-2*p);}
}
