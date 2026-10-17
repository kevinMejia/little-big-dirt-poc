import * as THREE from 'three';
import {JumpVehiclePrototype,rotateVector} from './JumpVehiclePrototype.js';
import {arcadeHandlingConfig} from './VehicleConfig.js';
import {HillSpeedPhysics} from './HillSpeedPhysics.js';
import {ArcadeGroundDrive} from './ArcadeGroundDrive.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let rapierPromise;
export async function loadWorldPhysics(){rapierPromise??=import('./viewer/vendor/rapier/rapier.mjs').then(async module=>{await module.default.init();return module.default;});return rapierPromise;}
export class RapierWorldVehicle {
 constructor(RAPIER,{surface,height,groundDebris,trees,rocks,limit=205}){if(typeof trees?.resolveMovement!=='function'||typeof rocks?.resolveMovement!=='function')throw new Error('Rapier requires current tree/rock collision adapters. Reload the game to refresh cached modules.');Object.assign(this,{RAPIER,surface,height,groundDebris,trees,rocks,limit});this.hills=new HillSpeedPhysics(height);this.point=new THREE.Vector3();this.rotation=new THREE.Quaternion();this.normal=new THREE.Vector3();this.cannonArmed=true;this.cannonFlight=false;this.cameraHeading=null;}
 setVehicle(vehicle,cfg,index,position,heading){
  this.physics?.dispose();this.vehicle=vehicle;const tuning=arcadeHandlingConfig[index?'stinky':'dirty'];this.cfg={...cfg,accel:tuning.acceleration,max:tuning.topSpeed,reverse:tuning.reverseSpeed,turn:tuning.turn,drag:tuning.drag};this.index=index;
  const model=vehicle.userData.controller,pivots=(model?.wheels?model.wheels.map(w=>w.steering||w):vehicle.children).filter(w=>w.userData.wheel);
  this.pivots=pivots;const wheels=pivots.map(p=>{const w=p.userData.wheel;return {x:w.x,z:w.z,r:w.r,front:w.z>0};});
  this.physics=new JumpVehiclePrototype(this.RAPIER,this.surface,{vehicle:index===0?'dirty':'stinky',wheels,safetyWalls:false,wheelFilterGroups:0x00040003,chassisHalfExtents:index===0?{x:1,y:.45,z:1.5}:{x:1.2,y:.45,z:2.7},afterStep:(p,h)=>this.afterStep(p,h)});
  this.arcade=new ArcadeGroundDrive(this);this.physics.step=(h,input)=>this.arcade.step(h,input);
  this.resetAt(position,heading);
 }
 resetAt(position,heading){this.physics.reset(position.x,position.z,position.y-.12,heading);this.physics.hasGrounded=true;this.hills.reset();this.cannonFlight=false;this.cannonArmed=true;this.cameraHeading=heading;}
 rootPose(pose){const down=rotateVector(pose.rotation,{x:0,y:-this.physics.offset,z:0});return {x:pose.position.x+down.x,y:pose.position.y+down.y,z:pose.position.z+down.z};}
 afterStep(p,h){
  const current=this.rootPose({position:p.body.translation(),rotation:p.body.rotation()}),previous=this.rootPose(p.previousPose),q=p.body.rotation(),forward=rotateVector(q,{x:0,y:0,z:1}),heading=Math.atan2(forward.x,forward.z),velocity=p.body.linvel();
  const grounded=!p.state.airborne;
  if(grounded){const trial={...current},result={x:velocity.x,z:velocity.z},before=p.state.speed;
   let speed=this.trees.resolveMovement(trial,previous.x,previous.z,heading,before,h,this.cfg.collision,{baseMaxSpeed:this.cfg.max,treeKnockdownSpeedPercent:this.cfg.hill.treeKnockdownSpeedPercent},result);
   const treeHit=Math.abs(trial.x-current.x)+Math.abs(trial.z-current.z)>1e-7||Math.abs(speed-before)>1e-6;
   if(treeHit)p.body.setLinvel({x:result.x,y:velocity.y,z:result.z},true);
   const priorRock={x:trial.x,z:trial.z},rockSpeed=this.rocks.resolveMovement(trial,previous.x,previous.z,heading,speed,h,this.cfg.collision,{baseMaxSpeed:this.cfg.max,...this.cfg.hill},result);
   const rockHit=Math.abs(trial.x-priorRock.x)+Math.abs(trial.z-priorRock.z)>1e-7||Math.abs(rockSpeed-speed)>1e-6;
   if(rockHit)p.body.setLinvel({x:result.x,y:p.body.linvel().y,z:result.z},true);
   const dx=trial.x-current.x,dz=trial.z-current.z;if(Math.abs(dx)+Math.abs(dz)>1e-7){const b=p.body.translation();p.body.setTranslation({x:b.x+dx,y:b.y,z:b.z+dz},true);}
  }
  const b=this.cfg.collision,reach=Math.max(Math.abs(b.rear),Math.abs(b.front)),lx=this.limit-b.radius-reach*Math.abs(Math.sin(heading)),lz=this.limit-b.radius-reach*Math.abs(Math.cos(heading));
  if(grounded&&Math.abs(current.x)<lx-12&&Math.abs(current.z)<lz-12)this.cannonArmed=true;
  const crossing=Math.abs(current.x)>=lx&&current.x*velocity.x>0||Math.abs(current.z)>=lz&&current.z*velocity.z>0;
  if(crossing&&this.cannonArmed&&!this.cannonFlight){const c=this.cfg.hill.boundaryCannon;
   if(c?.enabled!==false){const distance=Math.hypot(current.x,current.z)||1,speed=clamp(c?.horizontalLaunchSpeed??45,8,65);p.impulse({x:-current.x/distance*speed,y:clamp(c?.verticalLaunchSpeed??28,8,40),z:-current.z/distance*speed});this.cannonArmed=false;this.cannonFlight=true;this.cannonAge=0;const spin=clamp((c?.launchSpinPercent??20)/100,0,1);p.body.setAngvel({x:.35*spin,y:.25*spin,z:-.3*spin},true);p.state.airborne=true;p.state.contacts=0;}
   else{const v=p.body.linvel();p.body.setLinvel({x:Math.abs(current.x)>=lx?-Math.sign(current.x)*Math.min(2,Math.abs(v.x)*.15):v.x,y:v.y,z:Math.abs(current.z)>=lz?-Math.sign(current.z)*Math.min(2,Math.abs(v.z)*.15):v.z},true);}
  }
  if(this.cannonFlight){this.cannonAge+=h;if(p.state.contacts&&this.cannonAge>.2){for(const event of p.events)if(event.type==='landing')event.bounce=this.cfg.hill.boundaryCannon?.landingBouncePercent??30;this.cannonFlight=false;}else{const v=p.body.linvel(),steer=this.input?.steering??0,turn=-steer*clamp((this.cfg.hill.boundaryCannon?.airControlPercent??15)/100,0,1)*.7*h,c=Math.cos(turn),s=Math.sin(turn);p.body.setLinvel({x:v.x*c+v.z*s,y:v.y,z:v.z*c-v.x*s},true);const target=Math.atan2(v.x,v.z),angle=Math.atan2(Math.sin(target-heading),Math.cos(target-heading)),ang=p.body.angvel();p.body.applyTorqueImpulse({x:0,y:(angle*.9-ang.y*.7)*p.mass*h,z:0},true);}}
  // Velocity-only containment; normal flights never reach this guard.
  const v=p.body.linvel(),edge=this.limit+4;if(current.x>edge&&v.x>0||current.x<-edge&&v.x<0)p.body.setLinvel({...v,x:-Math.sign(current.x)*Math.abs(v.x)},true);if(current.z>edge&&v.z>0||current.z<-edge&&v.z<0)p.body.setLinvel({...p.body.linvel(),z:-Math.sign(current.z)*Math.abs(v.z)},true);
 }
 update(dt,input){
  const tuning=arcadeHandlingConfig[this.index?'stinky':'dirty'];
  Object.assign(this.cfg,{accel:tuning.acceleration,max:tuning.topSpeed,reverse:tuning.reverseSpeed,turn:tuning.turn,drag:tuning.drag});
  this.input=input;
  const p=this.physics;this.grade=0;p.update(dt,input);
  const pose={position:p.body.translation(),rotation:p.body.rotation()},root=this.rootPose(pose),forward=rotateVector(pose.rotation,{x:0,y:0,z:1});return {position:root,heading:Math.atan2(forward.x,forward.z),speed:p.state.speed,airborne:p.state.airborne,verticalSpeed:p.state.verticalSpeed,grade:this.grade,events:p.events.splice(0),cannon:this.cannonFlight};
 }
 render(root,visual,feedback,dt){
  const p=this.physics,pose=p.getRenderPose(),origin=this.rootPose(pose);root.position.set(origin.x,origin.y,origin.z);root.quaternion.set(pose.rotation.x,pose.rotation.y,pose.rotation.z,pose.rotation.w);visual.position.set(0,feedback.heave.value,0);visual.rotation.set(feedback.pitch.value,0,feedback.roll.value);root.updateMatrixWorld(true);
  const model=this.vehicle.userData.controller;model?.setSteering(pose.steering);model?.setWheelRotation(pose.wheelAngle);
  this.pivots.forEach((pivot,i)=>{const w=p.wheels[i];this.point.set(w.x,w.r+p.rest-pose.suspension[i],w.z);root.localToWorld(this.point);pivot.position.copy(pivot.parent.worldToLocal(this.point));if(!model){pivot.rotation.y=w.front?pose.steering:0;pivot.userData.roll.rotation.x=pose.wheelAngle*.75/w.r;}});model?.update(dt);
  const f=rotateVector(pose.rotation,{x:0,y:0,z:1}),yaw=Math.atan2(f.x,f.z),delta=Math.atan2(Math.sin(yaw-this.cameraHeading),Math.cos(yaw-this.cameraHeading));this.cameraHeading+=delta*(1-Math.exp(-5*dt));
 }
 dispose(){this.physics?.dispose();this.physics=null;}
}
