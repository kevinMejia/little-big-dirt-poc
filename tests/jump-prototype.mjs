import assert from 'node:assert/strict';
import fs from 'node:fs';
import R from '../viewer/vendor/rapier/rapier.mjs';
import {DirtJumpSystem,playgroundFeatures} from '../DirtJumpSystem.js';
import {JumpVehiclePrototype,matchWheelContacts,interpolateJumpPose} from '../JumpVehiclePrototype.js';
import {jumpConfig} from '../VehicleConfig.js';
await R.init();assert.equal(R.version(),'0.21.0');
const ramps=new DirtJumpSystem(),surface=ramps.createSurface(120,1);
assert(surface.spacing<=1);assert.equal(surface.indices.length,240*240*6);
for(let i=0;i<surface.vertices.length;i+=3)assert(Math.abs(surface.vertices[i+1]-ramps.sample(surface.vertices[i],surface.vertices[i+2]))<1e-5);
for(const f of ramps.features){assert(Math.abs(ramps.sample(f.x,f.z)-f.height)<1e-8);assert.equal(ramps.sample(f.x+f.width,f.z),0);assert.equal(ramps.sample(f.x,f.z-f.approach-1),0);assert(ramps.contains(f.x,f.z));assert(ramps.dirtMask(f.x,f.z)>.6);
 for(let q=-f.approach-1;q<80;q+=.07)assert(Math.abs(ramps.sample(f.x,f.z+q+.001)-ramps.sample(f.x,f.z+q))<.002,'continuous height, defined lip');
 if(f.id==='gentle'||f.id==='kicker'){const slope=(ramps.sample(f.x,f.z-.001)-ramps.sample(f.x,f.z-.011))/.01;assert(slope>.2,'launch lip retains uphill tangent');}
}
const turned=new DirtJumpSystem(()=>2,[{...playgroundFeatures()[0],x:0,z:0,angle:Math.PI/2}]);assert(turned.sample(-3,0)>2);assert.equal(turned.sample(0,20),2);
let total=0;
for(const vehicle of ['dirty','stinky'])for(const f of ramps.features){
 const p=new JumpVehiclePrototype(R,surface,{vehicle});p.reset(f.x,f.z-43,0);let took=false,landed=false,peak=0,impact=0,compression=0;
 for(let i=0;i<1200;i++){const pos=p.body.translation();p.step(1/120,{throttle:pos.z<f.z+48?1:0});for(const e of p.events.splice(0)){if(e.type==='takeoff'&&e.vy>.5)took=true;if(e.type==='landing'&&took){landed=true;impact=Math.max(impact,e.impact);}}const now=p.body.translation();peak=Math.max(peak,now.y-p.offset-ramps.sample(now.x,now.z));compression=Math.max(compression,...p.state.compression);assert([now.x,now.y,now.z,p.state.speed].every(Number.isFinite));assert(now.y>-1);}
 assert(took,vehicle+' '+f.id+' real takeoff');assert(landed,vehicle+' '+f.id+' real landing');assert(peak>.12);assert(impact>.5);assert(compression>.04);
 for(let i=0;i<2400;i++)p.step(1/120,{});const v=p.body.linvel();assert.equal(v.x,0,vehicle+' release stop X');assert.equal(v.z,0,vehicle+' release stop Z');const stopped={...p.body.translation()};for(let i=0;i<240;i++)p.step(1/120,{});assert.deepEqual({...p.body.translation()},stopped,'holds stopped');
 p.dispose();total++;
}
const flat=new DirtJumpSystem().createSurface(120,2),p=new JumpVehiclePrototype(R,flat);p.reset(0,-70,0);for(let i=0;i<200;i++)p.step(1/120,{});p.impulse({x:0,y:8,z:10});while(p.state.contacts)p.step(1/120,{});for(let i=0;i<8;i++)p.step(1/120,{});const before=p.body.linvel().y;for(let i=0;i<12;i++)p.step(1/120,{});assert(Math.abs(p.body.linvel().y-before+12*Math.max(.25,Math.min(2,jumpConfig.gravityScalePercent/100))*(12/120))<.03,'gravity drives airborne velocity');p.step(1/120,{pitch:1});assert(Math.abs(p.body.angvel().x)>0,'air pitch torque');p.dispose();
// Analytic free flight at known gravity values also guards both clamps. Starting
// high above terrain isolates gravity from contacts, springs and landing effects.
for(const [percent,gravity] of [[0,3],[25,3],[100,12],[200,24],[250,24]]){
 const flight=new JumpVehiclePrototype(R,flat,{config:{...jumpConfig,gravityScalePercent:percent}});
 flight.reset(0,-70,30);flight.hasGrounded=true;flight.body.setLinvel({x:0,y:8,z:0},true);
 for(let i=0;i<12;i++)flight.step(1/120,{});
 assert.equal(flight.state.contacts,0,'gravity fixture stays in free flight');
 assert(Math.abs(flight.body.linvel().y-(8-gravity*.1))<.003,percent+'% gravity follows analytic velocity and supported clamps');
 flight.dispose();
}
const manifest=JSON.parse(fs.readFileSync(new URL('../assets/dirty/manifest.json',import.meta.url),'utf8'));
const binding=matchWheelContacts(manifest.wheels,p.wheels);assert.deepEqual(binding.map(b=>b.physicsIndex),[2,0,3,1]);for(const {wheel,physicsIndex} of binding){const contact=p.wheels[physicsIndex];assert.equal(wheel.x,contact.x);assert.equal(wheel.z,contact.z);assert.equal(wheel.radius,contact.r);assert.equal(wheel.front,contact.front);}assert.throws(()=>matchWheelContacts([...manifest.wheels,manifest.wheels[0]],p.wheels),/unique/);
const reverse=new JumpVehiclePrototype(R,flat);reverse.reset(0,-70,0);for(let i=0;i<300;i++)reverse.step(1/120,{throttle:1});assert(reverse.state.speed>5);for(let i=0;i<700;i++)reverse.step(1/120,{throttle:-1});assert(reverse.state.speed<-2,'brake before reversing');for(let i=0;i<1200;i++)reverse.step(1/120,{});assert.equal(reverse.body.linvel().z,0,'reverse release stops');reverse.dispose();
const tipped=new JumpVehiclePrototype(R,flat);tipped.reset(0,-70,0);tipped.body.setTranslation({x:0,y:.6,z:-70},true);tipped.body.setRotation({x:1,y:0,z:0,w:0},true);for(let i=0;i<2400;i++)tipped.step(1/120,{});const tq=tipped.body.rotation();const upY=1-2*(tq.x*tq.x+tq.z*tq.z);assert(upY>.65,'force-driven recovery from an inverted landing');tipped.dispose();
const ends=[];for(const hz of [30,60,120]){const p=new JumpVehiclePrototype(R,surface);p.reset(-66,-13,0);for(let i=0;i<hz*6;i++)p.update(1/hz,{throttle:1});ends.push({...p.body.translation()});p.dispose();}assert(Math.abs(ends[0].z-ends[2].z)<.25,'fixed timestep frame independence');
const source=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');assert(!source.includes('JumpVehiclePrototype'));assert(source.includes('DirtJumpSystem'));assert(!source.includes('id="physicsMode"'));assert(!source.includes("physicsMode==='original'"));assert(source.includes('await loadWorldPhysics()'));assert(source.includes("dataset.phase='physics-error'"));
console.log(`PASS: ${total} actual Rapier ramp/mass scenarios; continuous oriented profiles/lips, shared mesh, takeoff/gravity/pitch/landing/compression, exact release stop/hold, fixed timestep and main-world comparison gate.`);



for(const hz of [60,90,144,165]){const p=new JumpVehiclePrototype(R,flat);p.reset(0,-70,30);p.impulse({x:0,y:8,z:10});let previous=null;for(let i=0;i<hz*.5;i++){p.update(1/hz,{});const pose=p.getRenderPose();if(previous!==null&&i>3)assert(Math.abs(pose.position.z-previous-10/hz)<.0002,'uniform rendered travel between fixed physics steps');previous=pose.position.z;assert(Math.abs(Math.hypot(...Object.values(pose.rotation))-1)<1e-8);}p.reset(5,6,2);assert.equal(p.getRenderPose().position.x,5);assert.equal(p.getRenderPose().position.z,6);p.dispose();}
console.log('PASS: chassis/wheel render interpolation at 60–165 Hz, normalized shortest-path orientation and reset history; physics timestep unchanged.');
