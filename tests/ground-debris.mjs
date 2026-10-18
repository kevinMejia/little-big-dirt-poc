import assert from 'node:assert/strict';
import * as THREE from '../three-test.mjs';
import {GroundDebrisSystem,DebrisWheelContacts,debrisHeight} from '../GroundDebrisSystem.js';
import {VehicleFeedback} from '../VehicleFeedback.js';
import {groundDebrisConfig} from '../VehicleConfig.js';
const scene=new THREE.Scene(),config={...groundDebrisConfig,densityPercent:50,interactivePercent:30,minBumpHeight:.05,maxBumpHeight:.25},flat=()=>0,painter={surface:()=>({slope:0,dirtMask:.5,path:.2})},layout={trees:[{x:30,z:30,scale:1}],rocks:[{x:-30,z:-30,radius:1}]};
const debris=new GroundDebrisSystem(scene,flat,220,painter,layout,config);
const snapshot=JSON.stringify(debris.objects);debris.regenerate();assert.equal(JSON.stringify(debris.objects),snapshot);assert.equal(debris.objects.length,500);assert.equal(debris.group.children.length,4);assert(debris.objects.every(o=>Math.hypot(o.x,o.z)>=14));
assert(debris.objects.some(o=>o.interactive)&&debris.objects.some(o=>!o.interactive));
const obstacle={x:-1,z:2,rx:.7,rz:.7,height:.25,angle:0,interactive:true};
function install(o){debris.grid.clear();for(let x=-2;x<=2;x++)for(let z=-2;z<=2;z++)debris.grid.set(x+','+z,[o]);}
install(obstacle);assert.equal(debrisHeight(-1,2,obstacle),.25);assert.equal(debrisHeight(-.3,2,obstacle),0);assert(debrisHeight(-.3001,2,obstacle)<1e-7);assert(debris.getWheelHeightAt(-1,2)<.25);
const root=new THREE.Group(),visual=new THREE.Group(),vehicle=new THREE.Group();scene.add(root);root.add(visual);visual.add(vehicle);
for(const x of [-1,1])for(const z of [-2,2]){const pivot=new THREE.Group();pivot.position.set(x,.7,z);pivot.userData.wheel={x,z,r:.7};vehicle.add(pivot);}
const contacts=new DebrisWheelContacts(),settings={bodyRollPercent:25,bodyPitchPercent:20,suspensionBouncePercent:20},feedback=new VehicleFeedback();
function step(dt=1/60){const targets=contacts.sample(vehicle,root,debris,settings);feedback.update(dt,{speed:0,yawRate:0,groundY:0,groundPitch:0,groundRoll:0,config:settings,debris:targets});visual.position.y=feedback.heave.value;visual.rotation.set(feedback.pitch.value,0,feedback.roll.value);root.updateMatrixWorld(true);contacts.ground(root,flat,feedback);return targets;}
let t=step();assert(contacts.wheels.filter(w=>w.bump>0).length===1);assert(t.pitch<0&&t.roll<0);const fl=contacts.wheels.find(c=>c.pivot.userData.wheel.x<0&&c.pivot.userData.wheel.z>0);assert(fl.bump>.2);
for(let i=0;i<240;i++)step();assert(feedback.heave.value>0&&Math.abs(feedback.roll.value)>.005);for(const c of contacts.wheels){const center=c.pivot.getWorldPosition(new THREE.Vector3());assert(Math.abs(center.y-(.7-.035+c.bump))<1e-6);}
root.position.z=4;step();assert(contacts.wheels.find(c=>c.pivot.userData.wheel.x<0&&c.pivot.userData.wheel.z<0).bump>.2); // rear follows same rock
root.position.z=0;step();assert(fl.bump>.2); // reverse
const mound={...obstacle,x:0,rx:2};install(mound);step();assert.equal(contacts.wheels.filter(w=>w.bump>0).length,2);
const branch={...obstacle,rx:2,rz:.12,angle:Math.PI/4};assert(debrisHeight(branch.x+1,branch.z+1,branch)>0);assert.equal(debrisHeight(branch.x+1,branch.z-1,branch),0);
const matrices=debris.group.children.map(b=>Array.from(b.instanceMatrix.array));let max=0;install(obstacle);
for(const hz of [20,60,144]){feedback.reset();for(let i=0;i<hz*6;i++){root.position.z=-5+i/hz*10;step(1/hz);max=Math.max(max,Math.abs(feedback.heave.value));assert(Number.isFinite(feedback.roll.value));}root.position.z=20;for(let i=0;i<hz*4;i++)step(1/hz);assert(Math.abs(feedback.heave.value)<1e-5);}
assert(max<=.3);assert.deepEqual(debris.group.children.map(b=>Array.from(b.instanceMatrix.array)),matrices);
config.suspensionEffectPercent=0;root.position.z=0;assert.equal(step().heave,0);assert(contacts.wheels.every(c=>c.bump===0));assert.equal(debris.objects.length,500);config.suspensionEffectPercent=60;
assert.equal(contacts.sample(vehicle,root,debris,settings,true).heave,0);
const truck=new THREE.Group();for(const x of [-1.4,1.4])for(const z of [-2,-.8,2.2]){const p=new THREE.Group();p.userData.wheel={x,z,r:.72};truck.add(p);}visual.add(truck);contacts.sample(truck,root,debris,settings);assert.equal(contacts.wheels.length,6);
let candidates=0;for(const list of debris.grid.values())candidates=Math.max(candidates,list.length);assert(candidates<20);
debris.regenerate();let busiest=0;for(const list of debris.grid.values())busiest=Math.max(busiest,list.length);assert(busiest<20);
const began=performance.now();for(let i=0;i<100000;i++)debris.getWheelHeightAt((i%70)-35,(i%67)-33);const ms=performance.now()-began;console.log(`100,000 footprint queries: ${ms.toFixed(1)}ms; busiest cell ${busiest} candidates`);
debris.showFootprints(true);debris.regenerate();debris.dispose();assert(!scene.children.includes(debris.group));
console.log('PASS: deterministic four-batch stationary debris; smooth ellipse/branch profiles, tire footprint; independent front/rear/reverse/parked contacts, paired mound, 20–144 Hz bounded springs/settling, zero effect, flight reset, six-wheel switch and cleanup.');


const expandedDebris=new GroundDebrisSystem(scene,flat,330,painter,layout,config,2.25);
assert.equal(expandedDebris.objects.length,1125,'same density on 2.25x map area');
assert(expandedDebris.objects.some(o=>Math.abs(o.x)>220||Math.abs(o.z)>220),'outer area has debris');
assert.equal(expandedDebris.group.children.length,4,'four instanced batches retained');expandedDebris.dispose();

// Main-world retirement: even enabled saved settings cannot override the local gate.
const retired=new GroundDebrisSystem(scene,flat,330,painter,layout,{...config,enabled:false},2.25);
assert.equal(retired.objects.length,0);
assert.equal(retired.grid.size,0,'no invisible bump footprints');
assert.equal(retired.group.children.length,0,'no rendered temporary debris');
retired.getWheelHeightAt=()=>{throw new Error('disabled debris must not sample bumps');};
const retiredContacts=new DebrisWheelContacts();
assert.deepEqual(retiredContacts.sample(truck,root,retired,settings),{heave:0,pitch:0,roll:0});
assert.equal(retiredContacts.wheels.length,6,'tire shadows/dust retain wheel descriptors');
assert(retiredContacts.wheels.every(w=>w.bump===0));
retiredContacts.ground(root,flat,feedback);
assert(retiredContacts.wheels.every(w=>Number.isFinite(w.pivot.position.y)),'ordinary terrain grounding retained');
retired.regenerate();assert.equal(retired.grid.size,0);assert.equal(retired.objects.length,0);
retired.dispose();
console.log('PASS: retired debris has no meshes, placements, bump grid or wheel queries; terrain wheel grounding retained.');
