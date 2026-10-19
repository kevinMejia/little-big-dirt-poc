// Ballistic boundary motion owns position ONLY while airborne. No Three.js dependency.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const setting=(v,f,a,b)=>clamp(Number.isFinite(Number(v))?Number(v):f,a,b);
export class BoundaryCannon {
  constructor(){this.reset();}
  reset(){this.flight=null;this.armed=true;}
  rearm(position,limit){if(!this.flight&&(typeof limit==='number'?Math.max(Math.abs(position.x),Math.abs(position.z))<limit-12:position.x>limit.minX+12&&position.x<limit.maxX-12&&position.z>limit.minZ+12&&position.z<limit.maxZ-12))this.armed=true;}
  launch(position,config={}){
    if(this.flight||!this.armed||config.enabled===false)return false;
    const distance=Math.hypot(position.x,position.z);if(distance<1)return false;
    const horizontal=setting(config.horizontalLaunchSpeed,45,8,65),vertical=setting(config.verticalLaunchSpeed,28,8,40);
    this.flight={vx:-position.x/distance*horizontal,vy:vertical,vz:-position.z/distance*horizontal,elapsed:0,
      spin:setting(config.launchSpinPercent,20,0,100)/100,control:setting(config.airControlPercent,15,0,100)/100,
      bounce:setting(config.landingBouncePercent,30,0,100),horizontal};this.armed=false;return true;
  }
  update(dt,position,height,steer,limit){
    const f=this.flight;if(!f)return null;
    // <=1/120 s subdivisions, exact constant-gravity integration within each step.
    const steps=Math.max(1,Math.ceil(Math.max(0,dt)*120)),h=Math.max(0,dt)/steps,gravity=12;
    for(let i=0;i<steps;i++){
      const angle=-clamp(steer,-1,1)*f.control*.7*h,c=Math.cos(angle),s=Math.sin(angle),vx=f.vx*c+f.vz*s;
      f.vz=f.vz*c-f.vx*s;f.vx=vx;
      const x=position.x,y=position.y,z=position.z,vy=f.vy;
      const sample=t=>({x:x+f.vx*t,y:y+vy*t-.5*gravity*t*t,z:z+f.vz*t});
      let next=sample(h);f.vy-=gravity*h;f.elapsed+=h;
      if(f.vy<0&&next.y<=height(next.x,next.z)-.09){
        let lo=0,hi=h;for(let j=0;j<18;j++){const mid=(lo+hi)/2,p=sample(mid);if(p.y>height(p.x,p.z)-.09)lo=mid;else hi=mid;}
        next=sample(hi);position.x=next.x;position.z=next.z;position.y=height(next.x,next.z)-.09;
        const impact=Math.max(0,-(vy-gravity*hi));this.flight=null;
        return {landed:true,impact,speed:Math.hypot(f.vx,f.vz)*.72,heading:Math.atan2(f.vx,f.vz),bounce:f.bounce};
      }
      position.x=next.x;position.y=next.y;position.z=next.z;
      // Safety containment for extreme settings/air steering: redirect velocity, never teleport.
      const safe=typeof limit==='number'?limit-4:0,minX=typeof limit==='number'?-safe:limit.minX+4,maxX=typeof limit==='number'?safe:limit.maxX-4,minZ=typeof limit==='number'?-safe:limit.minZ+4,maxZ=typeof limit==='number'?safe:limit.maxZ-4;if(position.x>maxX&&f.vx>0)f.vx=-Math.abs(f.vx);if(position.x<minX&&f.vx<0)f.vx=Math.abs(f.vx);
      if(position.z>maxZ&&f.vz>0)f.vz=-Math.abs(f.vz);if(position.z<minZ&&f.vz<0)f.vz=Math.abs(f.vz);
      // Bounded inputs and gravity normally land in <8 seconds. Timeout is an emergency only.
      if(f.elapsed>15||![position.x,position.y,position.z].every(Number.isFinite)){this.reset();return {unrecoverable:true};}
    }
    return {landed:false,speed:Math.hypot(f.vx,f.vz),heading:Math.atan2(f.vx,f.vz)};
  }
}
