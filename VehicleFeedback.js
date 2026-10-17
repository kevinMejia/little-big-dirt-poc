// Visual-only feedback: never moves the logical vehicle or collider.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const percent=v=>clamp(v??0,0,100)/100;
const radians=degrees=>degrees*Math.PI/180;
export const cameraReturnDecay=(value,dt)=>Math.exp(-8*percent(value)*Math.max(0,dt));
export function groundVisualWheel(pivot,root,height){
  const w=pivot.userData.wheel,contact=pivot.position.clone().set(w.x,0,w.z);
  root.localToWorld(contact);contact.y=height(contact.x,contact.z)-.035+w.r;
  pivot.position.copy(pivot.parent.worldToLocal(contact));
}
export class SoftBoundary {
  constructor(){this.reset();}
  reset(){this.x=this.z=0;this.latched=false;this.nx=this.nz=0;}
  damp(dt,release,config,braking=0){
    const length=Math.hypot(this.x,this.z);if(!length)return;
    const next=braking?Math.max(0,length-braking*dt):release?Math.max(0,length-(config.releaseDeceleration??5)*dt):length*Math.exp(-6*dt);
    const scale=next<=(config.stopThreshold??.1)?0:next/length;this.x*=scale;this.z*=scale;
  }
  resolve(position,heading,speed,limit,bounds,config,thrust){
    const fx=Math.sin(heading),fz=Math.cos(heading),reach=Math.max(Math.abs(bounds.rear),Math.abs(bounds.front));
    const lx=limit-bounds.radius-reach*Math.abs(fx),lz=limit-bounds.radius-reach*Math.abs(fz);
    let vx=fx*speed+this.x,vz=fz*speed+this.z;
    const nx=position.x>=lx&&vx>0?-1:position.x<=-lx&&vx<0?1:0;
    const nz=position.z>=lz&&vz>0?-1:position.z<=-lz&&vz<0?1:0;
    position.x=clamp(position.x,-lx,lx);position.z=clamp(position.z,-lz,lz);
    const clearance=Math.min(lx-Math.abs(position.x),lz-Math.abs(position.z));
    if(clearance>1&&(thrust===0||(fx*this.nx+fz*this.nz)*thrust>.1))this.latched=false;
    if(!nx&&!nz)return {speed,impact:0,nx:0,nz:0};
    const length=Math.hypot(nx,nz),normalX=nx/length,normalZ=nz/length;
    const incoming=Math.max(0,-vx*normalX-vz*normalZ);
    const fresh=!this.latched||normalX*this.nx+normalZ*this.nz<.5;
    // Remove each outward component, including both walls at corners.
    if(nx)vx=0;if(nz)vz=0;
    const rebound=fresh?Math.min(3,incoming*percent(config.boundaryBouncePercent)):0;
    vx+=normalX*rebound;vz+=normalZ*rebound;
    const nextSpeed=vx*fx+vz*fz;
    this.x=vx-fx*nextSpeed;this.z=vz-fz*nextSpeed;
    this.latched=true;this.nx=normalX;this.nz=normalZ;
    return {speed:nextSpeed,impact:fresh?incoming:0,nx:normalX,nz:normalZ};
  }
}
export class VehicleFeedback {
  constructor(){this.reset();}
  reset(){this.pitch={value:0,velocity:0};this.roll={value:0,velocity:0};this.heave={value:0,velocity:0};this.previous=null;}
  boundaryImpact(strength,forward,right,config){
    const amount=percent(config.boundaryBodyRockPercent)*clamp(strength/10,0,1);
    this.heave.velocity-=amount*2;this.pitch.velocity+=forward*amount*1.5;this.roll.velocity-=right*amount*1.5;
  }
  update(dt,{speed,yawRate,groundY,groundPitch,groundRoll,config}){
    if(dt<=0)return;
    const previous=this.previous??{speed,groundY,groundPitch,groundRoll,verticalSpeed:0};
    const acceleration=clamp((speed-previous.speed)/dt,-24,24),verticalSpeed=(groundY-previous.groundY)/dt,bounce=percent(config.suspensionBouncePercent);
    const targets={
      roll:clamp(speed*yawRate/12,-1,1)*radians(12)*percent(config.bodyRollPercent)+clamp((groundRoll-previous.groundRoll)/dt*.12,-radians(5),radians(5))*bounce,
      pitch:-clamp(acceleration/12,-1,1)*radians(10)*percent(config.bodyPitchPercent)+clamp((groundPitch-previous.groundPitch)/dt*.12,-radians(5),radians(5))*bounce,
      heave:-clamp((verticalSpeed-previous.verticalSpeed)*.05,-.3,.3)*bounce,
    };
    const steps=Math.max(1,Math.ceil(dt/(1/120))),h=dt/steps;
    for(let i=0;i<steps;i++)for(const key of ['pitch','roll','heave']){
      const spring=this[key];spring.velocity+=((targets[key]-spring.value)*65-spring.velocity*10)*h;spring.value+=spring.velocity*h;
      const limit=key==='heave'?.3:radians(16);spring.value=clamp(spring.value,-limit,limit);
    }
    this.previous={speed,groundY,groundPitch,groundRoll,verticalSpeed};
  }
}
