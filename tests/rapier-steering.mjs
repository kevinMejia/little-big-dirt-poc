import assert from 'node:assert/strict';
import R from '../viewer/vendor/rapier/rapier.mjs';
import {JumpVehiclePrototype} from '../JumpVehiclePrototype.js';
import {rapierTireGrip,updateRapierTireGrip} from '../RapierHandling.js';
await R.init();
const surface={vertices:new Float32Array([-600,0,-600,-600,0,600,600,0,-600,600,0,600]),indices:new Uint32Array([0,1,2,2,1,3]),halfSize:600,heightAt:()=>0};
const wheels=[-1.43,1.43].flatMap(x=>[-2.15,-.8,2.25].map(z=>({x,z,r:.72,front:z>0})));
for(const speed of [0,8,35,70,-35])assert.equal(rapierTireGrip(speed,0),2.5,'straight-line physics retains original grip');
assert.equal(rapierTireGrip(8,1),2.5);assert.equal(rapierTireGrip(35,1),6);assert.equal(rapierTireGrip(-35,-1),6);
function trial(vehicle,speed,steering,assisted){
 const p=new JumpVehiclePrototype(R,surface,{vehicle,wheels:vehicle==='stinky'?wheels:null,safetyWalls:false,chassisHalfExtents:vehicle==='stinky'?{x:1.2,y:.45,z:2.7}:{x:1,y:.45,z:1.5}});
 p.reset(0,0,0);for(let i=0;i<240;i++)p.update(1/120,{});p.body.setLinvel({x:0,y:0,z:speed},true);p.parked=false;
 let minContacts=p.wheels.length,maxSlip=0,totalYaw=0,previousYaw=0;
 for(let i=0;i<240;i++){
  if(assisted)updateRapierTireGrip(p,steering);
  p.update(1/120,{throttle:Math.sign(speed),steering,driveScale:vehicle==='dirty'?1.8:3,speedLimit:vehicle==='dirty'?37.8:51,reverseLimit:12});
  const q=p.body.rotation(),v=p.body.linvel(),yaw=Math.atan2(2*(q.w*q.y+q.x*q.z),1-2*(q.y*q.y+q.x*q.x));
  totalYaw+=Math.atan2(Math.sin(yaw-previousYaw),Math.cos(yaw-previousYaw));previousYaw=yaw;
  maxSlip=Math.max(maxSlip,Math.abs(v.x*Math.cos(yaw)-v.z*Math.sin(yaw)));minContacts=Math.min(minContacts,p.state.contacts);
  assert(Object.values(p.body.translation()).every(Number.isFinite));assert(q.w*q.w+q.y*q.y>.95,'upright turn');
 }
 const q=p.body.rotation(),yaw=Math.atan2(2*(q.w*q.y+q.x*q.z),1-2*(q.y*q.y+q.x*q.x));p.dispose();return {yaw:totalYaw,minContacts,maxSlip};
}
for(const vehicle of ['dirty','stinky'])for(const speed of [18,35,50])for(const steering of [-1,1]){
 const before=trial(vehicle,speed,steering,false),after=trial(vehicle,speed,steering,true);
 assert(Math.sign(after.yaw)===-steering,'correct turn direction');assert(Math.abs(after.yaw)>Math.abs(before.yaw)*1.5,'material high-speed turning improvement');assert(after.minContacts>=(vehicle==='dirty'?4:6),'maintain tire contact');assert(after.maxSlip<2,'bounded side slip');
 if(speed===35&&steering===1)console.log(vehicle+': two-second high-speed turn '+Math.round(Math.abs(before.yaw)*180/Math.PI)+'° -> '+Math.round(Math.abs(after.yaw)*180/Math.PI)+'°');
}
for(const vehicle of ['dirty','stinky'])for(const steering of [-1,1]){const result=trial(vehicle,-10,steering,true);assert(Math.sign(result.yaw)===steering,'reverse steering direction preserved');}
console.log('PASS: both vehicles, left/right at three speeds, retained contacts/upright chassis/bounded slip, reverse steering, original low-speed and straight-line grip');
