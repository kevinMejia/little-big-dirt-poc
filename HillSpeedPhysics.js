import {hillSettings} from './VehicleConfig.js';

const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

/** Samples terrain along measured horizontal motion, including collision slides.
 * Grade > 0 is uphill; grade < 0 is downhill. No physics-engine dependency.
 */
export class HillSpeedPhysics {
  constructor(height,settings=hillSettings){this.height=height;this.settings=settings;this.reset();}
  reset(){this.grade=0;this.modifier=0;this.dx=0;this.dz=0;}
  recordTravel(dx,dz){this.dx=dx;this.dz=dz;}
  update({x,z,heading,speed,thrust,config,dt}){
    const s=this.settings,sign=Math.sign(speed)||Math.sign(thrust);
    let dx=this.dx,dz=this.dz,length=Math.hypot(dx,dz);
    // At rest, or immediately after changing travel direction, use intended motion.
    const fx=Math.sin(heading)*sign,fz=Math.cos(heading)*sign;
    if(length<.0001||dx*fx+dz*fz<0){dx=fx;dz=fz;length=Math.hypot(dx,dz);}
    let rawGrade=0;
    if(length>0){dx/=length;dz/=length;const e=s.sampleDistance;
      rawGrade=(this.height(x+dx*e,z+dz*e)-this.height(x-dx*e,z-dz*e))/(2*e);
    }
    const strength=clamp((Math.abs(rawGrade)-s.flatGrade)/(s.fullEffectGrade-s.flatGrade),0,1);
    const percent=rawGrade<0?Math.max(0,config.downhillBoostPercent||0):clamp(config.uphillPenaltyPercent||0,0,95);
    const target=(rawGrade<0?1:-1)*strength*percent/100;
    const alpha=1-Math.exp(-dt/s.responseSeconds);
    this.grade+=(rawGrade-this.grade)*alpha;
    this.modifier+=(target-this.modifier)*alpha;
    // A disabled side must have no lingering force from a previous incline.
    if((rawGrade<=0&&!config.downhillBoostPercent)||(rawGrade>=0&&!config.uphillPenaltyPercent))this.modifier=0;
    return {grade:this.grade,modifier:this.modifier,direction:sign};
  }
  limitSpeed(speed,forwardMax,reverseMax,dt,previousSpeed=speed){
    const max=(speed<0?reverseMax:forwardMax)*(1+this.modifier);
    // Ease overspeed away rather than snapping down when a hill changes.
    const magnitude=Math.abs(speed);
    if(magnitude<=max)return speed;
    const previousMagnitude=Math.sign(previousSpeed)===Math.sign(speed)?Math.abs(previousSpeed):0;
    return Math.sign(speed)*(max+Math.max(0,previousMagnitude-max)*Math.exp(-this.settings.speedSettlingRate*dt));
  }
}
