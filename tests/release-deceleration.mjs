import assert from 'node:assert/strict';
import {applyReleaseDeceleration} from '../VehicleMotion.js';
import {vehicleConfig} from '../VehicleConfig.js';
for(const config of Object.values(vehicleConfig))for(const initial of [-20,-1,0,1,20])for(const dt of [1/144,1/60,1/30,.1]){
 let speed=initial,elapsed=0;
 if(Math.abs(initial)>1)assert.ok(Math.abs(applyReleaseDeceleration(initial,dt,config))>0,'release must be gradual');
 while(elapsed<10){const before=speed;speed=applyReleaseDeceleration(speed,dt,config);assert.ok(Math.abs(speed)<=Math.abs(before));assert.ok(speed*initial>=0,'never crosses into opposite movement');elapsed+=dt;}
 assert.equal(speed,0,'must reach exact zero');
 for(let i=0;i<100;i++)assert.equal(applyReleaseDeceleration(speed,dt,config),0,'rest remains zero');
}
assert.equal(applyReleaseDeceleration(.09,.016,vehicleConfig.backhoe),0);
assert.equal(applyReleaseDeceleration(-.09,.016,vehicleConfig.backhoe),0);
assert.equal(applyReleaseDeceleration(10,.1,{releaseDeceleration:5,stopThreshold:.1,autoBrakeOnRelease:false}),10);
assert.ok(applyReleaseDeceleration(10,.1,vehicleConfig.backhoe)<applyReleaseDeceleration(10,.1,vehicleConfig.garbageTruck));
console.log('PASS: gradual forward/reverse braking, per-vehicle rates, exact zero/hold, threshold snap, no sign reversal, configurable disable and variable frame rates.');
