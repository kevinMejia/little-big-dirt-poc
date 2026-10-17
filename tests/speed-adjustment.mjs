import assert from 'node:assert/strict';
import {getSpeedMultiplier,applyReleaseDeceleration} from '../VehicleMotion.js';
import {HillSpeedPhysics} from '../HillSpeedPhysics.js';
import {vehicleConfig} from '../VehicleConfig.js';
for(const value of [0,'',null,undefined,'  ','0','invalid',Infinity,NaN])assert.equal(getSpeedMultiplier(value),1);
assert.equal(getSpeedMultiplier(100),2);assert.equal(getSpeedMultiplier(-50),.5);assert.equal(getSpeedMultiplier(-100),0);assert.equal(getSpeedMultiplier(-200),0);
for(const config of Object.values(vehicleConfig))for(const sign of [-1,1])for(const dt of [1/144,1/60,1/20]){
 const drive=(setting,grade=0)=>{const scale=getSpeedMultiplier(setting),hill=new HillSpeedPhysics((x,z)=>z*grade);let speed=0;
  for(let i=0;i<8/dt;i++){
   const effect=hill.update({x:0,z:0,heading:0,speed,thrust:sign,config,dt});const old=speed;
   speed+=scale*(sign*11+effect.direction*11*effect.modifier)*dt;
   speed-=speed*.52*dt*.08;speed=hill.limitSpeed(speed,21*scale,9*scale,dt,old);
  }return speed;
 };
 const baseline=drive(0);assert.equal(drive(''),baseline);assert.ok(Math.abs(drive(-50)-baseline*.5)<1e-8);assert.ok(Math.abs(drive(100)-baseline*2)<1e-8);assert.equal(drive(-100),0);
 for(const grade of [-.35,.35])assert.ok(Math.abs(drive(100,grade)-2*drive(0,grade))<1e-8,'hill effects still compose with speed adjustment');
 let stopping=drive(100);for(let i=0;i<30/dt;i++)stopping=applyReleaseDeceleration(stopping,dt,config);assert.equal(stopping,0,'boosted vehicle still stops exactly');
}
console.log('PASS: positive/negative/zero/empty speed adjustments, original tuning, forward/reverse, hills, disabled drive and exact stopping at 20–144 Hz.');
