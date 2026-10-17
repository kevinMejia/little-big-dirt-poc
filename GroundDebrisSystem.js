import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pct=v=>clamp(Number(v)||0,0,100)/100;
const kinds=['dirtClump','smallRock','twig','earthClump'];
// Compact support with zero value AND slope at the edge. Branches use an ellipse.
export function debrisHeight(x,z,o){
  const dx=x-o.x,dz=z-o.z,c=Math.cos(o.angle),s=Math.sin(o.angle);
  const u=(dx*c+dz*s)/o.rx,v=(-dx*s+dz*c)/o.rz,q=u*u+v*v;
  return q>=1?0:o.height*(1-q)**2;
}

export class GroundDebrisSystem {
  constructor(scene,height,halfSize,painter,layout,config){
    Object.assign(this,{scene,height,halfSize,painter,layout,config});
    this.group=new THREE.Group();this.group.name='Stationary ground debris';scene.add(this.group);
    this.grid=new Map();this.objects=[];this.focus={x:0,z:0};this.cellSize=4;this.regenerate();
  }
  clear(){this.group.traverse(o=>{if(o.isMesh||o.isLineSegments){o.geometry.dispose();o.material.dispose();o.dispose?.();}});this.group.clear();this.grid.clear();this.objects.length=0;}
  regenerate(){
    this.clear();if(!this.config.enabled)return;
    let seed=79231;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
    const weights=kinds.map(k=>Math.max(0,Number(this.config[k+'Percent'])||0)),total=weights.reduce((a,b)=>a+b,0);
    if(!total)return;
    const budget=Math.round(1000*pct(this.config.densityPercent)),dummy=new THREE.Object3D(),color=new THREE.Color();
    const obstacles=[...this.layout.trees.map(t=>({...t,r:t.scale*.35+.5})),...this.layout.rocks.map(r=>({...r,r:r.radius+.6}))];
    for(let tries=0;tries<budget*30&&this.objects.length<budget;tries++){
      let roll=random()*total,kind=kinds[0];for(let i=0;i<kinds.length;i++){roll-=weights[i];if(roll<=0){kind=kinds[i];break;}}
      let x=(random()*2-1)*(this.halfSize-20),z=(random()*2-1)*(this.halfSize-20);
      const anchors=kind==='twig'?this.layout.trees:kind==='smallRock'?this.layout.rocks:[];
      if(anchors.length&&random()<.7){const a=anchors[Math.floor(random()*anchors.length)],angle=random()*Math.PI*2,d=2+random()*4;x=a.x+Math.cos(angle)*d;z=a.z+Math.sin(angle)*d;}
      if(Math.abs(x)>this.halfSize-20||Math.abs(z)>this.halfSize-20||Math.hypot(x,z)<14)continue;
      if(obstacles.some(o=>Math.hypot(o.x-x,o.z-z)<o.r+1))continue;
      const surface=this.painter.surface(x,z);if(surface.slope>.55)continue;
      if((kind==='dirtClump'||kind==='earthClump')&&random()>.22+.78*Math.max(surface.dirtMask,surface.path))continue;
      const interactive=random()<pct(this.config.interactivePercent),lo=clamp(Number(this.config.minBumpHeight)||0,0,.5),hi=clamp(Number(this.config.maxBumpHeight)||0,lo,.5);
      const h=interactive?lo+random()*(hi-lo):.025+random()*.035;
      const rx=kind==='twig'?.55+random()*.65:kind==='dirtClump'?.55+random()*.5:.22+random()*.3;
      const rz=kind==='twig'?Math.max(.09,h*.8):rx*(.65+random()*.3);
      const o={kind,x,z,rx,rz,height:h,angle:random()*Math.PI*2,interactive};this.objects.push(o);
      if(interactive){const radius=Math.max(rx,rz);for(let a=Math.floor((x-radius)/4);a<=Math.floor((x+radius)/4);a++)for(let b=Math.floor((z-radius)/4);b<=Math.floor((z+radius)/4);b++){const key=a+','+b;if(!this.grid.has(key))this.grid.set(key,[]);this.grid.get(key).push(o);}}
    }
    for(const kind of kinds){
      const list=this.objects.filter(o=>o.kind===kind);if(!list.length)continue;
      const geometry=new THREE.SphereGeometry(1,kind==='smallRock'?7:12,6);geometry.scale(1,1,1);
      // Custom upper surface matches the smooth sampling profile; lower half embeds in soil.
      const p=geometry.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),y=p.getY(i);p.setY(i,y>=0?Math.max(0,1-x*x-z*z)**2:-.08);}
      geometry.computeVertexNormals();
      const material=new THREE.MeshStandardMaterial({roughness:1,flatShading:kind==='smallRock'}),batch=new THREE.InstancedMesh(geometry,material,list.length);batch.name=kind;batch.receiveShadow=true;
      list.forEach((o,i)=>{dummy.position.set(o.x,this.height(o.x,o.z)+.006,o.z);dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(this.height(o.x-.2,o.z)-this.height(o.x+.2,o.z),.4,this.height(o.x,o.z-.2)-this.height(o.x,o.z+.2)).normalize());dummy.rotateY(-o.angle);dummy.scale.set(o.rx,o.height,o.rz);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);color.set(kind==='smallRock'?0x939085:kind==='twig'?0x725035:kind==='earthClump'?0x9a7950:0x9f7544).multiplyScalar(.88+random()*.24);batch.setColorAt(i,color);});batch.computeBoundingSphere();this.group.add(batch);
    }
    if(this.footprints)this.showFootprints(true);
  }
  setFocus(x,z){this.focus.x=x;this.focus.z=z;}
  getHeightAt(x,z){
    if(!this.config.enabled||!pct(this.config.suspensionEffectPercent)||Math.hypot(x-this.focus.x,z-this.focus.z)>Math.max(0,this.config.maxInteractiveDistance))return 0;
    let h=0;for(const o of this.grid.get(Math.floor(x/4)+','+Math.floor(z/4))||[])h=Math.max(h,debrisHeight(x,z,o));return h;
  }
  // Five weighted footprint samples filter details smaller than a tire contact patch.
  getWheelHeightAt(x,z,r=.7){const d=Math.min(.18,r*.2);return this.getHeightAt(x,z)*.5+(this.getHeightAt(x-d,z)+this.getHeightAt(x+d,z)+this.getHeightAt(x,z-d)+this.getHeightAt(x,z+d))*.125;}
  showFootprints(enabled){
    this.footprints=enabled;const old=this.group.getObjectByName('Bump footprints');if(old){old.geometry.dispose();old.material.dispose();old.removeFromParent();}if(!enabled)return;
    const points=[];for(const o of this.objects)if(o.interactive)for(let i=0;i<32;i++){for(const a of [i/32*Math.PI*2,(i+1)/32*Math.PI*2]){const u=Math.cos(a)*o.rx,v=Math.sin(a)*o.rz,x=o.x+u*Math.cos(o.angle)-v*Math.sin(o.angle),z=o.z+u*Math.sin(o.angle)+v*Math.cos(o.angle);points.push(x,this.height(x,z)+.025,z);}}
    const lines=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(points,3)),new THREE.LineBasicMaterial({color:0xff4477}));lines.name='Bump footprints';this.group.add(lines);
  }
  dispose(){this.showFootprints(false);this.clear();this.group.removeFromParent();}
}

// Reuses stable wheel descriptors; no raycasts, new colliders, or new body springs.
export class DebrisWheelContacts {
  constructor(){this.vehicle=null;this.wheels=[];this.targets={heave:0,pitch:0,roll:0};}
  sample(vehicle,root,debris,config,airborne=false){
    if(this.vehicle!==vehicle){this.vehicle=vehicle;const model=vehicle.userData.controller;this.wheels=(model?.wheels?model.wheels.map(w=>w.steering||w):vehicle.children).filter(p=>p.userData.wheel).map(pivot=>({pivot,point:new THREE.Vector3(),bump:0,compression:0}));}
    root.updateMatrixWorld(true);debris.setFocus(root.position.x,root.position.z);
    let sum=0,left=0,right=0,front=0,rear=0,nl=0,nr=0,nf=0,nb=0,minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
    for(const contact of this.wheels){const w=contact.pivot.userData.wheel;contact.point.set(w.x,0,w.z);root.localToWorld(contact.point);contact.bump=airborne?0:debris.getWheelHeightAt(contact.point.x,contact.point.z,w.r);sum+=contact.bump;
      if(w.x<0){left+=contact.bump;nl++;}else{right+=contact.bump;nr++;}if(w.z>0){front+=contact.bump;nf++;}else{rear+=contact.bump;nb++;}minX=Math.min(minX,w.x);maxX=Math.max(maxX,w.x);minZ=Math.min(minZ,w.z);maxZ=Math.max(maxZ,w.z);
    }
    const strength=pct(debris.config.suspensionEffectPercent),bounce=pct(config.suspensionBouncePercent),t=this.targets;
    t.heave=sum/Math.max(1,this.wheels.length)*strength*bounce;
    t.pitch=Math.atan2(rear/Math.max(1,nb)-front/Math.max(1,nf),Math.max(1,maxZ-minZ))*strength*pct(config.bodyPitchPercent);
    t.roll=Math.atan2(right/Math.max(1,nr)-left/Math.max(1,nl),Math.max(1,maxX-minX))*strength*pct(config.bodyRollPercent);return t;
  }
  ground(root,height,feedback){for(const c of this.wheels){const w=c.pivot.userData.wheel;c.point.set(w.x,0,w.z);root.localToWorld(c.point);c.point.y=height(c.point.x,c.point.z)+c.bump-.035+w.r;c.pivot.position.copy(c.pivot.parent.worldToLocal(c.point));c.compression=c.bump-feedback.heave.value;}}
}
