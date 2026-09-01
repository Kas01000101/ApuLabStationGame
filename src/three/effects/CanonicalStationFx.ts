import * as THREE from 'three';

export class CanonicalStationFx {
  readonly group = new THREE.Group();
  readonly monitorPulse: THREE.Mesh;
  readonly ayniPeek = new THREE.Group();
  readonly stemVisuals = new THREE.Group();

  private readonly monitorCanvas = document.createElement('canvas');
  private readonly monitorTexture: THREE.CanvasTexture;
  private readonly leftMonitorCanvas = document.createElement('canvas');
  private readonly leftMonitorTexture: THREE.CanvasTexture;
  private readonly rightMonitorCanvas = document.createElement('canvas');
  private readonly rightMonitorTexture: THREE.CanvasTexture;
  private readonly brandCanvas = document.createElement('canvas');
  private readonly brandTexture = new THREE.CanvasTexture(this.brandCanvas);

  private readonly stemMaterials: THREE.MeshBasicMaterial[] = [];
  private readonly ambientStripMaterials: THREE.MeshStandardMaterial[] = [];
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

  private readonly wallWashLeft = new THREE.PointLight(0x49c9d7,.82,13,2);
  private readonly wallWashRight = new THREE.PointLight(0x9284d2,.88,13,2);
  private readonly monitorGlowMain = new THREE.PointLight(0x49c9d7,.62,8,2);
  private readonly monitorGlowLeft = new THREE.PointLight(0x49c9d7,.48,7,2);
  private readonly monitorGlowRight = new THREE.PointLight(0x9284d2,.46,7,2);

  private lastMonitorTitle = 'APULAB STATION';
  private lastMonitorRows: string[] = ['BAHÍA DE SISTEMAS ROBÓTICOS','SISTEMA EN ESPERA'];
  private lastMonitorMode: 'cyan'|'amber' = 'cyan';
  private lastAmbientDraw = -1;

  constructor(parent: THREE.Object3D) {
    this.group.name='CanonicalStationFx';

    // La intro usa su propia iluminación global para no modificar ningún nivel.
    parent.traverse((object)=>{
      if(object instanceof THREE.HemisphereLight || object instanceof THREE.DirectionalLight) object.intensity=0;
    });

    // Iluminación base más clara: el laboratorio debe leerse completo, no solo
    // los personajes. Conservamos sombras y usamos cyan/lavanda como acentos.
    const hemi=new THREE.HemisphereLight(0xf0f5ff,0x211d31,1.62);
    const key=new THREE.DirectionalLight(0xf4f7ff,3.25);
    key.position.set(-7,11,8);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-14;key.shadow.camera.right=14;key.shadow.camera.top=13;key.shadow.camera.bottom=-13;
    const fill=new THREE.DirectionalLight(0x9284d2,1.58);fill.position.set(8,7,-5);
    const front=new THREE.DirectionalLight(0xffffff,.92);front.position.set(0,7,12);
    this.group.add(hemi,key,fill,front);

    this.wallWashLeft.position.set(-8.4,5.3,-8.5);
    this.wallWashRight.position.set(8.4,5.1,-8.2);
    this.monitorGlowMain.position.set(3.1,4.5,-8.8);
    this.monitorGlowLeft.position.set(-7.5,4.6,-8.9);
    this.monitorGlowRight.position.set(8.1,4.6,-8.9);
    this.group.add(this.wallWashLeft,this.wallWashRight,this.monitorGlowMain,this.monitorGlowLeft,this.monitorGlowRight);

    this.buildWallArchitecture();
    this.buildBranding();

    // Zonas de presentación: siguen destacando a Ruth/Ayni, pero ahora sobre
    // un laboratorio visible y no sobre un fondo casi negro.
    this.ruthHalo=new THREE.Mesh(new THREE.RingGeometry(.30,1.55,40),this.ruthHaloMat);
    this.ruthHalo.rotation.x=-Math.PI/2;this.ruthHalo.position.y=.025;this.group.add(this.ruthHalo);
    this.ruthFill.position.set(0,2.7,1.2);this.ruthRim.position.set(0,1.8,-1.25);this.group.add(this.ruthFill,this.ruthRim);

    this.ayniHalo=new THREE.Mesh(new THREE.RingGeometry(.38,1.85,40),this.ayniHaloMat);
    this.ayniHalo.rotation.x=-Math.PI/2;this.ayniHalo.position.y=.028;this.group.add(this.ayniHalo);
    this.ayniFill.position.set(0,2.5,1.1);this.ayniWarm.position.set(0,1.15,-1.05);this.group.add(this.ayniFill,this.ayniWarm);

    // Monitor narrativo principal.
    this.monitorCanvas.width=1024;this.monitorCanvas.height=560;
    this.monitorTexture=new THREE.CanvasTexture(this.monitorCanvas);
    this.monitorTexture.colorSpace=THREE.SRGBColorSpace;this.monitorTexture.minFilter=THREE.LinearFilter;this.monitorTexture.magFilter=THREE.LinearFilter;
    const shellMat=new THREE.MeshStandardMaterial({color:0x3b3650,roughness:.66,metalness:.22,flatShading:true});
    const shell=new THREE.Mesh(new THREE.BoxGeometry(5.35,3.35,.28),shellMat);shell.position.set(3.10,4.45,-10.46);this.group.add(shell);
    const screen=new THREE.Mesh(new THREE.PlaneGeometry(4.92,2.92),new THREE.MeshBasicMaterial({map:this.monitorTexture}));screen.position.set(3.10,4.45,-10.30);this.group.add(screen);
    this.monitorPulse=new THREE.Mesh(new THREE.SphereGeometry(.17,10,8),this.monitorPulseMat);this.monitorPulse.visible=false;this.monitorPulse.position.set(3.10,4.45,-10.08);this.group.add(this.monitorPulse);

    // Dos monitores secundarios: misión y telemetría real de la escena.
    this.leftMonitorCanvas.width=768;this.leftMonitorCanvas.height=420;
    this.leftMonitorTexture=new THREE.CanvasTexture(this.leftMonitorCanvas);
    this.leftMonitorTexture.colorSpace=THREE.SRGBColorSpace;this.leftMonitorTexture.minFilter=THREE.LinearFilter;this.leftMonitorTexture.magFilter=THREE.LinearFilter;
    const leftShell=new THREE.Mesh(new THREE.BoxGeometry(3.75,2.45,.25),shellMat);leftShell.position.set(-7.45,4.55,-10.45);this.group.add(leftShell);
    const leftScreen=new THREE.Mesh(new THREE.PlaneGeometry(3.42,2.12),new THREE.MeshBasicMaterial({map:this.leftMonitorTexture}));leftScreen.position.set(-7.45,4.55,-10.29);this.group.add(leftScreen);

    this.rightMonitorCanvas.width=768;this.rightMonitorCanvas.height=420;
    this.rightMonitorTexture=new THREE.CanvasTexture(this.rightMonitorCanvas);
    this.rightMonitorTexture.colorSpace=THREE.SRGBColorSpace;this.rightMonitorTexture.minFilter=THREE.LinearFilter;this.rightMonitorTexture.magFilter=THREE.LinearFilter;
    const rightShell=new THREE.Mesh(new THREE.BoxGeometry(3.35,2.25,.25),shellMat);rightShell.position.set(8.15,4.35,-10.45);this.group.add(rightShell);
    const rightScreen=new THREE.Mesh(new THREE.PlaneGeometry(3.02,1.92),new THREE.MeshBasicMaterial({map:this.rightMonitorTexture}));rightScreen.position.set(8.15,4.35,-10.29);this.group.add(rightScreen);

    this.ayniPeek.visible=false;for(const x of[-.34,.34]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.105,10,8),this.peekMaterial);eye.position.set(x,0,0);this.ayniPeek.add(eye);}this.ayniPeek.position.set(0,8.78,.34);this.group.add(this.ayniPeek);

    const symbols=['{}','⚙','✦','◌','◇'];symbols.forEach((symbol,index)=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');if(!ctx)return;ctx.fillStyle='#45405B';ctx.fillRect(0,0,128,128);ctx.strokeStyle=index%2?'#7565C7':'#39CFE5';ctx.lineWidth=5;ctx.strokeRect(7,7,114,114);ctx.fillStyle='#D8D9E3';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 48px Arial';ctx.fillText(symbol,64,67);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:0});this.stemMaterials.push(material);const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.75,.75),material);mesh.position.set(-7.7+index*1.05,6.55,-10.24);this.stemVisuals.add(mesh);});this.group.add(this.stemVisuals);

    parent.add(this.group);
    this.drawMonitor('APULAB STATION',['BAHÍA DE SISTEMAS ROBÓTICOS','SISTEMA EN ESPERA']);
    this.updateAmbient(0);
  }

  applySceneEnvironment(scene:THREE.Scene):void{scene.background=new THREE.Color(0x403950);scene.fog=new THREE.Fog(0x403950,23,43);}

  reset():void{
    this.setMonitorPulse(0,.45);this.setAyniPeek(false);this.setStemOpacity(0);
    this.setRuthPresentation(0,new THREE.Vector3());
    this.setAyniCelebration(0,new THREE.Vector3());
    this.drawMonitor('APULAB STATION',['BAHÍA DE SISTEMAS ROBÓTICOS','SISTEMA EN ESPERA']);
  }

  drawMonitor(title:string,rows:string[]=[],mode:'cyan'|'amber'='cyan'):void{
    this.lastMonitorTitle=title;this.lastMonitorRows=[...rows];this.lastMonitorMode=mode;
    const ctx=this.monitorCanvas.getContext('2d');if(!ctx)return;
    ctx.clearRect(0,0,1024,560);
    ctx.fillStyle='#141938';ctx.fillRect(0,0,1024,560);
    const accent=mode==='amber'?'#F4C75E':'#49C9D7';
    ctx.strokeStyle=accent;ctx.lineWidth=8;ctx.strokeRect(24,24,976,512);
    ctx.fillStyle='#8E7DCE';ctx.font='700 22px Poppins, Arial';ctx.fillText('APULAB // CENTRO DE MISIÓN',64,62);
    ctx.fillStyle='#F8F9FA';ctx.font='800 48px Poppins, Arial';ctx.fillText(title,64,122);
    ctx.fillStyle=accent;ctx.fillRect(64,145,170,5);
    ctx.font='600 33px Poppins, Arial';let y=215;
    rows.forEach((row)=>{ctx.fillStyle=row.includes('DETENIDO')||row.includes('DESCONOCIDA')?'#F4C75E':'#C9F6F7';ctx.fillText(row,66,y);y+=70;});
    ctx.fillStyle='#B8C2CC';ctx.font='600 20px Poppins, Arial';ctx.fillText('ENLACE DE DATOS · ACTIVO',66,520);
    this.monitorTexture.needsUpdate=true;
    this.drawAuxMonitors(performance.now()/1000);
  }

  updateAmbient(elapsed:number):void{
    const wave=.5+.5*Math.sin(elapsed*1.15);
    this.wallWashLeft.intensity=.70+.20*wave;
    this.wallWashRight.intensity=.76+.18*(1-wave);
    this.monitorGlowMain.intensity=.54+.16*wave;
    this.monitorGlowLeft.intensity=.42+.10*Math.sin(elapsed*1.6+1.2);
    this.monitorGlowRight.intensity=.40+.11*Math.sin(elapsed*1.4+2.1);
    this.ambientStripMaterials.forEach((material,index)=>{material.emissiveIntensity=.72+.34*(.5+.5*Math.sin(elapsed*(1.0+index*.08)+index));});
    if(this.lastAmbientDraw<0||elapsed-this.lastAmbientDraw>.12){this.lastAmbientDraw=elapsed;this.drawAuxMonitors(elapsed);}
  }

  setMonitorPulse(amount:number,scale=.45):void{const p=THREE.MathUtils.clamp(amount,0,1);this.monitorPulse.visible=p>.01;this.monitorPulseMat.opacity=p*.95;this.monitorPulse.scale.setScalar(scale);}
  setAyniPeek(visible:boolean,bob=0):void{this.ayniPeek.visible=visible;if(visible)this.ayniPeek.position.y=8.78+Math.sin(bob*5.5)*.035;}
  setStemOpacity(amount:number,elapsed=0):void{const p=THREE.MathUtils.clamp(amount,0,1);this.stemMaterials.forEach((material,index)=>{material.opacity=p>0?Math.max(0,p+.05*Math.sin(elapsed*2+index)):0;});}

  setRuthPresentation(amount:number,position:THREE.Vector3,elapsed=0):void{
    const p=THREE.MathUtils.clamp(amount,0,1);
    const breath=.88+.12*Math.sin(elapsed*3.2);
    this.ruthHalo.position.set(position.x,.028,position.z);
    this.ruthHaloMat.opacity=.18*p*breath;
    this.ruthHalo.scale.setScalar(.92+.08*Math.sin(elapsed*2.1));
    this.ruthFill.position.set(position.x,2.8,position.z+1.1);
    this.ruthRim.position.set(position.x-.45,2.0,position.z-1.15);
    this.ruthFill.intensity=1.85*p*breath;
    this.ruthRim.intensity=1.0*p;
  }

  setAyniCelebration(amount:number,position:THREE.Vector3,elapsed=0):void{
    const p=THREE.MathUtils.clamp(amount,0,1);
    const pulse=.72+.28*Math.sin(elapsed*7.4);
    this.ayniHalo.position.set(position.x,.03,position.z);
    this.ayniHaloMat.opacity=.20*p*pulse;
    this.ayniHalo.scale.setScalar(.92+.10*Math.sin(elapsed*5.2));
    this.ayniFill.position.set(position.x,2.7,position.z+1.05);
    this.ayniWarm.position.set(position.x,1.25,position.z-1.0);
    this.ayniFill.intensity=2.05*p*pulse;
    this.ayniWarm.intensity=.72*p;
  }

  private buildWallArchitecture():void{
    const ribMat=new THREE.MeshStandardMaterial({color:0x27243a,roughness:.76,metalness:.22,flatShading:true});
    const panelMat=new THREE.MeshStandardMaterial({color:0x3b3650,roughness:.90,metalness:.08,flatShading:true});
    const accentBase=new THREE.MeshStandardMaterial({color:0x49c9d7,emissive:0x16889b,emissiveIntensity:.9,roughness:.42,metalness:.06,flatShading:true});

    for(const x of[-10.8,-5.6,0,5.6,10.8]){
      const rib=new THREE.Mesh(new THREE.BoxGeometry(.20,8.2,.22),ribMat);rib.position.set(x,4.55,-10.18);this.group.add(rib);
    }
    for(const y of[1.25,7.35]){
      const rail=new THREE.Mesh(new THREE.BoxGeometry(23.1,.16,.20),ribMat);rail.position.set(0,y,-10.16);this.group.add(rail);
    }
    for(const [x,y,w,h] of[[-9.2,7.5,2.4,1.0],[-3.4,7.35,2.7,1.1],[7.2,7.45,2.8,1.0]]){
      const panel=new THREE.Mesh(new THREE.BoxGeometry(w,h,.12),panelMat);panel.position.set(x,y,-10.05);this.group.add(panel);
    }
    [-8.7,-3.9,1.1,6.2].forEach((x,index)=>{
      const mat=accentBase.clone();this.ambientStripMaterials.push(mat);
      const strip=new THREE.Mesh(new THREE.BoxGeometry(2.2,.07,.06),mat);strip.position.set(x,7.08,-9.96);this.group.add(strip);
    });
  }

  private buildBranding():void{
    this.brandCanvas.width=1024;this.brandCanvas.height=220;
    const ctx=this.brandCanvas.getContext('2d');
    if(ctx){
      ctx.clearRect(0,0,1024,220);
      ctx.fillStyle='rgba(20,25,56,.88)';ctx.fillRect(0,0,1024,220);
      ctx.strokeStyle='#4D4288';ctx.lineWidth=7;ctx.strokeRect(5,5,1014,210);
      ctx.fillStyle='#F8F9FA';ctx.font='800 72px Poppins, Arial';ctx.textAlign='center';ctx.fillText('APULAB',512,98);
      ctx.fillStyle='#49C9D7';ctx.fillRect(310,118,404,6);
      ctx.fillStyle='#B8C2CC';ctx.font='700 29px Poppins, Arial';ctx.fillText('STATION · PERÚ',512,171);
    }
    this.brandTexture.colorSpace=THREE.SRGBColorSpace;this.brandTexture.needsUpdate=true;
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(4.65,1.0),new THREE.MeshBasicMaterial({map:this.brandTexture}));
    sign.position.set(2.9,7.65,-10.22);this.group.add(sign);
  }

  private drawAuxMonitors(elapsed:number):void{
    const alert=this.lastMonitorRows.some((row)=>row.includes('DETENIDO')||row.includes('DESCONOCIDA'));
    const accent=alert||this.lastMonitorMode==='amber'?'#F4C75E':'#49C9D7';

    const left=this.leftMonitorCanvas.getContext('2d');
    if(left){
      left.clearRect(0,0,768,420);left.fillStyle='#11162F';left.fillRect(0,0,768,420);left.strokeStyle='#49C9D7';left.lineWidth=7;left.strokeRect(18,18,732,384);
      left.fillStyle='#B8C2CC';left.font='700 22px Poppins, Arial';left.fillText('MISIÓN APU-07',44,60);
      left.fillStyle='#F8F9FA';left.font='800 34px Poppins, Arial';left.fillText('ROVER · YACHAY',44,112);
      left.fillStyle=accent;left.font='700 27px Poppins, Arial';left.fillText(alert?'ESTADO · DETENIDO':'ENLACE · ESTABLE',44,165);
      left.fillStyle='#B8C2CC';left.font='600 23px Poppins, Arial';left.fillText('DATOS RECIBIDOS',44,220);
      left.fillStyle='#2D2654';left.fillRect(44,244,620,28);left.fillStyle='#49C9D7';left.fillRect(44,244,620,28);
      left.fillStyle='#F8F9FA';left.font='700 22px Poppins, Arial';left.fillText('100%',674,267);
      left.fillStyle='#B8C2CC';left.font='600 20px Poppins, Arial';left.fillText(this.lastMonitorTitle.slice(0,34),44,330);
      for(let i=0;i<7;i+=1){const h=18+42*(.5+.5*Math.sin(elapsed*2.1+i*.72));left.fillStyle=i<5?'#49C9D7':'#8E7DCE';left.fillRect(44+i*42,378-h,24,h);}
      this.leftMonitorTexture.needsUpdate=true;
    }

    const right=this.rightMonitorCanvas.getContext('2d');
    if(right){
      right.clearRect(0,0,768,420);right.fillStyle='#11162F';right.fillRect(0,0,768,420);right.strokeStyle=accent;right.lineWidth=7;right.strokeRect(18,18,732,384);
      right.fillStyle='#B8C2CC';right.font='700 22px Poppins, Arial';right.fillText('TELEMETRÍA EN VIVO',44,60);
      right.fillStyle='#F8F9FA';right.font='800 31px Poppins, Arial';right.fillText(alert?'SEÑAL RECIBIDA · ALERTA':'SEÑAL RECIBIDA · OK',44,108);
      right.fillStyle='#B8C2CC';right.font='600 21px Poppins, Arial';right.fillText('SEÑAL 98%   ·   ENLACE APULAB',44,150);
      right.strokeStyle='#4D4288';right.lineWidth=2;for(let y=190;y<=350;y+=40){right.beginPath();right.moveTo(44,y);right.lineTo(714,y);right.stroke();}
      right.strokeStyle=accent;right.lineWidth=5;right.beginPath();
      for(let x=44;x<=714;x+=8){const p=(x-44)/670;const y=270+Math.sin(p*16+elapsed*2.4)*34+Math.sin(p*43+elapsed*.8)*9;if(x===44)right.moveTo(x,y);else right.lineTo(x,y);}right.stroke();
      right.fillStyle=accent;right.beginPath();right.arc(686,270+Math.sin(16+elapsed*2.4)*34,8,0,Math.PI*2);right.fill();
      right.fillStyle='#B8C2CC';right.font='600 19px Poppins, Arial';right.fillText('MONITOREO CONTINUO',44,390);
      this.rightMonitorTexture.needsUpdate=true;
    }
  }
}
