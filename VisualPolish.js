import * as THREE from 'three';
import {visualPolishConfig} from './VehicleConfig.js';
import {contactMotionPolish} from './WorldEnvironmentConfig.js';
export const visualPercent=v=>THREE.MathUtils.clamp(Number(v)||0,0,100)/100;
export function createPolishedLighting(scene,renderer,config=visualPolishConfig){
 const quality={low:[1024,50],medium:[2048,65],high:[2048,48]}[config.shadowQuality]||[2048,65];
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
 const ambient=new THREE.HemisphereLight(0xdce9f1,0x87755e,1.5),sun=new THREE.DirectionalLight(0xffe6c6,2.8);
 sun.position.set(-55,100,48);sun.castShadow=true;sun.shadow.mapSize.set(quality[0],quality[0]);
 Object.assign(sun.shadow.camera,{left:-quality[1],right:quality[1],top:quality[1],bottom:-quality[1],near:1,far:240});sun.shadow.camera.updateProjectionMatrix();
 sun.shadow.normalBias=.018;sun.shadow.bias=-.00008;sun.shadow.intensity=.72;
 const fill=new THREE.DirectionalLight(0xc7dcf1,.55);fill.position.set(50,35,-65);scene.add(ambient,sun,sun.target,fill);
 // Move the existing single shadow map with the player; snap in light space to avoid shimmer.
 const direction=new THREE.Vector3(-55,100,48),right=new THREE.Vector3().crossVectors(direction,new THREE.Vector3(0,1,0)).normalize(),forward=new THREE.Vector3().crossVectors(right,direction).normalize(),anchor=new THREE.Vector3();
 return {sun,update(position){const texel=2*quality[1]/quality[0];anchor.copy(position);const a=anchor.dot(right),b=anchor.dot(forward);anchor.addScaledVector(right,Math.round(a/texel)*texel-a).addScaledVector(forward,Math.round(b/texel)*texel-b);sun.target.position.copy(anchor);sun.position.copy(anchor).add(direction);},dispose(){for(const o of [ambient,sun,sun.target,fill])o.removeFromParent();sun.shadow.map?.dispose();}};
}
function radialMaterial(strength){return new THREE.ShaderMaterial({transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,uniforms:{strength:{value:strength}},vertexShader:`attribute float contactAlpha; varying float shade; varying vec2 vUv; void main(){shade=contactAlpha;vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}`,fragmentShader:`varying vec2 vUv; varying float shade; uniform float strength; void main(){float r=length((vUv-.5)*2.);float broad=pow(max(0.,1.-r*r),3.);float core=pow(max(0.,1.-r*r*3.),2.);float a=(broad*.65+core*.35)*strength*shade;gl_FragColor=vec4(.075,.085,.065,a);}`});}
export class ContactShading {
 constructor(scene,height,layout,rocks,config=visualPolishConfig){
  Object.assign(this,{height,layout,rocks,config});this.dummy=new THREE.Object3D();this.normal=new THREE.Vector3();this.up=new THREE.Vector3(0,1,0);
  this.batch=new THREE.InstancedMesh(new THREE.PlaneGeometry(2,2).rotateX(-Math.PI/2),radialMaterial(visualPercent(config.contactShadowStrengthPercent)*.6),layout.trees.length+rocks.rocks.length+6);this.batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.batch.frustumCulled=false;this.batch.renderOrder=1;this.batch.name='Soft terrain contact shading';scene.add(this.batch);
  this.alpha=new THREE.InstancedBufferAttribute(new Float32Array(this.batch.instanceMatrix.count).fill(1),1);this.alpha.setUsage(THREE.DynamicDrawUsage);this.batch.geometry.setAttribute('contactAlpha',this.alpha);
  this.layout.trees.forEach((t,i)=>this.place(i,t.x,t.z,.6*t.scale,.6*t.scale,0));this.treeCount=layout.trees.length;
 }
 place(i,x,z,rx,rz,angle,alpha=1){const d=this.dummy;d.position.set(x,this.height(x,z)+.018,z);this.normal.set(this.height(x-.2,z)-this.height(x+.2,z),.4,this.height(x,z-.2)-this.height(x,z+.2)).normalize();d.quaternion.setFromUnitVectors(this.up,this.normal);d.rotateY(angle);d.scale.set(rx,1,rz);d.updateMatrix();this.batch.setMatrixAt(i,d.matrix);this.alpha.setX(i,alpha);}
 update(root,contacts,airborne){let i=this.treeCount;this.batch.material.uniforms.strength.value=visualPercent(this.config.contactShadowStrengthPercent)*Math.max(0,Math.min(1,contactMotionPolish.contactStrength));for(const r of this.rocks.rocks){const visible=r.group.visible&&r.state!=='BROKEN';this.place(i++,r.x,r.z,visible?r.r*.78:0,visible?r.r*.7:0,0);}for(const c of contacts.wheels){const p=c.pivot.getWorldPosition(this.normal),radius=c.pivot.userData.wheel.r??.7,gap=Math.max(0,p.y-radius-this.height(p.x,p.z)+.035),alpha=airborne?0:1-THREE.MathUtils.smoothstep(gap,.03,.4);this.place(i++,p.x,p.z,airborne?0:Math.min(.4,radius*.45),airborne?0:radius*.7,root.rotation.y,alpha);}this.batch.count=i;this.batch.instanceMatrix.needsUpdate=true;this.alpha.needsUpdate=true;}
 dispose(){this.batch.removeFromParent();this.batch.geometry.dispose();this.batch.material.dispose();this.batch.dispose();}
}

// Recolors existing vertices only: no terrain positions, normals or height samples change.
export function polishTerrain(terrain,painter,layout,halfSize,config=visualPolishConfig){
 const positions=terrain.geometry.attributes.position,colors=terrain.geometry.attributes.color,color=new THREE.Color(),soil=new THREE.Color(0xaa8758),dry=new THREE.Color(0xb99c6d),cells=new Map();
 const add=(o,r)=>{const k=Math.floor(o.x/8)+','+Math.floor(o.z/8);if(!cells.has(k))cells.set(k,[]);cells.get(k).push({...o,r});};layout.trees.forEach(t=>add(t,1.7+t.scale));layout.rocks.forEach(r=>add(r,r.radius+1.5));
 const variation=visualPercent(config.terrainColorVariationPercent),softness=visualPercent(config.dirtBlendSoftnessPercent);
 for(let i=0;i<positions.count;i++){
  const x=positions.getX(i),z=positions.getZ(i),edge=THREE.MathUtils.smoothstep(halfSize-Math.max(Math.abs(x),Math.abs(z)),0,15),field=painter.surface(x,z);painter.sampleColor(x,z,color);
  const path=Math.pow(field.path,1/(1+softness*.9));color.lerp(dry,Math.max(0,path-field.path)*.65*edge);
  let bare=0;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(const o of cells.get((Math.floor(x/8)+a)+','+(Math.floor(z/8)+b))||[]){const d=Math.hypot(x-o.x,z-o.z)/o.r;bare=Math.max(bare,Math.max(0,1-d*d)**2);}
  color.lerp(soil,bare*.35*edge);
  const noise=Math.sin(x*.61+Math.sin(z*.37))*Math.cos(z*.53)+.45*Math.sin(x*.17+z*.21);color.multiplyScalar(1+noise*variation*.18*edge);colors.setXYZ(i,color.r,color.g,color.b);
 }
 colors.needsUpdate=true;
}

function effectMaterial(color,opacity,track=false){return new THREE.ShaderMaterial({transparent:true,depthWrite:false,polygonOffset:track,polygonOffsetFactor:-2,uniforms:{tint:{value:new THREE.Color(color)},opacity:{value:opacity}},vertexShader:`attribute float lifeAlpha; varying float fade; varying vec2 vUv; void main(){fade=lifeAlpha;vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,fragmentShader:`varying float fade; varying vec2 vUv; uniform vec3 tint; uniform float opacity; void main(){vec2 p=vUv*2.-1.;float shape=${track?'(1.-smoothstep(.55,1.,abs(p.x)))*(1.-smoothstep(.75,1.,abs(p.y)))*(.6+.4*step(.45,fract(vUv.y*7.)))':'pow(max(0.,1.-dot(p,p)),2.)'};gl_FragColor=vec4(tint,opacity*fade*shape);}`});}
// Apply only around renderer.render, then restore before input/physics can run.
// Hydraulic endpoints follow the temporary pose; saved garage poses never change.
export class EquipmentRattle {
 constructor(){this.axis=new THREE.Vector3(1,0,0);this.delta=new THREE.Quaternion();this.reset();}
 reset(){this.restore();this.root=null;this.records=[];this.phase=0;this.amplitude=0;}
 apply(root,dt,{speed=0,bump=0,airborne=false,reducedMotion=false}={}){
  this.restore();if(this.root!==root){this.root=root;this.model=root.userData.controller;this.records=['FrontBucketPivot','RearBucketPivot','RearHopperPivot','CompactorPivot'].map(name=>root.getObjectByName(name)).filter(Boolean).map(joint=>({joint,rest:joint.quaternion.clone()}));this.amplitude=0;}
  const strength=Math.max(0,Math.min(1,contactMotionPolish.vibrationStrength));
  if(reducedMotion||!strength||airborne){this.amplitude=0;return;}
  const goal=Math.min(1,Math.abs(speed)/18+Math.max(0,bump)*8);this.amplitude=THREE.MathUtils.damp(this.amplitude,goal,9,Math.max(0,dt));this.phase+=Math.max(0,Math.min(dt,.1))*(42+Math.abs(speed)*.6);
  if(this.amplitude<1e-5||!this.records.length)return;
  this.records.forEach((r,i)=>{r.rest.copy(r.joint.quaternion);const angle=(Math.sin(this.phase+i*1.7)+.35*Math.sin(this.phase*1.83+i))*.0025*this.amplitude*strength;r.joint.quaternion.multiply(this.delta.setFromAxisAngle(this.axis,angle));});this.applied=true;this.model?.update(0);
 }
 restore(){if(!this.applied)return;for(const r of this.records)r.joint.quaternion.copy(r.rest);this.model?.update(0);this.applied=false;}
 dispose(){this.reset();this.model=null;}
}
export class VehicleSurfaceEffects {
 constructor(scene,height,painter,config=visualPolishConfig){
  Object.assign(this,{height,painter,config});this.dummy=new THREE.Object3D();this.up=new THREE.Vector3(0,1,0);this.normal=new THREE.Vector3();this.previous=null;this.lastTrack=null;this.dustClock=0;this.nextDust=0;this.nextTrack=0;
  this.dust=this.make(scene,48,0xbba17a,.25,false);this.tracks=this.make(scene,192,0x695438,.3,true);
 }
 make(scene,count,color,opacity,track){const geometry=new THREE.PlaneGeometry(2,2);if(track)geometry.rotateX(-Math.PI/2);geometry.setAttribute('lifeAlpha',new THREE.InstancedBufferAttribute(new Float32Array(count),1));const mesh=new THREE.InstancedMesh(geometry,effectMaterial(color,opacity,track),count);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);geometry.attributes.lifeAlpha.setUsage(THREE.DynamicDrawUsage);mesh.name=track?'Temporary tire tracks':'Pooled driving dust';mesh.frustumCulled=false;mesh.renderOrder=track?2:3;scene.add(mesh);return {mesh,alpha:geometry.attributes.lifeAlpha,items:Array.from({length:count},()=>({age:0,life:0,x:0,y:0,z:0,size:0,angle:0})),track};}
 puff(x,y,z,impact){const strength=visualPercent(this.config.dustIntensityPercent);if(!strength)return;const energy=Math.max(0,Math.min(30,impact));for(let i=0;i<Math.min(12,4+Math.round(energy*.2));i++){const angle=i*2.4,c=Math.cos(angle),s=Math.sin(angle);this.emitDust(x+c*.7,y+.08,z+s*.7,(.3+energy*.025)*strength,c*(.3+energy*.035),s*(.3+energy*.035));}}
 emitDust(x,y,z,size,vx=0,vz=0){const p=this.dust.items[this.nextDust++%this.dust.items.length];Object.assign(p,{x,y,z,size,age:0,life:1.05+Math.min(.4,size*.15),vx,vz});}
 update(dt,{position,speed,heading,airborne,contacts,camera,boosted=false}){
  const prev=this.previous,distance=prev?Math.hypot(position.x-prev.x,position.z-prev.z):0,travelSpeed=distance/Math.max(.001,dt);
  const moving=prev&&!airborne&&!prev.airborne&&Math.abs(speed)>.4&&distance>.0005&&distance<8;
  if(moving){const surface=this.painter.surface(position.x,position.z),soil=Math.max(surface.path,surface.dirtMask*.8),accel=Math.max(0,(Math.abs(speed)-prev.speed)/Math.max(.001,dt)),yaw=Math.abs(Math.atan2(Math.sin(heading-prev.heading),Math.cos(heading-prev.heading)))/Math.max(.001,dt),slip=Math.abs((position.x-prev.x)*Math.cos(heading)-(position.z-prev.z)*Math.sin(heading))/Math.max(.001,dt);
   this.dustClock+=dt;const amount=visualPercent(this.config.dustIntensityPercent);
   if(this.dustClock>(boosted?.045:.1)&&amount>0&&(soil>.12||boosted)){
    this.dustClock=0;let trailing=speed>=0?Infinity:-Infinity;for(const c of contacts.wheels){const z=c.pivot.userData.wheel.z;trailing=speed>=0?Math.min(trailing,z):Math.max(trailing,z);}
    for(const c of contacts.wheels){if(c.pivot.userData.wheel.z!==trailing)continue;const p=c.pivot.getWorldPosition(this.normal),field=this.painter.surface(p.x,p.z),cover=Math.max(field.path,field.dirtMask*.8);if(cover<=.12&&!boosted)continue;
     const size=(.12+Math.min(.7,travelSpeed/40+accel*.02+yaw*.15+slip*.06))*Math.max(cover,boosted?.65:0)*amount*(boosted?2.4:1.4);
     this.emitDust(p.x,this.height(p.x,p.z)+.12,p.z,size,Math.sin(heading)*speed*.08,Math.cos(heading)*speed*.08);
    }
   }
   if(soil>.3&&visualPercent(this.config.tireTrackOpacityPercent)>0&&(!this.lastTrack||Math.hypot(position.x-this.lastTrack.x,position.z-this.lastTrack.z)>.65)){
    let minZ=Infinity;for(const c of contacts.wheels)minZ=Math.min(minZ,c.pivot.userData.wheel.z);
    for(const c of contacts.wheels)if(c.pivot.userData.wheel.z===minZ){const point=c.pivot.getWorldPosition(this.normal),wheelSurface=this.painter.surface(point.x,point.z);if(Math.max(wheelSurface.path,wheelSurface.dirtMask*.8)<=.3)continue;const p=this.tracks.items[this.nextTrack++%this.tracks.items.length];Object.assign(p,{x:point.x,y:this.height(point.x,point.z)+.045,z:point.z,size:.22,angle:heading,age:0,life:9});}
    this.lastTrack={x:position.x,z:position.z};
   }
  }else this.dustClock=0;
  this.previous={x:position.x,z:position.z,speed:Math.abs(speed),heading,airborne};
  for(const pool of [this.dust,this.tracks]){
   pool.mesh.material.uniforms.opacity.value=visualPercent(pool.track?this.config.tireTrackOpacityPercent:this.config.dustIntensityPercent)*(pool.track?.5:.8);
   for(let i=0;i<pool.items.length;i++){const p=pool.items[i];p.age+=dt;const alive=p.life>p.age;pool.alpha.setX(i,alive?(1-p.age/p.life)**2*(pool.track?1:Math.min(1,p.age/.08)):0);if(!alive){this.dummy.scale.setScalar(0);}else{
     const drift=pool.track?0:(1-Math.exp(-p.age*2))*.5*Math.max(0,Math.min(2,contactMotionPolish.dustDrift));
     this.dummy.position.set(p.x+(p.vx??0)*drift,p.y+(pool.track?0:p.age*.45),p.z+(p.vz??0)*drift);if(pool.track){this.normal.set(this.height(p.x-.2,p.z)-this.height(p.x+.2,p.z),.4,this.height(p.x,p.z-.2)-this.height(p.x,p.z+.2)).normalize();this.dummy.quaternion.setFromUnitVectors(this.up,this.normal);this.dummy.rotateY(p.angle);this.dummy.scale.set(p.size,1,.48);}else{this.dummy.quaternion.copy(camera.quaternion);this.dummy.scale.setScalar(p.size*(1+p.age*.9));}
    }this.dummy.updateMatrix();pool.mesh.setMatrixAt(i,this.dummy.matrix);
   }pool.alpha.needsUpdate=true;pool.mesh.instanceMatrix.needsUpdate=true;
  }
 }
 reset(){this.previous=null;this.lastTrack=null;this.dustClock=0;for(const pool of [this.dust,this.tracks])for(const p of pool.items)p.life=0;}
 dispose(){for(const p of [this.dust,this.tracks]){p.mesh.removeFromParent();p.mesh.geometry.dispose();p.mesh.material.dispose();p.mesh.dispose();}}
}
