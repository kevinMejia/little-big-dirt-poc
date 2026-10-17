import assert from 'node:assert/strict';
import {BoundaryCannon} from '../BoundaryCannon.js';
import {VehicleFeedback} from '../VehicleFeedback.js';
import {vehicleConfig} from '../VehicleConfig.js';
const terrain=(x,z)=>2.6*Math.sin(x*.035)*Math.cos(z*.044)+3.6*Math.sin((x+z)*.018)+1.4*Math.cos(z*.085+x*.027)+.00034*(x*x+z*z);
for(const cfg of [vehicleConfig.backhoe,vehicleConfig.garbageTruck])for(const hz of [20,60,144])for(const [x,z] of [[0,201],[201,0],[0,-201],[-201,0],[200,200],[-200,-200]])for(const steer of [-1,0,1]){
 const cannon=new BoundaryCannon(),p={x,y:terrain(x,z)-.09,z},start={...p};assert(cannon.launch(p,cfg.boundaryCannon));assert.deepEqual(p,start,'launch does not teleport');assert(!cannon.launch(p,cfg.boundaryCannon));let result,peak=p.y,frames=0;
 while(cannon.flight&&frames++<hz*12){const before={...p};result=cannon.update(1/hz,p,terrain,steer,205);peak=Math.max(peak,p.y);assert(Math.hypot(p.x-before.x,p.z-before.z)<4,'no interpolation jump');assert(Math.max(Math.abs(p.x),Math.abs(p.z))<205);assert(Number.isFinite(p.y));}
 assert(result.landed);assert(peak-start.y>20);assert(Math.hypot(p.x-start.x,p.z-start.z)>90);assert(result.speed>20);assert(result.impact>10);assert.equal(p.y,terrain(p.x,p.z)-.09);assert(!cannon.launch(p,cfg.boundaryCannon),'landing cannot immediately relaunch');cannon.rearm(p,205);assert(cannon.armed,'safe interior rearms');
 const feedback=new VehicleFeedback();feedback.landingImpact(cfg,result.impact,result.bounce);let low=0,high=0;
 for(let i=0;i<hz*5;i++){feedback.update(1/hz,{speed:result.speed,yawRate:0,groundY:p.y,groundPitch:0,groundRoll:0,config:cfg});low=Math.min(low,feedback.heave.value);high=Math.max(high,feedback.heave.value);}
 assert(low<-.05&&high>.005);assert(Math.abs(feedback.heave.value)<1e-5);
}
const endpoints=[];for(const hz of [20,60,144]){const c=new BoundaryCannon(),p={x:0,y:-.09,z:200};c.launch(p,vehicleConfig.backhoe.boundaryCannon);let r;while(c.flight)r=c.update(1/hz,p,()=>0,0,205);endpoints.push(p.z);assert(Math.abs(r.impact-28)<1e-4);assert(Math.abs(p.z+10)<1e-4,'analytic ballistic range');}
assert(Math.max(...endpoints)-Math.min(...endpoints)<1e-4);
const c=new BoundaryCannon(),p={x:0,y:0,z:200};assert(!c.launch(p,{enabled:false}));assert(c.launch(p,{horizontalLaunchSpeed:999,verticalLaunchSpeed:999,airControlPercent:100}));let r;for(let i=0;i<2000&&c.flight;i++)r=c.update(1/60,p,terrain,1,205);assert(r.landed);assert(Math.abs(p.x)<205&&Math.abs(p.z)<205);c.reset();assert(c.armed&&!c.flight);
console.log('PASS: ballistic cannon all walls/corners, both vehicles, air steering, 20–144 Hz, analytic range/gravity, no teleport, safety caps, single encounter/rearm, retained momentum and impact-scaled landing dip/rebound/settling.');
