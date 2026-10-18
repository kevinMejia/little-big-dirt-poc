import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from '../three-test.mjs';
import R from '../viewer/vendor/rapier/rapier.mjs';
import {DirtyGLB} from '../DirtyGLB-test.mjs';
import {StinkyGLB} from '../StinkyGLB-test.mjs';
import {RapierWorldVehicle} from '../RapierWorldVehicle.js';
import {createJumpLabVehicle} from '../viewer/JumpLabVehicle.js';
import {playableVehicleConfig,smoothDrivingSteering,hybridDrivingInput,hybridLandingFeedback} from '../PlayableVehicleSetup.js';
import {VehicleFeedback} from '../VehicleFeedback.js';
import {DirtJumpSystem,playgroundFeatures} from '../DirtJumpSystem.js';
import {TreeCollisionSystem} from '../TreeCollisionSystem.js';
import {RockInteractionSystem} from '../RockInteractionSystem.js';
import {mergeDrivingInput,PointerInputState} from '../DrivingInput.js';
import {arcadeHandlingConfig,vehicleConfig,jumpConfig,jumpVehicleConfig,originalDriveConfig} from '../VehicleConfig.js';
import {mainWorldSettings} from '../MainWorldSettings.js';
import {setTuning,resetTuning} from '../TuningStore.js';
await R.init();
const tuningSnapshot=JSON.stringify({arcadeHandlingConfig,vehicleConfig,jumpConfig,jumpVehicleConfig,originalDriveConfig});

// Read actual exported node transforms/nesting, then use the production model
// adapters. Mesh vertex buffers are irrelevant to ray contacts/controller parity.
function exportedModel(index){
 const id=index?'stinky':'dirty',bytes=fs.readFileSync(path.join(process.argv[2],'assets',id,id+'.glb'));
 const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
 const nodes=gltf.nodes.map(node=>{const object=new THREE.Group();object.name=node.name;object.userData=node.extras??{};if(node.translation)object.position.fromArray(node.translation);if(node.rotation)object.quaternion.fromArray(node.rotation);if(node.scale)object.scale.fromArray(node.scale);return object;});
 gltf.nodes.forEach((node,i)=>{for(const child of node.children??[])nodes[i].add(nodes[child]);});
 const group=new THREE.Group();for(const i of gltf.scenes[gltf.scene??0].nodes)group.add(nodes[i]);
 const manifest=JSON.parse(fs.readFileSync(path.join(process.argv[2],'assets',id,'manifest.json')));
 const model=new (index?StinkyGLB:DirtyGLB)(group,manifest);group.userData.controller=model;return model;
}
const rolling=(x,z)=>2.6*Math.sin(x*.035)*Math.cos(z*.044)+3.6*Math.sin((x+z)*.018)+1.4*Math.cos(z*.085+x*.027)+.00034*(x*x+z*z);
function makePair(index,terrain,start){
 const surface=terrain.createWorldSurface(),height=(x,z)=>terrain.sample(x,z),entries=[];
 for(const labMode of [false,true]){
  const scene=new THREE.Scene(),model=exportedModel(index),root=new THREE.Group(),visual=new THREE.Group();root.add(visual);visual.add(model.group);scene.add(root);
  let entry;
  if(labMode)entry=createJumpLabVehicle(R,{scene,surface,height,vehicle:model.group,index,position:start,limit:10000});
  else{
   const trees=new TreeCollisionSystem(scene,{groundHeight:height}),rocks=new RockInteractionSystem(scene,{groundHeight:height}),config=playableVehicleConfig(index);
   const controller=new RapierWorldVehicle(R,{surface,height,trees,rocks,groundDebris:{getWheelHeightAt:()=>0},limit:10000});
   controller.setVehicle(model.group,config,index,start,0);
   entry={controller,config,dispose(){controller.dispose();trees.dispose();rocks.dispose();}};
  }
  assert(entry.controller instanceof RapierWorldVehicle,'lab uses the actual playable controller');
  assert.equal(entry.controller.pivots.length,index?6:4,'actual vehicle wheel layout');
  entries.push({...entry,model,root,visual,feedback:new VehicleFeedback(),steer:0,heading:0,events:[],dust:[],height});
 }
 assert.deepEqual(entries[0].controller.cfg,entries[1].controller.cfg);
 return entries;
}
function tick(entry,index,dt,input){
 entry.steer=smoothDrivingSteering(entry.steer,input,entry.config,dt);
 const state=entry.controller.update(dt,hybridDrivingInput(input,entry.steer,entry.controller.physics.state.airborne));
 for(const event of state.events){entry.events.push(event);if(event.type==='landing')hybridLandingFeedback(event,index,entry.config,entry.feedback,{puff:(...args)=>entry.dust.push(args)},entry.height);}
 if(!state.airborne)entry.feedback.update(dt,{speed:state.speed,yawRate:(state.heading-entry.heading)/Math.max(dt,.001),groundY:0,groundPitch:0,groundRoll:0,config:entry.config.hill});
 entry.heading=state.heading;entry.controller.render(entry.root,entry.visual,entry.feedback,dt);return state;
}
function compare(pair,states){
 for(const axis of ['x','y','z'])assert(Math.abs(states[0].position[axis]-states[1].position[axis])<1e-6,'same trajectory '+axis);
 for(const key of ['speed','heading','verticalSpeed'])assert(Math.abs(states[0][key]-states[1][key])<1e-6,'same '+key);
 assert.equal(states[0].airborne,states[1].airborne);
 assert.deepEqual(pair[0].controller.physics.state.compression,pair[1].controller.physics.state.compression,'same suspension');
 assert.deepEqual(pair[0].feedback,pair[1].feedback,'same landing/body feedback');
 assert.deepEqual(pair[0].dust,pair[1].dust,'same landing dust');
 for(let i=0;i<pair[0].model.wheels.length;i++)assert(pair[0].model.wheels[i].steering.getWorldPosition(new THREE.Vector3()).distanceTo(pair[1].model.wheels[i].steering.getWorldPosition(new THREE.Vector3()))<1e-6,'same nested visual wheel contact');
}
const input=(throttle=0,turn=0,brake=false,emergency=false)=>({accelerate:throttle>0,reverse:throttle<0,steerLeft:turn<0,steerRight:turn>0,axis:0,brake,emergencyBrake:emergency});
let scenarios=0;
for(const index of [0,1])for(const hills of [false,true]){
 const terrain=new DirtJumpSystem(hills?rolling:()=>0,[]),start=new THREE.Vector3(0,terrain.sample(0,-100)-.09,-100),pair=makePair(index,terrain,start);
 let time=0,peakSpeed=0;
 while(time<10){
  const dt=[1/30,1/60,1/144][Math.floor(time*10)%3],drive=time<4?input(1):time<5?input(1,1):time<6?input(0,0,true):time<7?input(-1,-1):time<8?input(0,0,false,true):input();
  const states=pair.map(entry=>tick(entry,index,dt,drive));compare(pair,states);peakSpeed=Math.max(peakSpeed,states[0].speed);time+=dt;
 }
 if(!hills){const t=arcadeHandlingConfig[index?'stinky':'dirty'],scale=1+vehicleConfig[index?'garbageTruck':'backhoe'].speedAdjustmentPercent/100;assert(peakSpeed>t.topSpeed*scale*.98,'same normal boosted top speed');}
 for(const entry of pair){entry.dispose();entry.model.dispose();}scenarios++;
}
for(const index of [0,1])for(const ramp of playgroundFeatures()){
 const terrain=new DirtJumpSystem(rolling,[{...ramp,x:0,z:0}]),pair=makePair(index,terrain,new THREE.Vector3(0,terrain.sample(0,-110)-.09,-110));
 for(let i=0;i<1200;i++){
  const raw=pair[0].controller.physics.body.translation().z<60?input(1):input();
  const states=pair.map(entry=>tick(entry,index,1/120,raw));compare(pair,states);
 }
 assert(pair[0].events.some(event=>event.type==='takeoff'),'both environments take off '+index+'/'+ramp.id);
 assert(pair[0].events.some(event=>event.type==='landing'),'both environments land '+index+'/'+ramp.id);
 for(const entry of pair){entry.dispose();entry.model.dispose();}scenarios++;
}
// Input semantics are shared, including touch braking-before-reverse and pads.
for(const index of [0,1]){
 const terrain=new DirtJumpSystem(()=>0,[]),pair=makePair(index,terrain,new THREE.Vector3(0,12,0));
 for(const entry of pair){entry.controller.physics.impulse({x:0,y:8,z:20});entry.controller.physics.state.airborne=true;}
 for(let i=0;i<600;i++){const states=pair.map(entry=>tick(entry,index,1/120,i<60?input(1,1):input()));compare(pair,states);}
 assert(pair[0].events.some(event=>event.type==='landing'),'shared controlled-air landing');
 for(const entry of pair){entry.dispose();entry.model.dispose();}

 const cannon=makePair(index,terrain,new THREE.Vector3());
 for(const entry of cannon){const bounds=entry.config.collision;entry.controller.limit=205;entry.controller.resetAt(new THREE.Vector3(0,-.09,205-bounds.radius-Math.max(Math.abs(bounds.rear),Math.abs(bounds.front))+.02),0);}
 let launched=false;
 for(let i=0;i<900;i++){
  const states=cannon.map(entry=>tick(entry,index,1/120,launched?input():input(1)));compare(cannon,states);
  if(states[0].cannon){if(!launched)assert(Math.abs(states[0].verticalSpeed-vehicleConfig[index?'garbageTruck':'backhoe'].boundaryCannon.verticalLaunchSpeed)<.0001,'configured cannon speed');launched=true;}
 }
 assert(launched&&cannon[0].events.some(event=>event.type==='landing'),'shared configured cannon flight/landing');
 for(const entry of cannon){entry.dispose();entry.model.dispose();}

 function earlySpeed(){
  const pair=makePair(index,terrain,new THREE.Vector3(0,-.09,-100));let states;
  for(let i=0;i<120;i++){states=pair.map(entry=>tick(entry,index,1/120,input(1)));compare(pair,states);}
  for(const entry of pair){entry.dispose();entry.model.dispose();}return states[0].speed;
 }
 const baseline=earlySpeed(),tuning=arcadeHandlingConfig[index?'stinky':'dirty'],savedAcceleration=tuning.acceleration;
 try{tuning.acceleration*=.5;assert(earlySpeed()<baseline*.6,'shared tuning edits reach game and lab');}finally{tuning.acceleration=savedAcceleration;}
 const legacy=jumpVehicleConfig[index?'stinky':'dirty'],savedLegacy={...legacy};
 try{Object.assign(legacy,{acceleration:.1,maxSpeed:1,releaseDeceleration:100,suspensionStiffness:500,suspensionCompression:100,suspensionRelaxation:100});assert(Math.abs(earlySpeed()-baseline)<1e-6,'legacy raycast drive/spring settings cannot override either hybrid');}finally{Object.assign(legacy,savedLegacy);}
 scenarios+=2;
}
// Edit a running controller through the same store used by the panel. Compare
// against an untouched moving controller: no recreation, reset or teleport.
for(const index of [0,1]){
 const terrain=new DirtJumpSystem(()=>0,[]),pair=makePair(index,terrain,new THREE.Vector3(0,-.09,-100));
 const key=index?'stinky':'dirty',other=index?'dirty':'stinky',path='arcadeHandlingConfig.'+key+'.acceleration';
 const otherAcceleration=arcadeHandlingConfig[other].acceleration;
 for(let i=0;i<30;i++)pair.forEach(entry=>tick(entry,index,1/120,input(1)));
 const bodies=pair.map(entry=>entry.controller.physics.body),positions=bodies.map(body=>({...body.translation()}));
 try{
  setTuning(path,0,null);
  pair.forEach((entry,i)=>{assert.equal(entry.controller.physics.body,bodies[i]);assert.deepEqual({...bodies[i].translation()},positions[i],'live edit keeps position');});
  const before=pair.map(entry=>entry.controller.physics.state.speed);
  const states=pair.map(entry=>tick(entry,index,1/120,input(1)));compare(pair,states);
  states.forEach((state,i)=>assert(state.speed<before[i],'zero acceleration takes effect on the running vehicle'));
  assert.equal(arcadeHandlingConfig[other].acceleration,otherAcceleration,'other vehicle unchanged');
 }finally{resetTuning([path],null);for(const entry of pair){entry.dispose();entry.model.dispose();}}
}
const touch=new PointerInputState();touch.set(1,'back');assert(mergeDrivingInput(new Set(),touch,null,10).brake);
assert(!mergeDrivingInput(new Set(),touch,null,10).reverse);assert(mergeDrivingInput(new Set(),touch,null,0).reverse);
assert(mergeDrivingInput(new Set(),new PointerInputState(),{axes:[.5],buttons:Array.from({length:8},(_,i)=>({value:i===7?1:0}))},0).accelerate);
assert.equal(JSON.stringify({arcadeHandlingConfig,vehicleConfig,jumpConfig,jumpVehicleConfig,originalDriveConfig}),tuningSnapshot,'approved tuning was not changed');
// Expanded MAIN world: actual exported Dirty/Stinky, approved controller/tuning,
// shared render/collider vertices, and cannon launches/landings at all four new edges.
const expanded=mainWorldSettings();assert.equal(expanded.worldSize,660);assert.equal(expanded.halfSize,330);assert.equal(expanded.areaScale,2.25);
assert.equal(mainWorldSettings({worldSize:440}).halfSize,220);assert.equal(mainWorldSettings({worldSize:99999}).worldSize,880);
const expandedTerrain=new DirtJumpSystem(rolling,playgroundFeatures()),expandedSurface=expandedTerrain.createWorldSurface(expanded.halfSize);
assert.equal(expandedSurface.vertices.reduce((max,value,i)=>i%3===0?Math.max(max,value):max,-Infinity),330);
assert(expandedSurface.indices.length/3<600000,'expanded render/collider mesh stays bounded without stretching grid');
for(let i=0;i<expandedSurface.vertices.length;i+=129){const x=expandedSurface.vertices[i],z=expandedSurface.vertices[i+2];assert(Math.abs(expandedSurface.vertices[i+1]-expandedTerrain.sample(x,z))<.0001);}
const expandedHeight=(x,z)=>expandedTerrain.sample(x,z),edge=expanded.halfSize-expanded.boundaryInset;
for(const index of [0,1]){
 const scene=new THREE.Scene(),model=exportedModel(index),config=playableVehicleConfig(index),trees=new TreeCollisionSystem(scene,{groundHeight:expandedHeight}),rocks=new RockInteractionSystem(scene,{groundHeight:expandedHeight});
 const controller=new RapierWorldVehicle(R,{surface:expandedSurface,height:expandedHeight,groundDebris:{getWheelHeightAt:()=>0},trees,rocks,limit:edge});
 controller.setVehicle(model.group,config,index,new THREE.Vector3(0,expandedHeight(0,0),0),0);
 for(const [x,z,heading] of [[0,edge-24,0],[edge-24,0,Math.PI/2],[0,-edge+24,Math.PI],[-edge+24,0,-Math.PI/2]]){
  controller.resetAt(new THREE.Vector3(x,expandedHeight(x,z)-.09,z),heading);
  let launched=false,landed=false,driven=false,launches=0,wasCannon=false;
  for(let frame=0;frame<1800;frame++){
   const state=controller.update(1/120,{throttle:launched?0:1});
   if(state.cannon&&!wasCannon){launched=true;launches++;}wasCannon=state.cannon;
   driven ||= Math.hypot(state.position.x-x,state.position.z-z)>8;
   if(launched&&state.events.some(event=>event.type==='landing'))landed=true;
   assert(Number.isFinite(state.position.y)&&Math.abs(state.position.x)<330&&Math.abs(state.position.z)<330,'new-edge flights remain inside collider extent');
   if(landed)break;
  }
  assert(driven&&launched&&landed,'real vehicle drives, launches and lands on new edge '+index+'/'+heading);assert.equal(launches,1);
 }
 controller.resetAt(new THREE.Vector3(0,expandedHeight(0,0)-.09,0),0);const resetPose=controller.rootPose({position:controller.physics.body.translation(),rotation:controller.physics.body.rotation()});assert(Math.hypot(resetPose.x,resetPose.z)<.001,'reset remains at original spawn');let settled;for(let i=0;i<120;i++)settled=controller.update(1/120,{});assert(Number.isFinite(settled.position.y)&&Math.hypot(settled.position.x,settled.position.z)<2,'reset settles near spawn');controller.dispose();trees.dispose();rocks.dispose();model.dispose();
}
assert(fs.readFileSync(path.join(process.argv[2],'viewer/jump-lab.js'),'utf8').includes('const halfSize=220,boundaryLimit=205'),'lab dimensions remain fixed');
assert.equal(JSON.stringify({arcadeHandlingConfig,vehicleConfig,jumpConfig,jumpVehicleConfig,originalDriveConfig}),tuningSnapshot,'approved vehicle physics unchanged');
console.log('PASS: expanded 660m main-world mesh/collider; actual Dirty and Stinky drive, cannon-jump and land at all four new edges, reset correctly; original scale and fixed lab bounds retained.');
console.log(`PASS: ${scenarios} real-model main/lab comparisons; Dirty four/Stinky six contacts, flat/rolling acceleration/top speed/turns/brakes/reverse, eight ramps, controlled flight/cannons/landings, identical wheel/body/dust feedback, touch/gamepad inputs, shared tuning edits and legacy override isolation; configuration unchanged.`);
