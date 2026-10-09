import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const U = 0.23;
const px = (n:number):number => n*U;

function mat(color:number,roughness=.82,metalness=.05):THREE.MeshStandardMaterial{
  return new THREE.MeshStandardMaterial({color,roughness,metalness,flatShading:true});
}

// Interpretación artística voxel inspirada en retratos históricos de la astrónoma peruana.
const M={
  white:mat(0xf4eadc,.83,.01),white2:mat(0xded4c7,.85,.01),
  jacket:mat(0x243c68,.83,.02),jacketDark:mat(0x172d51,.87,.02),lapel:mat(0x385880,.84,.02),
  blouse:mat(0xffe6ad,.84,.01),trousers:mat(0x232b42,.89,.01),
  skin:mat(0xac785e,.85,0),skinLight:mat(0xc99175,.84,0),
  hair:mat(0x322a2a,.91,.01),hair2:mat(0x625653,.92,.01),
  glasses:new THREE.MeshStandardMaterial({color:0x4c4140,roughness:.35,metalness:.30,flatShading:true}),
  dark:mat(0x242538,.91,.01),yellow:mat(0xf2d182,.79,.03),gold:mat(0xd4ad62,.55,.22),
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
  const c=document.createElement('canvas');c.width=512;c.height=240;
  const ctx=c.getContext('2d');if(!ctx)throw new Error('maria_luisa_name_tag_context_missing');
  ctx.fillStyle='#1e345a';ctx.fillRect(0,0,c.width,c.height);
  ctx.lineWidth=7;ctx.strokeStyle='#c6a66c';ctx.strokeRect(8,8,c.width-16,c.height-16);
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='#fff5e1';ctx.font='700 59px Arial';ctx.fillText('MARÍA LUISA',c.width/2,90);
  ctx.fillStyle='#f2d182';ctx.font='700 36px Arial';ctx.fillText('ASTRONOMÍA',c.width/2,172);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  t.minFilter=THREE.LinearFilter;t.magFilter=THREE.LinearFilter;return t;
}

export class MariaLuisaAguilar{
  readonly group=new THREE.Group();readonly headRoot=new THREE.Group();readonly rightShoulder=new THREE.Group();readonly leftShoulder=new THREE.Group();
  private readonly rightForearm=new THREE.Group();private readonly leftForearm=new THREE.Group();private idleTime=0;
  private presentationEnergy=0;
  private readonly presentationHaloMat=new THREE.MeshBasicMaterial({color:0x8e7dce,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
  private readonly presentationHalo=new THREE.Mesh(new THREE.RingGeometry(.32,1.35,36),this.presentationHaloMat);
  private readonly presentationFill=new THREE.PointLight(0x9284d2,0,5.5,2);
  private readonly presentationRim=new THREE.PointLight(0x49c9d7,0,4.5,2);

  constructor(){
    this.group.name='Homenaje digital a María Luisa Aguilar Hurtado';this.group.position.set(5.85,.02,.45);this.group.rotation.set(0,-.08,0);
    this.createLeg(-1);this.createLeg(1);
    const torsoRoot=new THREE.Group();torsoRoot.position.set(0,px(12),0);this.group.add(torsoRoot);
    const torso=voxelBox(8,12,4,M.jacket,torsoRoot);torso.position.y=px(6);
    const blouse=voxelBox(3.9,9,.34,M.blouse,torsoRoot,false);blouse.position.set(0,px(6.85),px(2.16));
    const waist=voxelBox(8.20,.7,4.12,M.jacketDark,torsoRoot);waist.position.y=px(.45);
    // Solapas académicas y botones: sin traje espacial ni parches tecnológicos.
    for(const side of [-1,1]){
      const lapel=voxelBox(2.1,7,.42,M.lapel,torsoRoot,false);
      lapel.position.set(side*px(2.30),px(8.15),px(2.24));lapel.rotation.z=-side*.17;
      const button=cylinder(px(.17),px(.10),M.gold,torsoRoot,false);
      button.rotation.x=Math.PI/2;button.position.set(side*px(1.75),px(4.4),px(2.40));
    }
    // Un único broche de órbita representa su dedicación a la astronomía.
    const orbit=new THREE.Mesh(new THREE.TorusGeometry(px(.58),px(.065),6,28),M.gold);
    orbit.position.set(-px(2.55),px(9.10),px(2.50));orbit.rotation.z=.36;torsoRoot.add(orbit);
    const star=new THREE.Mesh(new THREE.OctahedronGeometry(px(.24)),M.yellow);
    star.position.set(-px(2.55),px(9.10),px(2.54));torsoRoot.add(star);
    const tag=new THREE.Mesh(new THREE.PlaneGeometry(px(4.65),px(1.87)),
      new THREE.MeshBasicMaterial({map:nameTagTexture(),side:THREE.DoubleSide,transparent:true}));
    tag.position.set(0,px(2.55),px(2.26));torsoRoot.add(tag);

    this.buildArm(this.leftShoulder,this.leftForearm,-1);this.buildArm(this.rightShoulder,this.rightForearm,1);this.leftShoulder.position.set(-px(5.5),px(24),0);this.rightShoulder.position.set(px(5.5),px(24),0);this.group.add(this.leftShoulder,this.rightShoulder);
    // Sin insignias de EE. UU. ni atributos de ingeniería mecánica.

    this.headRoot.position.set(0,px(24),0);this.group.add(this.headRoot);this.buildHead();

    // Halo y luces suaves del homenaje digital; preservan la coreografía.
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

  private createLeg(side:-1|1):void{
    const root=new THREE.Group();root.position.set(side*px(2),0,0);this.group.add(root);
    const leg=voxelBox(4,11.9,4,M.trousers,root);leg.position.y=px(6);
    const hem=voxelBox(4.08,.75,4.08,M.jacketDark,root);hem.position.y=px(1.0);
    const shoe=voxelBox(4.2,1.65,5,M.dark,root);shoe.position.set(0,px(.78),px(.32));
    const toe=voxelBox(4.1,.65,1.1,M.dark,root,false);toe.position.set(0,px(.66),px(2.85));
  }

  private buildArm(shoulder:THREE.Group,forearm:THREE.Group,side:-1|1):void{
    const sleeve=voxelBox(3.1,10,4,M.jacket,shoulder);sleeve.position.y=-px(5);
    const cuff=voxelBox(3.16,.9,4.05,M.white,shoulder,false);cuff.position.y=-px(9.4);
    const hand=voxelBox(3.08,2.7,3.7,M.skinLight,shoulder);hand.position.y=-px(11.1);
    forearm.position.set(0,-px(7),0);shoulder.add(forearm);forearm.visible=false;
    shoulder.rotation.z=side*0;
  }

  private buildHead():void{
    const head=new THREE.Mesh(new RoundedBoxGeometry(1.48,1.58,1.38,1,.075),M.skinLight);head.position.set(0,.82,0);head.castShadow=true;head.receiveShadow=true;this.headRoot.add(head);for(const side of [-1,1]){const ear=rbox(.13,.26,.12,.025,M.skin,this.headRoot,false);ear.position.set(side*.77,.78,0);}
    // Melena corta, con raya lateral y discretas hebras grises, basada en retratos históricos.
    const silver=mat(0x9b9590,.92,.01),silverLight=mat(0xbbb1aa,.91,.01);
    const crown=rbox(1.55,.37,1.42,.035,M.hair,this.headRoot);
    crown.position.set(0,1.55,-.05);
    const swept=rbox(1.06,.20,1.10,.035,M.hair2,this.headRoot);
    swept.position.set(-.16,1.73,.05);swept.rotation.z=-.10;
    const back=rbox(1.42,.84,.31,.04,M.hair,this.headRoot);
    back.position.set(0,1.16,-.62);
    for(const side of [-1,1]){
      const sideHair=rbox(.27,.65,.90,.03,M.hair,this.headRoot);
      sideHair.position.set(side*.69,1.20,-.14);
      const grayLock=rbox(.09,.36,.18,.014,side<0?silver:silverLight,this.headRoot,false);
      grayLock.position.set(side*.64,1.24,.47);
    }
    const fringe=rbox(.96,.17,.40,.022,M.hair2,this.headRoot);
    fringe.position.set(-.23,1.56,.55);fringe.rotation.z=-.16;
    const part=rbox(.16,.13,.42,.016,silver,this.headRoot,false);
    part.position.set(.28,1.66,.38);

    this.createEye(-1);this.createEye(1);this.createGlasses(-.292,.835,.800);this.createGlasses(.292,.835,.800);
    const lensMat=new THREE.MeshPhysicalMaterial({color:0xe8f3ff,roughness:.03,metalness:0,transmission:.97,transparent:true,opacity:.065,thickness:.012,clearcoat:.65,clearcoatRoughness:.04,side:THREE.DoubleSide});const lensGeo=new RoundedBoxGeometry(.565,.365,.010,2,.075);for(const side of [-1,1]){const lens=new THREE.Mesh(lensGeo,lensMat);lens.position.set(side*.292,.835,.794);lens.renderOrder=3;this.headRoot.add(lens);const refl=rbox(.020,.095,.006,.003,M.white,this.headRoot,false);refl.position.set(side*.420,.900,.808);refl.rotation.z=-.16;}
    const bridge=rbox(.105,.014,.014,.004,M.glasses,this.headRoot,false);bridge.position.set(0,.842,.805);for(const side of [-1,1]){const curve=new THREE.LineCurve3(new THREE.Vector3(side*.585,.845,.790),new THREE.Vector3(side*.770,.820,.520));this.headRoot.add(new THREE.Mesh(new THREE.TubeGeometry(curve,5,.0042,4,false),M.glasses));}
    const nose=rbox(.085,.075,.040,.015,M.skin,this.headRoot,false);nose.position.set(0,.640,.748);const mouthDark=mat(0x824b4e,.84,0);const smile=new THREE.QuadraticBezierCurve3(new THREE.Vector3(-.16,.51,.773),new THREE.Vector3(0,.475,.781),new THREE.Vector3(.16,.51,.773));this.headRoot.add(new THREE.Mesh(new THREE.TubeGeometry(smile,18,.008,5,false),mouthDark));
    const blush=new THREE.MeshStandardMaterial({color:0xc88d81,roughness:.89,transparent:true,opacity:.23,flatShading:true});for(const side of [-1,1]){const cheek=rbox(.145,.050,.018,.018,blush,this.headRoot,false);cheek.position.set(side*.455,.615,.744);const e=voxelBox(.42,.42,.42,M.white,this.headRoot,false);e.position.set(side*.815,.635,.045);}
  }

  private createEye(side:-1|1):void{const ew=rbox(.455,.265,.040,.032,M.white,this.headRoot,false);ew.position.set(side*.292,.835,.750);const iris=rbox(.185,.180,.044,.024,mat(0x5a321f,.52,0),this.headRoot,false);iris.position.set(side*.292,.830,.770);const pupil=rbox(.110,.108,.046,.014,mat(0x121113,.58,0),this.headRoot,false);pupil.position.set(side*.292,.827,.783);const a=rbox(.036,.036,.048,.008,M.white,this.headRoot,false);a.position.set(side*.252,.867,.794);const b=rbox(.018,.026,.048,.005,M.white,this.headRoot,false);b.position.set(side*.330,.810,.794);const lid=rbox(.300,.022,.020,.006,M.skin,this.headRoot,false);lid.position.set(side*.292,.720,.776);const brow=rbox(.340,.042,.034,.010,M.hair,this.headRoot,false);brow.position.set(side*.292,1.035,.750);}
  private createGlasses(cx:number,cy:number,cz:number):void{const width=.660,height=.425,r=.105,hw=width/2,hh=height/2,pts:THREE.Vector3[]=[];pts.push(new THREE.Vector3(-hw+r,hh,0),new THREE.Vector3(hw-r,hh,0));for(let i=0;i<=5;i++){const a=Math.PI/2-(Math.PI/2)*(i/5);pts.push(new THREE.Vector3(hw-r+Math.cos(a)*r,hh-r+Math.sin(a)*r,0));}pts.push(new THREE.Vector3(hw,-hh+r,0));for(let i=0;i<=5;i++){const a=-(Math.PI/2)*(i/5);pts.push(new THREE.Vector3(hw-r+Math.cos(a)*r,-hh+r+Math.sin(a)*r,0));}pts.push(new THREE.Vector3(-hw+r,-hh,0));for(let i=0;i<=5;i++){const a=-Math.PI/2-(Math.PI/2)*(i/5);pts.push(new THREE.Vector3(-hw+r+Math.cos(a)*r,-hh+r+Math.sin(a)*r,0));}pts.push(new THREE.Vector3(-hw,hh-r,0));for(let i=0;i<=5;i++){const a=Math.PI-(Math.PI/2)*(i/5);pts.push(new THREE.Vector3(-hw+r+Math.cos(a)*r,hh-r+Math.sin(a)*r,0));}const curve=new THREE.CatmullRomCurve3(pts,true,'centripetal',.15);const frame=new THREE.Mesh(new THREE.TubeGeometry(curve,72,.0052,5,true),M.glasses);frame.position.set(cx,cy,cz);this.headRoot.add(frame);}
  private smooth(value:number):number{const p=THREE.MathUtils.clamp(value,0,1);return p*p*(3-2*p);}
}
