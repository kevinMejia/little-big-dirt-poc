import {jumpConfig,jumpVehicleConfig} from './VehicleConfig.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const rotateVector=(q,v)=>{const tx=2*(q.y*v.z-q.z*v.y),ty=2*(q.z*v.x-q.x*v.z),tz=2*(q.x*v.y-q.y*v.x);return {x:v.x+q.w*tx+q.y*tz-q.z*ty,y:v.y+q.w*ty+q.z*tx-q.x*tz,z:v.z+q.w*tz+q.x*ty-q.y*tx};};
// GLB manifests may enumerate wheels by side instead of axle. Never pair by index.
export function matchWheelContacts(modelWheels,physicsWheels){
 const used=new Set();return modelWheels.map(w=>{const index=physicsWheels.findIndex(p=>p.front===w.front&&Math.abs(p.x-w.x)<.02&&Math.abs(p.z-w.z)<.02&&Math.abs(p.r-(w.radius??w.r))<.02);if(index<0||used.has(index))throw new Error('Model wheel has no unique matching suspension contact: '+(w.steer??'unknown'));used.add(index);return {wheel:w,physicsIndex:index};});
}
const makeRenderPose=(wheelCount=4)=>({position:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0,w:1},suspension:new Float64Array(wheelCount),wheelAngle:0,steering:0});
export function interpolateJumpPose(previous,current,alpha,target=makeRenderPose(previous.suspension.length)){
 const t=clamp(alpha,0,1);for(const axis of ['x','y','z'])target.position[axis]=previous.position[axis]+(current.position[axis]-previous.position[axis])*t;
 const a=previous.rotation,b=current.rotation,sign=a.x*b.x+a.y*b.y+a.z*b.z+a.w*b.w<0?-1:1;let length=0;
 for(const axis of ['x','y','z','w']){target.rotation[axis]=a[axis]+(b[axis]*sign-a[axis])*t;length+=target.rotation[axis]**2;}length=Math.sqrt(length)||1;for(const axis of ['x','y','z','w'])target.rotation[axis]/=length;
 for(let i=0;i<previous.suspension.length;i++)target.suspension[i]=previous.suspension[i]+(current.suspension[i]-previous.suspension[i])*t;
 target.wheelAngle=previous.wheelAngle+(current.wheelAngle-previous.wheelAngle)*t;target.steering=previous.steering+(current.steering-previous.steering)*t;return target;
}
// Shared tested Rapier controller used by the lab and optional main-world adapter.
export class JumpVehiclePrototype {
 constructor(RAPIER,surface,{config=jumpConfig,vehicle='dirty',wheels=null,tuning=null,safetyWalls=true,chassisHalfExtents={x:1,y:.45,z:1.5},wheelFilterGroups=undefined,afterStep=null}={}){
  Object.assign(this,{RAPIER,surface,config,vehicle,wheelFilterGroups,afterStep});this.world=new RAPIER.World({x:0,y:-12*clamp(config.gravityScalePercent/100,.25,2),z:0});this.world.timestep=1/120;
  this.world.createCollider(RAPIER.ColliderDesc.trimesh(surface.vertices,surface.indices).setFriction(.85));
  const edge=surface.halfSize;
  if(safetyWalls)for(const [x,z,hx,hz] of [[-edge-1,0,1,edge+2],[edge+1,0,1,edge+2],[0,-edge-1,edge+2,1],[0,edge+1,edge+2,1]])this.world.createCollider(RAPIER.ColliderDesc.cuboid(hx,8,hz).setTranslation(x,7,z).setFriction(.4));
  this.tuning={...(jumpVehicleConfig[vehicle]??jumpVehicleConfig.dirty),...tuning};this.mass=this.tuning.mass;this.rest=this.tuning.restLength;this.offset=1.1;
  this.body=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0,2,0).setCcdEnabled(true).setAngularDamping(1.5));
  this.world.createCollider(RAPIER.ColliderDesc.cuboid(chassisHalfExtents.x,chassisHalfExtents.y,chassisHalfExtents.z).setCollisionGroups(0x00010001).setMass(this.mass).setFriction(.5).setRestitution(.02+.1*clamp(config.landingBouncePercent/100,0,1)),this.body);
  this.controller=this.world.createVehicleController(this.body);this.controller.indexUpAxis=1;this.controller.setIndexForwardAxis=2;
  this.wheels=wheels??[{x:-1.24,z:1.36,r:.66,front:true},{x:1.24,z:1.36,r:.66,front:true},{x:-1.31,z:-1.12,r:.92,front:false},{x:1.31,z:-1.12,r:.92,front:false}];
  this.wheels.forEach((w,i)=>{this.controller.addWheel({x:w.x,y:w.r+this.rest-this.offset,z:w.z},{x:0,y:-1,z:0},{x:-1,y:0,z:0},this.rest,w.r);this.controller.setWheelSuspensionStiffness(i,this.tuning.suspensionStiffness);this.controller.setWheelSuspensionCompression(i,this.tuning.suspensionCompression);this.controller.setWheelSuspensionRelaxation(i,this.tuning.suspensionRelaxation*(1-.4*clamp(config.landingBouncePercent/100,0,1)));this.controller.setWheelMaxSuspensionTravel(i,.35);this.controller.setWheelMaxSuspensionForce(i,this.mass*12);this.controller.setWheelFrictionSlip(i,2.5);this.controller.setWheelSideFrictionStiffness(i,.8);});
  this.accumulator=0;this.events=[];this.state={contacts:0,airborne:false,speed:0,verticalSpeed:0,compression:Array(this.wheels.length).fill(0),steps:0};this.airSeconds=0;this.hasGrounded=false;this.recoverSeconds=0;this.wheelAngle=0;this.previousPose=makeRenderPose(this.wheels.length);this.currentPose=makeRenderPose(this.wheels.length);this.renderPose=makeRenderPose(this.wheels.length);this.capturePose(this.currentPose);this.copyPose();
 }
 capturePose(target){Object.assign(target.position,this.body.translation());Object.assign(target.rotation,this.body.rotation());for(let i=0;i<this.wheels.length;i++)target.suspension[i]=this.controller.wheelSuspensionLength(i)??this.rest;target.wheelAngle=this.wheelAngle;target.steering=this.controller.wheelSteering(this.wheels.findIndex(w=>w.front))??0;}
 copyPose(){const a=this.previousPose,b=this.currentPose;Object.assign(a.position,b.position);Object.assign(a.rotation,b.rotation);a.suspension.set(b.suspension);a.wheelAngle=b.wheelAngle;a.steering=b.steering;}
 getRenderPose(){return interpolateJumpPose(this.previousPose,this.currentPose,this.accumulator*120,this.renderPose);}
 reset(x,z,y=0,heading=0){this.body.setTranslation({x,y:y+this.offset+.12,z},true);this.body.setRotation({x:0,y:Math.sin(heading/2),z:0,w:Math.cos(heading/2)},true);this.body.setLinvel({x:0,y:0,z:0},true);this.body.setAngvel({x:0,y:0,z:0},true);this.body.resetForces(true);this.body.resetTorques(true);this.accumulator=0;this.airSeconds=0;this.events.length=0;this.state.airborne=false;this.state.contacts=0;this.state.speed=0;this.state.verticalSpeed=0;this.state.compression.fill(0);this.state.steps=0;this.hasGrounded=false;this.parked=false;this.recoveryActive=false;this.wheelAngle=0;for(let i=0;i<this.wheels.length;i++)this.controller.setWheelSteering(i,0);this.capturePose(this.currentPose);this.copyPose();}
 update(dt,input={}){this.accumulator+=Math.min(.1,Math.max(0,dt));while(this.accumulator>=1/120){this.step(1/120,typeof input==='function'?input(1/120):input);this.accumulator-=1/120;}return this.state;}
 step(h,{throttle=0,steering=0,brake=false,pitch=0,driveScale=1,speedLimit=this.tuning.maxSpeed,reverseLimit=8,releaseDeceleration=this.tuning.releaseDeceleration,brakeRate=18,stopThreshold=.1}={}){
  this.copyPose();this.body.resetForces(false);
  const R=this.RAPIER,q=this.body.rotation(),v=this.body.linvel(),forward=rotateVector(q,{x:0,y:0,z:1}),up=rotateVector(q,{x:0,y:1,z:0}),speed=v.x*forward.x+v.z*forward.z;
  if(throttle||steering||brake){this.parked=false;this.body.wakeUp();}
  const previousContacts=this.state.contacts,airborne=previousContacts===0&&this.hasGrounded;
  this.body.setLinearDamping(airborne?0:.08);
  if(!this.parked){
   const opposing=throttle*speed<-.2,engine=throttle&&!opposing&&Math.abs(speed)<(throttle>0?speedLimit:reverseLimit)?this.mass*this.tuning.acceleration*driveScale*throttle/this.wheels.length:0;
   for(let i=0;i<this.wheels.length;i++){this.controller.setWheelEngineForce(i,engine);this.controller.setWheelSteering(i,this.wheels[i].front?-clamp(steering,-1,1)*.4:0);this.controller.setWheelBrake(i,(brake||opposing?brakeRate:throttle?0:releaseDeceleration)*this.mass*h/this.wheels.length);}
   if(airborne&&pitch){const right=rotateVector(q,{x:1,y:0,z:0}),strength=clamp(this.config.airbornePitchControlPercent/100,0,1)*this.mass*2*h*pitch;this.body.applyTorqueImpulse({x:right.x*strength,y:right.y*strength,z:right.z*strength},true);}
   this.controller.updateVehicle(h,R.QueryFilterFlags.EXCLUDE_DYNAMIC,this.wheelFilterGroups);
   if(!airborne&&throttle){const excess=Math.max(0,Math.abs(speed)-(speed<0?reverseLimit:speedLimit));if(excess>0)this.body.addForce({x:-forward.x*Math.sign(speed)*this.mass*excess*2.5,y:0,z:-forward.z*Math.sign(speed)*this.mass*excess*2.5},true);}
  }
  // Gentle torque recovery uses forces, never an upright transform snap.
  const position=this.body.translation(),nearGround=position.y<(this.surface.heightAt?.(position.x,position.z)??0)+4;
  this.recoverSeconds=nearGround&&up.y<.35&&Math.hypot(v.x,v.z)<2?this.recoverSeconds+h:0;
  if(this.recoverSeconds>2)this.recoveryActive=true;if(up.y>.85)this.recoveryActive=false;
  this.state.recovering=!!this.recoveryActive;
  if(this.recoveryActive){const spin=this.body.angvel(),length=Math.hypot(up.x,up.z),ax=length>.05?-up.z/length:1,az=length>.05?up.x/length:0;this.body.applyTorqueImpulse({x:(ax*50-spin.x*10)*this.mass*h,y:0,z:(az*50-spin.z*10)*this.mass*h},true);}

  this.world.step();let contacts=0;for(let i=0;i<this.wheels.length;i++){if(this.controller.wheelIsInContact(i))contacts++;this.state.compression[i]=this.rest-(this.controller.wheelSuspensionLength(i)??this.rest);}
  const velocity=this.body.linvel();if(!contacts)this.airSeconds+=h;
  if(contacts&&this.hasGrounded&&previousContacts===0&&this.airSeconds>.08){this.events.push({type:'landing',impact:Math.max(0,-v.y),x:this.body.translation().x,z:this.body.translation().z});this.airSeconds=0;}
  if(contacts)this.hasGrounded=true;
  if(!contacts&&previousContacts>0&&Math.hypot(v.x,v.z)>1)this.events.push({type:'takeoff',vx:v.x,vy:v.y,vz:v.z});
  if(!throttle&&!brake&&contacts>=3&&Math.hypot(velocity.x,velocity.z)<Math.max(.001,stopThreshold)&&Math.abs(velocity.y)<.15&&up.y>.8){this.body.setLinvel({x:0,y:0,z:0},false);this.body.setAngvel({x:0,y:0,z:0},false);this.body.sleep();this.parked=true;}
  if(this.events.length>32)this.events.splice(0,this.events.length-32);
  this.state.contacts=contacts;this.state.airborne=!contacts;this.state.speed=velocity.x*forward.x+velocity.z*forward.z;this.state.verticalSpeed=velocity.y;this.state.steps++;this.wheelAngle+=this.state.speed*h/.75;if(this.afterStep){this.afterStep(this,h);const corrected=this.body.linvel();this.state.speed=corrected.x*forward.x+corrected.z*forward.z;this.state.verticalSpeed=corrected.y;}
  this.capturePose(this.currentPose);
 }
 impulse(velocity){this.hasGrounded=true;this.state.contacts=0;const v=this.body.linvel();this.body.setLinvel({x:velocity.x??v.x,y:velocity.y??v.y,z:velocity.z??v.z},true);this.parked=false;this.recoveryActive=false;}
 dispose(){this.world.removeVehicleController(this.controller);this.world.free();}
}
