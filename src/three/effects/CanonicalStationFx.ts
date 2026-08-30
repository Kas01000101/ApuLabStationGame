import * as THREE from 'three';

export class CanonicalStationFx {
  readonly group = new THREE.Group();
  readonly monitorPulse: THREE.Mesh;
  readonly ayniPeek = new THREE.Group();
  readonly stemVisuals = new THREE.Group();

  private readonly monitorCanvas = document.createElement('canvas');
  private readonly monitorTexture: THREE.CanvasTexture;
  private readonly stemMaterials: THREE.MeshBasicMaterial[] = [];
  private readonly monitorPulseMat = new THREE.MeshBasicMaterial({ color:0xbff8ff, transparent:true, opacity:0, depthWrite:false });
  private readonly peekMaterial = new THREE.MeshStandardMaterial({ color:0x39cfe5, emissive:0x16889b, emissiveIntensity:2, roughness:.42, metalness:.08, flatShading:true });

  private readonly ruthHaloMat = new THREE.MeshBasicMaterial({ color:0x8e7dce, transparent:true, opacity:0, depthWrite:false, side:THREE.DoubleSide });
  private readonly ayniHaloMat = new THREE.MeshBasicMaterial({ color:0x49c9d7, transparent:true, opacity:0, depthWrite:false, side:THREE.DoubleSide });
  private readonly ruthHalo: THREE.Mesh;
  private readonly ayniHalo: THREE.Mesh;
  private readonly ruthFill = new THREE.PointLight(0x9284d2,0,6.5,2);
  private readonly ruthRim = new THREE.PointLight(0x49c9d7,0,5.0,2);
  private readonly ayniFill = new THREE.PointLight(0x49c9d7,0,6.0,2);
  private readonly ayniWarm = new THREE.PointLight(0xf4c75e,0,4.5,2);

  constructor(parent: THREE.Object3D) {
    this.group.name='CanonicalStationFx';

    // La primera migración creó otra iluminación global. Neutralizamos SOLO
    // hemisphere/directional generales y recuperamos la iluminación V38.
    parent.traverse((object)=>{
      if(object instanceof THREE.HemisphereLight || object instanceof THREE.DirectionalLight) object.intensity=0;
    });
    const hemi=new THREE.HemisphereLight(0xd8d9e3,0x211d31,1.05);
    const key=new THREE.DirectionalLight(0xd8d9e3,2.75);key.position.set(-7,11,8);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-14;key.shadow.camera.right=14;key.shadow.camera.top=13;key.shadow.camera.bottom=-13;
    const fill=new THREE.DirectionalLight(0x7565c7,1.28);fill.position.set(8,6,-7);
    this.group.add(hemi,key,fill);
    parent.add(this.group);

    // Zonas de presentación: no iluminan todo el laboratorio, solo el lugar
    // donde Ruth/Ayni están hablando, como un pequeño escenario técnico.
    this.ruthHalo=new THREE.Mesh(new THREE.RingGeometry(.30,1.55,40),this.ruthHaloMat);
    this.ruthHalo.rotation.x=-Math.PI/2;this.ruthHalo.position.y=.025;this.group.add(this.ruthHalo);
    this.ruthFill.position.set(0,2.7,1.2);this.ruthRim.position.set(0,1.8,-1.25);this.group.add(this.ruthFill,this.ruthRim);

    this.ayniHalo=new THREE.Mesh(new THREE.RingGeometry(.38,1.85,40),this.ayniHaloMat);
    this.ayniHalo.rotation.x=-Math.PI/2;this.ayniHalo.position.y=.028;this.group.add(this.ayniHalo);
    this.ayniFill.position.set(0,2.5,1.1);this.ayniWarm.position.set(0,1.15,-1.05);this.group.add(this.ayniFill,this.ayniWarm);

    this.monitorCanvas.width=1024;this.monitorCanvas.height=560;this.monitorTexture=new THREE.CanvasTexture(this.monitorCanvas);this.monitorTexture.colorSpace=THREE.SRGBColorSpace;this.monitorTexture.minFilter=THREE.LinearFilter;this.monitorTexture.magFilter=THREE.LinearFilter;
    const shell=new THREE.Mesh(new THREE.BoxGeometry(5.05,3.15,.25),new THREE.MeshStandardMaterial({color:0x5b566f,roughness:.72,metalness:.18,flatShading:true}));shell.position.set(3.10,4.45,-10.48);this.group.add(shell);
    const screen=new THREE.Mesh(new THREE.PlaneGeometry(4.65,2.72),new THREE.MeshBasicMaterial({map:this.monitorTexture}));screen.position.set(3.10,4.45,-10.33);this.group.add(screen);
    this.monitorPulse=new THREE.Mesh(new THREE.SphereGeometry(.17,10,8),this.monitorPulseMat);this.monitorPulse.visible=false;this.monitorPulse.position.set(3.10,4.45,-10.12);this.group.add(this.monitorPulse);

    this.ayniPeek.visible=false;for(const x of[-.34,.34]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.105,10,8),this.peekMaterial);eye.position.set(x,0,0);this.ayniPeek.add(eye);}this.ayniPeek.position.set(0,8.78,.34);this.group.add(this.ayniPeek);

    const symbols=['{}','⚙','✦','◌','◇'];symbols.forEach((symbol,index)=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');if(!ctx)return;ctx.fillStyle='#45405B';ctx.fillRect(0,0,128,128);ctx.strokeStyle=index%2?'#7565C7':'#39CFE5';ctx.lineWidth=5;ctx.strokeRect(7,7,114,114);ctx.fillStyle='#D8D9E3';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 48px Arial';ctx.fillText(symbol,64,67);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:0});this.stemMaterials.push(material);const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.75,.75),material);mesh.position.set(-7.7+index*1.05,6.35,-10.30);this.stemVisuals.add(mesh);});this.group.add(this.stemVisuals);
    this.drawMonitor('APULAB STATION',['BAHÍA DE SISTEMAS ROBÓTICOS','SISTEMA EN ESPERA']);
  }

  applySceneEnvironment(scene:THREE.Scene):void{scene.background=new THREE.Color(0x3a354d);scene.fog=new THREE.Fog(0x3a354d,21,39);}

  reset():void{
    this.setMonitorPulse(0,.45);this.setAyniPeek(false);this.setStemOpacity(0);
    this.setRuthPresentation(0,new THREE.Vector3());
    this.setAyniCelebration(0,new THREE.Vector3());
    this.drawMonitor('APULAB STATION',['BAHÍA DE SISTEMAS ROBÓTICOS','SISTEMA EN ESPERA']);
  }

  drawMonitor(title:string,rows:string[]=[],mode:'cyan'|'amber'='cyan'):void{const ctx=this.monitorCanvas.getContext('2d');if(!ctx)return;ctx.clearRect(0,0,1024,560);ctx.fillStyle='#211D31';ctx.fillRect(0,0,1024,560);ctx.strokeStyle=mode==='amber'?'#EFA73A':'#39CFE5';ctx.lineWidth=8;ctx.strokeRect(24,24,976,512);ctx.fillStyle='#D8D9E3';ctx.font='700 48px Poppins, Arial';ctx.fillText(title,64,92);ctx.font='600 34px Poppins, Arial';let y=178;rows.forEach((row)=>{ctx.fillStyle=row.includes('DETENIDO')?'#EFA73A':'#BFC7D8';ctx.fillText(row,66,y);y+=72;});this.monitorTexture.needsUpdate=true;}
  setMonitorPulse(amount:number,scale=.45):void{const p=THREE.MathUtils.clamp(amount,0,1);this.monitorPulse.visible=p>.01;this.monitorPulseMat.opacity=p*.95;this.monitorPulse.scale.setScalar(scale);}
  setAyniPeek(visible:boolean,bob=0):void{this.ayniPeek.visible=visible;if(visible)this.ayniPeek.position.y=8.78+Math.sin(bob*5.5)*.035;}
  setStemOpacity(amount:number,elapsed=0):void{const p=THREE.MathUtils.clamp(amount,0,1);this.stemMaterials.forEach((material,index)=>{material.opacity=p>0?Math.max(0,p+.05*Math.sin(elapsed*2+index)):0;});}

  setRuthPresentation(amount:number,position:THREE.Vector3,elapsed=0):void{
    const p=THREE.MathUtils.clamp(amount,0,1);
    const breath=.88+.12*Math.sin(elapsed*3.2);
    this.ruthHalo.position.set(position.x,.028,position.z);
    this.ruthHaloMat.opacity=.22*p*breath;
    this.ruthHalo.scale.setScalar(.92+.08*Math.sin(elapsed*2.1));
    this.ruthFill.position.set(position.x,2.8,position.z+1.1);
    this.ruthRim.position.set(position.x-.45,2.0,position.z-1.15);
    this.ruthFill.intensity=2.2*p*breath;
    this.ruthRim.intensity=1.25*p;
  }

  setAyniCelebration(amount:number,position:THREE.Vector3,elapsed=0):void{
    const p=THREE.MathUtils.clamp(amount,0,1);
    const pulse=.72+.28*Math.sin(elapsed*7.4);
    this.ayniHalo.position.set(position.x,.03,position.z);
    this.ayniHaloMat.opacity=.24*p*pulse;
    this.ayniHalo.scale.setScalar(.92+.10*Math.sin(elapsed*5.2));
    this.ayniFill.position.set(position.x,2.7,position.z+1.05);
    this.ayniWarm.position.set(position.x,1.25,position.z-1.0);
    this.ayniFill.intensity=2.35*p*pulse;
    this.ayniWarm.intensity=.85*p;
  }
}
