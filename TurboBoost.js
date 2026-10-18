import {turboBoostConfig} from './VehicleConfig.js';

// Controller-local timer, never a mutation of the normal vehicle tuning.
export class TurboBoost {
 constructor(config=turboBoostConfig){this.config=config;this.remaining=0;}
 get multiplier(){return this.remaining>0&&this.config.enabled?1+Math.max(0,this.config.speedBoostPercent)/100:1;}
 activate(){if(!this.config.enabled||this.config.durationSeconds<=0)return false;this.remaining=this.config.durationSeconds;return true;}
 step(dt){this.remaining=this.config.enabled?Math.max(0,this.remaining-dt):0;}
 reset(){this.remaining=0;}
}

export class TurboPickupTimer {
 constructor(){this.remaining=0;}
 get available(){return this.remaining<=0;}
 collect(seconds){if(!this.available)return false;this.remaining=Math.max(.001,seconds);return true;}
 step(dt){this.remaining=Math.max(0,this.remaining-dt);}
}

// Swept horizontal proximity avoids missing pickups at 3x speed or low FPS.
export function crossesPickup(from,to,pickup,radius){
 const dx=to.x-from.x,dz=to.z-from.z,den=dx*dx+dz*dz;
 const t=den?Math.max(0,Math.min(1,((pickup.x-from.x)*dx+(pickup.z-from.z)*dz)/den)):0;
 return Math.hypot(from.x+dx*t-pickup.x,from.z+dz*t-pickup.z)<=radius && Math.abs(from.y+(to.y-from.y)*t-pickup.y)<3.5;
}
