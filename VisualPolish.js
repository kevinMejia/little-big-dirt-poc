import * as THREE from 'three';
import {visualPolishConfig} from './VehicleConfig.js';
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
function radialMaterial(strength){return new THREE.ShaderMaterial({transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,uniforms:{strength:{value:strength}},vertexShader:`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}`,fragmentShader:`varying vec2 vUv; uniform float strength; void main(){float r=length((vUv-.5)*2.);float a=pow(max(0.,1.-r*r),3.)*strength;gl_FragColor=vec4(.10,.105,.075,a);}`});}
export class ContactShading {
 constructor(scene,height,layout,rocks,config=visualPolishConfig){
  Object.assign(this,{height,layout,rocks,config});this.dummy=new THREE.Object3D();this.normal=new THREE.Vector3();this.up=new THREE.Vector3(0,1,0);
  this.batch=new THREE.InstancedMesh(new THREE.PlaneGeometry(2,2).rotateX(-Math.PI/2),radialMaterial(visualPercent(config.contactShadowStrengthPercent)*.6),layout.trees.length+rocks.rocks.length+6);this.batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.batch.frustumCulled=false;this.batch.renderOrder=1;this.batch.name='Soft terrain contact shading';scene.add(this.batch);
  this.layout.trees.forEach((t,i)=>this.place(i,t.x,t.z,.6*t.scale,.6*t.scale,0));this.treeCount=layout.trees.length;
 }
 place(i,x,z,rx,rz,angle){const d=this.dummy;d.position.set(x,this.height(x,z)+.035,z);this.normal.set(this.height(x-.2,z)-this.height(x+.2,z),.4,this.height(x,z-.2)-this.height(x,z+.2)).normalize();d.quaternion.setFromUnitVectors(this.up,this.normal);d.rotateY(angle);d.scale.set(rx,1,rz);d.updateMatrix();this.batch.setMatrixAt(i,d.matrix);}
 update(root,contacts,airborne){let i=this.treeCount;for(const r of this.rocks.rocks){const visible=r.group.visible&&r.state!=='BROKEN';this.place(i++,r.x,r.z,visible?r.r*.9:0,visible?r.r*.8:0,0);}for(const c of contacts.wheels){const p=c.pivot.getWorldPosition(this.normal);this.place(i++,p.x,p.z,airborne?0:.55,airborne?0:.7,root.rotation.y);}this.batch.count=i;this.batch.instanceMatrix.needsUpdate=true;}
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
export class VehicleSurfaceEffects {
 constructor(scene,height,painter,config=visualPolishConfig){
  Object.assign(this,{height,painter,config});this.dummy=new THREE.Object3D();this.up=new THREE.Vector3(0,1,0);this.normal=new THREE.Vector3();this.previous=null;this.lastTrack=null;this.dustClock=0;this.nextDust=0;this.nextTrack=0;
  this.dust=this.make(scene,48,0xbba17a,.25,false);this.tracks=this.make(scene,192,0x695438,.3,true);
 }
 make(scene,count,color,opacity,track){const geometry=new THREE.PlaneGeometry(2,2);if(track)geometry.rotateX(-Math.PI/2);geometry.setAttribute('lifeAlpha',new THREE.InstancedBufferAttribute(new Float32Array(count),1));const mesh=new THREE.InstancedMesh(geometry,effectMaterial(color,opacity,track),count);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);geometry.attributes.lifeAlpha.setUsage(THREE.DynamicDrawUsage);mesh.name=track?'Temporary tire tracks':'Pooled driving dust';mesh.frustumCulled=false;mesh.renderOrder=track?2:3;scene.add(mesh);return {mesh,alpha:geometry.attributes.lifeAlpha,items:Array.from({length:count},()=>({age:0,life:0,x:0,y:0,z:0,size:0,angle:0})),track};}
 puff(x,y,z,impact){const strength=visualPercent(this.config.dustIntensityPercent);if(!strength)return;for(let i=0;i<Math.min(12,4+Math.round(impact*.2));i++)this.emitDust(x+Math.cos(i*2.4)*.7,y,z+Math.sin(i*2.4)*.7,.45+Math.min(1,impact*.025));}
 emitDust(x,y,z,size){const p=this.dust.items[this.nextDust++%this.dust.items.length];Object.assign(p,{x,y,z,size,age:0,life:1.1});}
 update(dt,{position,speed,heading,airborne,contacts,camera,boosted=false}){
  const prev=this.previous,distance=prev?Math.hypot(position.x-prev.x,position.z-prev.z):0,travelSpeed=distance/Math.max(.001,dt);
  const moving=prev&&!airborne&&!prev.airborne&&Math.abs(speed)>.4&&distance>.0005&&distance<8;
  if(moving){const surface=this.painter.surface(position.x,position.z),soil=Math.max(surface.path,surface.dirtMask*.8),accel=Math.max(0,(Math.abs(speed)-prev.speed)/Math.max(.001,dt)),yaw=Math.abs(Math.atan2(Math.sin(heading-prev.heading),Math.cos(heading-prev.heading)))/Math.max(.001,dt),slip=Math.abs((position.x-prev.x)*Math.cos(heading)-(position.z-prev.z)*Math.sin(heading))/Math.max(.001,dt);
   this.dustClock+=dt;const amount=visualPercent(this.config.dustIntensityPercent);
   if(this.dustClock>(boosted?.045:.1)&&amount>0&&(soil>.12||boosted)){this.dustClock=0;const behind=-Math.sign(speed||1)*2;this.emitDust(position.x+Math.sin(heading)*behind,this.height(position.x,position.z)+.15,position.z+Math.cos(heading)*behind,(.14+Math.min(1,travelSpeed/35+accel*.025+yaw*.2+slip*.08))*Math.max(soil,boosted?.65:0)*amount*(boosted?3:2));}
   if(soil>.3&&visualPercent(this.config.tireTrackOpacityPercent)>0&&(!this.lastTrack||Math.hypot(position.x-this.lastTrack.x,position.z-this.lastTrack.z)>.65)){
    let minZ=Infinity;for(const c of contacts.wheels)minZ=Math.min(minZ,c.pivot.userData.wheel.z);
    for(const c of contacts.wheels)if(c.pivot.userData.wheel.z===minZ){const point=c.pivot.getWorldPosition(this.normal),wheelSurface=this.painter.surface(point.x,point.z);if(Math.max(wheelSurface.path,wheelSurface.dirtMask*.8)<=.3)continue;const p=this.tracks.items[this.nextTrack++%this.tracks.items.length];Object.assign(p,{x:point.x,y:this.height(point.x,point.z)+.045,z:point.z,size:.22,angle:heading,age:0,life:9});}
    this.lastTrack={x:position.x,z:position.z};
   }
  }else this.dustClock=0;
  this.previous={x:position.x,z:position.z,speed:Math.abs(speed),heading,airborne};
  for(const pool of [this.dust,this.tracks]){
   pool.mesh.material.uniforms.opacity.value=visualPercent(pool.track?this.config.tireTrackOpacityPercent:this.config.dustIntensityPercent)*(pool.track?.5:.8);
   for(let i=0;i<pool.items.length;i++){const p=pool.items[i];p.age+=dt;const alive=p.life>p.age;pool.alpha.setX(i,alive?(1-p.age/p.life)**2:0);if(!alive){this.dummy.scale.setScalar(0);}else{
     this.dummy.position.set(p.x,p.y+(pool.track?0:p.age*.65),p.z);if(pool.track){this.normal.set(this.height(p.x-.2,p.z)-this.height(p.x+.2,p.z),.4,this.height(p.x,p.z-.2)-this.height(p.x,p.z+.2)).normalize();this.dummy.quaternion.setFromUnitVectors(this.up,this.normal);this.dummy.rotateY(p.angle);this.dummy.scale.set(p.size,1,.48);}else{this.dummy.quaternion.copy(camera.quaternion);this.dummy.scale.setScalar(p.size*(1+p.age*.8));}
    }this.dummy.updateMatrix();pool.mesh.setMatrixAt(i,this.dummy.matrix);
   }pool.alpha.needsUpdate=true;pool.mesh.instanceMatrix.needsUpdate=true;
  }
 }
 reset(){this.previous=null;this.lastTrack=null;this.dustClock=0;}
 dispose(){for(const p of [this.dust,this.tracks]){p.mesh.removeFromParent();p.mesh.geometry.dispose();p.mesh.material.dispose();p.mesh.dispose();}}
}
