import {mainWorldRamps,rampPoint} from '../MainWorldRamps.js';
import {createSceneryLayout,createTerrainPainter,worldAppearance} from '../WorldAppearance.js';
import assert from 'node:assert/strict';
import * as THREE from '../three-test.mjs';
import R from '../viewer/vendor/rapier/rapier.mjs';
import {RapierWorldVehicle} from '../RapierWorldVehicle.js';
import {DirtJumpSystem,playgroundFeatures} from '../DirtJumpSystem.js';
import {TreeCollisionSystem} from '../TreeCollisionSystem.js';
import {RockInteractionSystem} from '../RockInteractionSystem.js';
import {vehicleConfig,groundDebrisConfig,arcadeHandlingConfig,jumpConfig} from '../VehicleConfig.js';
import {applyReleaseDeceleration,getSpeedMultiplier} from '../VehicleMotion.js';
await R.init();
const base=(x,z)=>2.6*Math.sin(x*.035)*Math.cos(z*.044)+3.6*Math.sin((x+z)*.018)+1.4*Math.cos(z*.085+x*.027)+.00034*(x*x+z*z);
const jumps=new DirtJumpSystem(base,playgroundFeatures()),surface=jumps.createWorldSurface();
assert(surface.indices.length/3<300000,'bounded shared terrain mesh');
for(let i=0;i<surface.vertices.length;i+=3)assert(Math.abs(surface.vertices[i+1]-jumps.sample(surface.vertices[i],surface.vertices[i+2]))<1e-4);
const scene=new THREE.Scene(),trees=new TreeCollisionSystem(scene),rocks=new RockInteractionSystem(scene),debris={revision:0,objects:[],group:new THREE.Group()};
const flat=new DirtJumpSystem().createSurface(220,2);
assert.throws(()=>new RapierWorldVehicle(R,{surface:flat,height:()=>0,groundDebris:debris,trees:{},rocks}),/current tree\/rock collision adapters/,'reject stale modules before activation');
function vehicle(index){const group=new THREE.Group(),wheels=index===0?[[-1.31,-1.12,.92],[-1.24,1.36,.66],[1.31,-1.12,.92],[1.24,1.36,.66]]:[-1.43,1.43].flatMap(x=>[-2.15,-.8,2.25].map(z=>[x,z,.72]));for(const [x,z,r] of wheels){const p=new THREE.Group();p.userData.wheel={x,z,r};p.userData.roll=new THREE.Group();p.add(p.userData.roll);group.add(p);}return group;}
const cfg=index=>({max:index?17:21,reverse:index?7:9,hill:{...vehicleConfig[index?'garbageTruck':'backhoe'],speedAdjustmentPercent:0,downhillBoostPercent:35,uphillPenaltyPercent:40},collision:{radius:1.2,rear:-2.4,front:2.75}});
// Verify edit/save/reload-style tuning reaches the actual active controller.
for(const index of [0,1]){
 const tuning=arcadeHandlingConfig[index?'stinky':'dirty'],saved={...tuning};
 function trial(overrides){
  Object.assign(tuning,saved,overrides);
  const game=new RapierWorldVehicle(R,{surface:flat,height:()=>0,groundDebris:debris,trees,rocks,limit:10000});
  game.setVehicle(vehicle(index),cfg(index),index,new THREE.Vector3(0,-.09,0),0);
  let early=0,final;
  for(let i=0;i<960;i++){final=game.update(1/120,{throttle:1,steering:i>720?.6:0});if(i===119)early=final.speed;}
  const result={early,speed:final.speed,heading:final.heading};game.dispose();return result;
 }
 try{
  const baseline=trial({}),slower=trial({acceleration:saved.acceleration*.5}),capped=trial({topSpeed:5}),noTurn=trial({steeringResponse:0});
  assert(slower.early<baseline.early*.6,'acceleration tuning is connected');
  assert(capped.speed<=5.001&&baseline.speed>capped.speed*2,'topSpeed tuning is connected');
  assert(Math.abs(noTurn.heading)<.0001&&Math.abs(baseline.heading)>.5,'steeringResponse tuning is connected');
 }finally{Object.assign(tuning,saved);}
}
// Compare actual world-controller output with Original's flat-ground equations.
// Default speed boosts expose the 37.8 / 51 m/s regime missed by the old lab.
for(const index of [0,1])for(const steering of [0,-1,1]){
 const config=cfg(index);config.hill={...vehicleConfig[index?'garbageTruck':'backhoe']};
 const t=arcadeHandlingConfig[index?'stinky':'dirty'],scale=getSpeedMultiplier(config.hill.speedAdjustmentPercent);
 const game=new RapierWorldVehicle(R,{surface:flat,height:()=>0,groundDebris:debris,trees,rocks,limit:10000});
 game.setVehicle(vehicle(index),config,index,new THREE.Vector3(0,-.09,0),0);
 let speed=0,heading=0;
 for(let i=0;i<1800;i++){
  const h=1/120,throttle=i<1200?1:0,turn=i<1000?0:steering,emergencyBrake=i>=1450;
  speed+=throttle*t.acceleration*scale*h;speed-=speed*t.drag*h*.08;speed=Math.min(speed,t.topSpeed*scale);
  if(emergencyBrake)speed=Math.max(0,speed-38*h);
  if(!throttle)speed=applyReleaseDeceleration(speed,h,config.hill);
  heading-=turn*t.turn*Math.min(Math.abs(speed)/9,1)*h*Math.sign(speed||1);
  const state=game.update(h,{throttle,steering:turn,emergencyBrake});
  assert(Math.abs(state.speed-speed)<.002,`Original speed parity ${index}/${i}`);
  assert(Math.abs(Math.atan2(Math.sin(state.heading-heading),Math.cos(state.heading-heading)))<.0001,'Original turn parity');
  assert(!state.airborne,'flat full-speed straight/turn remains grounded');
  const up=game.physics.body.rotation();assert(Math.abs(up.x)+Math.abs(up.z)<.00001,'no rollover');
  if(i===999)assert(Math.abs(state.speed-t.topSpeed*scale)<.01,'reaches Original top speed');
 }
 game.dispose();
}
for(const index of [0,1]){
 const game=new RapierWorldVehicle(R,{surface:flat,height:()=>0,groundDebris:debris,trees,rocks});game.setVehicle(vehicle(index),cfg(index),index,new THREE.Vector3(0,0,-65),.15);
 assert.equal(game.pivots.length,index?6:4);assert.equal(game.physics.getRenderPose().position.x,0);assert(Math.abs(game.rootPose(game.physics.currentPose).y)<1e-6);assert(Math.abs(game.update(0,{}).heading-.15)<1e-6);
 for(let i=0;i<360;i++)game.update(1/120,{throttle:1,steering:0});assert(game.physics.state.speed>8);
 for(let i=0;i<2400;i++)game.update(1/120,{});assert.equal(game.physics.body.linvel().x,0);assert.equal(game.physics.body.linvel().z,0);const parked={...game.physics.body.translation()};for(let i=0;i<120;i++)game.update(1/120,{});assert.deepEqual({...game.physics.body.translation()},parked);
 const pose=game.rootPose(game.physics.currentPose);game.resetAt(pose,.7);assert.equal(game.physics.body.linvel().z,0);assert(Math.abs(game.rootPose(game.physics.currentPose).y-pose.y)<1e-6);
 game.resetAt(new THREE.Vector3(0,0,200),0);let launched=false,landed=false,peak=0,launches=0,prior=false;for(let i=0;i<1500;i++){const state=game.update(1/120,{throttle:launched?0:1});if(game.cannonFlight&&!prior){launches++;launched=true;}prior=game.cannonFlight;peak=Math.max(peak,state.position.y);if(state.events.some(e=>e.type==='landing')&&launched)landed=true;assert(Math.abs(state.position.x)<210&&Math.abs(state.position.z)<210);assert(Number.isFinite(state.verticalSpeed));}
 assert(launched&&landed,'physical cannon takeoff and landing');const gravity=12*Math.max(.25,Math.min(2,jumpConfig.gravityScalePercent/100)),expectedRise=cfg(index).hill.boundaryCannon.verticalLaunchSpeed**2/(2*gravity);assert(Math.abs(peak-expectedRise)<.5,'cannon apex follows configured launch speed and clamped gravity');assert.equal(launches,1);game.dispose();
}

for(const index of [0,1])for(const ramp of jumps.features){
 const game=new RapierWorldVehicle(R,{surface,height:(x,z)=>jumps.sample(x,z),groundDebris:debris,trees,rocks});game.setVehicle(vehicle(index),cfg(index),index,new THREE.Vector3(ramp.x,jumps.sample(ramp.x,ramp.z-43),ramp.z-43),0);
 let took=false,landed=false,compression=0;for(let i=0;i<1500;i++){const z=game.physics.body.translation().z,state=game.update(1/120,{throttle:z<ramp.z+55?1:0});for(const e of state.events){if(e.type==='takeoff'&&e.vy>.5)took=true;if(e.type==='landing'&&took)landed=true;}compression=Math.max(compression,...game.physics.state.compression);assert(Number.isFinite(state.position.y));}
 assert(took&&landed,`world ${index} ${ramp.id} jump/land`);assert(compression>.04);for(let i=0;i<2400;i++)game.update(1/120,{});assert.equal(game.physics.body.linvel().x,0,'hill release X');assert.equal(game.physics.body.linvel().z,0,'hill release Z');game.dispose();
}
// Gentle hills and repeated small bumps stay attached at normal maximum speed.
for(const index of [0,1])for(const bumps of [false,true]){
 const height=bumps?(x,z)=>.08*Math.sin(z*1.2):(x,z)=>2*Math.sin(z*.025);
 const game=new RapierWorldVehicle(R,{surface:flat,height,groundDebris:debris,trees,rocks,limit:10000});
 game.setVehicle(vehicle(index),cfg(index),index,new THREE.Vector3(0,height(0,0)-.09,0),0);
 for(let i=0;i<1200;i++){const state=game.update(1/120,{throttle:1});assert(!state.airborne,'hills/small bumps remain supported');assert(Math.abs(state.position.y-height(state.position.x,state.position.z)+.09)<.00001);}
 // An inverted cannon landing must also return control, rather than rest on its roof.
 game.physics.reset(0,0,12);game.physics.body.setRotation({x:1,y:0,z:0,w:0},true);
 game.physics.impulse({x:0,y:-3,z:5});game.physics.state.airborne=true;
 let landed=false;for(let i=0;i<600;i++){const state=game.update(1/120,{});landed||=state.events.some(e=>e.type==='landing');}
 assert(landed&&!game.physics.state.airborne,'inverted landing settles');game.dispose();
}
for(const index of [0,1]){
 const game=new RapierWorldVehicle(R,{surface:flat,height:()=>0,groundDebris:debris,trees,rocks,limit:10000});
 game.setVehicle(vehicle(index),cfg(index),index,new THREE.Vector3(0,12,0),0);
 game.physics.impulse({x:0,y:8,z:20});game.physics.state.airborne=true;
 for(let i=0;i<48;i++)game.update(1/120,{pitch:1,steering:1});
 const q=game.physics.body.rotation();assert(Math.abs(q.x)>.005&&Math.abs(q.z)>.002,'hybrid pitch and roll authority');
 assert(game.physics.body.linvel().y<4,'Rapier gravity acts during flight');
 let landings=0;for(let i=0;i<1200;i++)landings+=game.update(1/120,{}).events.filter(e=>e.type==='landing').length;
 assert.equal(landings,1,'one settled landing, no repeated bounce');game.dispose();
}
// Imported debris no longer transfers disruptive forces into the chassis.
const mound=new THREE.SphereGeometry(1,12,8),batch=new THREE.InstancedMesh(mound,new THREE.MeshBasicMaterial(),2);batch.name='dirtClump';const matrix=new THREE.Matrix4();for(let i=0;i<2;i++){matrix.compose(new THREE.Vector3(i?1.3:-1.3,0,-60),new THREE.Quaternion(),new THREE.Vector3(1.2,.5,3));batch.setMatrixAt(i,matrix);}const debrisFixture={revision:1,group:new THREE.Group(),objects:[{kind:'dirtClump',interactive:true},{kind:'dirtClump',interactive:true}]};debrisFixture.group.add(batch);
const priorEffect=groundDebrisConfig.suspensionEffectPercent;const peaks=[];
for(const strength of [0,100]){groundDebrisConfig.suspensionEffectPercent=strength;const game=new RapierWorldVehicle(R,{surface:flat,height:()=>0,groundDebris:debrisFixture,trees,rocks});game.setVehicle(vehicle(0),cfg(0),0,new THREE.Vector3(0,0,-65),0);let peak=-Infinity;for(let i=0;i<380;i++){const state=game.update(1/120,{throttle:1});if(state.position.z>-63&&state.position.z<-57)peak=Math.max(peak,state.position.y);}peaks.push(peak);game.dispose();}groundDebrisConfig.suspensionEffectPercent=priorEffect;assert(Math.abs(peaks[1]-peaks[0])<.001,'debris never launches hybrid chassis');mound.dispose();batch.material.dispose();
// Existing collision semantics applied to an already-integrated displacement.
const empty=new THREE.Vector3(30,0,12),velocity={x:0,z:2};trees.resolveMovement(empty,30,11,0,2,.5,{radius:1,rear:-1,front:1},{},velocity);assert(Math.abs(empty.z-12)<1e-10,'no second movement step');
const tree=new THREE.Group();tree.position.set(0,0,5);scene.add(tree);trees.addTree(tree,.3,3);const impact=new THREE.Vector3(0,0,10);trees.resolveMovement(impact,0,0,0,100,.1,{radius:1,rear:-1,front:1},{},velocity);assert(impact.z<3);assert(velocity.z<0);
trees.dispose();rocks.dispose();
console.log('PASS: shared adaptive world mesh, original-order Dirty/four and Stinky/six contacts, preserved reset pose/heading, driving/exact stop/hold, both physical cannon flights/landings/single encounter/containment, eight rolling-world ramp jumps/landings, hill stopping, debris force isolation, no duplicate movement and tree rebound; Original speed/yaw parity at default boosted limits, full-speed stable turns, gentle hills/small bumps, and inverted landing recovery.');

const scatteredLayout=createSceneryLayout(createTerrainPainter(base,220),330,worldAppearance,2.25);
const scatteredJumps=new DirtJumpSystem(base,mainWorldRamps({halfSize:330,height:base,layout:scatteredLayout}));
const scatteredMesh=scatteredJumps.createWorldSurface(330,2,1.5);
for(const index of [0,1])for(const ramp of scatteredJumps.features){
 const start=rampPoint(ramp,0,-48);
 const game=new RapierWorldVehicle(R,{surface:scatteredMesh,height:(x,z)=>scatteredJumps.sample(x,z),groundDebris:debris,trees,rocks,limit:320});
 game.setVehicle(vehicle(index),cfg(index),index,new THREE.Vector3(start.x,scatteredJumps.sample(start.x,start.z),start.z),ramp.angle);
 let took=false,landed=false,reached=false;
 for(let i=0;i<1600;i++){
  const p=game.physics.body.translation(),along=scatteredJumps.local(p.x,p.z,ramp).along;
  const state=game.update(1/120,{throttle:along<70?1:0});
  if(along>40)reached=true;
  for(const e of state.events){if(e.type==='takeoff'&&e.vy>.5)took=true;if(e.type==='landing'&&took)landed=true;}
  assert([state.position.x,state.position.y,state.position.z].every(Number.isFinite));
 }
 assert(took&&landed&&reached,`scattered ramp ${index} ${ramp.id} usable: takeoff=${took} landing=${landed} reached=${reached}`);
 game.dispose();
}
console.log('PASS: both vehicles approach, jump and land all four seeded, rotated main-world ramps on actual rolling terrain.');

// Turbo is an overlay on the authoritative controller, not a second solver.
for(const index of [0,1]){
 const game=new RapierWorldVehicle(R,{surface:flat,height:()=>0,groundDebris:debris,trees,rocks,limit:10000});
 game.setVehicle(vehicle(index),cfg(index),index,new THREE.Vector3(0,0,-65),0);
 const normal=game.cfg.max,normalConfig=JSON.stringify(game.cfg),baseVelocity=normal;
 assert(game.collectTurbo());assert(Math.abs(game.physics.body.linvel().z-normal*3)<1e-6,'immediate 3x speed');
 for(let i=0;i<120;i++)game.update(1/120,{throttle:1,steering:.1});
 assert(game.turbo.remaining>.99 && game.turbo.remaining<1.01);
 assert(Math.abs(game.physics.state.speed)>normal*2.8,'raised speed cap');
 game.collectTurbo();assert.equal(game.turbo.remaining,2);assert(game.physics.state.speed<normal*3.1,'no stacking');
 for(let i=0;i<240;i++)game.update(1/120,{throttle:1});
 assert(game.turbo.remaining<1e-10);
 const previous=game.physics.state.speed;game.update(1/120,{throttle:1});
 assert(previous-game.physics.state.speed<normal*.3,'smooth expiration, no velocity snap');
 for(let i=0;i<1000;i++)game.update(1/120,{throttle:1});
 assert(Math.abs(game.physics.state.speed-normal)<.1,'returns to ordinary speed');
 assert.equal(JSON.stringify(game.cfg),normalConfig,'no permanent vehicle tuning mutation');
 game.collectTurbo();game.resetAt(new THREE.Vector3(0,0,0),0);assert.equal(game.turbo.remaining,0);assert.equal(game.physics.state.speed,0);
 game.physics.state.airborne=true;game.physics.body.setLinvel({x:4,y:12,z:8},true);game.collectTurbo();
 const v=game.physics.body.linvel();assert.equal(v.y,12,'airborne boost preserves vertical momentum');assert(Math.abs(Math.hypot(v.x,v.z)-normal*3)<.001);
 game.dispose();
}
for(const index of [0,1])for(const ramp of scatteredJumps.features){
 const start=rampPoint(ramp,0,-45),game=new RapierWorldVehicle(R,{surface:scatteredMesh,height:(x,z)=>scatteredJumps.sample(x,z),groundDebris:debris,trees,rocks,limit:320});
 game.setVehicle(vehicle(index),cfg(index),index,new THREE.Vector3(start.x,scatteredJumps.sample(start.x,start.z),start.z),ramp.angle);
 game.collectTurbo();let took=false,landed=false;
 for(let i=0;i<1300;i++){
  const state=game.update(1/120,{throttle:game.cannonFlight?0:1});
  for(const e of state.events){if(e.type==='takeoff'&&e.vy>.5)took=true;if(e.type==='landing'&&took)landed=true;}
  assert([state.position.x,state.position.y,state.position.z,state.speed].every(Number.isFinite));
  if(took&&landed)break;
 }
 assert(took&&landed,`boosted ${index} ${ramp.id} launch and landing`);game.dispose();
}
console.log('PASS Turbo both vehicles: immediate 3x, 2-second duration/refill, smooth expiry, no tuning mutation, reset, airborne momentum, and all eight boosted ramp launches/landings.');
