import * as THREE from 'three';
import {applyReleaseDeceleration,getSpeedMultiplier} from './VehicleMotion.js';
import {rotateVector} from './JumpVehiclePrototype.js';
import {arcadeHandlingConfig,jumpConfig,groundDebrisConfig,originalDriveConfig} from './VehicleConfig.js';

// One owner per fixed step: grounded motion never runs the raycast vehicle solver.
// Flight advances the dynamic Rapier body; terrain crossing returns ownership here.
export class ArcadeGroundDrive {
 constructor(adapter){this.adapter=adapter;this.euler=new THREE.Euler(0,0,0,'YXZ');this.q=new THREE.Quaternion();}
 step(h,input={}){
  const a=this.adapter,p=a.physics,cfg=a.cfg,t=cfg.handling??arcadeHandlingConfig[a.index?'stinky':'dirty'];
  const throttle=input.throttle??0,steer=input.steering??0,shared=cfg.rally?cfg:originalDriveConfig[a.index?'stinky':'dirty'];
  p.copyPose();
  let root=a.rootPose({position:p.body.translation(),rotation:p.body.rotation()});
  const f=rotateVector(p.body.rotation(),{x:0,y:0,z:1});
  let heading=Math.atan2(f.x,f.z),speed=p.state.speed,vy=p.body.linvel().y;
  const wasAir=p.state.airborne;
  if(!wasAir){
   const hill=a.hills.update({x:root.x,z:root.z,heading,speed,thrust:throttle,config:cfg.hill,dt:h});a.grade=hill.grade;
   const scale=getSpeedMultiplier(cfg.hill.speedAdjustmentPercent),boost=a.turbo?.multiplier??1,previous=speed;
   let acceleration=scale*boost*(throttle*(cfg.accel??t.acceleration)*(throttle>0&&speed<0?1.5:1)+(throttle?hill.direction*(cfg.accel??t.acceleration)*hill.modifier:0));
   if(input.brake&&!input.emergencyBrake)acceleration-=Math.sign(speed)*Math.min(Math.abs(speed)/h,shared.brakeDeceleration);
   speed+=acceleration*h;speed-=speed*(cfg.drag??t.drag)*h*.08;
   speed=a.hills.limitSpeed(speed,cfg.max*scale*boost,cfg.reverse*scale*boost,h,previous);
   if(input.emergencyBrake)speed=Math.sign(speed)*Math.max(0,Math.abs(speed)-shared.emergencyBrakeDeceleration*h);
   if(!throttle)speed=applyReleaseDeceleration(speed,h,cfg.hill);
   heading-=steer*(cfg.turn??t.turn)*Math.min(Math.abs(speed)/t.steeringFullSpeed,1)*h*Math.sign(speed||1)*t.steeringResponse/(1+t.speedSteeringReduction*Math.abs(speed));
   let dx=Math.sin(heading)*speed*h,dz=Math.cos(heading)*speed*h;
   if(cfg.rally){
    const velocity=p.body.linvel(),side=velocity.x*Math.cos(heading)-velocity.z*Math.sin(heading);
    this.slip=THREE.MathUtils.damp(this.slip??0,input.emergencyBrake?steer*Math.abs(speed)*.32:side*Math.exp(-7*h), input.emergencyBrake?5:9,h);
    dx+=Math.cos(heading)*this.slip*h;dz-=Math.sin(heading)*this.slip*h;
   }
   const ground=a.height(root.x+dx,root.z+dz)-.09;
   // Predict the next support height from the current tangent. Sharp convex
   // ramp lips release the body; ordinary terrain curvature stays attached.
   const gravity=12*Math.max(.25,Math.min(2,jumpConfig.gravityScalePercent/100));
   const predicted=root.y+vy*h-.5*gravity*h*h;
   // Sampled road/bank seams are continuous support, not authored jump lips.
   // Check both ends so leaving a road or a real ramp still permits flight.
   const roadSupport=a.surface.isContinuousRoad?.(root.x,root.z)&&a.surface.isContinuousRoad?.(root.x+dx,root.z+dz);
   const launch=!roadSupport&&jumpConfig.enabled&&vy>t.minimumLaunchSpeed&&predicted-ground>t.takeoffClearance;
   root.x+=dx;root.z+=dz;
   if(launch){root.y=predicted;vy-=gravity*h;p.state.airborne=true;p.events.push({type:'takeoff',vx:dx/h,vy,vz:dz/h});}
   else{vy=(ground-root.y)/h;root.y=ground;}
   if(!launch){
    const sx=Math.sin(heading),cz=Math.cos(heading),height=a.height;
    const pitch=Math.atan2(height(root.x-sx*2,root.z-cz*2)-height(root.x+sx*2,root.z+cz*2),4);
    const roll=Math.atan2(height(root.x+cz*1.3,root.z-sx*1.3)-height(root.x-cz*1.3,root.z+sx*1.3),2.6);
    this.euler.set(pitch,heading,roll,'YXZ');this.q.setFromEuler(this.euler);
    p.body.setRotation(this.q,true);p.body.setAngvel({x:0,y:0,z:0},true);
   }
   const offset=rotateVector(p.body.rotation(),{x:0,y:p.offset,z:0});
   p.body.setTranslation({x:root.x+offset.x,y:root.y+offset.y,z:root.z+offset.z},true);
   p.body.setLinvel({x:dx/h||0,y:vy,z:dz/h||0},true);
   a.hills.recordTravel(dx,dz);
  }else{
   p.body.resetForces(true);p.body.resetTorques(true);p.body.setLinearDamping(0);p.body.setAngularDamping(Math.max(0,t.airborneAngularDamping));
   p.world.gravity.y=-12*Math.max(.25,Math.min(2,jumpConfig.gravityScalePercent/100));
   const q=p.body.rotation(),right=rotateVector(q,{x:1,y:0,z:0}),forward=rotateVector(q,{x:0,y:0,z:1});
   const pitch=(input.pitch??0)*Math.max(0,Math.min(1,jumpConfig.airbornePitchControlPercent/100)),roll=-steer*Math.max(0,Math.min(1,t.airborneRollControlPercent/100));
   p.body.applyTorqueImpulse({x:(right.x*pitch+forward.x*roll)*p.mass*2*h,y:0,z:(right.z*pitch+forward.z*roll)*p.mass*2*h},true);
   const before=p.body.linvel();p.world.step();root=a.rootPose({position:p.body.translation(),rotation:p.body.rotation()});
   p.airSeconds+=h;
   const floor=a.height(root.x,root.z)-.09;
   const chassisContact=before.y<-.1&&p.body.linvel().y>=-.01&&p.body.translation().y-floor<3;
   if((root.y<=floor||chassisContact)&&before.y<=0){
    root.y=floor;const direction=rotateVector(p.body.rotation(),{x:0,y:0,z:1});heading=Math.atan2(direction.x,direction.z);
    const velocity=p.body.linvel();speed=(velocity.x*Math.sin(heading)+velocity.z*Math.cos(heading))*Math.max(0,Math.min(1,t.landingSpeedRetention));
    this.euler.set(0,heading,0,'YXZ');this.q.setFromEuler(this.euler);p.body.setRotation(this.q,true);
    p.body.setTranslation({x:root.x,y:floor+p.offset,z:root.z},true);
    p.body.setLinvel({x:Math.sin(heading)*speed,y:0,z:Math.cos(heading)*speed},true);p.body.setAngvel({x:0,y:0,z:0},true);
    p.state.airborne=false;p.airSeconds=0;p.state.compression.fill(Math.min(.25,Math.max(0,-before.y)*t.landingCompressionScale));
    p.events.push({type:'landing',impact:Math.max(0,-before.y),x:root.x,z:root.z});
   }
  }
  p.state.contacts=p.state.airborne?0:p.wheels.length;p.hasGrounded=true;
  p.state.speed=speed;p.state.verticalSpeed=p.body.linvel().y;p.state.steps++;
  p.wheelAngle+=speed*h/.75;
  // Suspension is visual: debris can move wheels without kicking the chassis.
  const q=p.body.rotation();
  for(let i=0;i<p.wheels.length;i++){
   const w=p.wheels[i],v=rotateVector(q,{x:w.x,y:0,z:w.z});
   const debris=(a.groundDebris.getWheelHeightAt?.(root.x+v.x,root.z+v.z,w.r)??0)*Math.max(0,Math.min(1,groundDebrisConfig.suspensionEffectPercent/100));
   const target=p.state.airborne?-.12:Math.max(-.2,Math.min(.25,a.height(root.x+v.x,root.z+v.z)+debris-root.y-v.y-.09));
   const rate=target>p.state.compression[i]?t.suspensionStiffness:t.suspensionDamping;
   p.state.compression[i]+=(target-p.state.compression[i])*(1-Math.exp(-rate*h));
   p.controller.setWheelSteering(i,w.front?-steer*.35:0);
  }
  a.afterStep(p,h);
  const v=p.body.linvel(),forward=rotateVector(p.body.rotation(),{x:0,y:0,z:1}),len=Math.hypot(forward.x,forward.z)||1;
  p.state.speed=(v.x*forward.x+v.z*forward.z)/len;p.state.verticalSpeed=v.y;
  if(p.events.length>32)p.events.splice(0,p.events.length-32);
  a.turbo?.step(h);
  p.capturePose(p.currentPose);for(let i=0;i<p.wheels.length;i++)p.currentPose.suspension[i]=p.rest-p.state.compression[i];
 }
}
