import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {loadWorldPhysics} from '../RapierWorldVehicle.js';
import {createJumpLabVehicle} from './JumpLabVehicle.js';
import {DirtJumpSystem,playgroundFeatures} from '../DirtJumpSystem.js';
import {DirtyGLB} from '../assets/dirty/DirtyGLB.js';
import {StinkyGLB} from '../assets/stinky/StinkyGLB.js';
import {jumpConfig,rampConfig} from '../VehicleConfig.js';
import {PointerInputState,mergeDrivingInput} from '../DrivingInput.js';
import {smoothDrivingSteering,hybridDrivingInput,hybridLandingFeedback} from '../PlayableVehicleSetup.js';
import {createPolishedLighting,VehicleSurfaceEffects} from '../VisualPolish.js';
import {addGroundTextures} from '../GroundTextures.js';
import {VehicleFeedback} from '../VehicleFeedback.js';

const $=selector=>document.querySelector(selector),scene=new THREE.Scene();scene.background=new THREE.Color(0xb5e1ee);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);document.body.prepend(renderer.domElement);
const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.1,700),orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.maxPolarAngle=Math.PI*.47;orbit.minDistance=9;orbit.maxDistance=400;
const lighting=createPolishedLighting(scene,renderer),physicsRoot=new THREE.Group(),visual=new THREE.Group();scene.add(physicsRoot);physicsRoot.add(visual);
const feedback=new VehicleFeedback(),keys=new Set(),touch=new PointerInputState(),templates=[];
const labels=new THREE.Group(),clock=new THREE.Clock(),lastBody=new THREE.Vector3(),position=new THREE.Vector3();scene.add(labels);
let RAPIER,lab,model,renderContacts,ramps,ground,texture,effects,surface,selected,follow=true,steer=0,heading=0;
let telemetry=0,airPeak=0,lastImpact=0,landings=0,takeoffs=0,frames=0,fpsTime=0,fps=0;
const halfSize=220,boundaryLimit=205; // Same playable-world extent, enough approach for Stinky's normal speed.
const restingColor=new THREE.Color(0x86a65c),dirt=new THREE.Color(0xb59057),color=new THREE.Color();
const rolling=(x,z)=>2.6*Math.sin(x*.035)*Math.cos(z*.044)+3.6*Math.sin((x+z)*.018)+1.4*Math.cos(z*.085+x*.027)+.00034*(x*x+z*z);
const vehicleIndex=()=>$('#vehicle').value==='dirty'?0:1;
if(matchMedia('(max-width:800px)').matches)$('#setup').open=false;
$('header .eyebrow').textContent='SHARED MAIN-GAME HYBRID PHYSICS';
$('header .notes').textContent='Uses the main game’s hybrid controller, VehicleConfig.js, input smoothing and landing feedback. Dirty has four wheels; Stinky uses its actual six-wheel Blender model. Scene, ramp, camera and telemetry controls are lab-only. No handling overrides.';
$('#vehicle').options[0].textContent='Dirty · main-game backhoe';$('#vehicle').options[1].textContent='Stinky · main-game six-wheel truck';
$('#mode').options[2].textContent='Rolling terrain · same main-game base hills';
$('#instructions').textContent='W / ↑ accelerate · S / ↓ brake/reverse · A D steer · Space brake · E emergency brake · airborne W/S pitch · R reset. Gamepad supported. Drag to orbit · scroll/pinch to zoom.';
$('#readout').textContent='Loading the main-game hybrid and both Blender vehicles…';
for(const feature of playgroundFeatures()){const option=[...$('#feature').options].find(option=>option.value===feature.id);if(option)option.textContent=feature.name+' · '+feature.height+' m';}

function label(text,x,z){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const context=canvas.getContext('2d');context.fillStyle='#254c43';context.fillRect(0,0,512,96);context.fillStyle='#fff1bc';context.font='bold 32px system-ui';context.textAlign='center';context.fillText(text,256,60);
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map,depthTest:true,toneMapped:false}));sprite.scale.set(9,1.7,1);sprite.position.set(x,ramps.sample(x,z)+2,z);labels.add(sprite);
}
function disposeGround(){
 lab?.dispose();lab=null;model?.dispose();model=null;texture?.dispose();effects?.dispose();
 if(ground){ground.removeFromParent();ground.geometry.dispose();ground.material.dispose();ground=null;}
 for(const child of labels.children){child.material.map.dispose();child.material.dispose();}labels.clear();
}
function rebuild(){
 clear();disposeGround();const mode=$('#mode').value,id=$('#feature').value;let features=playgroundFeatures();
 if(mode==='single')features=features.filter(feature=>feature.id===id).map(feature=>({...feature,x:0,z:0}));
 if(!jumpConfig.enabled)features=[];
 ramps=new DirtJumpSystem(mode==='rolling'?rolling:()=>0,features,rampConfig);surface=ramps.createWorldSurface(halfSize);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(surface.vertices,3));geometry.setIndex(new THREE.BufferAttribute(surface.indices,1));const colors=new Float32Array(surface.vertices.length);
 for(let i=0;i<surface.vertices.length;i+=3){const x=surface.vertices[i],z=surface.vertices[i+2];color.copy(restingColor).lerp(dirt,ramps.dirtMask(x,z));colors[i]=color.r;colors[i+1]=color.g;colors[i+2]=color.b;}
 geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.computeVertexNormals();ground=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));ground.receiveShadow=true;scene.add(ground);
 const painter={surface:(x,z)=>({path:ramps.dirtMask(x,z),dirtMask:ramps.dirtMask(x,z),rockMask:0})};
 texture=addGroundTextures(ground,painter,halfSize,renderer);effects=new VehicleSurfaceEffects(scene,(x,z)=>ramps.sample(x,z),painter);
 const index=vehicleIndex();model=templates[index].clone();model.group.userData.controller=model;visual.add(model.group);
 renderContacts={wheels:model.wheels.map(wheel=>({pivot:wheel.steering,compression:0}))};
 lab=createJumpLabVehicle(RAPIER,{scene,surface,height:(x,z)=>ramps.sample(x,z),vehicle:model.group,index,limit:boundaryLimit});
 for(const feature of features)label(feature.name,feature.x-feature.width*.65,feature.z-feature.approach-3);
 selected=features.find(feature=>feature.id===id)||features[0]||{x:0,z:0,angle:0};reset();
}
function place(x,z,angle){
 clear();steer=0;heading=angle;position.set(x,ramps.sample(x,z)-.09,z);lab.controller.resetAt(position,angle);feedback.reset();effects.reset();visual.position.set(0,0,0);visual.rotation.set(0,0,0);
 follow=true;airPeak=lastImpact=landings=takeoffs=0;lastBody.copy(position);camera.position.set(x-12,position.y+10,z-21);orbit.target.copy(position).y+=2.4;orbit.update();
}
function reset(){const feature=selected;place(feature.x-Math.sin(feature.angle)*110,feature.z-Math.cos(feature.angle)*110,feature.angle);}
function clear(){
 keys.clear();touch.clear();
 for(const button of document.querySelectorAll('.drive'))button.classList.remove('pressed');
}
addEventListener('keydown',event=>{if(!lab)return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code))event.preventDefault();keys.add(event.code);if(event.code==='KeyR'&&!event.repeat)reset();});
addEventListener('keyup',event=>keys.delete(event.code));addEventListener('blur',clear);document.addEventListener('visibilitychange',()=>{clear();clock.getDelta();});
for(const button of document.querySelectorAll('.drive')){
 button.addEventListener('pointerdown',event=>{event.preventDefault();touch.set(event.pointerId,button.dataset.input);button.setPointerCapture(event.pointerId);button.classList.add('pressed');});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,event=>{touch.release(event.pointerId);button.classList.toggle('pressed',touch.held(button.dataset.input));});
}
$('#reset').onclick=reset;$('#mode').onchange=rebuild;$('#feature').onchange=rebuild;$('#vehicle').onchange=rebuild;
$('#view').onclick=()=>{follow=!follow;if(!follow){camera.position.set(190,190,-170);orbit.target.set(0,0,24);}else reset();};
$('#cannon').onclick=()=>{
 const bounds=lab.config.collision,z=boundaryLimit-bounds.radius-Math.max(Math.abs(bounds.rear),Math.abs(bounds.front))+.02;
 place(0,z,0);
 // Cross the actual playable boundary once. The shared controller supplies this
 // vehicle's configured launch speeds, spin, air control and landing bounce.
 lab.controller.update(1/120,hybridDrivingInput({accelerate:true,reverse:false,brake:false,emergencyBrake:false},0,false));
 if(lab.controller.cannonFlight)takeoffs++;
};
function render(){
 requestAnimationFrame(render);const dt=Math.min(clock.getDelta(),.05);if(!lab||document.hidden)return;
 const controller=lab.controller,config=lab.config,previousHeading=heading;
 const driving=mergeDrivingInput(keys,touch,navigator.getGamepads?.()[0],controller.physics.state.speed);
 steer=smoothDrivingSteering(steer,driving,config,dt);
 const state=controller.update(dt,hybridDrivingInput(driving,steer,controller.physics.state.airborne));position.set(state.position.x,state.position.y,state.position.z);heading=state.heading;
 for(const event of state.events){
  if(event.type==='takeoff')takeoffs++;
  else if(event.type==='landing'){lastImpact=event.impact;landings++;hybridLandingFeedback(event,vehicleIndex(),config,feedback,effects,(x,z)=>ramps.sample(x,z));}
 }
 if(!state.airborne)feedback.update(dt,{speed:state.speed,yawRate:(heading-previousHeading)/Math.max(dt,.001),groundY:0,groundPitch:0,groundRoll:0,config:config.hill});
 controller.render(physicsRoot,visual,feedback,dt);
 for(let i=0;i<renderContacts.wheels.length;i++)renderContacts.wheels[i].compression=controller.physics.state.compression[i]??0;
 if(follow){const delta=physicsRoot.position.clone().sub(lastBody);camera.position.add(delta);orbit.target.add(delta);}lastBody.copy(physicsRoot.position);orbit.update();lighting.update(position);
 effects.update(dt,{position,speed:state.speed,heading,airborne:state.airborne,contacts:renderContacts,camera});
 const physics=controller.physics;
 if(Math.abs(position.x)>halfSize+10||Math.abs(position.z)>halfSize+10||position.y<-20)reset();
 airPeak=Math.max(airPeak,position.y-ramps.sample(position.x,position.z));telemetry+=dt;frames++;fpsTime+=dt;
 if(fpsTime>1){fps=Math.round(frames/fpsTime);frames=0;fpsTime=0;}
 if(telemetry>.12){
  telemetry=0;$('#readout').textContent=`MAIN-GAME HYBRID · ${vehicleIndex()===0?'Dirty':'Stinky'} · ${state.airborne?'AIRBORNE':'GROUND CONTACT'} · ${(Math.abs(state.speed)*2.237).toFixed(0)} mph
Wheels touching: ${physics.state.contacts}/${physics.wheels.length} · Vertical ${state.verticalSpeed.toFixed(1)} m/s
Suspension: ${physics.state.compression.map(value=>(value*100).toFixed(0)).join(' / ')} cm
Takeoffs ${takeoffs} · Landings ${landings} · Last impact ${lastImpact.toFixed(1)} m/s
Peak clearance ${airPeak.toFixed(1)} m · ${fps} FPS · fixed 120 Hz`;
 }
 renderer.render(scene,camera);
}
try{
 const loaded=await Promise.all([loadWorldPhysics(),DirtyGLB.load(new URL('../assets/dirty/dirty.glb',location.href).href),StinkyGLB.load(new URL('../assets/stinky/stinky.glb',location.href).href)]);RAPIER=loaded[0];templates.push(...loaded.slice(1));
 rebuild();document.querySelectorAll('#setup select,#setup button').forEach(control=>control.disabled=false);render();
}catch(error){console.error(error);disposeGround();$('#error').textContent='Dirt Jump Lab could not start: '+error.message;}
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();if(matchMedia('(max-width:800px)').matches)$('#setup').open=false;clear();});
addEventListener('pagehide',event=>{if(!event.persisted){disposeGround();for(const template of templates)template?.dispose();lighting.dispose();orbit.dispose();renderer.dispose();}});
