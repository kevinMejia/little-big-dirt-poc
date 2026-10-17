import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import RAPIER from './vendor/rapier/rapier.mjs';
import {DirtJumpSystem,playgroundFeatures} from '../DirtJumpSystem.js';
import {JumpVehiclePrototype,rotateVector,matchWheelContacts} from '../JumpVehiclePrototype.js';
import {DirtyGLB} from '../assets/dirty/DirtyGLB.js';
import {jumpConfig,rampConfig} from '../VehicleConfig.js';
import {createPolishedLighting,VehicleSurfaceEffects} from '../VisualPolish.js';
import {addGroundTextures} from '../GroundTextures.js';
import {VehicleFeedback} from '../VehicleFeedback.js';
const $=s=>document.querySelector(s),scene=new THREE.Scene();scene.background=new THREE.Color(0xb5e1ee);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);document.body.prepend(renderer.domElement);
const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.1,600),orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.maxPolarAngle=Math.PI*.47;orbit.minDistance=9;orbit.maxDistance=240;
const lighting=createPolishedLighting(scene,renderer),physicsRoot=new THREE.Group(),visual=new THREE.Group();scene.add(physicsRoot);physicsRoot.add(visual);
const feedback=new VehicleFeedback(),keys=new Set(),touch=new Map();let model,renderContacts,wheelBindings,prototype,ramps,ground,texture,effects,surface,follow=true,selected,labels=new THREE.Group(),clock=new THREE.Clock(),telemetry=0,airPeak=0,lastImpact=0,landings=0,takeoffs=0,frames=0,fpsTime=0,fps=0;
scene.add(labels);
if(matchMedia('(max-width:800px)').matches)$('#setup').open=false;
const restingColor=new THREE.Color(0x86a65c),dirt=new THREE.Color(0xb59057),color=new THREE.Color(),point=new THREE.Vector3(),lastBody=new THREE.Vector3();
const rolling=(x,z)=>2.6*Math.sin(x*.035)*Math.cos(z*.044)+3.6*Math.sin((x+z)*.018)+1.4*Math.cos(z*.085+x*.027)+.00034*(x*x+z*z);
function label(text,x,z){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const ctx=canvas.getContext('2d');ctx.fillStyle='#254c43';ctx.fillRect(0,0,512,96);ctx.fillStyle='#fff1bc';ctx.font='bold 32px system-ui';ctx.textAlign='center';ctx.fillText(text,256,60);const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map,depthTest:true,toneMapped:false}));sprite.scale.set(9,1.7,1);sprite.position.set(x,ramps.sample(x,z)+2,z);labels.add(sprite);}
function disposeGround(){texture?.dispose();effects?.dispose();if(ground){ground.removeFromParent();ground.geometry.dispose();ground.material.dispose();}for(const c of labels.children){c.material.map.dispose();c.material.dispose();}labels.clear();prototype?.dispose();}
function rebuild(){
 disposeGround();const mode=$('#mode').value,id=$('#feature').value;let features=playgroundFeatures();if(mode==='single'){features=features.filter(f=>f.id===id).map(f=>({...f,x:0,z:0}));}
 if(!jumpConfig.enabled)features=[];ramps=new DirtJumpSystem(mode==='rolling'?rolling:()=>0,features,rampConfig);surface=ramps.createSurface(120,.75);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(surface.vertices,3));geometry.setIndex(new THREE.BufferAttribute(surface.indices,1));const colors=new Float32Array(surface.vertices.length);
 for(let i=0;i<surface.vertices.length;i+=3){const x=surface.vertices[i],z=surface.vertices[i+2],mask=ramps.dirtMask(x,z);color.copy(restingColor).lerp(dirt,mask);colors[i]=color.r;colors[i+1]=color.g;colors[i+2]=color.b;}geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.computeVertexNormals();
 ground=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));ground.receiveShadow=true;scene.add(ground);
 const painter={surface:(x,z)=>({path:ramps.dirtMask(x,z),dirtMask:ramps.dirtMask(x,z),rockMask:0})};texture=addGroundTextures(ground,painter,120,renderer);effects=new VehicleSurfaceEffects(scene,(x,z)=>ramps.sample(x,z),painter);
 prototype=new JumpVehiclePrototype(RAPIER,surface,{config:jumpConfig,vehicle:$('#vehicle').value});
 wheelBindings=matchWheelContacts(model.wheels,prototype.wheels);
 for(const f of features)label(f.name,f.x-f.width*.65,f.z-f.approach-3);selected=features.find(f=>f.id===id)||features[0]||{x:0,z:0,angle:0};reset();
}
function reset(){const f=selected,x=f.x-Math.sin(f.angle)*43,z=f.z-Math.cos(f.angle)*43;prototype.reset(x,z,ramps.sample(x,z),f.angle);feedback.reset();effects.reset();follow=true;airPeak=lastImpact=landings=takeoffs=0;lastBody.set(x,ramps.sample(x,z)+1.1,z);camera.position.set(x-12,lastBody.y+10,z-21);orbit.target.copy(lastBody);orbit.update();}
function clear(){keys.clear();touch.clear();document.querySelectorAll('.drive').forEach(b=>b.classList.remove('pressed'));}
addEventListener('keydown',e=>{if(!prototype)return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='KeyR'&&!e.repeat)reset();});addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',clear);document.addEventListener('visibilitychange',()=>{clear();clock.getDelta();});
for(const button of document.querySelectorAll('.drive')){button.addEventListener('pointerdown',e=>{e.preventDefault();touch.set(e.pointerId,button.dataset.input);button.setPointerCapture(e.pointerId);button.classList.add('pressed');});for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,e=>{touch.delete(e.pointerId);button.classList.toggle('pressed',[...touch.values()].includes(button.dataset.input));});}
function input(){const down=(code,arrow,name)=>keys.has(code)||keys.has(arrow)||[...touch.values()].includes(name),forward=down('KeyW','ArrowUp','forward'),back=down('KeyS','ArrowDown','back'),left=down('KeyA','ArrowLeft','left'),right=down('KeyD','ArrowRight','right');return {throttle:forward?1:back?-1:0,steering:Number(right)-Number(left),brake:keys.has('Space'),pitch:prototype.state.airborne?(Number(back)-Number(forward)):0};}
$('#reset').onclick=reset;$('#mode').onchange=rebuild;$('#feature').onchange=rebuild;$('#vehicle').onchange=rebuild;
$('#view').onclick=()=>{follow=!follow;if(!follow){camera.position.set(110,110,-95);orbit.target.set(0,0,24);}else reset();};
$('#cannon').onclick=()=>{prototype.reset(0,105,ramps.sample(0,105),Math.PI);lastBody.set(0,ramps.sample(0,105)+prototype.offset,105);camera.position.set(12,lastBody.y+10,126);orbit.target.copy(lastBody);orbit.update();prototype.impulse({x:0,y:28,z:-45});feedback.reset();follow=true;};
function render(){requestAnimationFrame(render);const dt=Math.min(clock.getDelta(),.06);if(!prototype||document.hidden)return;
 const controls=input(),state=prototype.update(dt,controls),pose=prototype.getRenderPose(),p=pose.position,q=pose.rotation,body=new THREE.Vector3(p.x,p.y,p.z),heading=Math.atan2(rotateVector(q,{x:0,y:0,z:1}).x,rotateVector(q,{x:0,y:0,z:1}).z);
 const settings={bodyRollPercent:prototype.tuning.bodyRollPercent,bodyPitchPercent:prototype.tuning.bodyPitchPercent,suspensionBouncePercent:15,boundaryBodyRockPercent:jumpConfig.landingBodyRockPercent};
 for(const event of prototype.events.splice(0)){if(event.type==='takeoff')takeoffs++;else{lastImpact=event.impact;landings++;feedback.landingImpact(settings,event.impact,jumpConfig.landingBouncePercent*prototype.tuning.landingBounceScalePercent/100);if(jumpConfig.landingDustPercent>0)effects.puff(event.x,ramps.sample(event.x,event.z)+.2,event.z,event.impact*jumpConfig.landingDustPercent/100);}}
 if(!state.airborne)feedback.update(dt,{speed:state.speed,yawRate:controls.steering*state.speed*.015,groundY:0,groundPitch:0,groundRoll:0,config:settings});
 physicsRoot.position.copy(body);physicsRoot.quaternion.set(q.x,q.y,q.z,q.w);visual.position.set(0,-prototype.offset+feedback.heave.value,0);visual.rotation.set(feedback.pitch.value,0,feedback.roll.value);physicsRoot.updateMatrixWorld(true);
 model.setSteering(pose.steering);model.setWheelRotation(pose.wheelAngle);
 wheelBindings.forEach(({wheel:w,physicsIndex:i})=>{const meta=prototype.wheels[i];point.set(meta.x,meta.r+prototype.rest-prototype.offset-pose.suspension[i],meta.z);physicsRoot.localToWorld(point);w.steering.position.copy(w.steering.parent.worldToLocal(point));});model.update(dt);
 if(follow){const delta=body.clone().sub(lastBody);camera.position.add(delta);orbit.target.add(delta);}lastBody.copy(body);orbit.update();lighting.update(body);
 effects.update(dt,{position:body,speed:state.speed,heading,airborne:state.airborne,contacts:renderContacts,camera});
 if(Math.abs(p.x)>125||Math.abs(p.z)>125||p.y<-20)reset();airPeak=Math.max(airPeak,p.y-prototype.offset-ramps.sample(p.x,p.z));telemetry+=dt;frames++;fpsTime+=dt;if(fpsTime>1){fps=Math.round(frames/fpsTime);frames=0;fpsTime=0;}
 if(telemetry>.12){telemetry=0;$('#readout').textContent=`${state.airborne?'AIRBORNE':'GROUND CONTACT'} · ${(Math.abs(state.speed)*2.237).toFixed(0)} mph\nWheels touching: ${state.contacts}/4 · Vertical ${state.verticalSpeed.toFixed(1)} m/s\nSuspension: ${state.compression.map(v=>(v*100).toFixed(0)).join(' / ')} cm\nTakeoffs ${takeoffs} · Landings ${landings} · Last impact ${lastImpact.toFixed(1)} m/s\nPeak clearance ${airPeak.toFixed(1)} m · ${fps} FPS · fixed 120 Hz`;}
 renderer.render(scene,camera);
}
try{await RAPIER.init();model=await DirtyGLB.load(new URL('../assets/dirty/dirty.glb',location.href).href);visual.add(model.group);renderContacts={wheels:model.wheels.map(w=>({pivot:w.steering}))};rebuild();document.querySelectorAll('#setup select,#setup button').forEach(control=>control.disabled=false);render();}catch(error){console.error(error);$('#error').textContent='Prototype could not start: '+error.message;}
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();if(matchMedia('(max-width:800px)').matches)$('#setup').open=false;clear();});addEventListener('pagehide',e=>{if(!e.persisted){disposeGround();model?.dispose();lighting.dispose();orbit.dispose();renderer.dispose();}});
