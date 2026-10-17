import assert from 'node:assert/strict';
import {VehicleFeedback,SoftBoundary,cameraReturnDecay,boundaryFlightProgress} from '../VehicleFeedback.js';
import {vehicleConfig} from '../VehicleConfig.js';
const config=vehicleConfig.backhoe;
const frame=(feedback,dt,speed=10,yawRate=0,groundY=0,settings=config)=>feedback.update(dt,{speed,yawRate,groundY,groundPitch:0,groundRoll:0,config:settings});
for(const dt of [1/144,1/60,1/20]){
 const f=new VehicleFeedback();frame(f,dt,0);
 for(let i=0;i<1/dt;i++)frame(f,dt,Math.min(10,(i+1)*dt*10),.8);
 assert.ok(f.pitch.value<-.005,'acceleration pitches back');assert.ok(f.roll.value>.01,'right turn rolls outward');
 for(let i=0;i<.5/dt;i++)frame(f,dt,Math.max(0,10-(i+1)*dt*20));
 assert.ok(f.pitch.value>.005,'braking pitches forward');
 for(let i=0;i<4/dt;i++)frame(f,dt,0);
 assert.ok(Math.abs(f.pitch.value)+Math.abs(f.roll.value)+Math.abs(f.heave.value)<.00001,'settles at rest');
 f.reset();for(let i=0;i<2/dt;i++)frame(f,dt,10,0,.06*Math.sin(i*dt*10));
 assert.ok(Math.abs(f.heave.value)>.0001,'uneven ground excites bounce');
 f.reset();const disabled={bodyRollPercent:0,bodyPitchPercent:0,suspensionBouncePercent:0};
 for(let i=0;i<1/dt;i++)frame(f,dt,i*dt*10,.8,Math.sin(i*dt),disabled);
 assert.equal(f.pitch.value,0);assert.equal(f.roll.value,0);assert.equal(f.heave.value,0);
}
const results=[1/144,1/60,1/20].map(dt=>{const f=new VehicleFeedback();for(let i=0;i<2/dt;i++)frame(f,dt,10,.8);return f.roll.value;});
assert.ok(Math.max(...results)-Math.min(...results)<.0001,'spring response consistent across frame rates');
console.log('PASS: visible outward roll, acceleration/braking pitch, terrain bounce, settling, disabled settings and variable frame rates.');
assert.equal(cameraReturnDecay(0,1),1,'0% holds orbit');
assert.ok(cameraReturnDecay(100,1)<cameraReturnDecay(50,1));
for(const dt of [1/144,1/60,1/20])assert.ok(Math.abs(cameraReturnDecay(50,dt)**Math.round(1/dt)-Math.exp(-4))<1e-10);
const bounds={radius:1.2,rear:-2.4,front:2.75},limit=205;
for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2,Math.PI/4])for(const sign of [-1,1]){
 const state=new SoftBoundary(),fx=Math.sin(heading),fz=Math.cos(heading);
 const distance=210/Math.max(Math.abs(fx),Math.abs(fz));const p={x:fx*sign*distance,z:fz*sign*distance};const hit=state.resolve(p,heading,sign*20,limit,bounds,config,sign);
 assert.ok(hit.impact>0);const vx=fx*hit.speed+state.x,vz=fz*hit.speed+state.z;
 assert.ok(vx*hit.nx+vz*hit.nz>0,'rebound points inward');assert.ok(Math.hypot(vx,vz)<=3.00001,'rebound capped');
 assert.ok(Math.abs(p.x)<205&&Math.abs(p.z)<205,'inside playable boundary');
}
for(const dt of [1/144,1/60,1/20]){
 const state=new SoftBoundary(),p={x:0,z:210};let speed=20,hits=0;
 for(let i=0;i<8/dt;i++){
  state.damp(dt,false,config);speed=Math.min(21,speed+11*dt);p.z+=(speed+state.z)*dt;p.x+=state.x*dt;
  const hit=state.resolve(p,0,speed,limit,bounds,config,1);speed=hit.speed;if(hit.impact>.1)hits++;
 }
 assert.equal(hits,1,'holding into wall never repeats rebound');
 // Reverse remains immediately usable and releases the contact latch after clearing.
 for(let i=0;i<2/dt;i++){speed=-3;p.z+=speed*dt;state.resolve(p,0,speed,limit,bounds,config,-1);}
 assert.ok(!state.latched&&p.z<200,'reverse escapes normally');
 state.x=2;state.z=1;for(let i=0;i<2/dt;i++)state.damp(dt,true,config);
 assert.equal(state.x,0);assert.equal(state.z,0,'release braking stops residual boundary motion');
}
const noBounce=new SoftBoundary();const contact=noBounce.resolve({x:0,z:210},0,20,limit,bounds,{...config,boundaryBouncePercent:0},1);assert.equal(contact.speed,0);
const impact=new VehicleFeedback();impact.boundaryImpact(20,1,0,config);frame(impact,1/60,0);assert.ok(impact.heave.value<0,'barrier compresses chassis');
for(let i=0;i<300;i++)frame(impact,1/60,0);assert.ok(Math.abs(impact.heave.value)<1e-8,'barrier reaction settles');
console.log('PASS: orbit return 0/50/100%, frame independence; all boundary normals, corners/reverse, capped rebound, contact latch, escape, release stop and compression settling.');
assert.deepEqual(boundaryFlightProgress(0,3),{progress:0,arc:0,landed:false});
assert.equal(boundaryFlightProgress(1.5,3).arc,1,'original full launch height retained');
assert.deepEqual(boundaryFlightProgress(3,3),{progress:1,arc:0,landed:true});
assert.ok(boundaryFlightProgress(.001,3).arc<.00001,'lift-off/arrival ease without a velocity step');
for(const dt of [1/144,1/60,1/20]){
 const feedback=new VehicleFeedback();feedback.landingImpact(config);let lowest=0,rebound=0;
 for(let i=0;i<5/dt;i++){frame(feedback,dt,0);lowest=Math.min(lowest,feedback.heave.value);rebound=Math.max(rebound,feedback.heave.value);}
 assert.ok(lowest<-.05,'landing visibly compresses chassis');assert.ok(rebound>.005,'chassis rebounds after contact');
 assert.ok(Math.abs(feedback.heave.value)<1e-6,'landing settles');assert.equal(feedback.landingSeconds,0);
}
const quiet=new VehicleFeedback();quiet.landingImpact({...config,boundaryBouncePercent:0,boundaryBodyRockPercent:0});frame(quiet,1/60,0);assert.equal(quiet.heave.value,0);assert.equal(quiet.pitch.value,0);
console.log('PASS: restored airborne arc/endpoints, eased arrival, landing compression/rebound/settling at 20–144 Hz and disabled landing effects.');
